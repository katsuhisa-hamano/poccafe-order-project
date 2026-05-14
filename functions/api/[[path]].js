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

      return new Response(JSON.stringify({ 
        success: true, 
        user: { id: user.id, name: user.name, email: user.email, square_customer_id: user.square_customer_id }
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
      const squareItemId = url.searchParams.get('square_item_id'); // 詳細取得用

      // 【パターンA】特定のSquareアイテムの詳細（バリエーション・オプション）をリアルタイム取得
      if (squareItemId) {
        try {
          // Squareのカタログオブジェクト取得APIを叩く
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
          
          // フロントエンドが扱いやすいようにデータを整理して返す
          const item = squareData.object.item_data;
          const related = squareData.related_objects || [];

          const result = {
            id: squareData.object.id,
            name: item.name,
            description: item.description || '',
            // バリエーション（サイズ、価格など）の抽出
            variations: (item.variations || []).map(v => ({
              id: v.id,
              name: v.item_variation_data.name,
              price: v.item_variation_data.price_money ? v.item_variation_data.price_money.amount : 0
            })),
            // オプション（トッピングなど、関連オブジェクトから抽出）
            options: related
              .filter(obj => obj.type === "MODIFIER_LIST")
              .map(modList => ({
                id: modList.id,
                name: modList.modifier_list_data.name,
                selection_type: modList.modifier_list_data.selection_type, // SINGLE または MULTIPLE
                modifiers: (modList.modifier_list_data.modifiers || []).map(m => ({
                  id: m.id,
                  name: m.modifier_data.name,
                  price: m.modifier_data.price_money ? m.modifier_data.price_money.amount : 0
                }))
              }))
          };

          return new Response(JSON.stringify({ success: true, item: result }), { headers: corsHeaders });

        } catch (err) {
          return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
        }
      }

      // 【パターンB】指定日のメニュー一覧を取得（従来通り）
      let menus = [];
      if (searchDate) {
        const res = await env.DB.prepare("SELECT * FROM menus WHERE available_date = ?").bind(searchDate).all();
        menus = res.results || [];
      } else {
        const res = await env.DB.prepare("SELECT * FROM menus").all();
        menus = res.results || [];
      }

      // 各メニューに対して、名前や基本価格をSquareからリアルタイムに補完して一覧を作る
      const fullMenus = [];
      for (const m of menus) {
        try {
          const sqRes = await fetch(`https://connect.squareup.com/v2/catalog/object/${m.square_item_id}`, {
            headers: { 'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}` }
          });
          if (sqRes.ok) {
            const sqData = await sqRes.json();
            const itemData = sqData.object.item_data;
            // 最初のバリエーションの価格を基本価格とする
            const firstVar = itemData.variations?.[0]?.item_variation_data;
            const basePrice = firstVar?.price_money ? Number(firstVar.price_money.amount) : 0;

            fullMenus.push({
              id: m.id,
              square_item_id: m.square_item_id,
              name: itemData.name,
              description: itemData.description || '',
              price: basePrice,
              image_url: m.image_url // 画像はD1に予め入っているものを流用
            });
          }
        } catch(e) {
          // 通信エラー時はスキップ、または仮データ
          fullMenus.push({ id: m.id, square_item_id: m.square_item_id, name: "商品情報取得エラー", price: 0, image_url: m.image_url });
        }
      }

      return new Response(JSON.stringify(fullMenus), { headers: corsHeaders });
    }

    // どのルートにも引っかからなかった場合 (404)
    return new Response(JSON.stringify({ error: "Not Found", path: path }), { status: 404, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}