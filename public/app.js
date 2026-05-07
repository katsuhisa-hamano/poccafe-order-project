const router = {
    go(view) {
        // 全ビューを隠す
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        
        // 指定ビューを表示
        const target = document.getElementById(`view-${view}`);
        if (target) target.classList.remove('hidden');

        // UIパーツの表示制御
        const header = document.getElementById('main-header');
        const cartBar = document.getElementById('cart-bar');

        if (view === 'login') {
            header.classList.add('hidden');
            cartBar.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
            // ホーム画面かつカートに何か入っていれば表示（簡易的に常に表示設定）
            if (view === 'home') cartBar.classList.remove('hidden');
            else cartBar.classList.add('hidden');
        }

        if (view === 'admin') app.loadAdminOrders();
        if (view === 'home') app.loadMenus();
        
        window.scrollTo(0, 0);
    }
};

const app = {
    state: { 
        menus: [], 
        cart: {}, 
        user: { id: null, name: null } 
    },

    // ログイン処理
    async login() {
        const email = document.getElementById('login-email').value;
        if (!email) return alert("メールアドレスを入力してください");

        try {
            const res = await fetch(`/api/auth/login?email=${encodeURIComponent(email)}`);
            if (res.ok) {
                const user = await res.json();
                this.state.user.id = user.square_customer_id;
                this.state.user.name = user.name;
                
                localStorage.setItem('cafe_user_id', user.square_customer_id);
                localStorage.setItem('cafe_user_name', user.name);
                
                document.getElementById('userDisplay').innerText = `ログイン中: ${user.name}様`;
                router.go('home');
            } else {
                alert("アカウントが見つかりません。新規登録をお願いします。");
            }
        } catch (e) {
            alert("ログイン通信に失敗しました");
        }
    },

    // ログアウト処理
    logout() {
        if (!confirm("ログアウトしますか？")) return;
        localStorage.clear();
        this.state.user = { id: null, name: null };
        this.state.cart = {};
        this.updateCartBar();
        router.go('login');
    },

    // 起動時の認証チェック
    init() {
        const savedId = localStorage.getItem('cafe_user_id');
        const savedName = localStorage.getItem('cafe_user_name');
        
        if (savedId && savedName) {
            this.state.user.id = savedId;
            this.state.user.name = savedName;
            document.getElementById('userDisplay').innerText = `ログイン中: ${savedName}様`;
            router.go('home');
        } else {
            router.go('login');
        }
        
        document.getElementById('order-date').valueAsDate = new Date();
    },

    // --- 以下、既存の注文ロジック ---
    async loadMenus() {
        const date = document.getElementById('order-date').value;
        const res = await fetch(`/api/menus?date=${date}`);
        this.state.menus = await res.json();
        this.renderMenus();
    },

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
            if(m) total += m.price * this.state.cart[id];
        }
        document.getElementById('cart-total-display').innerText = `¥${total.toLocaleString()}`;
        document.getElementById('cart-bar').style.opacity = total > 0 ? "1" : "0.6";
    },

    renderMenus() {
        const container = document.getElementById('menu-list');
        container.innerHTML = this.state.menus.map(m => {
            const qty = this.state.cart[m.square_item_id] || 0;
            return `
            <div class="bg-white flex p-4 rounded-3xl shadow-sm border-2 ${qty > 0 ? 'border-orange-500' : 'border-transparent'} transition-all active:scale-[0.98]">
                <img src="${m.image_url || 'https://via.placeholder.com/100'}" class="w-20 h-20 object-cover rounded-2xl bg-gray-100">
                <div class="flex-1 ml-4 flex flex-col justify-between">
                    <div>
                        <h3 class="font-bold text-sm leading-tight text-gray-800">${m.name}</h3>
                        <p class="text-orange-600 font-black text-lg">¥${m.price}</p>
                    </div>
                    <div class="flex items-center justify-between mt-2">
                        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">残り ${m.remaining}</span>
                        <div class="flex items-center gap-3 bg-gray-50 rounded-full p-1 border border-gray-100">
                            <button onclick="app.changeQty('${m.square_item_id}', -1)" class="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center font-bold text-gray-500">-</button>
                            <span class="w-4 text-center font-black text-sm">${qty}</span>
                            <button onclick="app.changeQty('${m.square_item_id}', 1)" class="w-8 h-8 rounded-full bg-gray-800 text-white shadow-sm flex items-center justify-center font-bold">+</button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    confirmOrder() {
        const content = document.getElementById('modal-content');
        let html = '';
        for(let id in this.state.cart) {
            if(this.state.cart[id] > 0) {
                const m = this.state.menus.find(x => x.square_item_id === id);
                html += `
                <div class="flex justify-between items-center py-3 border-b border-gray-50">
                    <span class="font-medium text-gray-700">${m.name} <span class="text-gray-400 text-xs ml-1">x${this.state.cart[id]}</span></span>
                    <span class="font-black text-gray-900">¥${(m.price * this.state.cart[id]).toLocaleString()}</span>
                </div>`;
            }
        }
        if(!html) return alert("商品を選択してください");
        content.innerHTML = html;
        document.getElementById('modal').classList.remove('hidden');
    },

    showRegister() { document.getElementById('register-modal').classList.remove('hidden'); },
    closeRegister() { document.getElementById('register-modal').classList.add('hidden'); },
    closeModal() { document.getElementById('modal').classList.add('hidden'); }
};

// 起動
app.init();