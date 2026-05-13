export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, ""); // 末尾のスラッシュを削除
  const method = request.method;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // プリフライトリクエスト対応
  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---------------------------------------------------------
    // 1. 新規アカウント登録申請 (POST /api/auth/register)
    // ---------------------------------------------------------
    if (path === '/api/auth/register' && method === 'POST') {
      try {
        const { name, email, tel, password } = await request.json();

        if (!name || !email || !password) {
          return new Response(JSON.stringify({ success: false, message: "必須項目が不足しています。" }), { status: 400, headers: corsHeaders });
        }

        if (!env.DB) throw new Error("Database binding 'DB' is missing.");

        // ① 既にアプリ側のDBに登録（かつアクティブ）がないか確認
        const existingUser = await env.DB.prepare(
          "SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND status = 'active'"
        ).bind(email.trim()).first();

        if (existingUser) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "このメールアドレスは既に登録されています。ログインするか、パスワード再設定をお試しください。" 
          }), { status: 409, headers: corsHeaders });
        }

        // --- Square連携ロジック（追加） ---
        let squareCustomerId = null;
        const squareToken = env.SQUARE_ACCESS_TOKEN; // Cloudflareの環境変数から取得

        if (squareToken) {
          try {
            // ② Squareレジに同じメールアドレスの顧客がいるか検索
            const searchRes = await fetch('https://connect.squareup.com/v2/customers/search', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${squareToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                query: {
                  filter: {
                    email_address: {
                      exact: email.trim().toLowerCase()
                    }
                  }
                }
              })
            });

            if (searchRes.ok) {
              const searchData = await searchRes.json();
              if (searchData.customers && searchData.customers.length > 0) {
                // 既存の顧客が見つかった場合は、そのIDを利用する
                squareCustomerId = searchData.customers[0].id;
                console.log(`Squareに既存の顧客を発見: ${squareCustomerId}`);
              }
            }

            // ③ Squareに存在しなかった場合のみ、新規で顧客登録する
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
                console.log(`Squareに新規顧客を作成しました: ${squareCustomerId}`);
              } else {
                console.error("Square顧客作成に失敗しました。一時的な仮IDを発行します。");
              }
            }
          } catch (sqErr) {
            console.error("Squareとの通信でエラーが発生しました:", sqErr);
          }
        }

        // Squareトークンがない、または通信エラー時は、後から紐付けられるよう仮の文字列を入れる
        if (!squareCustomerId) {
          squareCustomerId = "PENDING_" + Date.now();
        }

        // パスワードのハッシュ化 (SHA-256)
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // 本登録メール用の仮トークン生成
        const verifyToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24時間有効

        // DBに「承認待ち(pending)」の状態で保存
        // ※ 既存のpendingデータがあれば上書き、なければ新規挿入
        await env.DB.prepare(`
          INSERT OR REPLACE INTO users (name, email, tel, password_hash, square_customer_id, status, verify_token, token_expires_at)
          VALUES (?, LOWER(?), ?, ?, ?, 'pending', ?, ?)
        `).bind(name.trim(), email.trim(), tel ? tel.trim() : null, passwordHash, squareCustomerId, verifyToken, expiresAt).run();

        // ④ 本登録確認メールの送信処理（D1から読み込んで仮登録完了メールを送る処理へ続く...）
        const url = new URL(request.url);
        const verifyLink = `${url.origin}/api/auth/verify?token=${verifyToken}`;

        if (env.SENDGRID_API_KEY) {
          await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: email.trim() }] }],
              from: { email: 'noreply@pokkapoka.net', name: 'ぽっカフェ' },
              subject: '【ぽっカフェ】アカウント作成の確認',
              content: [{
                type: 'text/plain',
                value: `${name}様\n\nぽっカフェへの会員登録申請ありがとうございます。\n以下のリンクをクリックして、アカウント作成を完了させてください。\n\n${verifyLink}\n\n※このリンクの有効期限は24時間です。`
              }]
            })
          });
        }

        return new Response(JSON.stringify({ success: true, message: "認証メールを送信しました。" }), { headers: corsHeaders });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 2. メール認証処理 (GET /api/auth/verify)
    // ---------------------------------------------------------
    // パラメータを除外した path が verify で終わるか、または完全に一致するかをチェック
    if ((path.endsWith('/api/auth/verify') || path === '/api/auth/verify') && method === 'GET') {
      try {
        // URLから直接 token を取得
        const token = url.searchParams.get('token');

        if (!token) {
          return new Response("認証トークンが見つかりません。", { status: 400 });
        }

        // トークンに一致する pending ユーザーを探す
        if (!env.DB) throw new Error("DB binding is missing");
        
        const user = await env.DB.prepare(
          "SELECT email FROM users WHERE square_customer_id = ? AND status = 'pending'"
        ).bind(token).first();

        if (!user) {
          return new Response("無効なトークンか、既に認証期限が切れています。", { status: 400 });
        }

        // ステータスを active に更新
        await env.DB.prepare(
          "UPDATE users SET status = 'active' WHERE square_customer_id = ?"
        ).bind(token).run();

        // 認証成功後、フロントエンドのログイン画面などへリダイレクト
        //return Response.redirect(`${url.origin}/?verified=true`, 302);
        // 既存の Response.redirect(...) を消して以下に差し替え
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>認証完了</title>
              <style>body { font-family: sans-serif; text-align: center; padding-top: 50px; }</style>
            </head>
            <body>
              <h2>メール認証が完了しました！</h2>
              <p>アカウントが有効になりました。元のアプリ画面に戻るか、トップページからログインしてください。</p>
              <a href="${url.origin}">トップページへ戻る</a>
            </body>
          </html>
        `, { headers: { "Content-Type": "text/html; charset=utf-8" } });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 3. ログイン処理 (GET または POST /api/auth/login)
    // ---------------------------------------------------------
    if (path === '/api/auth/login') {
      try {
        let email = null;
        let inputPassword = null;

        if (method === 'GET') {
          // URLのパラメータ (?email=...&password=...) から取得
          email = url.searchParams.get('email');
          inputPassword = url.searchParams.get('password'); // ★ここを確実に取得
        } else if (method === 'POST') {
          // リクエストのBody（JSON）から取得
          try {
            const bodyData = await request.json();
            email = bodyData.email;
            inputPassword = bodyData.password;
          } catch(e) {
            // Bodyが空、またはJSONじゃない場合
          }
        } else if (method === 'OPTIONS') {
          return new Response(null, { headers: corsHeaders });
        } else {
          return new Response("Method Not Allowed", { status: 405 });
        }

        // メールアドレスのチェック
        if (!email) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "メールアドレスが指定されていません。" 
          }), { status: 400, headers: corsHeaders });
        }

        // ★【ここが原因でした】パスワードのチェック
        if (!inputPassword) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "パスワードを入力してください。" 
          }), { status: 400, headers: corsHeaders });
        }

        if (!env.DB) throw new Error("Database binding 'DB' is missing.");

        // 大文字小文字・前後の空白を無視して、ステータスが 'active' のユーザーを検索
        const user = await env.DB.prepare(
          "SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND status = 'active'"
        ).bind(email.trim()).first();

        // ユーザーが見つからない場合
        if (!user) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: `アカウントが見つかりません。新規登録をお願いします。` 
          }), { status: 401, headers: corsHeaders });
        }

        // パスワードのハッシュ化照合処理
        const msgUint8 = new TextEncoder().encode(inputPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (user.password_hash !== inputHash) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: "メールアドレスまたはパスワードが間違っています。" 
          }), { status: 401, headers: corsHeaders });
        }

        // ログイン成功：フロントエンドに必要なユーザー情報を返す
        return new Response(JSON.stringify({ 
          success: true, 
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            tel: user.tel,
            square_customer_id: user.square_customer_id
          }
        }), { headers: corsHeaders });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 4. パスワードリセット申請 (POST /api/auth/forgot-password)
    // ---------------------------------------------------------
    if (path === '/api/auth/forgot-password' && method === 'POST') {
      try {
        const { email } = await request.json();
        if (!env.DB || !env.RESEND_API_KEY) throw new Error("環境変数が不足しています。");

        const user = await env.DB.prepare("SELECT name FROM users WHERE email = ? AND status = 'active'").bind(email).first();
        
        // セキュリティ上、ユーザーが見つからなくても「送信しました」と嘘をつくのが一般的ですが、
        // 開発を分かりやすくするため、ここではエラーを返します。
        if (!user) {
          return new Response(JSON.stringify({ success: false, message: "登録されていないメールアドレスです。" }), { status: 404, headers: corsHeaders });
        }

        const resetToken = crypto.randomUUID();
        // 有効期限を 1時間後に設定 (SQLiteの表記に合わせる)
        const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        await env.DB.prepare(
          "UPDATE users SET reset_token = ?, reset_expiry = ? WHERE email = ?"
        ).bind(resetToken, expiry, email).run();

        // Resendでリセット用リンクを送信
        const resetLink = `${url.origin}/#token=${resetToken}`;
        
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Cafe Order <order@pokkapoka.net>',
            to: [email],
            subject: '【ぽっカフェ】パスワードの再設定',
            html: `<p>${user.name} 様</p><p>以下のリンクから新しいパスワードを設定してください（有効期限: 1時間）。</p><p><a href="${resetLink}">${resetLink}</a></p>`
          })
        });

        return new Response(JSON.stringify({ success: true, message: "再設定メールを送信しました。" }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ---------------------------------------------------------
    // 5. パスワード再設定実行 (POST /api/auth/reset-password)
    // ---------------------------------------------------------
    if (path === '/api/auth/reset-password' && method === 'POST') {
      try {
        const { token, newPassword } = await request.json();
        if (!env.DB) throw new Error("DB binding is missing");

        // トークンが一致し、かつ有効期限内のユーザーを探す
        const user = await env.DB.prepare(
          "SELECT email FROM users WHERE reset_token = ? AND reset_expiry > datetime('now')"
        ).bind(token).first();

        if (!user) {
          return new Response(JSON.stringify({ success: false, message: "トークンが無効か、有効期限が切れています。" }), { status: 400, headers: corsHeaders });
        }

        // 新しいパスワードをハッシュ化
        const msgUint8 = new TextEncoder().encode(newPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const newPwdHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // パスワードを更新し、トークンをクリアする
        await env.DB.prepare(
          "UPDATE users SET password_hash = ?, reset_token = NULL, reset_expiry = NULL WHERE email = ?"
        ).bind(newPwdHash, user.email).run();

        return new Response(JSON.stringify({ success: true, message: "パスワードを更新しました。新しいパスワードでログインしてください。" }), { headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // どのパスにも該当しない場合
    return new Response(JSON.stringify({ error: "Not Found", path: path }), { status: 404, headers: corsHeaders });

  } catch (err) {
    // ここでエラーをキャッチして JSON で返す
    return new Response(JSON.stringify({ 
      success: false,
      error: err.message,
      stack: err.stack 
    }), { status: 500, headers: corsHeaders });
  }
}