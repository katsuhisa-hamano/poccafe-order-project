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

      // ② Squareレジ連携（通信エラーが起きても全体を巻き添えにしないよう完全に隔離）
      if (squareToken) {
        try {
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
            console.error("Square検索APIがエラーを返しました:", await searchRes.text());
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
                phone_number: tel ? tel.trim() : undefined
              })
            });

            if (createRes.ok) {
              const createData = await createRes.json();
              squareCustomerId = createData.customer.id;
              console.log("新規Square顧客を作成:", squareCustomerId);
            } else {
              console.error("Square作成APIがエラーを返しました:", await createRes.text());
            }
          }
        } catch (sqErr) {
          console.error("Square APIとの通信自体に失敗しました:", sqErr);
        }
      }

      // Squareトークンがない、またはAPIが全滅した場合は、システムを止めずに一時的なIDを発行
      if (!squareCustomerId) {
        squareCustomerId = "PENDING_" + Date.now();
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
    // 【追加】6. メニュー取得用エンドポイントのフォールバック (GET /api/menus)
    // ---------------------------------------------------------
    if (path === '/api/menus' && method === 'GET') {
      // 本来のメニュー取得ロジックがここにあれば流用してください。
      // もし他で処理している場合は、このブロックをすり抜けて下の404に落ちないためのガードです。
      // ここでは仮として空配列を正常レスポンス(200)で返します。
      return new Response(JSON.stringify([]), { headers: corsHeaders });
    }

    // どのルートにも引っかからなかった場合 (404)
    return new Response(JSON.stringify({ error: "Not Found", path: path }), { status: 404, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}