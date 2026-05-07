export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // 簡易ルーティング
  try {
    // 1. メニュー一覧取得 (GET /api/menus?date=YYYY-MM-DD)
    if (path === '/api/menus' && method === 'GET') {
      const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
      const { results: menus } = await env.DB.prepare(`
        SELECT m.*, COALESCE(i.stock_limit, m.default_stock) as current_limit
        FROM menus m
        LEFT JOIN inventory_overrides i ON m.square_item_id = i.menu_id AND i.date = ?
        ORDER BY m.sort_order ASC
      `).bind(date).all();

      const { results: sold } = await env.DB.prepare(`
        SELECT menu_id, SUM(quantity) as total_sold FROM order_items oi
        JOIN orders o ON oi.order_id = o.id WHERE o.delivery_date = ? GROUP BY menu_id
      `).bind(date).all();

      const data = menus.map(m => {
        const s = sold.find(x => x.menu_id === m.square_item_id);
        const remaining = m.current_limit !== null ? m.current_limit - (s ? s.total_sold : 0) : 999;
        return { ...m, remaining: Math.max(0, remaining) };
      });
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    }

    // 2. 注文登録 (POST /api/orders)
    if (path === '/api/orders' && method === 'POST') {
      const body = await request.json();
      const { customer_id, delivery_date, items } = body;
      
      // 在庫チェック・保存（簡易版）
      const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const { meta } = await env.DB.prepare(
        "INSERT INTO orders (customer_id, delivery_date, total_amount) VALUES (?, ?, ?)"
      ).bind(customer_id, delivery_date, total).run();
      
      const orderId = meta.last_row_id;
      for (const item of items) {
        await env.DB.prepare("INSERT INTO order_items (order_id, menu_id, quantity) VALUES (?, ?, ?)")
          .bind(orderId, item.id, item.quantity).run();
      }
      return new Response(JSON.stringify({ success: true }), { status: 201 });
    }

    // 3. 管理者用：注文一覧 (GET /api/admin/orders?date=YYYY-MM-DD)
    if (path === '/api/admin/orders' && method === 'GET') {
      const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
      const query = date.length === 7 ? `${date}-%` : date; // 月指定なら前方一致
      const { results } = await env.DB.prepare(`
        SELECT o.*, u.name as user_name, GROUP_CONCAT(m.name || 'x' || oi.quantity) as detail
        FROM orders o
        LEFT JOIN users u ON o.customer_id = u.square_customer_id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN menus m ON oi.menu_id = m.square_item_id
        WHERE o.delivery_date LIKE ? GROUP BY o.id ORDER BY o.created_at DESC
      `).bind(query).all();
      return new Response(JSON.stringify(results));
    }

    // POST /api/auth/register - 仮登録 & 認証メール送信
    if (path === '/api/auth/register' && method === 'POST') {
      const { email, name, tel } = await request.json();
      const token = crypto.randomUUID(); // 認証用トークン
      const expiry = Date.now() + 3600000; // 1時間有効

      // 一時的なユーザーデータをD1に保存（status: 'pending'）
      // 本来は別テーブルか、usersテーブルに仮フラグで保存
      await env.DB.prepare(`
        INSERT INTO users (square_customer_id, email, name, tel, status) 
        VALUES (?, ?, ?, ?, ?)
      `).bind(token, email, name, tel, 'pending').run();

      // 認証URLの構築 (環境変数からドメイン取得)
      const authLink = `${new URL(request.url).origin}/api/auth/verify?token=${token}`;

      // メール送信ロジック (Resend API等の例)
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Po-Cafe <onboarding@yourdomain.com>',
          to: email,
          subject: '【ぽっカフェ】アカウント登録を完了してください',
          html: `<p>${name}様</p><p>以下のリンクをクリックして登録を完了してください：</p><a href="${authLink}">${authLink}</a>`
        })
      });

      return new Response(JSON.stringify({ success: true }));
    }

    // GET /api/auth/verify - メールリンククリック時の処理
    if (path === '/api/auth/verify' && method === 'GET') {
      const token = url.searchParams.get('token');
      
      // トークンでユーザー情報を取得
      const user = await env.DB.prepare("SELECT * FROM users WHERE square_customer_id = ? AND status = 'pending'").bind(token).first();
      if (!user) return new Response("無効なリンクです", { status: 400 });

      // --- Square APIで顧客作成 ---
      const sqRes = await fetch('https://connect.squareup.com/v2/customers', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          given_name: user.name,
          email_address: user.email,
          phone_number: user.tel
        })
      });
      const sqData = await sqRes.json();
      const squareId = sqData.customer.id;

      // D1の情報を更新（仮IDをSquare IDに書き換え、ステータスを本登録に）
      await env.DB.prepare("UPDATE users SET square_customer_id = ?, status = 'active' WHERE square_customer_id = ?")
        .bind(squareId, token).run();

      // 完了後、ログイン済みの状態でトップへリダイレクト
      return Response.redirect(`${new URL(request.url).origin}/#login_success`);
    }

    return new Response("Not Found", { status: 404 });
  } catch (err) {
    return new Response(err.stack, { status: 500 });
  }
}