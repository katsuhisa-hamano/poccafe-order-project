// =========================================================
// 0. 管理者画面テンプレート定義 (adminView)
// =========================================================
const adminView = {
    render: () => {
        return `
            <div class="max-w-6xl mx-auto px-2 py-4">
                <!-- ヘッダーエリア -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-gray-200 mb-6">
                    <div>
                        <h1 class="text-2xl font-black text-gray-800 tracking-tight">⚙️ 管理者ダッシュボード</h1>
                        <p class="text-xs text-gray-500 mt-1">当日の注文状況の確認およびメニューの管理が行えます。</p>
                    </div>
                    <div class="mt-4 md:mt-0 flex space-x-2">
                        <button onclick="router.go('home')" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition text-xs">
                            一般画面へ戻る
                        </button>
                        <button onclick="router.go('menu-edit')" class="bg-orange-500 text-white px-4 py-2 rounded-full font-bold hover:bg-orange-600 transition text-xs shadow-sm">
                            メニューを編集する
                        </button>
                    </div>
                </div>

                <!-- 簡易ステータスカード -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">本日の総注文数</p>
                        <p id="admin-total-orders-count" class="text-2xl font-black text-gray-800 mt-1">-- 件</p>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">未受け渡しの注文</p>
                        <p id="admin-pending-orders-count" class="text-2xl font-black text-amber-600 mt-1">-- 件</p>
                    </div>
                    <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">本日の売上（目安）</p>
                        <p id="admin-total-sales-amount" class="text-2xl font-black text-orange-600 mt-1">¥--,---</p>
                    </div>
                </div>

                <!-- 注文一覧セクション -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div class="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 class="font-bold text-gray-800 text-sm flex items-center">
                            <span class="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                            リアルタイム注文受領リスト
                        </h2>
                        <button onclick="app.loadAdminOrders()" class="text-[11px] bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl font-medium hover:bg-gray-50 transition">
                            同期リフレッシュ
                        </button>
                    </div>
                    
                    <div id="admin-orders-list" class="divide-y divide-gray-100 min-h-[150px]">
                        <p class="text-center text-gray-400 py-8 text-xs">注文データを読み込んでいます...</p>
                    </div>
                </div>
            </div>
        `;
    }
};

