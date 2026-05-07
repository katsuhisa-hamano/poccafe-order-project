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

    return new Response("Not Found", { status: 404 });
  } catch (err) {
    return new Response(err.stack, { status: 500 });
  }
}