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
    // 1. 登録処理 (POST /api/auth/register)
    // ---------------------------------------------------------
    // パスの判定（スラッシュの有無に依存しないよう /api/auth/register で判定）
    if (path === '/api/auth/register' && method === 'POST') {
      const { email, name, tel } = await request.json();

      // 1. D1 接続確認
      if (!env.DB) {
        throw new Error("Database binding 'DB' is missing.");
      }

      // 2. 既存ユーザーの取得（ここで existingUser を確実に定義）
      const existingUser = await env.DB.prepare(
        "SELECT status FROM users WHERE email = ?"
      ).bind(email).first();

      // 3. 本登録済みチェック
      if (existingUser && existingUser.status === 'active') {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "このメールアドレスは既に登録されています。" 
        }), { status: 409, headers: corsHeaders });
      }

      const token = crypto.randomUUID();

      // 4. DB更新または挿入
      if (existingUser && existingUser.status === 'pending') {
        // UPDATE処理
        await env.DB.prepare(
          "UPDATE users SET square_customer_id = ?, name = ?, tel = ? WHERE email = ? AND status = 'pending'"
        ).bind(token, name, tel, email).run();
      } else {
        // INSERT処理
        await env.DB.prepare(
          "INSERT INTO users (square_customer_id, email, name, tel, status) VALUES (?, ?, ?, ?, 'pending')"
        ).bind(token, email, name, tel).run();
      }

      // 5. メール送信処理 (Resend)
      const authLink = `${url.origin}/api/auth/verify?token=${token}`;
      
      if (!env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not defined in environment variables.");
      }

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Cafe Order <order@pokkapoka.net>',
          to: [email],
          subject: '【ぽっカフェ】メール認証を完了してください',
          html: `<p>${name} 様</p><p>登録完了リンク: <a href="${authLink}">${authLink}</a></p>`
        })
      });

      if (!emailRes.ok) {
        const emailErr = await emailRes.text();
        throw new Error(`Email Service Error: ${emailRes.status} ${emailErr}`);
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
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
        return Response.redirect(`${url.origin}/login.html?verified=true`, 302);

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