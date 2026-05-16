// =========================================================
// 0. 管理者画面テンプレート定義 (adminView)
// =========================================================
const adminView = {
    render: () => {
        return `
            <div class="max-w-6xl mx-auto px-4 py-8">
                <!-- ヘッダーエリア -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-gray-200 mb-8">
                    <div>
                        <h1 class="text-3xl font-black text-gray-800 tracking-tight">管理者ダッシュボード</h1>
                        <p class="text-sm text-gray-500 mt-1">当日の注文状況の確認およびメニューの管理が行えます。</p>
                    </div>
                    <div class="mt-4 md:mt-0 flex space-x-3">
                        <button onclick="router.go('home')" class="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-full font-bold hover:bg-gray-200 transition text-sm">
                            一般画面へ戻る
                        </button>
                        <button onclick="router.go('menu-edit')" class="bg-emerald-600 text-white px-5 py-2.5 rounded-full font-bold hover:bg-emerald-700 transition text-sm shadow-sm">
                            メニューを編集する
                        </button>
                    </div>
                </div>

                <!-- 簡易ステータスカード -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">本日の総注文数</p>
                        <p id="admin-total-orders-count" class="text-3xl font-black text-gray-800 mt-2">-- 件</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">未受け渡しの注文</p>
                        <p id="admin-pending-orders-count" class="text-3xl font-black text-amber-600 mt-2">-- 件</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">本日の売上（目安）</p>
                        <p id="admin-total-sales-amount" class="text-3xl font-black text-emerald-600 mt-2">¥--,---</p>
                    </div>
                </div>

                <!-- 注文一覧セクション -->
                <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div class="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 class="font-bold text-gray-800 flex items-center">
                            <span class="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2"></span>
                            リアルタイム注文受領リスト
                        </h2>
                        <button onclick="app.loadAdminOrders()" class="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-md font-medium hover:bg-gray-50 active:bg-gray-100 transition">
                            同期リフレッシュ
                        </button>
                    </div>
                    
                    <!-- 注文データが流し込まれるコンテナ -->
                    <div id="admin-orders-list" class="divide-y divide-gray-100 min-h-[200px]">
                        <p class="text-center text-gray-400 py-12 text-sm">注文データを読み込んでいます...</p>
                    </div>
                </div>
            </div>
        `;
    }
};