// =========================================================
// 0-2. 管理者メニュー編集画面テンプレート定義 (menuEditView)
// =========================================================
const menuEditView = {
    render: () => {
        return `
            <div class="max-w-6xl mx-auto px-2 py-4">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-gray-200 mb-6">
                    <div>
                        <h1 class="text-2xl font-black text-gray-800 tracking-tight">🛠️ メニュー表示管理</h1>
                        <p class="text-xs text-gray-500 mt-1">Square同期商品のアプリ内表示/非表示の切り替え、および表示名の編集を行えます。</p>
                    </div>
                    <div class="mt-4 md:mt-0 flex space-x-2">
                        <button onclick="router.go('admin')" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition text-xs">
                            ダッシュボードへ戻る
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- 左・中央：メニュー一覧 -->
                    <div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <h3 class="text-sm font-bold text-gray-800 mb-3">現在のアプリ内メニュー一覧</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-gray-50 border-b border-gray-100">
                                        <th class="p-3 text-[11px] font-bold text-gray-500 uppercase">メニュー名 (アプリ内表示名)</th>
                                        <th class="p-3 text-[11px] font-bold text-gray-500 uppercase w-24 text-center">公開状態</th>
                                        <th class="p-3 text-[11px] font-bold text-gray-500 uppercase w-20 text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody id="menuListTable" class="divide-y divide-gray-100 text-xs">
                                    <tr><td colspan="3" class="text-center text-gray-400 py-6">読み込み中...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 右：新規登録フォーム -->
                    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-fit">
                        <h3 class="text-sm font-bold text-gray-800 mb-4">メニュー新規追加</h3>
                        <form id="newMenuForm" onsubmit="app.handleCreateMenu(event)" class="space-y-4 text-xs">
                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Squareカタログ連携商品</label>
                                <select id="squareItemSelector" class="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500" required>
                                    <option value="">-- Squareから同期中 --</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">アプリ用カスタム表示名</label>
                                <input type="text" id="newMenuName" class="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="空欄時はSquareの商品名を使用">
                            </div>

                            <div>
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">商品画像URL</label>
                                <input type="text" id="newImageUrl" class="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="https://example.com/image.jpg">
                            </div>

                            <div class="flex items-center pt-1">
                                <input type="checkbox" id="newIsVisible" class="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 cursor-pointer" checked>
                                <label for="newIsVisible" class="ml-2 text-xs text-gray-600 font-bold cursor-pointer select-none">登録と同時にアプリ内に公開する</label>
                            </div>

                            <button type="submit" class="w-full bg-orange-500 text-white font-bold p-3 rounded-xl hover:bg-orange-600 transition shadow-md tracking-wider mt-2">
                                アプリメニューに登録
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }
};

// =========================================================
// 1. ルーター定義 (router)
// =========================================================
const router = {
    go(view) {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        
        const target = document.getElementById(`view-${view}`);
        if (target) {
            target.classList.remove('hidden');
        } else {
            console.error(`View "view-${view}" not found.`);
            return;
        }

        const header = document.getElementById('main-header');
        const cartBar = document.getElementById('cart-bar');

        if (view === 'login') {
            if (header) header.classList.add('hidden');
            if (cartBar) cartBar.classList.add('hidden');
        } else if (view === 'admin' || view === 'menu-edit') {
            if (header) header.classList.remove('hidden');
            if (cartBar) cartBar.classList.add('hidden');
        } else if (view === 'home') {
            if (header) header.classList.remove('hidden');
            this.updateCartBarVisibility();
            app.renderAdminCustomerSelector();
        }

        switch (view) {
            case 'admin':
                const adminTarget = document.getElementById('view-admin');
                if (adminTarget) adminTarget.innerHTML = adminView.render();
                if (typeof app.loadAdminOrders === 'function') app.loadAdminOrders(); 
                break;

            case 'menu-edit':
                const editTarget = document.getElementById('view-menu-edit');
                if (editTarget) editTarget.innerHTML = menuEditView.render();
                setTimeout(() => {
                    if (typeof app.loadSquareItems === 'function') app.loadSquareItems();
                    if (typeof app.loadAdminMenuList === 'function') app.loadAdminMenuList();
                }, 1);
                break;

            case 'home':
                setTimeout(() => app.loadMenus(), 1);
                break;
        }
        window.scrollTo(0, 0);
    },

    updateCartBarVisibility() {
        const cartBar = document.getElementById('cart-bar');
        if (cartBar) {
            if (Object.keys(app.state.cart).length > 0) {
                cartBar.classList.remove('hidden');
            } else {
                cartBar.classList.add('hidden');
            }
        }
    }
};

// =========================================================
// 2. アプリケーションコアロジック (app)
// =========================================================
const app = {
    state: { 
        menus: [], 
        cart: {}, 
        user: { id: null, name: null, isAdmin: false },
        adminCustomers: [], 
        resetToken: null
    },

    // ログイン処理
    async login() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) return alert("メールアドレスとパスワードを入力してください");

        try {
            const res = await fetch(`/api/auth/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
            const result = await res.json();

            if (res.ok && result.success) {
                const user = result.user;
                this.state.user.id = user.square_customer_id;
                this.state.user.name = user.name;
                this.state.user.isAdmin = user.is_admin === 1; 
                
                localStorage.setItem('cafe_user_id', user.square_customer_id);
                localStorage.setItem('cafe_user_name', user.name);
                localStorage.setItem('cafe_user_is_admin', user.is_admin); 

                const display = document.getElementById('userDisplay');
                if (display) display.innerText = `ログイン中: ${user.name}様`;
                
                const adminBtn = document.getElementById('go-to-admin-btn');
                if (adminBtn) {
                    if (this.state.user.isAdmin) {
                        adminBtn.classList.remove('hidden');
                    } else {
                        adminBtn.classList.add('hidden');
                    }
                }

                const dateInput = document.getElementById('order-date');
                if (dateInput && !dateInput.value) {
                    dateInput.valueAsDate = new Date();
                }

                if (this.state.user.isAdmin) {
                    await this.loadAdminCustomers();
                }

                router.go('home'); 
            } else {
                alert(result.message || "アカウントが見つからないか、パスワードが間違っています。");
            }
        } catch (e) {
            alert("ログイン通信に失敗しました");
        }
    },

    // ログアウト処理
    logout() {
        if (!confirm("ログアウトしますか？")) return;
        localStorage.clear();
        this.state.user = { id: null, name: null, isAdmin: false };
        this.state.adminCustomers = [];
        this.state.cart = {};
        this.updateCartBar();
        router.go('login');
    },

    // 新規登録申請
    async submitRegister() {
        const btn = document.getElementById('reg-submit-btn');
        const data = {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            tel: document.getElementById('reg-tel').value,
            password: document.getElementById('reg-password').value
        };

        if(!data.name || !data.email || !data.password) return alert("必須項目（名前・メール・パスワード）を入力してください");

        btn.innerText = "照合中...";
        btn.disabled = true;

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (res.status === 409) {
                alert(`【登録不可】\n${result.message}`);
                this.closeRegister();
            } else if (res.ok) {
                alert("認証メールを送信しました。メール内のリンクをクリックして完了してください。");
                this.closeRegister();
            } else {
                throw new Error(result.message || "登録エラー");
            }
        } catch (e) {
            alert(e.message || "登録処理中にエラーが発生しました。");
        } finally {
            btn.innerText = "認証メールを送る";
            btn.disabled = false;
        }
    },

    // パスワードリセットメール申請
    async submitForgotPassword() {
        const btn = document.getElementById('forgot-submit-btn');
        const email = document.getElementById('forgot-email').value;

        if (!email) return alert("メールアドレスを入力してください");

        btn.innerText = "送信中...";
        btn.disabled = true;

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const result = await res.json();

            if (res.ok && result.success) {
                alert("再設定用メールを送信しました。メール内のリンクをご確認ください。");
                this.closeForgotPassword();
            } else {
                alert(result.message || "送信に失敗しました。");
            }
        } catch(e) {
            alert("通信エラーが発生しました。");
        } finally {
            btn.innerText = "再設定メールを送る";
            btn.disabled = false;
        }
    },

    // パスワードの再設定（実行）
    async submitResetPassword() {
        const btn = document.getElementById('reset-submit-btn');
        const newPassword = document.getElementById('reset-new-password').value;

        if (!newPassword) return alert("新しいパスワードを入力してください");
        if (!this.state.resetToken) return alert("トークンが無効です。メールのリンクから再度やり初めてください。");

        btn.innerText = "更新中...";
        btn.disabled = true;

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: this.state.resetToken, newPassword })
            });
            const result = await res.json();

            if (res.ok && result.success) {
                alert("パスワードを更新しました！新しいパスワードでログインしてください。");
                document.getElementById('reset-modal').classList.add('hidden');
                window.location.href = window.location.pathname; 
            } else {
                alert(result.message || "更新に失敗しました。有効期限切れの可能性があります。");
            }
        } catch(e) {
            alert("通信エラーが発生しました。");
        } finally {
            btn.innerText = "パスワードを更新する";
            btn.disabled = false;
        }
    },

    // 起動時の初期化
    async init() {
        console.log("=== app.js が正常に起動しました ===");
        
        let token = null;
        if (window.location.hash && window.location.hash.startsWith('#token=')) {
            token = window.location.hash.split('=')[1];
        }

        if (token) {
            this.state.resetToken = token;
            setTimeout(() => {
                const resetModal = document.getElementById('reset-modal');
                if (resetModal) {
                    resetModal.classList.remove('hidden');
                    resetModal.style.display = 'flex'; 
                }
            }, 300);

            if (document.getElementById('order-date')) {
                document.getElementById('order-date').valueAsDate = new Date();
            }
            return; 
        }

        const savedId = localStorage.getItem('cafe_user_id');
        const savedName = localStorage.getItem('cafe_user_name');
        const savedIsAdmin = localStorage.getItem('cafe_user_is_admin'); 
        
        if (document.getElementById('order-date')) {
            document.getElementById('order-date').valueAsDate = new Date();
        }

        if (savedId && savedName) {
            this.state.user.id = savedId;
            this.state.user.name = savedName;
            this.state.user.isAdmin = savedIsAdmin === '1'; 

            const display = document.getElementById('userDisplay');
            if (display) display.innerText = `ログイン中: ${savedName}様`;

            const adminBtn = document.getElementById('go-to-admin-btn');
            if (adminBtn) {
                if (this.state.user.isAdmin) {
                    adminBtn.classList.remove('hidden'); 
                } else {
                    adminBtn.classList.add('hidden');    
                }
            }

            if (this.state.user.isAdmin) {
                await this.loadAdminCustomers();
            }

            router.go('home');
        } else {
            const adminBtn = document.getElementById('go-to-admin-btn');
            if (adminBtn) adminBtn.classList.add('hidden');
            router.go('login');
        }
    },

    // 管理者代理注文用：顧客リスト取得
    async loadAdminCustomers() {
        try {
            const res = await fetch('/api/admin/customers'); 
            if (!res.ok) throw new Error("顧客リストの取得に失敗しました");
            const data = await res.json();
            this.state.adminCustomers = Array.isArray(data) ? data : (data.customers || []);
        } catch (e) {
            console.error("顧客リストロードエラー:", e);
            this.state.adminCustomers = [];
        }
    },

    // 管理者用：一般画面での顧客変更用UI構築
    renderAdminCustomerSelector() {
        const wrapper = document.getElementById('admin-customer-selector-wrapper');
        if (!wrapper) return;

        if (!this.state.user.isAdmin) {
            wrapper.innerHTML = '';
            wrapper.classList.add('hidden');
            return;
        }

        wrapper.classList.remove('hidden');
        
        const isCartActive = Object.keys(this.state.cart).length > 0;
        const disabledAttr = isCartActive ? 'disabled' : '';

        wrapper.innerHTML = `
            <div class="mb-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <label for="admin-customer-select" class="block text-orange-800 font-bold text-xs mb-1.5 flex items-center">
                    <span class="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black mr-2">管理者権限</span>
                    代理注文：対象の注文者を選択してください
                </label>
                <select id="admin-customer-select" ${disabledAttr} class="w-full bg-white border border-gray-200 h-11 px-3 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:text-gray-400 transition">
                    <option value="${this.state.user.id}">【本人として注文】 ${this.state.user.name}様</option>
                    ${this.state.adminCustomers.map(cust => {
                        if (cust.square_customer_id === this.state.user.id) return '';
                        return `<option value="${cust.square_customer_id}">${cust.name}様 (${cust.email || '確認不可'})</option>`;
                    }).join('')}
                </select>
                ${isCartActive ? `<p class="text-[10px] text-red-500 mt-1 font-bold">※カートに商品が入っているため、注文者を変更できません。</p>` : ''}
            </div>
        `;
    },

    showRegister() { document.getElementById('register-modal').classList.remove('hidden'); },
    closeRegister() { document.getElementById('register-modal').classList.add('hidden'); },
    showForgotPassword() { document.getElementById('forgot-modal').classList.remove('hidden'); },
    closeForgotPassword() { document.getElementById('forgot-modal').classList.add('hidden'); },
    closeModal() { document.getElementById('modal').classList.add('hidden'); },

    // メニュー一覧の読み込み
    async loadMenus() {
        const container = document.getElementById('menu-list');
        if (container) container.innerHTML = '<p class="text-center text-gray-400 py-8 text-xs font-bold">メニューを読み込み中...</p>';

        try {
            const res = await fetch('/api/menus');
            if (!res.ok) throw new Error("メニューの取得に失敗しました");
            
            const data = await res.json();
            this.state.menus = Array.isArray(data) ? data : (data.menus || []); 
            
            this.renderMenus(); 
        } catch (e) {
            console.error(e);
            if (container) container.innerHTML = '<p class="text-center text-red-500 py-8 text-xs font-bold">メニューの取得に失敗しました。</p>';
        }
    },

    // 管理者画面用：注文サマリーとリスト取得
    async loadAdminOrders() {
        const listContainer = document.getElementById('admin-orders-list');
        if (!listContainer) return;

        try {
            const res = await fetch('/api/admin/orders');
            if (!res.ok) throw new Error("注文データの取得に失敗しました");
            const data = await res.json();

            document.getElementById('admin-total-orders-count').innerText = `${data.totalOrdersCount || 0} 件`;
            document.getElementById('admin-pending-orders-count').innerText = `${data.pendingOrdersCount || 0} 件`;
            document.getElementById('admin-total-sales-amount').innerText = `¥${(data.totalSalesAmount || 0).toLocaleString()}`;

            const orders = data.orders || [];
            if (orders.length === 0) {
                listContainer.innerHTML = '<p class="text-center text-gray-400 py-8 text-xs">本日の注文はまだありません。</p>';
                return;
            }

            listContainer.innerHTML = orders.map(order => `
                <div class="p-4 hover:bg-gray-50 transition flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="font-black text-gray-800">注文者: ${order.customer_name}様</span>
                            <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">受取: ${order.pickup_time || '--:--'}</span>
                        </div>
                        <p class="text-[11px] text-gray-400 mt-1">内容: ${order.item_summary}</p>
                    </div>
                    <div class="flex items-center justify-between md:justify-end space-x-4">
                        <span class="font-black text-gray-900">¥${Number(order.total_price).toLocaleString()}</span>
                        <select onchange="app.updateOrderStatus('${order.id}', this.value)" class="text-[11px] border rounded-xl p-1.5 bg-white font-bold focus:outline-none">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>未受け渡し</option>
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>受け渡し済</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>キャンセル</option>
                        </select>
                    </div>
                </div>
            `).join('');

        } catch (e) {
            console.error(e);
            listContainer.innerHTML = '<p class="text-center text-red-500 py-8 text-xs">注文一覧の読み込みに失敗しました。</p>';
        }
    },

    async updateOrderStatus(orderId, nextStatus) {
        try {
            const res = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            const data = await res.json();
            if (!data.success) alert('ステータスの更新に失敗しました: ' + data.message);
            this.loadAdminOrders();
        } catch(e) {
            alert('通信エラーが発生しました。');
        }
    },

    // 管理用：メニュー一覧ロード
    async loadAdminMenuList() {
        const tbody = document.getElementById('menuListTable');
        if (!tbody) return;

        try {
            const res = await fetch('/api/admin/menus');
            if (!res.ok) throw new Error('メニュー表示一覧の取得に失敗しました');
            const menus = await res.json();

            if (menus.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-gray-400 py-6">登録されているメニューがありません。</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            menus.forEach(menu => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-gray-50 transition';
                tr.innerHTML = `
                    <td class="p-3">
                        <input type="text" id="name-${menu.id}" value="${menu.name || ''}" class="w-full border border-transparent hover:border-gray-300 focus:border-orange-500 rounded p-1 bg-transparent focus:bg-white font-bold transition">
                        <span class="text-[9px] text-gray-400 block mt-0.5">Square ID: ${menu.square_item_id}</span>
                    </td>
                    <td class="p-3 text-center">
                        <label class="relative inline-flex items-center cursor-pointer mx-auto">
                            <input type="checkbox" id="visible-${menu.id}" class="sr-only peer" ${menu.is_visible ? 'checked' : ''} onchange="app.updateMenuVisibility(${menu.id})">
                            <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                    </td>
                    <td class="p-3 text-center">
                        <button onclick="app.updateMenuName(${menu.id})" class="text-[11px] bg-orange-50 text-orange-600 font-bold px-2.5 py-1.5 rounded-xl hover:bg-orange-100 transition">
                            保存
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-red-500 py-6">エラーが発生しました。</td></tr>';
        }
    },

    async loadSquareItems() {
        const selector = document.getElementById('squareItemSelector');
        if (!selector) return;

        try {
            const res = await fetch('/api/admin/square-items');
            if (!res.ok) throw new Error('Squareアイテムの取得に失敗しました');
            const items = await res.json();

            selector.innerHTML = '<option value="">-- 連動する商品を選択 --</option>';
            items.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = item.name;
                selector.appendChild(opt);
            });
        } catch (err) {
            selector.innerHTML = '<option value="">読み込み失敗</option>';
        }
    },

    async updateMenuName(id) {
        const name = document.getElementById(`name-${id}`).value;
        const isVisible = document.getElementById(`visible-${id}`).checked ? 1 : 0;
        await this.sendMenuUpdate(id, name, isVisible);
    },

    async updateMenuVisibility(id) {
        const name = document.getElementById(`name-${id}`).value;
        const isVisible = document.getElementById(`visible-${id}`).checked ? 1 : 0;
        await this.sendMenuUpdate(id, name, isVisible);
    },

    async sendMenuUpdate(id, name, isVisible) {
        try {
            const res = await fetch(`/api/admin/menus/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, is_visible: isVisible })
            });
            const data = await res.json();
            if (!data.success) alert('更新エラー: ' + data.message);
        } catch (err) {
            alert('通信に失敗しました。');
        }
    },

    async handleCreateMenu(e) {
        e.preventDefault();
        const squareItemId = document.getElementById('squareItemSelector').value;
        let name = document.getElementById('newMenuName').value.trim();
        const imageUrl = document.getElementById('newImageUrl').value.trim();
        const isVisible = document.getElementById('newIsVisible').checked ? 1 : 0;

        if (!squareItemId) return alert('Square商品を選択してください。');

        if (!name) {
            const selector = document.getElementById('squareItemSelector');
            name = selector.options[selector.selectedIndex].text;
        }

        try {
            const res = await fetch('/api/admin/menus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    square_item_id: squareItemId,
                    name: name,
                    image_url: imageUrl,
                    is_visible: isVisible
                })
            });

            const data = await res.json();
            if (data.success) {
                alert('アプリメニューに新規登録しました！');
                document.getElementById('newMenuForm').reset();
                this.loadAdminMenuList();
            } else {
                alert('登録エラー: ' + data.message);
            }
        } catch (err) {
            alert('登録に失敗しました。');
        }
    },

    // ユーザー画面：メニューレンダリング
    renderMenus() {
        const container = document.getElementById('menu-list');
        if (!container) return;

        if (this.state.menus.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 py-8 text-xs font-bold">本日の提供メニューはありません。</p>';
            return;
        }

        container.innerHTML = this.state.menus.map(item => `
            <div class="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100 flex p-3 items-center justify-between gap-3">
                <div class="flex items-center gap-3 flex-1">
                    ${item.image_url ? `
                        <div onclick="app.openOptionModal('${item.square_item_id}', '${item.name.replace(/'/g, "\\'")}')" class="w-16 h-16 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer">
                            <img src="${item.image_url}" class="w-full h-full object-cover">
                        </div>
                    ` : `
                        <div onclick="app.openOptionModal('${item.square_item_id}', '${item.name.replace(/'/g, "\\'")}')" class="w-16 h-16 bg-orange-50 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer text-xl">
                            ☕
                        </div>
                    `}
                    <div class="flex-1">
                        <h3 class="font-black text-gray-800 text-sm">${item.name}</h3>
                        <p class="text-[11px] text-gray-400 mt-0.5 line-clamp-1">${item.description || '美味しいカフェメニューです。'}</p>
                        <p class="text-orange-500 font-black text-xs mt-1">¥${item.price.toLocaleString()}〜</p>
                    </div>
                </div>
                <button onclick="app.openOptionModal('${item.square_item_id}', '${item.name.replace(/'/g, "\\'")}')" class="bg-orange-500 text-white px-4 py-2.5 rounded-full text-xs font-bold active:scale-95 transition-all">
                    選択
                </button>
            </div>
        `).join('');
    },

    // モーダルのリアルタイム集計金額計算
    calculateModalPrice() {
        let total = 0;
        const selectedVar = document.querySelector('input[name="square_variation"]:checked');
        if (selectedVar) {
            total += Number(selectedVar.getAttribute('data-price')) || 0;
        }

        const checkedModifiers = document.querySelectorAll('input[name^="square_modifier_"]:checked');
        checkedModifiers.forEach(input => {
            total += Number(input.getAttribute('data-price')) || 0;
        });

        const priceDisplay = document.getElementById('modal-total-price');
        if (priceDisplay) {
            priceDisplay.innerText = `¥${total.toLocaleString()}`;
        }
    },

    // オプション選択用ポップアップ展開
    async openOptionModal(squareItemId, itemName) {
        let modal = document.getElementById('option-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'option-modal';
            modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end hidden';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="relative bg-white w-full rounded-t-[32px] p-6 max-w-md mx-auto text-center font-bold text-xs text-gray-400">
                Squareから詳細情報を同期中...
            </div>
        `;
        modal.classList.remove('hidden');

        try {
            const res = await fetch(`/api/menus?square_item_id=${squareItemId}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            const item = data.item;

            modal.innerHTML = `
                <div class="absolute inset-0 bg-transparent" onclick="document.getElementById('option-modal').classList.add('hidden')"></div>
                <div class="relative bg-white w-full rounded-t-[32px] p-6 animate-slide-up max-w-md mx-auto flex flex-col max-h-[85vh] overflow-y-auto">
                    <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 flex-shrink-0"></div>
                    
                    <div class="overflow-y-auto flex-1 text-left pb-4">
                        <h2 class="text-base font-black text-gray-800 mb-1">${item.name}</h2>
                        <p class="text-[11px] text-gray-400 mb-5">${item.description || ''}</p>
                        
                        <!-- バリエーション -->
                        <div class="mb-5">
                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">サイズ・種類 (必須)</label>
                            <div class="space-y-2">
                                ${item.variations.map((v, idx) => {
                                    const radioId = `var_${v.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
                                    return `
                                    <label for="${radioId}" class="flex items-center justify-between p-3 border border-gray-100 bg-gray-50 rounded-2xl cursor-pointer select-none text-xs">
                                        <span class="flex items-center">
                                            <input type="radio" id="${radioId}" name="square_variation" value="${v.id}" data-price="${v.price}" onchange="app.calculateModalPrice()" ${idx === 0 ? 'checked' : ''} class="mr-3 h-4 w-4 text-orange-500 focus:ring-orange-500 cursor-pointer">
                                            <span class="font-bold text-gray-800">${v.name}</span>
                                        </span>
                                        <span class="font-black text-gray-700">¥${Number(v.price).toLocaleString()}</span>
                                    </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- モディファイア群 -->
                        ${item.options.map((optList) => `
                            <div class="mb-5">
                                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                    ${optList.name} ${optList.selection_type === 'SINGLE' ? '(1つまで)' : '(複数選択可)'}
                                </label>
                                <div class="space-y-2">
                                    ${optList.modifiers.map((m) => {
                                        const checkId = `mod_${m.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
                                        const inputType = optList.selection_type === 'SINGLE' ? 'radio' : 'checkbox';
                                        return `
                                        <label for="${checkId}" class="flex items-center justify-between p-3 border border-gray-100 bg-gray-50 rounded-2xl cursor-pointer select-none text-xs">
                                            <span class="flex items-center">
                                                <input type="${inputType}" id="${checkId}" name="square_modifier_${optList.id}" value="${m.id}" data-price="${m.price}" onclick="app.handleModifierClick(this, '${inputType}')" class="mr-3 h-4 w-4 text-orange-500 focus:ring-orange-500 cursor-pointer">
                                                <span class="text-gray-700 font-medium">${m.name}</span>
                                            </span>
                                            <span class="text-gray-400 font-bold">+¥${Number(m.price).toLocaleString()}</span>
                                        </label>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- 下部フッターエリア -->
                    <div class="pt-4 border-t border-gray-100">
                        <div class="mb-4 flex justify-between items-center text-gray-800">
                            <span class="text-xs font-bold text-gray-400">選択合計金額</span>
                            <span id="modal-total-price" class="text-2xl font-black text-orange-600">¥0</span>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="document.getElementById('option-modal').classList.add('hidden')" class="w-1/3 bg-gray-100 text-gray-500 py-3.5 rounded-2xl font-bold text-xs">
                                閉じる
                            </button>
                            <button onclick="app.confirmAddToCart('${item.id}', '${item.name.replace(/'/g, "\\'")}')" class="w-2/3 bg-orange-500 text-white py-3.5 rounded-2xl font-black text-xs shadow-md tracking-wider">
                                カートに追加
                            </button>
                        </div>
                    </div>
                </div>
            `;

            this.calculateModalPrice();

        } catch (e) {
            modal.innerHTML = `<div class="bg-white p-6 rounded-t-[32px] max-w-md mx-auto text-center text-red-500 font-bold text-xs">データの同期に失敗しました: ${e.message}</div>`;
        }
    },

    handleModifierClick(input, type) {
        if (type === 'radio') {
            if (input.dataset.wasChecked === 'true') {
                input.checked = false;
                input.dataset.wasChecked = 'false';
            } else {
                const name = input.getAttribute('name');
                document.querySelectorAll(`input[name="${name}"]`).forEach(el => {
                    el.dataset.wasChecked = 'false';
                });
                input.dataset.wasChecked = 'true';
            }
        }
        this.calculateModalPrice();
    },

    // カートへの最終追加処理
    confirmAddToCart(itemId, itemName) {
        const dateElement = document.getElementById('order-date');
        const orderDate = dateElement ? dateElement.value : '';
        
        if (!orderDate) {
            alert("受取日を選択してください。");
            return;
        }

        let targetCustomerId = this.state.user.id; 
        let targetCustomerName = this.state.user.name;

        if (this.state.user.isAdmin) {
            const selectEl = document.getElementById('admin-customer-select');
            if (selectEl) {
                targetCustomerId = selectEl.value;
                targetCustomerName = selectEl.options[selectEl.selectedIndex].text.replace('様', '').replace(/（.*）/, '').trim();
            }
        }

        const selectedVar = document.querySelector('input[name="square_variation"]:checked');
        if (!selectedVar) {
            alert("サイズ・種類を選択してください。");
            return;
        }

        const variationId = selectedVar.value;
        const variationName = selectedVar.closest('label').querySelector('.font-bold').innerText;
        let totalPrice = Number(selectedVar.getAttribute('data-price')) || 0;
        
        const selectedModifiers = [];
        const modifierInputs = document.querySelectorAll('input[name^="square_modifier_"]:checked');
        modifierInputs.forEach(input => {
            totalPrice += Number(input.getAttribute('data-price')) || 0;
            const modName = input.closest('label').querySelector('.text-gray-700').innerText;
            selectedModifiers.push({ id: input.value, name: modName });
        });

        const cartKey = `${orderDate}_${targetCustomerId}_${itemId}_${variationId}_${selectedModifiers.map(m => m.id).sort().join('_')}`;
        
        if (!this.state.cart[cartKey]) {
            this.state.cart[cartKey] = {
                orderDate, 
                customerId: targetCustomerId,     
                customerName: targetCustomerName, 
                itemId,
                itemName,
                variationId,
                variationName,
                modifiers: selectedModifiers,
                price: totalPrice,
                qty: 0
            };
        }
        
        this.state.cart[cartKey].qty += 1;

        alert(`【${orderDate} 受取分 / ${targetCustomerName}】\n${itemName} (${variationName}) をカートに追加しました！`);
        document.getElementById('option-modal').classList.add('hidden');
        
        this.updateCartBar();
        this.renderAdminCustomerSelector(); 
    },

    // カートインジケーターの数値及び状態リフレッシュ
    updateCartBar() {
        let total = 0;
        let count = 0;
        let currentTargetDate = '';
        let currentTargetName = '';
        
        for (let key in this.state.cart) {
            const item = this.state.cart[key];
            total += item.price * item.qty;
            count += item.qty;
            currentTargetDate = item.orderDate;
            currentTargetName = item.customerName;
        }
        
        const totalDisplay = document.getElementById('cart-total-display');
        const cartBar = document.getElementById('cart-bar');
        
        if (count > 0) {
            if (totalDisplay) {
                totalDisplay.innerHTML = `
                    <span class="text-[10px] text-gray-400 block font-normal leading-tight">${currentTargetDate} 受取分 (${currentTargetName}様)</span>
                    ¥${total.toLocaleString()}
                `;
            }
            
            let clearBtn = document.getElementById('cart-clear-btn');
            if (!clearBtn && cartBar) {
                clearBtn = document.createElement('button');
                clearBtn.id = 'cart-clear-btn';
                clearBtn.innerText = '空にする';
                clearBtn.className = 'text-[11px] text-red-400 font-bold bg-red-50 px-2.5 py-1 rounded-full ml-2 focus:outline-none transition';
                
                // カートバー内のレイアウト構造維持のため挿入
                const flexContainer = cartBar.querySelector('.max-w-md');
                if (flexContainer) {
                    flexContainer.insertBefore(clearBtn, flexContainer.lastElementChild);
                }
                
                clearBtn.onclick = (e) => {
                    e.stopPropagation(); 
                    if (confirm("カート内のアイテムをすべてクリアしますか？")) {
                        app.state.cart = {}; 
                        app.updateCartBar(); 
                        app.renderAdminCustomerSelector(); 
                    }
                };
            }
            router.go('home'); // 表示変更を追従させる
        } else {
            const clearBtn = document.getElementById('cart-clear-btn');
            if (clearBtn) clearBtn.remove();
            router.go('home');
        }
    },

    // 注文確認モーダル展開
    confirmOrder() {
        const content = document.getElementById('modal-content');
        if (!content) return;
        
        let html = '';
        for (let key in this.state.cart) {
            const item = this.state.cart[key];
            if (item.qty > 0) {
                const modsText = item.modifiers.map(m => `+${m.name}`).join(', ');
                html += `
                <div class="py-3 border-b border-gray-100 flex justify-between items-start text-xs">
                    <div>
                        <p class="font-black text-gray-800">${item.itemName} <span class="text-orange-500 font-bold ml-1">x${item.qty}</span></p>
                        <p class="text-[10px] text-gray-400 mt-0.5">種類: ${item.variationName} ${modsText ? `(${modsText})` : ''}</p>
                        <p class="text-[9px] text-gray-400">対象者: ${item.customerName}様</p>
                    </div>
                    <span class="font-black text-gray-900 text-right">¥${(item.price * item.qty).toLocaleString()}</span>
                </div>`;
            }
        }

        if (!html) return alert("カートに商品がありません。");
        content.innerHTML = html;
        
        const modal = document.getElementById('modal');
        if (modal) modal.classList.remove('hidden');
    },

    // 注文送信処理 (APIサーバー接続)
    async submitOrder() {
        const submitBtn = document.querySelector('#modal button[onclick="app.submitOrder()"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "注文を送信中...";
        }

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart: this.state.cart })
            });
            const result = await res.json();

            if (res.ok && result.success) {
                alert("ご注文ありがとうございました！予約が確定しました。");
                this.state.cart = {};
                this.closeModal();
                this.updateCartBar();
                this.renderAdminCustomerSelector();
            } else {
                alert("注文送信エラー: " + (result.message || "サーバーで問題が発生しました"));
            }
        } catch(e) {
            alert("通信環境の良い場所で再度お試しください。");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "注文を確定する";
            }
        }
    }
};

// =========================================================
// 3. アプリケーションのエントリーポイント（自動起動）
// =========================================================
app.init();

// =========================================================
// 4. 特殊ブラウザイベント制御 (IIFE)
// =========================================================
(function() {
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', function() {
        alert("この画面ではブラウザの「戻る」ボタンはご利用いただけません。アプリ内のヘッダー等のボタン操作をお願いいたします。");
        window.history.pushState(null, null, window.location.href);
    });
})();

// 日付操作・顧客セレクターの変更を監視する処理
(function() {
    let lastCheckedDate = '';

    window.addEventListener('load', () => {
        setTimeout(() => {
            const dateInput = document.getElementById('order-date');
            if (dateInput) lastCheckedDate = dateInput.value;
        }, 500);
    });

    document.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'order-date') {
            const dateInput = e.target;
            const cartCount = Object.keys(app.state.cart).length;

            if (cartCount > 0) {
                alert("すでにカートに商品が入っているため、受取日を変更できません。\n変更する場合は一度カート内を空にしてください。");
                dateInput.value = lastCheckedDate;
                return;
            }
            lastCheckedDate = dateInput.value;
            console.log("受取希望日を変更しました:", lastCheckedDate);
        }
    });
})();