const router = {
    go(view) {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${view}`).classList.remove('hidden');
        if(view === 'admin') app.loadAdminOrders();
    }
};

const app = {
    state: { 
        menus: [], 
        cart: {}, 
        user: { id: 'SQR_USER_001', name: 'ポポ' } 
    },

    async loadMenus() {
        const date = document.getElementById('order-date').value || new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/menus?date=${date}`);
        this.state.menus = await res.json();
        this.renderMenus();
    },

    // 数量変更ロジック（プラス・マイナス）
    changeQty(id, delta) {
        const current = this.state.cart[id] || 0;
        const menu = this.state.menus.find(m => m.square_item_id === id);
        const next = Math.max(0, Math.min(30, Math.min(menu.remaining, current + delta)));
        
        this.state.cart[id] = next;
        this.renderMenus();
        this.updateCartBar();
    },

    updateCartBar() {
        let total = 0;
        for (let id in this.state.cart) {
            const m = this.state.menus.find(x => x.square_item_id === id);
            total += m.price * this.state.cart[id];
        }
        document.getElementById('cart-total-display').innerText = `¥${total.toLocaleString()}`;
        // カートが空ならバーを少し透過
        document.getElementById('cart-bar').style.opacity = total > 0 ? "1" : "0.5";
    },

    renderMenus() {
        const container = document.getElementById('menu-list');
        container.innerHTML = this.state.menus.map(m => {
            const qty = this.state.cart[m.square_item_id] || 0;
            return `
            <div class="bg-white flex p-3 rounded-2xl shadow-sm border-2 ${qty > 0 ? 'border-orange-500' : 'border-transparent'} transition-all">
                <img src="${m.image_url || 'https://via.placeholder.com/100'}" class="w-24 h-24 object-cover rounded-xl bg-gray-100">
                <div class="flex-1 ml-4 flex flex-col justify-between">
                    <div>
                        <h3 class="font-bold text-sm leading-tight">${m.name}</h3>
                        <p class="text-orange-600 font-black">¥${m.price}</p>
                        <p class="text-[10px] text-gray-400 mt-1">残り ${m.remaining}個</p>
                    </div>
                    
                    <div class="flex items-center justify-end gap-3">
                        <button onclick="app.changeQty('${m.square_item_id}', -1)" 
                                class="w-8 h-8 rounded-full border-2 border-gray-100 flex items-center justify-center font-bold">-</button>
                        <span class="w-6 text-center font-bold">${qty}</span>
                        <button onclick="app.changeQty('${m.square_item_id}', 1)" 
                                class="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold">+</button>
                    </div>
                </div>
            </div>
        `}).join('');
    },

    confirmOrder() {
        const content = document.getElementById('modal-content');
        let html = '';
        for(let id in this.state.cart) {
            if(this.state.cart[id] > 0) {
                const m = this.state.menus.find(x => x.square_item_id === id);
                html += `
                <div class="flex justify-between items-center py-2 border-b border-gray-50">
                    <span>${m.name} <span class="text-gray-400">x${this.state.cart[id]}</span></span>
                    <span class="font-bold">¥${(m.price * this.state.cart[id]).toLocaleString()}</span>
                </div>`;
            }
        }
        if(!html) return alert("商品を選択してください");
        content.innerHTML = html;
        document.getElementById('modal').classList.remove('hidden');
    },

    async submitOrder() {
        // ... (API送信ロジックは前回同様)
        alert("注文を送信しました！");
        this.closeModal();
    },

    showRegister() {
        document.getElementById('register-modal').classList.remove('hidden');
    },

    closeRegister() {
        document.getElementById('register-modal').classList.add('hidden');
    },

    async submitRegister() {
        const btn = document.getElementById('reg-submit-btn');
        const data = {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            tel: document.getElementById('reg-tel').value
        };

        if(!data.name || !data.email) return alert("必須項目を入力してください");

        btn.innerText = "送信中...";
        btn.disabled = true;

        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert("認証メールを送信しました。メール内のリンクをクリックして完了してください。");
            this.closeRegister();
        } else {
            alert("エラーが発生しました。");
            btn.innerText = "メールを送る";
            btn.disabled = false;
        }
    },

    async login() {
        const email = document.getElementById('login-email').value;
        // 簡易ログイン処理（本来はパスワードやマジックリンクが必要）
        // ここではメールアドレスが登録済みか確認し、IDをlocalStorageに保持
        const res = await fetch(`/api/auth/login?email=${email}`);
        if (res.ok) {
            const user = await res.json();
            localStorage.setItem('cafe_user_id', user.square_customer_id);
            localStorage.setItem('cafe_user_name', user.name);
            router.go('home');
        } else {
            alert("アカウントが見つかりません。新規作成してください。");
        }
    },

    closeModal() { document.getElementById('modal').classList.add('hidden'); }
};

// 初期ロード
document.getElementById('order-date').valueAsDate = new Date();
app.loadMenus();