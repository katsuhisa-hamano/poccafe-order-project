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
    // ---------------------------------------------------------
    // 1. 新規アカウント登録申請 (POST /api/auth/register)
    // ---------------------------------------------------------
    if (path === '/api/auth/register' && method === 'POST') {
      const { name, email, tel, password } = await request.json();

      if (!name || !email || !password) {
        return new Response(JSON.stringify({ success: false, message: "必須項目が不足しています。" }), { status: 400, headers: corsHeaders });
      }

      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, message: "データベース(DB)のバインドが見つかりません。Cloudflareの設定を確認してください。" }), { status: 500, headers: corsHeaders });
      }

      // ① 既にアプリ側のDBに登録（かつアクティブ）がないか確認
      const existingUser = await env.DB.prepare(
        "SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND status = 'active'"
      ).bind(email.trim()).first();

      if (existingUser) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "このメールアドレスは既に登録されています。" 
        }), { status: 409, headers: corsHeaders });
      }

      let squareCustomerId = null;
      const squareToken = env.SQUARE_ACCESS_TOKEN;

      // ② Squareレジ連携（通信エラーやバリデーションエラーを徹底捕捉）
      if (squareToken) {
        try {
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

          // Squareレジに同じメールアドレスの顧客がいるか検索
          const searchRes = await fetch('https://connect.squareup.com/v2/customers/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${squareToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query: { filter: { email_address: { exact: email.trim().toLowerCase() } } }
            })
          });

          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.customers && searchData.customers.length > 0) {
              squareCustomerId = searchData.customers[0].id;
              console.log("既存のSquare顧客IDを取得:", squareCustomerId);
            }
          } else {
            const searchErrText = await searchRes.text();
            // ★もし検索でコケていたら画面（レスポンス）に直接理由を返して処理を止めます
            return new Response(JSON.stringify({ success: false, message: `Square検索に失敗: ${searchErrText}` }), { status: 400, headers: corsHeaders });
          }

          // ③ Squareに存在しなかった場合のみ新規作成
          if (!squareCustomerId) {
            const createRes = await fetch('https://connect.squareup.com/v2/customers', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${squareToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                given_name: name.trim(),
                email_address: email.trim().toLowerCase(),
                phone_number: formattedTel // 整形した電話番号を渡す（空ならundefinedなので送信されない）
              })
            });

            if (createRes.ok) {
              const createData = await createRes.json();
              squareCustomerId = createData.customer.id;
              console.log("新規Square顧客を作成:", squareCustomerId);
            } else {
              const createErrText = await createRes.text();
              // ★もし作成でコケていたら、何が原因（例: 必須項目エラー、電話番号エラー等）か画面に出す
              return new Response(JSON.stringify({ success: false, message: `Square作成に失敗: ${createErrText}` }), { status: 400, headers: corsHeaders });
            }
          }
        } catch (sqErr) {
          return new Response(JSON.stringify({ success: false, message: `Square通信自体に失敗: ${sqErr.message}` }), { status: 500, headers: corsHeaders });
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
      await env.DB.prepare(`
        INSERT OR REPLACE INTO users (name, email, tel, password_hash, square_customer_id, status, verify_token, token_expires_at)
        VALUES (?, LOWER(?), ?, ?, ?, 'pending', ?, ?)
      `).bind(name.trim(), email.trim(), tel ? tel.trim() : null, passwordHash, squareCustomerId, verifyToken, expiresAt).run();

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
                name: modList.modifier_list_data.name,
                selection_type: modList.modifier_list_data.selection_type,
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
          SELECT DISTINCT m.id, m.square_item_id
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
              headers: { 'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}` }
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
                image_url: imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80' // 画像がない場合のプレースホルダー
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
          SELECT id FROM users WHERE name = ? OR tel = ?
        `).bind(name, tel).first();

        if (exists) {
          return new Response(JSON.stringify({ success: false, message: "この顧客名と電話番号の組み合わせは既に登録されています。" }), { status: 400, headers: corsHeaders });
        }

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
          let squareCustomerId = null;
          let allCustomers = [];
          let cursor = undefined;
          let hasMore = true;
          const headers = {
            'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          };

          try {
            while (hasMore) {
              const bodyPayload = {};
              if (cursor) {
                bodyPayload.cursor = cursor; // 次のページがある場合はカーソルを指定
              }

              const listRes = await fetch('https://connect.squareup.com/v2/customers/search', {
                method: 'POST',
                headers: headers,
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
          SELECT COUNT(*) as count FROM orders WHERE user_id = ?
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
    // 管理者用：既存ITEMのSquare商品マッピング変更 (POST /api/admin/menus/change-item)
    // ---------------------------------------------------------
    if (path === '/api/admin/menus/change-item' && method === 'POST') {
      const { menu_id, square_item_id, name, variations } = await request.json();
      try {
        // 1. 親情報の更新
        await env.DB.prepare(`
          UPDATE menus SET square_item_id = ?, name = ? WHERE id = ?
        `).bind(square_item_id, name, menu_id).run();

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
          headers: {
            'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
            'Square-Version': '2024-01-17',
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

    // どのルートにも引っかからなかった場合 (404)
    return new Response(JSON.stringify({ error: "Not Found", path: path }), { status: 404, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}