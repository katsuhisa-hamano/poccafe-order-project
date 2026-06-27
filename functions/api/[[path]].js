export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // 全てのレスポンスに付与するCORSヘッダー
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // プリフライト（OPTIONS）リクエストへの即時返答
  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // =========================================================
    // 注文データ保存処理 (POST /api/orders)
    // =========================================================
    if (path === '/api/orders' && method === 'POST') {
      try {
        const payload = await request.json();
        
        // 基本的なバリデーション
        if (!payload || !payload.items || payload.items.length === 0) {
          return new Response(JSON.stringify({ success: false, message: 'リクエストデータが不足しています。' }), { status: 400, headers: corsHeaders });
        }

        if (!env.DB) {
          return new Response(JSON.stringify({ success: false, message: 'データベースのバインドが見つかりません。' }), { status: 500, headers: corsHeaders });
        }

        const items = payload.items;
        const statements = [];

        // ---------------------------------------------------------
        // 1. 親（orders）テーブルへの挿入クエリを配列の最初に追加
        // ---------------------------------------------------------
        statements.push(
          env.DB.prepare(`
            INSERT INTO orders (customer_id, customer_name, customer_email, creater_id, creater_name, delivery_date, total_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            payload.customer_id ?? "",
            payload.customer_name ?? "ゲスト",
            payload.customer_email ?? null,
            payload.creater_id ?? "",
            payload.creater_name ?? "",
            payload.order_date ?? "",
            parseInt(payload.overallPrice, 10) || 0
          )
        );

        // ---------------------------------------------------------
        // 2. 連想配列（オブジェクト）をループ展開して子と孫のクエリを生成
        // ---------------------------------------------------------
        Object.keys(items).forEach(key => {
          const item = items[key]; // キーに対応する商品のオブジェクトを取得
          if (!item) return;

          // ① 子（order_items）の挿入
          // 💡 重複問題の解決策: 配列の[0]番目でインサートした『親のID』を安全に引き出すため、
          // SQLiteの「(SELECT seq FROM sqlite_sequence WHERE name='orders')」または「(SELECT MAX(id) FROM orders)」を使用します。
          // これにより、この後のクエリで last_insert_rowid() が何に上書きされようが、常に「今回の親注文のID」が固定で入ります。
          statements.push(
            env.DB.prepare(`
              INSERT INTO order_items (order_id, menu_id, menu_name, variation_id, variation_name, quantity, unit_price)
              VALUES ((SELECT MAX(id) FROM orders), ?, ?, ?, ?, ?, ?)
            `).bind(
              item.itemId ?? "",
              item.itemName ?? "",
              item.variationId ?? "",
              item.variationName ?? "",
              parseInt(item.quantity, 10) || 1,
              parseInt(item.price, 10) || 0
            )
          );

          // ② 孫（order_item_modifiers）の挿入
          if (item.modifiers && Array.isArray(item.modifiers)) {
            item.modifiers.forEach(mod => {
              // 💡 解決の鍵: order_item_id には、この商品のループ直前に固定した子テーブル用テンポラリからIDをセレクトして入れる！
              // これにより、トッピングが何個連続でインサートされても、一切IDがブレなくなります。
              statements.push(
                env.DB.prepare(`
                  INSERT INTO order_item_modifiers (order_item_id, modifier_id, modifier_name, modifier_price)
                  VALUES ((SELECT MAX(id) FROM order_items), ?, ?, ?)
                `).bind(
                  mod.id ?? "",
                  mod.name ?? "",
                  parseInt(mod.price, 10) || 0
                )
              );
            });
          }
        });

        // =========================================================
        // 3. 【一括実行】すべてのクエリを1つのバッチとしてD1に転送
        // =========================================================
        // 💡D1公式の仕様: env.DB.batch() に渡された配列は自動的に1つのトランザクションになります。
        // 親・子・孫のインサート中、どこか1箇所でもエラー（制約違反や型エラーなど）が発生した場合、
        // 例外がスローされ、一番上の「親（orders）」も含めてデータベースから【自動で完全にロールバック】されます。
        const batchResults = await env.DB.batch(statements);

        // 新しく生成された親注文のIDを、親インサート文（[0]番目のクエリ）のメタデータから取得
        const newOrderId = batchResults[0].meta.last_row_id;

        // 成功レスポンスの返却
        return new Response(JSON.stringify({
          success: true, 
          message: '注文が正常に登録されました。',
          order_id: newOrderId 
        }), { headers: corsHeaders });

      } catch (dbErr) {
        console.error("注文保存エラー（親を含めて完全ロールバックされました）:", dbErr);
        return new Response(JSON.stringify({ 
          success: false, 
          message: '注文処理中にエラーが発生したため、すべての処理を取り消しました: ' + dbErr.message 
        }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================
    // 【追加】休日設定の取得 (GET /api/holiday-settings)
    // =========================================================
    if (path === '/api/holiday-settings' && method === 'GET') {
      try {
        // 1. 定休日マトリックスの取得
        const matrixRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'holiday_rules'").first();
        const disabledMatrix = matrixRow ? JSON.parse(matrixRow.value) : [];

        // 2. 注文締め切り時間の取得
        const cutoffRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'holiday_cutoff_time'").first();
        const cutoffTime = cutoffRow ? cutoffRow.value : "14:00";
        
        // 3. 注文期限月の取得
        const maxMonthRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'max_order_month'").first();
        const maxOrderMonth = maxMonthRow ? maxMonthRow.value : ""; // データがなければ空文字

        // 4. 臨時休業（年月ごとに保存された全データを結合して返却する）
        // settingsテーブルから key が 'holiday_specific_' で始まるものをすべて取得
        const { results: specificHolidaysRows } = await env.DB.prepare("SELECT key, value FROM settings WHERE key LIKE 'holiday_specific_%'").all();

        // 4. 臨時営業（年月ごとに保存された全データを結合して返却する）
        // settingsテーブルから key が 'workday_specific_' で始まるものをすべて取得
        const { results: specificWorkdaysRows } = await env.DB.prepare("SELECT key, value FROM settings WHERE key LIKE 'workday_specific_%'").all();

        let specificHolidays = [];
        if (specificHolidaysRows && specificHolidaysRows.length > 0) {
          specificHolidaysRows.forEach(row => {
            const monthlyHolidays = JSON.parse(row.value);
            if (Array.isArray(monthlyHolidays)) {
              specificHolidays = specificHolidays.concat(monthlyHolidays);
            }
          });
        }
        // 重複排除とソート
        specificHolidays = [...new Set(specificHolidays)].sort();

        let specificWorkdays = [];
        if (specificWorkdaysRows && specificWorkdaysRows.length > 0) {
          specificWorkdaysRows.forEach(row => {
            const monthlyWorkdays = JSON.parse(row.value);
            if (Array.isArray(monthlyWorkdays)) {
              specificWorkdays = specificWorkdays.concat(monthlyWorkdays);
            }
          });
        }
        // 重複排除とソート
        specificWorkdays = [...new Set(specificWorkdays)].sort();

        return new Response(JSON.stringify({
          success: true,
          settings: {
            disabledMatrix,
            cutoffTime,
            maxOrderMonth,
            specificHolidays,
            specificWorkdays
          }
        }), { headers: corsHeaders });
      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, message: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================
    // 【追加】休日設定の保存 (POST /api/holiday-settings)
    // =========================================================
    if (path === '/api/holiday-settings' && method === 'POST') {
      try {
        const { disabledMatrix, cutoffTime, specificHolidays, specificWorkdays, maxOrderMonth } = await request.json();

        // 1. 定休日マトリックスを個別保存
        if (disabledMatrix !== undefined) {
          await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('holiday_rules', ?)")
            .bind(JSON.stringify(disabledMatrix))
            .run();
        }

        // 2. 締め切り時間を個別保存 (プレーンな文字列)
        if (cutoffTime !== undefined) {
          await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('holiday_cutoff_time', ?)")
            .bind(cutoffTime)
            .run();
        }

        // 3. 注文期限月を保存
        if (maxOrderMonth !== undefined) {
          await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('max_order_month', ?)")
            .bind(maxOrderMonth)
            .run();
        }

        // 4. 臨時休業日を「年月ごと (YYYY-MM)」に key 分けして保存
        if (specificHolidays !== undefined) {
          // まずは既存の holiday_specific_ で始まる全レコードをいったんお掃除
          await env.DB.prepare("DELETE FROM settings WHERE key LIKE 'holiday_specific_%'").run();

          // 送られてきた日付を「年-月」ごとにグルーピング
          const grouped = {};
          specificHolidays.forEach(dateStr => {
            // dateStr は "2026-05-27" のような形式を想定
            if (dateStr && dateStr.includes('-')) {
              const parts = dateStr.split('-');
              const yearMonth = `${parts[0]}-${parts[1]}`; // "2026-05"
              if (!grouped[yearMonth]) {
                grouped[yearMonth] = [];
              }
              grouped[yearMonth].push(dateStr);
            }
          });

          // 存在する年月のデータだけを、個別のkeyでDBにバルク保存（ループ処理）
          for (const [yearMonth, dates] of Object.entries(grouped)) {
            const keyName = `holiday_specific_${yearMonth}`;
            await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
              .bind(keyName, JSON.stringify(dates.sort()))
              .run();
          }
        }

        // 5. 臨時営業日を「年月ごと (YYYY-MM)」に key 分けして保存
        if (specificWorkdays !== undefined) {
          // まずは既存の workday_specific_ で始まる全レコードをいったんお掃除
          await env.DB.prepare("DELETE FROM settings WHERE key LIKE 'workday_specific_%'").run();

          // 送られてきた日付を「年-月」ごとにグルーピング
          const grouped = {};
          specificWorkdays.forEach(dateStr => {
            // dateStr は "2026-05-27" のような形式を想定
            if (dateStr && dateStr.includes('-')) {
              const parts = dateStr.split('-');
              const yearMonth = `${parts[0]}-${parts[1]}`; // "2026-05"
              if (!grouped[yearMonth]) {
                grouped[yearMonth] = [];
              }
              grouped[yearMonth].push(dateStr);
            }
          });

          // 存在する年月のデータだけを、個別のkeyでDBにバルク保存（ループ処理）
          for (const [yearMonth, dates] of Object.entries(grouped)) {
            const keyName = `workday_specific_${yearMonth}`;
            await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
              .bind(keyName, JSON.stringify(dates.sort()))
              .run();
          }
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, message: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------\
    // 1. 新規アカウント登録申請 (POST /api/auth/register)
    // ---------------------------------------------------------\
    if (path === '/api/auth/register' && method === 'POST') {
      const { name, email, tel, password } = await request.json();

      if (!name || !email || !tel || !password) {
        return new Response(JSON.stringify({ success: false, message: '必須項目が不足しています。' }), { status: 400, headers: corsHeaders });
      }

      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, message: 'データベース(DB)のバインドが見つかりません。' }), { status: 500, headers: corsHeaders });
      }

      // 【追加】電話番号の整形（Squareは +81 形式、またはハイフンなしの数字のみを好みます）
      // 日本の「0」ではじまる番号（090...）を「+8190...」に自動変換
      let formattedTel = undefined;
      if (tel) {
        const cleanedTel = tel.trim().replace(/[-()\s]/g, ''); // ハイフンやスペースを除去
        if (cleanedTel.startsWith('0')) {
          formattedTel = '+81' + cleanedTel.substring(1);
        } else {
          formattedTel = cleanedTel;
        }
      }

      const searchName = name.replace(/\s+/g, "").toLowerCase();

      // --- 1. DB内に「名前と電話番号が一致し、Emailが空白」の既存ユーザーがいるか確認 ---
      const existingUsers = await env.DB.prepare(`
        SELECT * FROM users WHERE tel = ?
      `).bind(tel).all();

      let targetUser = null;
      if (existingUsers.results && existingUsers.results.length > 0) {
        // 名前の一致かつEmailが空（nullまたは空文字）のユーザーを探す
        targetUser = existingUsers.results.find(u => {
          const dbName = (u.name || "").replace(/\s+/g, "").toLowerCase();
          const isEmailEmpty = !u.email || u.email.trim() === "";
          return dbName === searchName && isEmailEmpty;
        });
      }

      // すでに通常の登録（Emailが存在する）がある場合は重複エラー
      const emailCheck = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first();
      if (emailCheck) {
        return new Response(JSON.stringify({ success: false, message: 'このメールアドレスは既に登録されています。' }), { status: 400, headers: corsHeaders });
      }

      let squareCustomerId = targetUser ? targetUser.square_customer_id : null;
      const headers = {
        'Square-Version': '2026-05-20', // 本番環境のバージョンに合わせて調整してください
        'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      };

      // --- 2. Square側の顧客特定または同期処理 ---
      if (squareCustomerId) {
        // すでにDBにSquareIDがある場合、Square側のEmail情報を更新(PUT)する
        try {
          const updateSquareRes = await fetch(`https://connect.squareup.com/v2/customers/${squareCustomerId}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ email_address: email })
          });
          if (!updateSquareRes.ok) {
            console.error("Square顧客のEmail更新に失敗しました。既存ID:", squareCustomerId);
          }
        } catch (err) {
          console.error("Square通信エラー(PUT):", err);
        }
      } else {
        // DBにSquareIDがない、または新規作成の場合、まずSquare全件から検索
        let allCustomers = [];
        let cursor = undefined;
        let hasMore = true;

        while (hasMore) {
          const bodyPayload = {};
          if (cursor) bodyPayload.cursor = cursor;

          const listRes = await fetch('https://connect.squareup.com/v2/customers/search', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(bodyPayload)
          });

          if (listRes.ok) {
            const listData = await listRes.json();
            if (listData.customers) allCustomers = allCustomers.concat(listData.customers);
            cursor = listData.cursor || null;
            hasMore = !!cursor;
          } else {
            hasMore = false;
          }
        }

        // メモリ上での名前・電話番号マッチング
        const matchedCustomer = allCustomers.find(customer => {
          const matchTel = customer.phone_number === formattedTel;
          const customerFullName = `${customer.family_name || ""}${customer.given_name || ""}`.replace(/\s+/g, "").toLowerCase();
          const matchName = customerFullName.includes(searchName) || searchName.includes(customerFullName);
          return matchTel && matchName;
        });

        if (matchedCustomer) {
          squareCustomerId = matchedCustomer.id;
          // 見つかったSquare顧客のEmailを更新
          await fetch(`https://connect.squareup.com/v2/customers/${squareCustomerId}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ email_address: email })
          });
        } else {
          // Square側に全く存在しない場合は新規作成(POST)
          const createRes = await fetch('https://connect.squareup.com/v2/customers', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
              given_name: name,
              email_address: email,
              phone_number: formattedTel
            })
          });
          if (createRes.ok) {
            const createData = await createRes.json();
            squareCustomerId = createData.customer.id;
          } else {
            const errText = await createRes.text();
            return new Response(JSON.stringify({ success: false, message: `Square顧客作成に失敗: ${errText}` }), { status: 400, headers: corsHeaders });
          }
        }
      }

      // パスワードハッシュ化 (SHA-256)
      const msgUint8 = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const verifyToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      

      
      // DBへ仮登録
      if (targetUser) {
        // パターンA: 名前・電話番号一致のEmail空データがある場合 ➔ レコードをアップデート
        const userId = targetUser.id;
        await env.DB.prepare(`
          UPDATE users 
          SET email = ?, password_hash = ?, square_customer_id = ?, status = 'pending', verify_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(email.trim(), passwordHash, squareCustomerId, verifyToken, expiresAt, userId).run();
      } else {
        // パターンB: 完全に新規のユーザー ➔ 新規INSERT
        await env.DB.prepare(`
        INSERT OR REPLACE INTO users (name, email, tel, password_hash, square_customer_id, status, verify_token, token_expires_at)
        VALUES (?, LOWER(?), ?, ?, ?, 'pending', ?, ?)
      `).bind(name.trim(), email.trim(), tel ? tel.trim() : null, passwordHash, squareCustomerId, verifyToken, expiresAt).run();
      }

      // メール送信処理（Resend API 対応）
      const verifyLink = `${url.origin}/api/auth/verify?token=${verifyToken}`;
      if (env.RESEND_API_KEY) {
        try {
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'ぽっカフェ <noreply@pokkapoka.net>',
              to: [email.trim()],
              subject: '【ぽっカフェ】アカウント作成の確認',
              text: `${name}様\n\nぽっカフェへの会員登録申請ありがとうございます。\n以下のリンクをクリックして、アカウント作成を完了させてください。\n\n${verifyLink}\n\n※このリンクの有効期限は24時間です。`
            })
          });

          if (!resendRes.ok) {
            console.error("Resend API エラー:", await resendRes.text());
          }
        } catch (mailErr) {
          console.error("メール送信エラー:", mailErr);
        }
      } else {
        console.warn("env.RESEND_API_KEY が見つかりません。");
      }

      return new Response(JSON.stringify({ success: true, message: "認証メールを送信しました。" }), { headers: corsHeaders });
    }

    // ---------------------------------------------------------
    // 2. 本登録完了処理 (GET /api/auth/verify)
    // ---------------------------------------------------------
    if (path === '/api/auth/verify' && method === 'GET') {
      const token = url.searchParams.get('token');
      if (!token) return new Response("Invalid Token", { status: 400 });

      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE verify_token = ? AND status = 'pending'"
      ).bind(token).first();

      if (!user) {
        return new Response("ユーザーが見つからないか、既にアクティブです。", { status: 400 });
      }

      if (new Date().toISOString() > user.token_expires_at) {
        return new Response("トークンの有効期限が切れています。もう一度登録し直してください。", { status: 400 });
      }

      // ステータスを active に更新
      await env.DB.prepare(
        "UPDATE users SET status = 'active', verify_token = NULL, token_expires_at = NULL WHERE id = ?"
      ).bind(user.id).run();

      // 本登録完了後、自動でログイン画面（トップ）へリダイレクト
      return Response.redirect(`${url.origin}/`, 302);
    }

    // ---------------------------------------------------------
    // 3. ログイン処理 (GET または POST /api/auth/login)
    // ---------------------------------------------------------
    if (path === '/api/auth/login') {
      let email = null;
      let inputPassword = null;

      if (method === 'GET') {
        email = url.searchParams.get('email');
        inputPassword = url.searchParams.get('password');
      } else if (method === 'POST') {
        try {
          const bodyData = await request.json();
          email = bodyData.email;
          inputPassword = bodyData.password;
        } catch(e) {}
      }

      if (!email || !inputPassword) {
        return new Response(JSON.stringify({ success: false, message: "メールアドレスとパスワードが必要です。" }), { status: 400, headers: corsHeaders });
      }

      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND status = 'active'"
      ).bind(email.trim()).first();

      if (!user) {
        return new Response(JSON.stringify({ success: false, message: "アカウントが見つかりません。新規登録をお願いします。" }), { status: 401, headers: corsHeaders });
      }

      // パスワード照合
      const msgUint8 = new TextEncoder().encode(inputPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (user.password_hash !== inputHash) {
        return new Response(JSON.stringify({ success: false, message: "メールアドレスまたはパスワードが間違っています。" }), { status: 401, headers: corsHeaders });
      }

      // ★ ログイン成功時のレスポンスに user.is_admin を追加して返却する
      return new Response(JSON.stringify({ 
        success: true, 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          square_customer_id: user.square_customer_id,
          is_admin: user.is_admin || 0
        }
      }), { headers: corsHeaders });
    }

    // ---------------------------------------------------------
    // 4. パスワードリセット申請メール送信 (POST /api/auth/forgot-password)
    // ---------------------------------------------------------
    if (path === '/api/auth/forgot-password' && method === 'POST') {
      const { email } = await request.json();
      if (!email) return new Response(JSON.stringify({ success: false, message: "メールアドレスが必要です。" }), { status: 400, headers: corsHeaders });

      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND status = 'active'"
      ).bind(email.trim()).first();

      if (!user) {
        return new Response(JSON.stringify({ success: false, message: "そのメールアドレスは登録されていません。" }), { status: 404, headers: corsHeaders });
      }

      const resetToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1時間有効

      await env.DB.prepare(
        "UPDATE users SET verify_token = ?, token_expires_at = ? WHERE id = ?"
      ).bind(resetToken, expiresAt, user.id).run();

      // ハッシュ（#）付きの再設定リンクを生成
      const resetLink = `${url.origin}/#token=${resetToken}`;

      // メール送信処理（Resend API 対応）
      if (env.RESEND_API_KEY) {
        try {
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'ぽっカフェ <noreply@pokkapoka.net>',
              to: [email.trim()],
              subject: '【ぽっカフェ】パスワード再設定のご案内',
              text: `${user.name}様\n\nいつもぽっカフェをご利用いただきありがとうございます。\n以下のリンクから新しいパスワードを設定してください。\n\n${resetLink}`
            })
          });

          if (!resendRes.ok) {
            console.error("Resend API エラー:", await resendRes.text());
          }
        } catch (mailErr) {
          console.error("Resendパスワードリセット送信エラー:", mailErr);
        }
      } else {
        console.warn("env.RESEND_API_KEY が見つかりません。");
      }

      return new Response(JSON.stringify({ success: true, message: "再設定メールを送信しました。" }), { headers: corsHeaders });
    }

    // ---------------------------------------------------------
    // 5. パスワードリセット実行 (POST /api/auth/reset-password)
    // ---------------------------------------------------------
    if (path === '/api/auth/reset-password' && method === 'POST') {
      const { token, newPassword } = await request.json();

      if (!token || !newPassword) {
        return new Response(JSON.stringify({ success: false, message: "データが不足しています。" }), { status: 400, headers: corsHeaders });
      }

      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE verify_token = ? AND status = 'active'"
      ).bind(token).first();

      if (!user || new Date().toISOString() > user.token_expires_at) {
        return new Response(JSON.stringify({ success: false, message: "無効なトークンか、有効期限が切れています。" }), { status: 400, headers: corsHeaders });
      }

      // 新パスワードハッシュ化
      const msgUint8 = new TextEncoder().encode(newPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await env.DB.prepare(
        "UPDATE users SET password_hash = ?, verify_token = NULL, token_expires_at = NULL WHERE id = ?"
      ).bind(passwordHash, user.id).run();

      return new Response(JSON.stringify({ success: true, message: "パスワードを更新しました。" }), { headers: corsHeaders });
    }

    // ---------------------------------------------------------
    // 6. メニュー取得・詳細用エンドポイント (GET /api/menus)
    // ---------------------------------------------------------
    if (path === '/api/menus' && method === 'GET') {
      if (!env.DB || !env.SQUARE_ACCESS_TOKEN) {
        return new Response(JSON.stringify({ error: "Bindings missing" }), { status: 500, headers: corsHeaders });
      }

      const searchDate = url.searchParams.get('date');
      const squareItemId = url.searchParams.get('square_item_id'); // 詳細取得用（親商品のITEM ID）

      // =========================================================
      // 【パターンA】特定のSquareアイテムの詳細（バリエーション・オプション）を取得
      // =========================================================
      if (squareItemId) {
        try {
          // 1. Squareのカタログオブジェクト（親商品）をリアルタイム取得
          const squareRes = await fetch(`https://connect.squareup.com/v2/catalog/object/${squareItemId}?include_related_objects=true`, {
            method: 'GET',
            headers: {
              'Square-Version': '2026-05-20', // 本番環境のバージョンに合わせて調整してください
              'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          if (!squareRes.ok) {
            return new Response(JSON.stringify({ success: false, message: "Squareからの商品取得に失敗" }), { status: 400, headers: corsHeaders });
          }

          const squareData = await squareRes.json();
          const item = squareData.object.item_data;
          const related = squareData.related_objects || [];

          // 2. アプリDB（menu_variations）から、この商品の全バリエーションの在庫数と表示フラグを取得
          const { results: dbVariations } = await env.DB.prepare(`
            SELECT square_variation_id, remaining, is_visible 
            FROM menu_variations 
            WHERE menu_id = (SELECT id FROM menus WHERE square_item_id = ?)
          `).bind(squareItemId).all();

          // 扱いやすいようにMap化（キー: SquareバリエーションID）
          const dbVarMap = new Map((dbVariations || []).map(v => [v.square_variation_id, v]));

          // 3. Squareのバリエーション情報に、アプリDBの「在庫数」「表示状態」をマージ
          const variations = (item.variations || []).map(v => {
            const dbInfo = dbVarMap.get(v.id) || { remaining: 0, is_visible: 0 }; // DBに未登録なら非表示扱い
            const rawPrice = v.item_variation_data.price_money ? Number(v.item_variation_data.price_money.amount) : 0;

            return {
              id: v.id, // square_variation_id
              name: v.item_variation_data.name === 'Regular' ? '通常' : v.item_variation_data.name,
              price: rawPrice,
              remaining: dbInfo.remaining,  // バリエーション単位の在庫
              is_visible: dbInfo.is_visible // バリエーション単位の表示フラグ
            };
          }).filter(v => v.is_visible === 1); // 一般画面向けなので、非表示(0)のバリエーションは除外

          const result = {
            id: squareData.object.id, // square_item_id
            name: item.name,
            description: item.description || '',
            variations: variations, // 有効なバリエーションのみ
            // オプション（トッピングなど）
            options: related
              .filter(obj => obj.type === "MODIFIER_LIST")
              .map(modList => ({
                id: modList.id,
                max_selected_modifiers: item.modifier_list_info[0].max_selected_modifiers === -1 ? related.filter(obj => obj.type === "MODIFIER_LIST")[0].modifier_list_data.max_selected_modifiers : item.modifier_list_info[0].max_selected_modifiers,
                name: modList.modifier_list_data.name,
                modifiers: (modList.modifier_list_data.modifiers || []).map(m => ({
                  id: m.id,
                  name: m.modifier_data.name,
                  price: m.modifier_data.price_money ? Number(m.modifier_data.price_money.amount) : 0
                }))
              }))
          };

          return new Response(JSON.stringify({ success: true, item: result }), { headers: corsHeaders });

        } catch (err) {
          return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
        }
      }

      // =========================================================
      // 【パターンB】メニュー一覧をすべて取得
      // =========================================================
      try {
        // 表示ON(1)かつ在庫が1以上あるバリエーションを最低1つ持っている親商品（menus）だけを取得
        const { results: menus } = await env.DB.prepare(`
          SELECT DISTINCT m.id, m.square_item_id, m.available_days
          FROM menus m
          JOIN menu_variations mv ON m.id = mv.menu_id
          WHERE mv.is_visible = 1 AND mv.remaining > 0
          ORDER BY m.sort_order ASC, m.id ASC
        `).all();

        const fullMenus = [];

        for (const m of (menus || [])) {
          try {
            // 画像情報を関連オブジェクト（include_related_objects=true）として一緒に取得する
            const sqRes = await fetch(`https://connect.squareup.com/v2/catalog/object/${m.square_item_id}?include_related_objects=true`, {
              method: 'GET',
              headers: {
                'Square-Version': '2026-05-20', // 本番環境のバージョンに合わせて調整してください
                'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (sqRes.ok) {
              const sqData = await sqRes.json();
              const itemData = sqData.object.item_data;
              const squareVariations = itemData.variations || [];
              const relatedObjects = sqData.related_objects || [];

              // --- [追加分] Squareの商品画像URLを取得するロジック ---
              let imageUrl = '';
              if (itemData.image_ids && itemData.image_ids.length > 0) {
                const firstImageId = itemData.image_ids[0];
                // 関連オブジェクトの中から該当するIMAGEタイプを探索
                const imgObj = relatedObjects.find(obj => obj.type === 'IMAGE' && obj.id === firstImageId);
                if (imgObj && imgObj.image_data) {
                  imageUrl = imgObj.image_data.url; // Squareにホストされている画像URL
                }
              }
              // -----------------------------------------------------

              // この親商品に紐づく、表示ON・在庫ありバリエーションのID一覧をDBから取得
              const { results: activeVars } = await env.DB.prepare(`
                SELECT square_variation_id 
                FROM menu_variations 
                WHERE menu_id = ? AND is_visible = 1 AND remaining > 0
              `).bind(m.id).all();

              const activeVarIds = new Set((activeVars || []).map(av => av.square_variation_id));

              // 販売可能なバリエーションの中から「最安値」を算出
              let minPrice = Infinity;
              squareVariations.forEach(v => {
                if (activeVarIds.has(v.id) && v.item_variation_data?.price_money) {
                  const amt = Number(v.item_variation_data.price_money.amount);
                  if (amt < minPrice) minPrice = amt;
                }
              });

              if (minPrice === Infinity) continue; // 有効なバリエーションがなければスキップ

              fullMenus.push({
                id: m.id,
                square_item_id: m.square_item_id,
                name: itemData.name,
                description: itemData.description || '',
                price: minPrice, 
                image_url: imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80', // 画像がない場合のプレースホルダー
                available_days: m.available_days
              });
            }
          } catch(e) {
            console.error(e);
          }
        }

        return new Response(JSON.stringify(fullMenus), { headers: corsHeaders });

      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, error: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 7. 管理者用：顧客リスト取得 (GET /api/admin/customers)
    // ---------------------------------------------------------
    if (path === '/api/admin/customers' && method === 'GET') {
      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, message: "データベースのバインドが見つかりません。" }), { status: 500, headers: corsHeaders });
      }

      try {
        // usersテーブルから、代理注文の選択肢として必要な情報を取得
        // ※ フロントが求めるキー名 (square_customer_id, name, email) にカラム名を合わせています
        // ※ 本登録完了しているアクティブなユーザーのみを名前順（昇順）で取得します
        const { results } = await env.DB.prepare(`
          SELECT 
            square_customer_id, 
            name, 
            email 
          FROM users 
          WHERE status = 'active'
          ORDER BY name ASC
        `).all();

        // 取得した配列データをそのままフロントに返却
        return new Response(JSON.stringify(results || []), { 
          headers: corsHeaders 
        });

      } catch (dbErr) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: `D1からの顧客リスト取得に失敗しました: ${dbErr.message}` 
        }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 管理者用：編集用顧客リスト取得 (GET /api/admin/customers/edit)
    // ---------------------------------------------------------
    if (path === '/api/admin/customers/edit' && method === 'GET') {
      try {
        const users = await env.DB.prepare(`
          SELECT id, name, email, tel, status, created_at, 
          CASE WHEN (SELECT COUNT(*) FROM orders WHERE orders.customer_id = users.id) > 0 THEN 1 ELSE 0 END as has_orders 
          FROM users ORDER BY id DESC
        `).all();
        return new Response(JSON.stringify({ success: true, customers: users.results || [] }), { headers: corsHeaders });
      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, message: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 管理者用：代理入力用顧客の追加 (POST /api/admin/customers/add)
    // ---------------------------------------------------------
    if (path === '/api/admin/customers/add' && method === 'POST') {
      const { name, tel } = await request.json();

      if (!name || !tel) {
        return new Response(JSON.stringify({ success: false, message: "顧客名と電話番号は必須です。" }), { status: 400, headers: corsHeaders });
      }

      try {
        // 1. 顧客名と電話番号で重複チェック
        const exists = await env.DB.prepare(`
          SELECT id FROM users WHERE name = ? AND tel = ?
        `).bind(name, tel).first();

        if (exists) {
          return new Response(JSON.stringify({ success: false, message: "この顧客名と電話番号の組み合わせは既に登録されています。" }), { status: 400, headers: corsHeaders });
        }

        let squareCustomerId = null;

        // Squareレジ連携
        try {
          // 電話番号の整形
          let formattedTel = undefined;
          if (tel) {
            const cleanedTel = tel.trim().replace(/[-()\s]/g, '');
            if (cleanedTel.startsWith('0')) {
              formattedTel = '+81' + cleanedTel.substring(1);
            } else {
              formattedTel = cleanedTel;
            }
          }

          // 1. Squareから全顧客データをページネーションで全件取得
          let allCustomers = [];
          let cursor = undefined;
          let hasMore = true;

          try {
            while (hasMore) {
              const bodyPayload = {};
              if (cursor) {
                bodyPayload.cursor = cursor; // 次のページがある場合はカーソルを指定
              }

              const listRes = await fetch('https://connect.squareup.com/v2/customers/search', {
                method: 'POST',
                headers: {
                  'Square-Version': '2026-05-20', // 本番環境のバージョンに合わせて調整してください
                  'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(bodyPayload) // 空、またはcursorのみを指定すると全件取得の動きになります
              });

              if (!listRes.ok) {
                const errText = await listRes.text();
                return new Response(JSON.stringify({ success: false, message: `Square顧客データの全件取得に失敗: ${errText}` }), { status: 400, headers: corsHeaders });
              }

              const listData = await listRes.json();
              if (listData.customers) {
                allCustomers = allCustomers.concat(listData.customers);
              }

              // 次のページがあるか確認
              if (listData.cursor) {
                cursor = listData.cursor;
              } else {
                hasMore = false;
              }
            }
          } catch (error) {
            return new Response(JSON.stringify({ success: false, message: `通信エラー: ${error.message}` }), { status: 500, headers: corsHeaders });
          }

          // 2. メモリ上で「電話番号」と「名前」の一致フィルタリングを実行
          if (allCustomers.length > 0) {
            const searchName = name ? name.replace(/\s+/g, "").toLowerCase() : "";

            const matchedCustomer = allCustomers.find(customer => {
              // 電話番号の比較（存在する場合のみ一致確認）
              const matchTel = formattedTel ? (customer.phone_number === formattedTel) : true;

              // 名前の比較（given_name や family_name を結合してスペースを除去して比較）
              // ※Square側は given_name と family_name が分かれているため、結合して判定するのが安全です
              const customerGiven = customer.given_name || "";
              const customerFamily = customer.family_name || "";
              const customerFullName = `${customerFamily}${customerGiven}`.replace(/\s+/g, "").toLowerCase();
              
              const matchName = searchName ? (customerFullName.includes(searchName) || searchName.includes(customerFullName)) : true;

              // 電話番号と名前の両方が指定されている場合は「両方一致」、片方なら「片方一致」で判定
              if (formattedTel && searchName) {
                return matchTel && matchName;
              } else if (formattedTel) {
                return matchTel;
              } else if (searchName) {
                return matchName;
              }
              return false;
            });

            if (matchedCustomer) {
              squareCustomerId = matchedCustomer.id;
              console.log("既存のSquare顧客IDを取得(全件走査フィルタ):", squareCustomerId);
            }
          }

          // 3. Squareに存在しなかった場合のみ新規作成
          if (!squareCustomerId) {
            const createRes = await fetch('https://connect.squareup.com/v2/customers', {
              method: 'POST',
              headers: headers,
              body: JSON.stringify({
                given_name: name.trim(),
                phone_number: formattedTel
              })
            });

            if (createRes.ok) {
              const createData = await createRes.json();
              squareCustomerId = createData.customer.id;
              console.log("新規Square顧客を作成:", squareCustomerId);
            } else {
              const createErrText = await createRes.text();
              return new Response(JSON.stringify({ success: false, message: `Square作成に失敗: ${createErrText}` }), { status: 400, headers: corsHeaders });
            }
          }            
        } catch(e) { 
          console.error("Square Customer Sync Error", e);
          return new Response(JSON.stringify({ success: false, message: `Square通信に失敗しました: ${e.message}` }), { status: 500, headers: corsHeaders });
        }

        // 4. アプリDBに登録（取得した squareCustomerId を確実にバインドする）
        await env.DB.prepare(`
          INSERT INTO users (name, email, tel, password_hash, square_customer_id, status)
          VALUES (?, null, ?, '', ?, 'active')
        `).bind(name.trim(), tel.trim(), squareCustomerId).run();

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, message: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 管理者用：顧客情報の削除 (POST /api/admin/customers/delete)
    // ---------------------------------------------------------
    if (path === '/api/admin/customers/delete' && method === 'POST') {
      const { customer_id } = await request.json();
      try {
        const orderCount = await env.DB.prepare(`
          SELECT COUNT(*) as count FROM orders WHERE customer_id = ?
        `).bind(customer_id).first('count');

        if (orderCount > 0) {
          return new Response(JSON.stringify({ success: false, message: "この顧客は過去に注文履歴があるため削除できません。ステータスを停止する等で対応してください。" }), { status: 400, headers: corsHeaders });
        }
        
        await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(customer_id).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, message: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 管理者用：メニュー＆バリエーション階層一覧取得 (GET /api/admin/menus)
    // ---------------------------------------------------------
    if (path === '/api/admin/menus' && method === 'GET') {
      try {
        // 親商品を sort_order 順に取得
        const menus = await env.DB.prepare(`
          SELECT * FROM menus ORDER BY sort_order ASC, id ASC
        `).all();

        const menuList = menus.results || [];

        // 各親商品に紐づくバリエーションを取得してマージ
        for (let menu of menuList) {
          const vars = await env.DB.prepare(`
            SELECT * FROM menu_variations WHERE menu_id = ? ORDER BY id ASC
          `).bind(menu.id).all();
          menu.variations = vars.results || [];
        }

        return new Response(JSON.stringify({ success: true, menus: menuList }), { headers: corsHeaders });
      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, message: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 管理者用：ITEM（親商品）の並び順更新 (POST /api/admin/menus/update-order)
    // ---------------------------------------------------------
    if (path === '/api/admin/menus/update-order' && method === 'POST') {
      const { orders } = await request.json(); // orders: [{ id: 1, sort_order: 0 }, { id: 2, sort_order: 1 }]
      try {
        const statements = orders.map(item => {
          return env.DB.prepare("UPDATE menus SET sort_order = ? WHERE id = ?").bind(item.sort_order, item.id);
        });
        await env.DB.batch(statements);
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, message: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 【追加】管理者用：メニュー単位の曜日限定設定更新 (PUT /api/admin/menus/:id/available-days)
    // ---------------------------------------------------------
    // URLパスが "/api/admin/menus/数字/available-days" のパターンに一致するか判定
    const availableDaysMatch = path.match(/^\/api\/admin\/menus\/(\d+)\/available-days$/);
    if (availableDaysMatch && method === 'PUT') {
      const menuId = availableDaysMatch[1]; // URLからmenu_idを抽出
      try {
        const { available_days } = await request.json();

        if (available_days === undefined) {
          return new Response(JSON.stringify({ success: false, message: "設定データが不足しています。" }), { status: 400, headers: corsHeaders });
        }

        if (!env.DB) {
          return new Response(JSON.stringify({ success: false, message: "データベースのバインドが見つかりません。" }), { status: 500, headers: corsHeaders });
        }

        // menus テーブルの available_days カラムに JSON文字列（例: '["1","3"]'）を保存
        await env.DB.prepare(`
          UPDATE menus 
          SET available_days = ? 
          WHERE id = ?
        `).bind(available_days, menuId).run();

        return new Response(JSON.stringify({ success: true, message: "曜日限定設定を更新しました。" }), { headers: corsHeaders });
      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, message: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 管理者用：既存ITEMのSquare商品マッピング変更 (POST /api/admin/menus/change-item)
    // ---------------------------------------------------------
    if (path === '/api/admin/menus/change-item' && method === 'POST') {
      const { menu_id, square_item_id, name, available_days, variations } = await request.json();
      try {
        // 1. 親情報の更新
        await env.DB.prepare(`
          UPDATE menus SET square_item_id = ?, name = ?, available_days = ? WHERE id = ?
        `).bind(square_item_id, name, available_days ?? '[]', menu_id).run();

        // 2. 旧バリエーションの削除
        await env.DB.prepare(`DELETE FROM menu_variations WHERE menu_id = ?`).bind(menu_id).run();

        // 3. 新バリエーションの挿入
        for (const v of variations) {
          await env.DB.prepare(`
            INSERT INTO menu_variations (menu_id, square_variation_id, name, price, remaining, is_visible)
            VALUES (?, ?, ?, ?, ?, 1)
          `).bind(menu_id, v.square_variation_id, v.name, v.price, v.remaining || 0).run();
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, message: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 管理者用：新規ITEM追加 (POST /api/admin/menus/add-item)
    // ---------------------------------------------------------
    if (path === '/api/admin/menus/add-item' && method === 'POST') {
      const { square_item_id, name, variations } = await request.json();
      try {
        // 現在の最大 sort_order を取得
        const maxOrderRow = await env.DB.prepare("SELECT MAX(sort_order) as max_order FROM menus").first();
        const nextOrder = (maxOrderRow?.max_order || 0) + 1;

        // 親商品の追加
        const result = await env.DB.prepare(`
          INSERT INTO menus (square_item_id, name, sort_order) VALUES (?, ?, ?)
        `).bind(square_item_id, name, nextOrder).run();
        
        const menuId = result.meta.last_row_id;

        // バリエーションの追加
        for (const v of variations) {
          await env.DB.prepare(`
            INSERT INTO menu_variations (menu_id, square_variation_id, name, price, remaining, is_visible)
            VALUES (?, ?, ?, ?, ?, 1)
          `).bind(menuId, v.square_variation_id, v.name, v.price, v.remaining || 0).run();
        }

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, message: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 管理者用：バリエーション単位の在庫・表示更新 (POST /api/admin/menus/update-variation)
    // ---------------------------------------------------------
    if (path === '/api/admin/menus/update-variation' && method === 'POST') {
      const { variation_id, remaining, is_visible } = await request.json();
      try {
        await env.DB.prepare(`
          UPDATE menu_variations 
          SET remaining = ?, is_visible = ? 
          WHERE id = ?
        `).bind(remaining, is_visible, variation_id).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, message: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 管理者用：Squareカタログ取得 ＆ 登録済み商品の除外
    // ---------------------------------------------------------
    if (path === '/api/admin/square-catalog' && method === 'GET') {
      try {
        // 1. Square APIからカタログオブジェクト(ITEM)を取得するダミーまたは実際の通信
        // ※実際には env.SQUARE_ACCESS_TOKEN 等を使い Square API (https://connect.squareup.com/v2/catalog/list?types=ITEM) を叩きます
        // ここではSquare APIから戻ってきた生データ（想定）の配列を `allSquareItems` とします。
        
        // 実際のSquare API呼び出し例:
        const squareResponse = await fetch('https://connect.squareup.com/v2/catalog/list?types=ITEM', {
          method: 'GET',
          headers: {
            'Square-Version': '2026-05-20', // 本番環境のバージョンに合わせて調整してください
            'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        const squareData = await squareResponse.json();
        const allSquareItems = (squareData.objects || []).map(obj => ({
          id: obj.id,
          name: obj.item_data.name,
          variations: (obj.item_data.variations || []).map(v => ({
            id: v.id,
            name: v.item_variation_data.name,
            price: v.item_variation_data.price_money ? v.item_variation_data.price_money.amount : 0
          }))
        }));
        

        /* // テスト・検証用のモックデータ構造例（本番環境に合わせて適宜マッピングしてください）
        const allSquareItems = [
          { id: "ITEM_COFFEE_001", name: "ブレンドコーヒー", variations: [{ id: "VAR_REG_01", name: "レギュラー", price: 400 }, { id: "VAR_LRG_01", name: "Lサイズ", price: 500 }] },
          { id: "ITEM_LATTE_002", name: "カフェラテ", variations: [{ id: "VAR_REG_02", name: "レギュラー", price: 450 }] },
          { id: "ITEM_TEA_003", name: "和紅茶", variations: [{ id: "VAR_REG_03", name: "レギュラー", price: 380 }] },
          { id: "ITEM_COOKIE_004", name: "手作りクッキー", variations: [{ id: "VAR_REG_04", name: "1枚", price: 150 }] }
        ];
        */

        // 2. アプリのDB（menusテーブル）から、既に登録されている square_item_id の一覧を取得
        const registeredMenus = await env.DB.prepare(`
          SELECT square_item_id FROM menus
        `).all();
        
        // 登録済みIDのSetを作成（検索を高速化するため）
        const registeredIds = new Set((registeredMenus.results || []).map(m => m.square_item_id));

        // 3. すでに登録されているものを除外（フィルタリング）
        const unRegisteredItems = allSquareItems.filter(item => !registeredIds.has(item.id));

        return new Response(JSON.stringify({ 
          success: true, 
          items: unRegisteredItems 
        }), { headers: corsHeaders });

      } catch (dbErr) {
        return new Response(JSON.stringify({ success: false, message: dbErr.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================
    // 【新設】共有在庫グループ一覧の取得 (GET /api/admin/stock-groups)
    // =========================================================
    if (path === '/api/admin/stock-groups' && method === 'GET') {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM menu_stock_groups").all();
        return new Response(JSON.stringify({ success: true, groups: results || [] }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================
    // 【新設】共有在庫グループの作成・更新 (POST /api/admin/stock-groups)
    // =========================================================
    if (path === '/api/admin/stock-groups' && method === 'POST') {
      try {
        const { id, name, remaining } = await request.json();

        if (!name || remaining === undefined) {
          return new Response(JSON.stringify({ success: false, message: "必要なパラメータが不足しています。" }), { status: 400, headers: corsHeaders });
        }

        if (id) {
          // 更新
          await env.DB.prepare(`
            UPDATE menu_stock_groups SET name = ?, remaining = ? WHERE id = ?
          `).bind(name, remaining, id).run();
          return new Response(JSON.stringify({ success: true, message: "共有在庫を更新しました。" }), { headers: corsHeaders });
        } else {
          // 新規作成
          await env.DB.prepare(`
            INSERT INTO menu_stock_groups (name, remaining) VALUES (?, ?)
          `).bind(name, remaining).run();
          return new Response(JSON.stringify({ success: true, message: "共有在庫を作成しました。" }), { headers: corsHeaders });
        }
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================
    // 【新設】バリエーションの在庫管理紐付け更新 (POST /api/admin/variations/stock-type)
    // =========================================================
    if (path === '/api/admin/variations/stock-type' && method === 'POST') {
      try {
        const { variationId, stockGroupId } = await request.json(); // stockGroupIdがnullの場合は単独在庫

        if (!variationId) {
          return new Response(JSON.stringify({ success: false, message: "バリエーションIDが不足しています。" }), { status: 400, headers: corsHeaders });
        }

        await env.DB.prepare(`
          UPDATE menu_variations SET stock_group_id = ? WHERE id = ?
        `).bind(stockGroupId, variationId).run();

        return new Response(JSON.stringify({ success: true, message: "在庫紐付けを更新しました。" }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================
    // 【新設】当日統計情報の取得 (GET /api/admin/daily-stats?date=YYYY-MM-DD)
    // =========================================================
    if (path === '/api/admin/daily-stats' && method === 'GET') {
      try {
        const url = new URL(request.url);
        const targetDate = url.searchParams.get('date'); // 例: "2026-06-18"
        if (!targetDate) {
          return new Response(JSON.stringify({ success: false, message: "日付が指定されていません。" }), { status: 400, headers: corsHeaders });
        }

        // 1. メニューとバリエーション、および当日変更値（結合）の取得
        const { results: items } = await env.DB.prepare(`
          SELECT 
            m.id as menu_id, m.square_item_id, m.available_days,
            mv.square_variation_id as variation_id, m.name as item_name, mv.name as variation_name, mv.remaining as default_quantity,
            mv.stock_group_id, msg.remaining as shared_quantity, dma.adjusted_quantity
          FROM menu_variations mv
          INNER JOIN menus m ON mv.menu_id = m.id
          LEFT JOIN menu_stock_groups msg ON mv.stock_group_id = msg.id
          LEFT JOIN daily_manufacture_adjustments dma 
            ON mv.square_variation_id = dma.menu_variation_id AND dma.target_date = ?
          WHERE mv.is_visible = 1
        `).bind(targetDate).all();

        // 2. 予約システムからの予約数集計（例: orders / order_items テーブルがある想定）
        const { results: reservations } = await env.DB.prepare(`
          SELECT oi.variation_id as menu_variation_id, SUM(oi.quantity) as reserved_count, IFNULL(SUM(oir.quantity), 0) as pickup_count
          FROM order_items oi
          INNER JOIN orders o ON oi.order_id = o.id
  				LEFT JOIN order_items oir ON oi.id = oir.id AND o.received_status = 1
          WHERE o.delivery_date = ? AND IFNULL(o.status, '') != 'canceled' AND IFNULL(oi.status, '') != 'canceled' AND IFNULL(oir.status, '') != 'canceled'
          GROUP BY oi.variation_id
        `).bind(targetDate).all();
        
        const reservationMap = new Map(reservations.map(r => [r.menu_variation_id, r.reserved_count]));

        const pickupMap = new Map(reservations.map(r => [r.menu_variation_id, r.pickup_count]));

        const squareSalesMap = new Map();

        // 3. Square API から当日のレジ販売数をリアルタイム取得
        // Squareのアクセストークンや環境変数が設定されている場合のみ実行
        if (env.SQUARE_ACCESS_TOKEN) {
          try {
            // 指定日（日本時間）の開始時刻と終了時刻を ISO 8601 形式（UTC）に変換
            // 例: "2026-06-19" -> 開始 "2026-06-18T15:00:00Z" / 終了 "2026-06-19T15:00:00Z"
            const startOfDay = new Date(`${targetDate}T00:00:00+09:00`).toISOString();
            const endOfDay = new Date(`${targetDate}T23:59:59+09:00`).toISOString();

            const squareResponse = await fetch(`https://connect.squareup.com/v2/orders/search`, {
              method: 'POST',
              headers: {
                'Square-Version': '2026-05-20', // 本番環境のバージョンに合わせて調整してください
                'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                location_ids: [env.SQUARE_LOCATION_ID], // 環境変数から店舗IDを指定
                query: {
                  filter: {
                    state_filter: { states: ["COMPLETED"] }, // 完了済みの売上のみ
                    date_time_filter: {
                      closed_at: { start_at: startOfDay, end_at: endOfDay } // 指定日に決済されたもの
                    }
                  },
                  sort: { sort_field: "CLOSED_AT", sort_order: "DESC" }
                },
                return_entries: false
              })
            });

            if (squareResponse.ok) {
              const squareData = await squareResponse.json();
              const orders = squareData.orders || [];

              // 注文データから商品（Line Items）を取り出して集計
              orders.forEach(order => {
                if (order.line_items) {
                  order.line_items.forEach(item => {
                    // Squareの商品バリエーションID（カタログオブジェクトID）を取得
                    const catalogId = item.catalog_object_id;
                    const quantity = parseInt(item.quantity, 10) || 0;

                    if (catalogId) {
                      const currentQty = squareSalesMap.get(catalogId) || 0;
                      squareSalesMap.set(catalogId, currentQty + quantity);
                    }
                  });
                }
              });
            } else {
              console.error("Square API Error:", await squareResponse.text());
            }
          } catch (squareErr) {
            console.error("Square通信例外エラー:", squareErr);
            // Square APIが落ちていてもシステム全体を止めないよう、エラーはキャッチしてスルーします
          }
        }

        // 4. フロントエンド向けにデータを整形
        const stats = items.map(item => {
          const manufactureCount = item.adjusted_quantity !== null ? item.adjusted_quantity : item.stock_group_id !== null ? item.shared_quantity : item.default_quantity;
          const reservedCount = reservationMap.get(item.variation_id) || 0;
          const squareSalesCount = squareSalesMap.get(item.variation_id) || 0;
          const pickupCount = pickupMap.get(item.variation_id) || 0;
          let cnt = 0;
          if(item.stock_group_id !== null) {
            items
              .filter(i => i.stock_group_id === item.stock_group_id)
              .forEach(x => {
                const reservedCount = reservationMap.get(x.variation_id) || 0;
                const squareSalesCount = squareSalesMap.get(x.variation_id) || 0;
                const pickupCount = pickupMap.get(x.variation_id) || 0;
                cnt += (reservedCount + squareSalesCount - pickupCount);
              });
          } else {
            cnt = reservedCount + squareSalesCount - pickupCount;
          }
          
          // 残り数 = 製造個数 - 予約数 - （レジ売上数 - ピックアップ済み数）
          const remainingCount = manufactureCount - cnt;

          return {
            menuId: item.menu_id,
            variationId: item.variation_id,
            itemName: item.item_name + " (" + item.variation_name + ")",
            availableDays: item.available_days,
            isAdjusted: item.adjusted_quantity !== null, // 変更済みフラグ
            isOriginal: item.adjusted_quantity === (item.stock_group_id !== null ? item.shared_quantity : item.default_quantity), // 変更前に戻るフラグ
            manufactureCount,
            reservedCount,
            inStoreSalesCount:squareSalesCount - pickupCount,
            remainingCount,
            stockGroupId: item.stock_group_id
          };
        });

        return new Response(JSON.stringify({ success: true, stats }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================
    // 【新設】当日製造個数の変更保存 (POST /api/admin/daily-stats/adjust)
    // =========================================================
    if (path === '/api/admin/daily-stats/adjust' && method === 'POST') {
      try {
        const { targetDate, variationId, quantity } = await request.json();

        if (!targetDate || !variationId || quantity === undefined) {
          return new Response(JSON.stringify({ success: false, message: "必要なパラメータが不足しています。" }), { status: 400, headers: corsHeaders });
        }

        const item = await env.DB.prepare(`
          SELECT stock_group_id FROM menu_variations WHERE square_variation_id = ?
        `).bind(variationId).first();

        if (item && item.stock_group_id) {
          // 💡 共有在庫の場合：同じグループに属するすべてのバリエーションのIDを取得する
          const { results: siblings } = await env.DB.prepare(`
            SELECT square_variation_id FROM menu_variations WHERE stock_group_id = ?
          `).bind(item.stock_group_id).all();

          // グループ全体のバリエーションに同一の数量を反映（ON CONFLICTは当初の定義通り menu_variation_id を使用）
          const statements = siblings.map(sibling => {
            return env.DB.prepare(`
              INSERT INTO daily_manufacture_adjustments (target_date, menu_variation_id, adjusted_quantity)
              VALUES (?, ?, ?)
              ON CONFLICT(target_date, menu_variation_id) DO UPDATE SET 
              adjusted_quantity = excluded.adjusted_quantity
            `).bind(targetDate, sibling.square_variation_id, quantity);
          });
          
          // D1のバッチ処理で高速・安全に一括更新
          await env.DB.batch(statements);

        } else {
          // 💡 単独在庫の場合：対象のバリエーションのみを更新
          await env.DB.prepare(`
            INSERT INTO daily_manufacture_adjustments (target_date, menu_variation_id, adjusted_quantity)
            VALUES (?, ?, ?)
            ON CONFLICT(target_date, menu_variation_id) DO UPDATE SET 
            adjusted_quantity = excluded.adjusted_quantity
          `).bind(targetDate, variationId, quantity).run();
        }
        return new Response(JSON.stringify({ success: true, message: "当日の製造個数を更新しました。" }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================
    // 【新設】管理者用：指定日の注文受領リスト取得 (GET /api/admin/reception-list)
    // =========================================================
    if (path === '/api/admin/reception-list' && method === 'GET') {
      try {
        const targetDate = url.searchParams.get('date');
        if (!targetDate) {
          return new Response(JSON.stringify({ success: false, message: "日付が指定されていません。" }), { status: 400, headers: corsHeaders });
        }

        // 指定日の注文基本情報（注文者名など）を全件取得
        const { results: orders } = await env.DB.prepare(`
          SELECT id, customer_name, total_amount, received_status 
          FROM orders 
          WHERE delivery_date = ? AND IFNULL(status, '') != 'canceled'
          ORDER BY id DESC
        `).bind(targetDate).all();

        // 指定日のすべての注文明細を取得
        const { results: items } = await env.DB.prepare(`
          SELECT oi.id, oi.order_id, m.name as menu_name, mv.name as variation_name, oi.quantity
          FROM order_items oi
          INNER JOIN menu_variations mv ON oi.variation_id = mv.square_variation_id
          INNER JOIN menus m ON mv.menu_id = m.id
          INNER JOIN orders o ON oi.order_id = o.id
          WHERE o.delivery_date = ? AND IFNULL(o.status, '') != 'canceled' AND IFNULL(oi.status, '') != 'canceled'
        `).bind(targetDate).all();

        const { results: modifiers } = await env.DB.prepare(`
          SELECT oi.id, oim.modifier_name
          FROM order_item_modifiers oim
          INNER JOIN order_items oi ON oim.order_item_id = oi.id
          INNER JOIN orders o ON oi.order_id = o.id
          WHERE o.delivery_date = ? AND IFNULL(o.status, '') != 'canceled' AND IFNULL(oi.status, '') != 'canceled'
        `).bind(targetDate).all();

        // 注文ごとに明細アイテムをグルーピング
        const list = orders.map(order => {
          const orderItems = items.filter(item => item.order_id === order.id).map(item => {
            const itemModifiers = modifiers.filter(mod => mod.id === item.id).map(mod => mod.modifier_name).join(", ");
            return {
              name: `${item.menu_name} (${item.variation_name})` + (itemModifiers ? ` [${itemModifiers}]` : ""),
              quantity: item.quantity,
              modifiers: itemModifiers
            };
          });

          return {
            id: order.id,
            user_name: order.customer_name || "不明な顧客",
            total_price: order.total_amount,
            received_status: order.received_status || 0,
            items: orderItems
          };
        });

        return new Response(JSON.stringify({ success: true, list }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================
    // 【新設】管理者用：注文受領ステータスの更新 (POST /api/admin/reception-list/toggle)
    // =========================================================
    if (path === '/api/admin/reception-list/toggle' && method === 'POST') {
      try {
        const { orderId, status } = await request.json(); // status: 1(受領) または 0(未受領)

        if (!orderId || status === undefined) {
          return new Response(JSON.stringify({ success: false, message: "必要なパラメータが不足しています。" }), { status: 400, headers: corsHeaders });
        }

        await env.DB.prepare(`
          UPDATE orders SET received_status = ? WHERE id = ?
        `).bind(status, orderId).run();

        return new Response(JSON.stringify({ success: true, message: "受領ステータスを更新しました。" }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================
    // 【新設】注文画面用：ログインユーザーの今日以降の注文一覧取得 
    // (GET /api/orders/upcoming?userId=XXX)
    // =========================================================
    if (path === '/api/orders/upcoming' && method === 'GET') {
      try {
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return new Response(JSON.stringify({ success: false, message: "ユーザーIDが指定されていません。" }), { status: 400, headers: corsHeaders });
        }

        const now = new Date();
        const formatter = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
        });
        const [{ value: year }, , { value: month }, , { value: day }] = formatter.formatToParts(now);
        const todayStr = `${year}/${month}/${day}`;

        // 1. 今日以降で、かつ完全にキャンセル(Canceled)されていない注文を検索
        // 代理注文の場合も考慮し、customer_idが一致するものを取得
        const { results: orders } = await env.DB.prepare(`
          SELECT id, customer_name, delivery_date, total_amount, status 
          FROM orders 
          WHERE customer_id = ? AND delivery_date >= ? AND IFNULL(status, '') != 'Canceled'
          ORDER BY delivery_date ASC, id DESC
        `).bind(userId, todayStr).all();

        // 2. それらの注文に紐づく明細（こちらも個別にCanceledになっていないもの）を取得
        const { results: items } = await env.DB.prepare(`
          SELECT oi.id as order_item_id, oi.order_id, m.name as menu_name, mv.name as variation_name, oi.quantity, oi.unit_price, oi.variation_id
          FROM order_items oi
          INNER JOIN menu_variations mv ON oi.variation_id = mv.square_variation_id
          INNER JOIN menus m ON mv.menu_id = m.id
          INNER JOIN orders o ON oi.order_id = o.id
          WHERE o.customer_id = ? AND o.delivery_date >= ? AND IFNULL(o.status, '') != 'Canceled' AND IFNULL(oi.status, '') != 'Canceled'
        `).bind(userId, todayStr).all();

        const { results: modifiers } = await env.DB.prepare(`
          SELECT oi.id, oim.modifier_name
          FROM order_item_modifiers oim
          INNER JOIN order_items oi ON oim.order_item_id = oi.id
          INNER JOIN orders o ON oi.order_id = o.id
          WHERE o.customer_id = ? AND o.delivery_date >= ? AND IFNULL(o.status, '') != 'Canceled' AND IFNULL(oi.status, '') != 'Canceled'
        `).bind(userId, todayStr).all();

        // 3. 注文ごとに明細をマージしてレスポンス用に形成
        const list = orders.map(order => {
          const orderItems = items.filter(item => item.order_id === order.id).map(item => {
            const itemModifiers = modifiers.filter(mod => mod.id === item.id).map(mod => mod.modifier_name).join(", ");
            return {
              order_item_id: item.order_item_id,
              variation_id: item.variation_id,
              name: `${item.menu_name} (${item.variation_name})` + (itemModifiers ? ` [${itemModifiers}]` : ""),
              quantity: item.quantity,
              price: item.unit_price,
              modifiers: itemModifiers
            };
          });

          return {
            id: order.id,
            user_name: order.customer_name,
            delivery_date: order.delivery_date,
            total_price: order.total_price,
            items: orderItems
          };
        }).filter(order => order.items.length > 0); // 明細がすべて個別に消された注文は除外

        return new Response(JSON.stringify({ success: true, list }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================
    // 【新設】注文画面用：注文全体のキャンセル (POST /api/orders/cancel-entire)
    // =========================================================
    if (path === '/api/orders/cancel-entire' && method === 'POST') {
      try {
        const { orderId } = await request.json();
        if (!orderId) {
          return new Response(JSON.stringify({ success: false, message: "注文IDが不足しています。" }), { status: 400, headers: corsHeaders });
        }

        // トランザクション処理を擬似的にバッチで実行（親と明細の双方のstatusを 'Canceled' に変更）
        await env.DB.batch([
          env.DB.prepare("UPDATE orders SET status = 'Canceled' WHERE id = ?").bind(orderId),
          env.DB.prepare("UPDATE order_items SET status = 'Canceled' WHERE order_id = ?").bind(orderId)
        ]);

        return new Response(JSON.stringify({ success: true, message: "注文をすべてキャンセルしました。" }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // =========================================================
    // 【新設】注文画面用：注文内容の変更・一部アイテムのキャンセル (POST /api/orders/update-items)
    // =========================================================
    if (path === '/api/orders/update-items' && method === 'POST') {
      try {
        const { orderId, items } = await request.json(); // items: [{ order_item_id, quantity }]
        if (!orderId || !items || !Array.length) {
          return new Response(JSON.stringify({ success: false, message: "パラメータが不足しています。" }), { status: 400, headers: corsHeaders });
        }

        const statements = [];
        let newTotalPrice = 0;

        // 現在の注文明細情報を最新DBから取得し、単価を元に再計算する準備
        const { results: currentItems } = await env.DB.prepare(`
          SELECT id, price, quantity FROM order_items WHERE order_id = ? AND status != 'Canceled'
        `).bind(orderId).all();

        for (const current of currentItems) {
          // 送信されてきた変更データの中に一致する明細があるか探す
          const updateInfo = items.find(i => i.order_item_id === current.id);
          
          if (updateInfo) {
            const targetQty = parseInt(updateInfo.quantity, 10);
            if (targetQty <= 0) {
              // 💡 数量が0以下の場合は、この明細アイテムを個別にキャンセルする仕様
              statements.push(env.DB.prepare("UPDATE order_items SET quantity = 0, status = 'Canceled' WHERE id = ?").bind(current.id));
            } else {
              // 数量を変更
              statements.push(env.DB.prepare("UPDATE order_items SET quantity = ? WHERE id = ?").bind(targetQty, current.id));
              newTotalPrice += current.price * targetQty;
            }
          } else {
            // 変更指示が送られてこなかった既存明細はそのまま合算
            newTotalPrice += current.price * current.quantity;
          }
        }

        if (newTotalPrice === 0) {
          // すべてのアイテムの数量が0になった場合は注文全体をキャンセル扱いにする
          statements.push(env.DB.prepare("UPDATE orders SET total_price = 0, status = 'Canceled' WHERE id = ?").bind(orderId));
        } else {
          // 合計金額を上書き更新
          statements.push(env.DB.prepare("UPDATE orders SET total_price = ? WHERE id = ?").bind(newTotalPrice, orderId));
        }

        // 全クエリを一括実行
        await env.DB.batch(statements);

        return new Response(JSON.stringify({ success: true, message: "注文内容を更新しました。" }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // どのルートにも引っかからなかった場合 (404)
    return new Response(JSON.stringify({ error: "Not Found", path: path }), { status: 404, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}