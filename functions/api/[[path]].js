export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS設定（Pages Functionsと同一ドメインなら本来不要ですが、開発用に）
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---------------------------------------------------------
    // 1. ログイン認証 (GET /api/auth/login)
    // ---------------------------------------------------------
    if (path === '/api/auth/login' && method === 'GET') {
      const email = url.searchParams.get('email');
      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE email = ? AND status = 'active'"
      ).bind(email).first();

      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });
      }
      return new Response(JSON.stringify(user), { headers: corsHeaders });
    }

    // ---------------------------------------------------------
    // 2. 新規アカウント登録・重複チェック (POST /api/auth/register)
    // ---------------------------------------------------------
    if (path === '/api/auth/register' && method === 'POST') {
      const { email, name, tel } = await request.json();
      console.log("Input data:", { email, name, tel });
      console.log("DB instance:", !!env.DB);

      // D1重複チェック
      const localUser = await env.DB.prepare("SELECT email FROM users WHERE email = ?").bind(email).first();
      if (localUser) {
        return new Response(JSON.stringify({ success: false, message: "既に登録されています。" }), { status: 409, headers: corsHeaders });
      }

      // Square API重複チェック
      const sqSearch = await fetch('https://connect.squareup.com/v2/customers/search', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: { filter: { email_address: { exact: email } } } })
      });
      const sqData = await sqSearch.json();
      if (sqData.customers?.length > 0) {
        return new Response(JSON.stringify({ success: false, message: "Squareレジに既存のアカウントが存在します。" }), { status: 409, headers: corsHeaders });
      }

      // 仮登録保存
      const token = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO users (square_customer_id, email, name, tel, status) VALUES (?, ?, ?, ?, 'pending')")
        .bind(token, email, name, tel).run();

      // 本来はここで認証メールを送信 (Resend等を利用)
      // await sendVerificationEmail(email, token, env);

      console.log(`Verification URL: ${url.origin}/api/auth/verify?token=${token}`);
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ---------------------------------------------------------
    // 3. 認証完了・Square同期 (GET /api/auth/verify)
    // ---------------------------------------------------------
    if (path === '/api/auth/verify' && method === 'GET') {
      const token = url.searchParams.get('token');
      const user = await env.DB.prepare("SELECT * FROM users WHERE square_customer_id = ? AND status = 'pending'").bind(token).first();
      if (!user) return new Response("Invalid token", { status: 400 });

      // Square顧客作成
      const sqRes = await fetch('https://connect.squareup.com/v2/customers', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ given_name: user.name, email_address: user.email, phone_number: user.tel })
      });
      const sqData = await sqRes.json();
      const newId = sqData.customer.id;

      // D1更新
      await env.DB.prepare("UPDATE users SET square_customer_id = ?, status = 'active' WHERE square_customer_id = ?")
        .bind(newId, token).run();

      return Response.redirect(`${url.origin}/#register_complete`);
    }

    // ---------------------------------------------------------
    // 4. メニュー取得・在庫計算 (GET /api/menus)
    // ---------------------------------------------------------
    if (path === '/api/menus' && method === 'GET') {
      const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
      
      const { results: menus } = await env.DB.prepare(`
        SELECT m.*, COALESCE(i.stock_limit, m.default_stock) as current_limit
        FROM menus m
        LEFT JOIN inventory_overrides i ON m.square_item_id = i.menu_id AND i.date = ?
        ORDER BY m.sort_order ASC
      `).bind(date).all();

      const { results: sold } = await env.DB.prepare(`
        SELECT menu_id, SUM(quantity) as total_sold
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.delivery_date = ?
        GROUP BY menu_id
      `).bind(date).all();

      const data = menus.map(m => {
        const s = sold.find(x => x.menu_id === m.square_item_id);
        const remaining = m.current_limit !== null ? m.current_limit - (s ? s.total_sold : 0) : 999;
        return { ...m, remaining: Math.max(0, remaining) };
      });

      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // ---------------------------------------------------------
    // 5. 注文登録 (POST /api/orders)
    // ---------------------------------------------------------
    if (path === '/api/orders' && method === 'POST') {
      const body = await request.json();
      const { customer_id, delivery_date, items } = body;

      // 合計金額計算
      const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

      // トランザクション的にバッチ実行
      const orderInsert = env.DB.prepare("INSERT INTO orders (customer_id, delivery_date, total_amount) VALUES (?, ?, ?)")
        .bind(customer_id, delivery_date, total);
      
      const { meta } = await orderInsert.run();
      const orderId = meta.last_row_id;

      const itemQueries = items.map(item => 
        env.DB.prepare("INSERT INTO order_items (order_id, menu_id, quantity) VALUES (?, ?, ?)")
          .bind(orderId, item.id, item.quantity)
      );

      await env.DB.batch(itemQueries);
      return new Response(JSON.stringify({ success: true, orderId }), { status: 201, headers: corsHeaders });
    }

    // ---------------------------------------------------------
    // 6. 管理者：注文管理 (GET /api/admin/orders)
    // ---------------------------------------------------------
    if (path === '/api/admin/orders' && method === 'GET') {
      const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
      const queryParam = date.length === 7 ? `${date}%` : date; // 月単位表示対応

      const { results } = await env.DB.prepare(`
        SELECT o.*, u.name as user_name, GROUP_CONCAT(m.name || 'x' || oi.quantity) as detail
        FROM orders o
        LEFT JOIN users u ON o.customer_id = u.square_customer_id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN menus m ON oi.menu_id = m.square_item_id
        WHERE o.delivery_date LIKE ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `).bind(queryParam).all();

      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    return new Response("API Endpoint Not Found", { status: 404, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}