// =========================================================
// 管理者：メニュー編集画面テンプレート定義 (menuEditView)
// =========================================================
const menuEditView = {
    render: () => {
        return `
            <div class="max-w-6xl mx-auto px-4 py-8">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-gray-200 mb-8">
                    <div>
                        <h1 class="text-3xl font-black text-gray-800 tracking-tight">メニュー・バリエーション管理</h1>
                        <p class="text-sm text-gray-500 mt-1">商品はSquareの上位単位で抽出し、在庫・非表示フラグはバリエーション単位で制御します。</p>
                    </div>
                    <div class="mt-4 md:mt-0">
                        <button onclick="router.go('admin')" class="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-full font-bold hover:bg-gray-200 transition text-sm">
                            ダッシュボードへ戻る
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-fit">
                        <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <span class="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2"></span>
                            メニュー・バリエーション追加
                        </h2>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">対象バリエーションを選択</label>
                                <select id="edit-square-item-select" class="w-full bg-gray-50 border border-gray-200 h-11 px-3 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                    <option value="">Squareから商品データを読込中...</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">バリエーション初期在庫数</label>
                                <input type="number" id="edit-menu-remaining" value="30" min="0" class="w-full bg-gray-50 border border-gray-200 h-11 px-3 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">初期表示フラグ</label>
                                <select id="edit-menu-status" class="w-full bg-gray-50 border border-gray-200 h-11 px-3 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                    <option value="1">ON (表示)</option>
                                    <option value="0">OFF (非表示)</option>
                                </select>
                            </div>
                            <button onclick="app.addMenuFromSquare()" class="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition text-sm shadow-sm mt-2">
                                バリエーションを登録
                            </button>
                        </div>
                    </div>

                    <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div class="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 class="font-bold text-gray-800 flex items-center">
                                <span class="w-2.5 h-2.5 bg-orange-500 rounded-full mr-2"></span>
                                登録済みバリエーション一覧
                            </h2>
                            <button onclick="app.loadAdminMenuList()" class="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-md font-medium hover:bg-gray-50 transition">
                                リフレッシュ
                            </button>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr class="bg-gray-50/50 text-gray-400 font-bold border-b border-gray-100">
                                        <th class="p-4">登録メニュー / バリエーション</th>
                                        <th class="p-4 text-center">バリエーション在庫</th>
                                        <th class="p-4 text-center">表示フラグ</th>
                                        <th class="p-4 text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody id="admin-menu-list-tbody" class="divide-y divide-gray-100">
                                    <tr>
                                        <td colspan="4" class="text-center text-gray-400 py-12">データを読み込んでいます...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
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
        // すべての表示エリアを一度隠す
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

        // --- 画面ごとのUI表示制御 ---
        if (view === 'login') {
            if (header) header.classList.add('hidden');
            if (cartBar) cartBar.classList.add('hidden');
        } else if (view === 'admin' || view === 'menu-edit') {
            if (header) header.classList.remove('hidden');
            if (cartBar) cartBar.classList.add('hidden');
        } else if (view === 'home') {
            if (header) header.classList.remove('hidden');
            if (cartBar && Object.keys(app.state.cart).length > 0) {
                cartBar.classList.remove('hidden');
            }
            // ★【追加】一般ホーム画面に戻った際、管理者ならセレクターを生成/描画する
            app.renderAdminCustomerSelector();
        }

        // --- 画面遷移時のデータロード ＆ 画面生成処理 ---
        switch (view) {
            case 'admin':
                const adminTarget = document.getElementById('view-admin');
                if (adminTarget && typeof adminView !== 'undefined') {
                    adminTarget.innerHTML = adminView.render();
                }
                if (typeof app.loadAdminOrders === 'function') {
                    app.loadAdminOrders(); 
                }
                break;

            case 'menu-edit':
                const editTarget = document.getElementById('view-menu-edit');
                if (editTarget && typeof menuEditView !== 'undefined') {
                    editTarget.innerHTML = menuEditView.render();
                }
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
        adminCustomers: [], // ★【追加】管理者が選べる顧客リストの保管場所
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

                // ★【追加】管理者ログイン時、あらかじめ顧客リストをバックグラウンドで取得しておく
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
        this.state.adminCustomers = []; // クリア
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

    // 起動時の認証チェック
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

            // ★【追加】リロード（再起動）時も管理者なら自動で顧客リストを取得
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

    // ★【追加】管理者用：APIから顧客（注文者）リストを取得する関数
    async loadAdminCustomers() {
        try {
            // ※ backendに用意された顧客一覧取得APIエンドポイントを想定
            const res = await fetch('/api/admin/customers'); 
            if (!res.ok) throw new Error("顧客リストの取得に失敗しました");
            const data = await res.json();
            this.state.adminCustomers = Array.isArray(data) ? data : (data.customers || []);
        } catch (e) {
            console.error("顧客リストロードエラー:", e);
            this.state.adminCustomers = [];
        }
    },

    // ★【追加】管理者用：日付選択の上部に顧客一覧セレクターを動的に挿入・構築する関数
    renderAdminCustomerSelector() {
        // 配置用のラッパー（HTML側にあらかじめ <div id="admin-customer-selector-wrapper"></div> を設置してください）
        const wrapper = document.getElementById('admin-customer-selector-wrapper');
        if (!wrapper) return;

        // 管理者でなければ、中身を空にして非表示にする
        if (!this.state.user.isAdmin) {
            wrapper.innerHTML = '';
            wrapper.classList.add('hidden');
            return;
        }

        wrapper.classList.remove('hidden');
        
        // すでにカートに商品がある場合は変更不可にするための属性制御
        const isCartActive = Object.keys(this.state.cart).length > 0;
        const disabledAttr = isCartActive ? 'disabled' : '';

        wrapper.innerHTML = `
            <div class="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <label for="admin-customer-select" class="block text-amber-900 font-bold text-sm mb-1.5 flex items-center">
                    <span class="bg-amber-600 text-white text-xs px-2 py-0.5 rounded font-black mr-2">管理者権限</span>
                    代理注文：対象の顧客（注文者）を選択してください
                </label>
                <select id="admin-customer-select" ${disabledAttr} class="w-full bg-white border border-amber-300 h-11 px-3 rounded-md text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition">
                    <option value="${this.state.user.id}">【本人として注文】 ${this.state.user.name}様</option>
                    ${this.state.adminCustomers.map(cust => {
                        // 本人以外を表示
                        if (cust.square_customer_id === this.state.user.id) return '';
                        return `<option value="${cust.square_customer_id}">${cust.name}様 (${cust.email || 'メールなし'})</option>`;
                    }).join('')}
                </select>
                ${isCartActive ? `<p class="text-xs text-red-600 mt-1 font-bold">※カートに商品が入っているため、注文者を変更できません。</p>` : ''}
            </div>
        `;
    },

    // モーダル表示切り替え
    showRegister() { document.getElementById('register-modal').classList.remove('hidden'); },
    closeRegister() { document.getElementById('register-modal').classList.add('hidden'); },
    showForgotPassword() { document.getElementById('forgot-modal').classList.remove('hidden'); },
    closeForgotPassword() { document.getElementById('forgot-modal').classList.add('hidden'); },
    closeModal() { document.getElementById('modal').classList.add('hidden'); },

    // 注文ロジック：メニューの読み込み
    async loadMenus() {
        const container = document.getElementById('menu-list');
        if (!container) return;

        try {
            const res = await fetch('/api/menus');
            if (!res.ok) throw new Error("メニューの取得に失敗しました");
            const menus = await res.json();

            if (menus.length === 0) {
                container.innerHTML = `<p class="text-center text-gray-400 py-8">現在ご注文可能なメニューはありません。</p>`;
                return;
            }

            // グリッドレイアウトで画像付きの「注文ボタン（カード）」を並べる
            container.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    ${menus.map(item => `
                        <button onclick="app.openMenuDetail('${item.square_item_id}')" 
                            class="menu-card flex flex-col text-left bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.98] transition focus:outline-none">
                            
                            <div class="w-full aspect-square bg-gray-100 relative overflow-hidden">
                                <img src="${item.image_url}" alt="${item.name}" class="w-full h-full object-cover">
                                
                                <span class="absolute bottom-2 right-2 bg-gray-900/80 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                    ¥${item.price.toLocaleString()}〜
                                </span>
                            </div>

                            <div class="p-3.5 flex flex-col flex-1 justify-between">
                                <div>
                                    <h3 class="font-black text-gray-800 text-sm leading-tight line-clamp-1">${item.name}</h3>
                                    <p class="text-[11px] text-gray-400 mt-1 line-clamp-2 h-8">${item.description}</p>
                                </div>
                                
                                <div class="mt-2 w-full bg-orange-50 text-orange-600 text-center py-1.5 rounded-xl font-bold text-xs group-hover:bg-orange-500 group-hover:text-white transition">
                                    注文に進む
                                </div>
                            </div>

                        </button>
                    `).join('')}
                </div>
            `;
        } catch (e) {
            console.error(e);
            container.innerHTML = `<p class="text-center text-red-500 py-8">メニューの読み込み中にエラーが発生しました。</p>`;
        }
    },

    loadAdminOrders() {
        const listContainer = document.getElementById('admin-orders-list');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="text-center py-12 text-gray-400 text-sm">
                    現在、有効な注文はありません。（API未実装の場合はここへロード処理を統合してください）
                </div>
            `;
        }
    },

    isCartEmpty() {
        return Object.keys(this.state.cart).length === 0;
    },

    changeQty(id, delta) {
        const current = this.state.cart[id] || 0;
        const menu = this.state.menus.find(m => m.square_item_id === id);
        if (!menu) return;
        const next = Math.max(0, Math.min(30, Math.min(menu.remaining, current + delta)));
        this.state.cart[id] = next;
        this.renderMenus();
        this.updateCartBar();
    },

    updateCartBar() {
        let total = 0;
        let count = 0;
        let currentTargetDate = '';
        
        for (let key in this.state.cart) {
            const item = this.state.cart[key];
            total += item.price * item.qty;
            count += item.qty;
            currentTargetDate = item.orderDate;
        }
        
        const totalDisplay = document.getElementById('cart-total-display');
        const cartBar = document.getElementById('cart-bar');
        
        if (count > 0) {
            if (totalDisplay) {
                totalDisplay.innerText = `【${currentTargetDate} 受取分】 合計: ¥${total.toLocaleString()}`;
            }
            
            let clearBtn = document.getElementById('cart-clear-btn');
            if (!clearBtn && cartBar) {
                clearBtn = document.createElement('button');
                clearBtn.id = 'cart-clear-btn';
                clearBtn.innerText = 'カートを空にする';
                clearBtn.className = 'text-xs text-red-200 underline font-medium hover:text-red-300 ml-4 focus:outline-none transition z-50 cursor-pointer';
                
                clearBtn.onclick = (e) => {
                    e.stopPropagation(); 
                    if (confirm("カートの商品をすべて削除してもよろしいですか？\n（選択していた受取日・注文者も変更できるようになります）")) {
                        app.state.cart = {}; 
                        app.updateCartBar(); 
                        app.renderAdminCustomerSelector(); // ★ 空にしたら注文者セレクターの状態（ロック解除）を再描画
                        alert("カートを空にしました。");
                    }
                };
                
                cartBar.appendChild(clearBtn);
            }

            if (cartBar) {
                cartBar.classList.remove('hidden');
                cartBar.style.opacity = "1";
                cartBar.style.display = "flex"; 
                cartBar.style.justifyContent = "between"; 
                cartBar.style.alignItems = "center";
            }
        } else {
            if (totalDisplay) totalDisplay.innerText = '¥0';
            
            const clearBtn = document.getElementById('cart-clear-btn');
            if (clearBtn) clearBtn.remove();
            
            if (cartBar) {
                cartBar.classList.add('hidden');
                cartBar.style.display = "none";
            }
        }
    },

    renderMenus() {
        const container = document.getElementById('menu-list');
        if (!container) return;

        if (this.state.menus.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-8">選択された日付のメニューはありません。</p>';
            return;
        }

        container.innerHTML = this.state.menus.map(item => `
            <div class="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 flex flex-col">
                ${item.image_url ? `
                    <div onclick="app.openOptionModal('${item.square_item_id}')" 
                         role="button"
                         tabindex="0"
                         class="w-full h-48 bg-gray-50 flex items-center justify-center p-2 cursor-pointer active:bg-gray-100 transition duration-200 select-none touch-manipulation"
                         style="-webkit-tap-highlight-color: rgba(0,0,0,0.1);">
                        <img src="${item.image_url}" class="w-full h-full object-contain pointer-events-none">
                    </div>
                ` : ''}
                
                <div class="p-4 flex flex-col flex-grow justify-between">
                    <div>
                        <h3 class="font-bold text-gray-800 text-lg">${item.name}</h3>
                        <p class="text-gray-500 text-sm mt-1 line-clamp-2">${item.description || ''}</p>
                    </div>
                    <div class="mt-4 flex justify-between items-center">
                        <span class="text-main font-bold text-lg">¥${item.price.toLocaleString()}〜</span>
                        <button onclick="app.openOptionModal('${item.square_item_id}')" class="bg-main text-white px-4 py-2 rounded-full text-sm font-bold active:bg-opacity-80 transition">
                            選択する
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    confirmOrder() {
        const content = document.getElementById('modal-content');
        if (!content) return;
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
        const modal = document.getElementById('modal');
        if (modal) modal.classList.remove('hidden');
    },

    async openOptionModal(squareItemId) {
        let modal = document.getElementById('option-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'option-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 hidden';
            document.body.appendChild(modal);
        }

        modal.innerHTML = '<div class="bg-white p-6 rounded-lg max-w-md w-full text-center font-bold">Squareから最新情報を読み込み中...</div>';
        modal.classList.remove('hidden');

        try {
            const res = await fetch(`/api/menus?square_item_id=${squareItemId}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            const item = data.item;

            modal.innerHTML = `
                <div class="bg-white rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto p-6 flex flex-col justify-between shadow-xl">
                    <div class="flex-grow overflow-y-auto mb-6 pr-1">
                        <h2 class="text-xl font-bold text-gray-800 mb-2">${item.name}</h2>
                        <p class="text-gray-500 text-sm mb-6">${item.description || ''}</p>
                        
                        <div class="mb-6 text-left">
                            <label class="block text-gray-700 font-bold mb-2 text-sm border-l-4 border-emerald-600 pl-2">サイズ / 種類 (必須)</label>
                            <div class="space-y-2">
                                ${item.variations.map((v, idx) => {
                                    const radioId = `var_${v.id.replace(/[^a-zA-Z0-9]/g, '_')}_${idx}`;
                                    return `
                                    <label for="${radioId}" class="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 bg-white select-none">
                                        <span class="flex items-center">
                                            <input type="radio" 
                                                   id="${radioId}"
                                                   name="square_variation" 
                                                   value="${v.id}" 
                                                   data-price="${v.price}" 
                                                   onchange="app.calculateModalPrice()"
                                                   ${idx === 0 ? 'checked' : ''} 
                                                   class="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer">
                                            <span class="text-gray-800 font-bold">${v.name}</span>
                                        </span>
                                        <span class="font-bold text-gray-700">¥${Number(v.price).toLocaleString()}</span>
                                    </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        ${item.options.map((optList, oIdx) => `
                            <div class="mb-6 text-left">
                                <label class="block text-gray-700 font-bold mb-2 text-sm border-l-4 border-gray-400 pl-2">
                                    ${optList.name} ${optList.selection_type === 'SINGLE' ? '(1つまで・再タップで解除可)' : '(複数選択可)'}
                                </label>
                                <div class="space-y-2">
                                    ${optList.modifiers.map((m, mIdx) => {
                                        const checkId = `mod_${m.id.replace(/[^a-zA-Z0-9]/g, '_')}_${oIdx}_${mIdx}`;
                                        const inputType = optList.selection_type === 'SINGLE' ? 'radio' : 'checkbox';
                                        return `
                                        <label for="${checkId}" class="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 bg-white select-none">
                                            <span class="flex items-center">
                                                <input type="${inputType}" 
                                                       id="${checkId}"
                                                       name="square_modifier_${optList.id}" 
                                                       value="${m.id}" 
                                                       data-price="${m.price}" 
                                                       onclick="app.handleModifierClick(this, '${inputType}')"
                                                       class="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer">
                                                <span class="text-gray-700">${m.name}</span>
                                            </span>
                                            <span class="text-gray-500 text-sm font-medium">+¥${Number(m.price).toLocaleString()}</span>
                                        </label>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="mb-4 p-3 bg-emerald-50 rounded-lg flex justify-between items-center text-emerald-900">
                        <span class="font-bold text-sm">現在の選択合計</span>
                        <span id="modal-total-price" class="text-xl font-black">¥0</span>
                    </div>

                    <div class="flex space-x-3 pt-4 border-t border-gray-100 bg-white sticky bottom-0">
                        <button onclick="document.getElementById('option-modal').classList.add('hidden')" class="w-1/2 border border-gray-300 py-3 rounded-full font-bold text-gray-600 hover:bg-gray-50 transition">
                            キャンセル
                        </button>
                        <button onclick="app.confirmAddToCart('${item.id}', '${item.name}')" class="w-1/2 bg-emerald-600 text-white py-3 rounded-full font-black hover:bg-emerald-700 transition shadow-md block text-center text-base tracking-wider z-50">
                            カートに追加
                        </button>
                    </div>
                </div>
            `;

            this.calculateModalPrice();

        } catch (e) {
            modal.innerHTML = `<div class="bg-white p-6 rounded-lg max-w-md w-full text-center text-red-500 font-bold">エラー: ${e.message}</div>`;
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

    // カートへの最終追加処理
    confirmAddToCart(itemId, itemName) {
        const dateElement = document.getElementById('order-date');
        const orderDate = dateElement ? dateElement.value : '';
        
        if (!orderDate) {
            alert("受取日を選択してください。");
            return;
        }

        // ★【追加】管理者モード時の注文主（顧客のID）を判別する
        let targetCustomerId = this.state.user.id; // デフォルトは自分
        let targetCustomerName = this.state.user.name;

        if (this.state.user.isAdmin) {
            const selectEl = document.getElementById('admin-customer-select');
            if (selectEl) {
                targetCustomerId = selectEl.value;
                targetCustomerName = selectEl.options[selectEl.selectedIndex].text.replace('様', '').trim();
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

        // カートのキー（注文主ごとに別のカートアイテムとして保持できるよう顧客IDも結合）
        const cartKey = `${orderDate}_${targetCustomerId}_${itemId}_${variationId}_${selectedModifiers.map(m => m.id).sort().join('_')}`;
        
        if (!this.state.cart[cartKey]) {
            this.state.cart[cartKey] = {
                orderDate, 
                customerId: targetCustomerId,     // ★ カートの要素に注文対象の顧客IDを持たせる
                customerName: targetCustomerName, // 表示用ネーム
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
        this.renderAdminCustomerSelector(); // カート追加後にセレクターを再描画（Disabledロックをかけるため）
    },

    // =========================================================
    // appオブジェクトの通信・ハンドリングロジック
    // =========================================================

    // 1. 新規登録用に、Squareカタログから「上位アイテム(親商品)」の一覧を取得してセレクターを構築
    async loadSquareItems() {
        const select = document.getElementById('edit-square-item-select');
        if (!select) return;

        try {
            const res = await fetch('/api/admin/square-items');
            if (!res.ok) throw new Error("Squareデータのロード失敗");
            
            // バックエンドから整形済みの親子オブジェクト配列が届く
            this.state.squareItemsCache = await res.json(); 

            if (this.state.squareItemsCache.length === 0) {
                select.innerHTML = '<option value="">登録可能なSquare商品がありません</option>';
                return;
            }

            let html = '<option value="">登録する商品を選択してください...</option>';
            this.state.squareItemsCache.forEach((item, index) => {
                html += `
                    <option value="${item.square_item_id}" data-index="${index}">
                        ${item.name} (${item.variations.length}個のバリエーションを含みます)
                    </option>
                `;
            });
            select.innerHTML = html;
        } catch (e) {
            console.error(e);
            select.innerHTML = '<option value="">商品の取得に失敗しました</option>';
        }
    },

    // 2. メニューにアイテム単位で新規追加（バリエーションが同時展開されてDBに保存される）
    async addMenuFromSquare() {
        const select = document.getElementById('edit-square-item-select');
        const remainingInput = document.getElementById('edit-menu-remaining');
        const statusSelect = document.getElementById('edit-menu-status');

        if (!select || select.value === "") return alert("登録する商品を選択してください");

        const selectedIndex = select.options[select.selectedIndex].getAttribute('data-index');
        const selectedItem = this.state.squareItemsCache[selectedIndex];

        // 選択された親商品オブジェクトと、バリエーションの配列をそのまま送信
        const data = {
            square_item_id: selectedItem.square_item_id,
            name: selectedItem.name,
            variations: selectedItem.variations, // 子バリエーション配列
            default_remaining: parseInt(remainingInput.value, 10) || 0,
            default_is_visible: parseInt(statusSelect.value, 10)
        };

        try {
            const res = await fetch('/api/admin/menus/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok && result.success) {
                alert(`「${selectedItem.name}」とそのバリエーションを登録しました。`);
                this.loadAdminMenuList();
            } else {
                alert(result.message || "登録に失敗しました");
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
    },

    // 3. 管理画面用：バリエーション単位で在庫数・表示フラグを一覧に描画
    async loadAdminMenuList() {
        const tbody = document.getElementById('admin-menu-list-tbody');
        if (!tbody) return;

        try {
            const res = await fetch('/api/admin/menus');
            if (!res.ok) throw new Error("管理リストの取得に失敗しました");
            const variationsList = await res.json();

            if (variationsList.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-400 py-12">登録済みのメニューバリエーションはありません。</td></tr>';
                return;
            }

            tbody.innerHTML = variationsList.map(item => `
                <tr class="hover:bg-gray-50/50 transition">
                    <td class="p-4">
                        <div class="text-xs font-bold text-orange-600 uppercase tracking-wider">${item.parent_name}</div>
                        <div class="font-bold text-gray-800 text-base mt-0.5">${item.variation_name}</div>
                        <div class="text-xs text-gray-500 mt-1">価格: ¥${item.price.toLocaleString()}</div>
                    </td>
                    <td class="p-4 text-center">
                        <input type="number" id="qty-${item.variation_db_id}" value="${item.remaining}" min="0" 
                            class="w-20 border border-gray-200 rounded-lg px-2 py-1 text-center font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                    </td>
                    <td class="p-4 text-center">
                        <select id="status-${item.variation_db_id}" class="border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-xs font-bold text-gray-700">
                            <option value="1" ${item.is_visible === 1 ? 'selected' : ''}>ON (表示)</option>
                            <option value="0" ${item.is_visible === 0 ? 'selected' : ''}>OFF (非表示)</option>
                        </select>
                    </td>
                    <td class="p-4 text-center">
                        <button onclick="app.updateAdminMenu('${item.variation_db_id}')" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm">
                            保存
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-red-500 py-12">データの読み込みに失敗しました。</td></tr>';
        }
    },

    // 4. バリエーション単位での在庫数・表示フラグ（ON/OFF）更新を保存
    async updateAdminMenu(variationDbId) {
        const remaining = parseInt(document.getElementById(`qty-${variationDbId}`).value, 10);
        const isVisible = parseInt(document.getElementById(`status-${variationDbId}`).value, 10);

        if (isNaN(remaining) || remaining < 0) return alert("正しい在庫数を入力してください");

        try {
            const res = await fetch(`/api/admin/menus/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variation_db_id: variationDbId, remaining, is_visible: isVisible })
            });
            const result = await res.json();

            if (res.ok && result.success) {
                alert("バリエーション状態を更新しました");
                this.loadAdminMenuList();
            } else {
                alert(result.message || "更新に失敗しました");
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
    },
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
    window.addEventListener('popstate', function(e) {
        alert("この画面ではブラウザの「戻る」ボタンはご利用いただけません。アプリ内のボタン操作をお願いいたします。");
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
        // 1. 日付変更の監視
        if (e.target && e.target.id === 'order-date') {
            const dateInput = e.target;
            const cartCount = Object.keys(app.state.cart).length;

            if (cartCount > 0) {
                alert("すでにカートに商品が入っているため、受取日を変更できません。\n変更する場合は一度カートを空にしてください。");
                dateInput.value = lastCheckedDate;
                return;
            }

            lastCheckedDate = dateInput.value;
            console.log("受取希望日を変更しました:", lastCheckedDate);
        }
    });
})();