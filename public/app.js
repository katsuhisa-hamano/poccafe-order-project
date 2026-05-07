const router = {
    go(view) {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${view}`).classList.remove('hidden');
        if(view === 'admin') app.loadAdminOrders();
    }
};

const app = {
    state: { menus: [], cart: {}, user: { id: 'TEMP_USER_ID', name: 'ゲスト' } },

    async loadMenus() {
        const date = document.getElementById('order-date').value || new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/menus?date=${date}`);
        this.state.menus = await res.json();
        this.renderMenus();
    },

    renderMenus() {
        const container = document.getElementById('menu-list');
        container.innerHTML = this.state.menus.map(m => `
            <div class="bg-white p-3 rounded shadow ${m.remaining === 0 ? 'opacity-50' : ''}">
                <img src="${m.image_url || ''}" class="w-full h-24 object-cover mb-2">
                <div class="text-sm font-bold">${m.name}</div>
                <div class="text-orange-600 font-bold">¥${m.price}</div>
                <div class="text-[10px] text-gray-500">残: ${m.remaining}</div>
                <input type="number" min="0" max="${Math.min(30, m.remaining)}" 
                       class="w-full border mt-1 text-center" value="0"
                       onchange="app.state.cart['${m.square_item_id}'] = parseInt(this.value)">
            </div>
        `).join('');
    },

    confirmOrder() {
        const content = document.getElementById('modal-content');
        let html = '';
        for(let id in this.state.cart) {
            if(this.state.cart[id] > 0) {
                const m = this.state.menus.find(x => x.square_item_id === id);
                html += `<div>${m.name} x ${this.state.cart[id]}</div>`;
            }
        }
        if(!html) return alert("商品を選択してください");
        content.innerHTML = html;
        document.getElementById('modal').classList.remove('hidden');
    },

    async submitOrder() {
        const items = [];
        for(let id in this.state.cart) {
            if(this.state.cart[id] > 0) {
                const m = this.state.menus.find(x => x.square_item_id === id);
                items.push({ id, quantity: this.state.cart[id], price: m.price });
            }
        }
        const res = await fetch('/api/orders', {
            method: 'POST',
            body: JSON.stringify({
                customer_id: this.state.user.id,
                delivery_date: document.getElementById('order-date').value,
                items
            })
        });
        if(res.ok) {
            alert("注文を受け付けました");
            location.reload();
        }
    },

    async loadAdminOrders(type = 'date') {
        const val = type === 'date' 
            ? document.getElementById('admin-date-filter').value 
            : document.getElementById('admin-month-filter').value;
        const res = await fetch(`/api/admin/orders?date=${val}`);
        const orders = await res.json();
        document.getElementById('admin-order-list').innerHTML = orders.map(o => `
            <div class="bg-white p-3 rounded text-sm shadow">
                <div class="flex justify-between border-b mb-1 pb-1">
                    <span class="font-bold">${o.user_name || '不明'}</span>
                    <span class="text-gray-500">${o.delivery_date}</span>
                </div>
                <div>${o.detail}</div>
                <div class="text-right font-bold text-orange-600">¥${o.total_amount}</div>
            </div>
        `).join('');
    },

    closeModal() { document.getElementById('modal').classList.add('hidden'); }
};

// 初期ロード
document.getElementById('order-date').value = new Date().toISOString().split('T')[0];
app.loadMenus();