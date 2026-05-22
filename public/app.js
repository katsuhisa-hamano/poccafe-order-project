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
                        <button onclick="router.go('customer-edit')" class="bg-blue-600 text-white px-5 py-2.5 rounded-full font-bold hover:bg-blue-700 transition text-sm shadow-sm">
                            顧客を管理する
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
// 管理者メニュー編集画面ビュー定義 (menuEditView)
// =========================================================
const menuEditView = {
    render: () => {
        return `
            <div class="max-w-4xl mx-auto px-4 py-8 pb-32">
                <div class="flex items-center justify-between pb-6 border-b border-gray-200 mb-8">
                    <div>
                        <h1 class="text-2xl font-black text-gray-800 tracking-tight">メニュー構造・在庫管理</h1>
                        <p class="text-xs text-gray-500 mt-1">ITEM（親商品）の並び替え、Square同期、在庫設定が行えます。</p>
                    </div>
                    <button onclick="router.go('admin')" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition text-xs">
                        ダッシュボード戻る
                    </button>
                </div>

                <div class="space-y-6 mb-12" id="admin-menu-hierarchy-list">
                    <p class="text-center text-gray-400 py-12 text-sm">メニューデータを読み込んでいます...</p>
                </div>

                <div class="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm">
                    <h3 class="text-sm font-black text-orange-800 mb-3 flex items-center">
                        <span class="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded font-bold mr-2">新規追加</span>
                        Squareから新しいITEMを追加する
                    </h3>
                    <div class="flex flex-col sm:flex-row gap-3">
                        <select id="new-square-item-selector" class="flex-1 bg-white border border-orange-300 h-11 px-3 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500">
                            <option value="">Squareのカタログから商品を選択...</option>
                        </select>
                        <button onclick="app.addNewItemFromSquare()" class="bg-orange-600 text-white px-6 h-11 rounded-xl font-bold hover:bg-orange-700 text-sm shadow-sm transition whitespace-nowrap">
                            アプリにメニュー追加
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
};

// =========================================================
// 管理者画面：顧客管理画面ビュー定義 (customerEditView)
// =========================================================
const customerEditView = {
    render: () => {
        return `
            <div class="max-w-4xl mx-auto px-4 py-8">
                <div class="flex items-center justify-between pb-6 border-b border-gray-200 mb-8">
                    <div>
                        <h1 class="text-2xl font-black text-gray-800 tracking-tight">顧客アカウント管理</h1>
                        <p class="text-xs text-gray-500 mt-1">代理入力用顧客の追加、および既存顧客の削除が行えます。</p>
                    </div>
                    <button onclick="router.go('admin')" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition text-xs">
                        ダッシュボード戻る
                    </button>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm mb-8">
                    <h3 class="text-sm font-black text-blue-800 mb-3 flex items-center">
                        <span class="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold mr-2">代理追加</span>
                        電話注文用の顧客を追加する（Square同期）
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <input type="text" id="proxy-customer-name" placeholder="顧客名（例：山田太郎）" class="bg-white border border-blue-300 h-11 px-3 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input type="tel" id="proxy-customer-tel" placeholder="電話番号（例：09012345678）" class="bg-white border border-blue-300 h-11 px-3 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button onclick="app.addProxyCustomer()" class="w-full bg-blue-600 text-white h-11 rounded-xl font-bold hover:bg-blue-700 text-sm shadow-sm transition">
                        代理顧客として新規登録
                    </button>
                </div>

                <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div class="p-4 bg-gray-50 border-b border-gray-100">
                        <h2 class="font-black text-gray-800 text-sm">登録済み顧客一覧</h2>
                    </div>
                    <div class="divide-y divide-gray-100" id="admin-customer-list">
                        <p class="text-center text-gray-400 py-8 text-sm">顧客データを読み込んでいます...</p>
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
            // 一般ホーム画面に戻った際、管理者ならセレクターを生成/描画する
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

            case 'customer-edit':
                const customerTarget = document.getElementById('view-customer-edit');
                if (customerTarget && typeof customerEditView !== 'undefined') {
                    customerTarget.innerHTML = customerEditView.render();
                }
                setTimeout(() => {
                    if (typeof app.loadAdminCustomersEdit === 'function') app.loadAdminCustomersEdit();
                }, 1);
                break;

            case 'menu-edit':
                const editTarget = document.getElementById('view-menu-edit');
                if (editTarget && typeof menuEditView !== 'undefined') {
                    editTarget.innerHTML = menuEditView.render();
                }
                
                // 【修正箇所】setTimeout内の古い呼び出しを統合初期化関数へ変更
                setTimeout(async () => {
                    if (typeof app.initMenuEditPage === 'function') {
                        // 全取得、未登録抽出、セレクター構築、メニュー一覧描画をまとめて実行
                        await app.initMenuEditPage();
                    } else {
                        // 万が一、まだ initMenuEditPage を app.js 側に統合していない場合のフォールバック
                        if (typeof app.loadAvailableSquareItems === 'function') await app.loadAvailableSquareItems();
                        if (typeof app.loadAdminMenuList === 'function') await app.loadAdminMenuList();
                    }
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
        resetToken: null,
        squareCatalogItems: [],
        availableSquareItems: []
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
            name: document.getElementById('reg-name').value.replace(/\s+/g, "").toLowerCase(),
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

    // 1. 顧客一覧のロードと描画
    async loadAdminCustomersEdit() {
        const container = document.getElementById('admin-customer-list');
        if (!container) return;

        try {
            const res = await fetch('/api/admin/customers/edit');
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "データ取得失敗");

            const customers = data.customers || [];
            if (customers.length === 0) {
                container.innerHTML = `<p class="text-center text-gray-400 py-8 text-sm">登録されている顧客はいません。</p>`;
                return;
            }

            container.innerHTML = customers.map(c => {
                // メールアドレスの有無を判定
                const isSelfRegistered = c.email && c.email.trim() !== "";
                // ★【追加】注文データがある（c.has_orders === 1）場合は削除不可
                const isDeleteDisabled = c.has_orders === 1;                
                return `
                    <div class="p-4 flex items-center justify-between gap-4 text-sm">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-gray-800">${c.name}</span>
                                ${isSelfRegistered 
                                    ? `<span class="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded font-bold">一般会員</span>`
                                    : `<span class="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold">代理登録(電話)</span>`
                                }
                            </div>
                            <div class="text-xs text-gray-400 mt-0.5 space-y-0.5">
                                <p>TEL: ${c.tel || '未設定'}</p>
                                ${isSelfRegistered ? `<p>Email: ${c.email}</p>` : ''}
                                ${isDeleteDisabled ? `<p class="text-[11px] text-orange-500 font-medium">※注文データがあるため削除できません</p>` : ''}
                            </div>
                        </div>
                        <div>
                            <button 
                                onclick="app.deleteCustomer(${c.id}, '${c.name}')" 
                                ${isDeleteDisabled ? 'disabled' : ''} 
                                class="text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                                    isDeleteDisabled 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' 
                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                }"
                            >
                                削除
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (err) {
            container.innerHTML = `<p class="text-center text-red-500 py-8 text-sm">エラー: ${err.message}</p>`;
        }
    },

    // 2. 代理入力顧客の新規追加処理
    async addProxyCustomer() {
        const nameInput = document.getElementById('proxy-customer-name');
        const telInput = document.getElementById('proxy-customer-tel');
        
        if (!nameInput || !telInput) return;

        const name = nameInput.value.replace(/\s+/g, "").toLowerCase();
        const tel = telInput.value.trim();

        if (!name || !tel) {
            alert("顧客名と電話番号の両方を入力してください。");
            return;
        }

        try {
            const res = await fetch('/api/admin/customers/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, tel })
            });

            const result = await res.json();
            if (res.ok && result.success) {
                alert(`顧客「${name}」様を代理入力用として登録し、Squareに同期しました。`);
                nameInput.value = "";
                telInput.value = "";
                // リストを再ロード
                await this.loadAdminCustomersEdit();
            } else {
                alert("登録に失敗しました: " + (result.message || "未知のエラー"));
            }
        } catch (e) {
            alert("通信エラーが発生しました: " + e.message);
        }
    },

    // 3. 顧客の削除処理
    async deleteCustomer(customerId, customerName) {
        if (!confirm(`顧客「${customerName}」様のアカウント情報を削除してよろしいですか？\n※この操作は取り消せません。`)) {
            return;
        }

        try {
            const res = await fetch('/api/admin/customers/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: customerId })
            });

            const result = await res.json();
            if (res.ok && result.success) {
                alert("顧客情報を削除しました。");
                await this.loadAdminCustomersEdit();
            } else {
                alert("削除に失敗しました: " + (result.message || "未知のエラー"));
            }
        } catch (e) {
            alert("通信エラーが発生しました: " + e.message);
        }
    },
    
    // 1. Square側から直接全アイテム（バリエーション含む）を取得して保持する
    async loadSquareItems() {
        try {
            // Squareアイテム一覧を取得するバックエンドAPIへのリクエスト（適宜環境に合わせて調整）
            const res = await fetch('/api/admin/square-catalog'); 
            if (!res.ok) throw new Error("Squareカタログの取得に失敗");
            const data = await res.json();
            this.state.squareCatalogItems = data.items || [];
            
            // 最下部の新規追加用セレクターを構築
            this.populateSquareItemSelectors();
        } catch (e) {
            console.error("Squareアイテムロードエラー:", e);
        }
    },

    // 2. アプリDBに登録されている現在のメニュー＆バリエーション階層をロードして描画
    async loadAdminMenuList() {
        const container = document.getElementById('admin-menu-hierarchy-list');
        if (!container) return;

        try {
            const res = await fetch('/api/admin/menus');
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "取得失敗");

            const menus = data.menus;
            if (menus.length === 0) {
                container.innerHTML = `<p class="text-center text-gray-400 py-12 text-sm">登録されているメニューはありません。最下部から追加してください。</p>`;
                return;
            }

            container.innerHTML = menus.map((menu, idx) => {
                return `
                    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden" data-menu-id="${menu.id}">
                        <div class="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <div class="flex flex-col gap-1">
                                    <button onclick="app.moveMenuOrder(${menu.id}, ${idx}, -1)" ${idx === 0 ? 'disabled class="opacity-30"' : ''} class="p-1 hover:bg-gray-200 rounded text-gray-600 text-xs font-bold">▲</button>
                                    <button onclick="app.moveMenuOrder(${menu.id}, ${idx}, 1)" ${idx === menus.length - 1 ? 'disabled class="opacity-30"' : ''} class="p-1 hover:bg-gray-200 rounded text-gray-600 text-xs font-bold">▼</button>
                                </div>
                                <div>
                                    <span class="text-xs text-gray-400 font-mono block">ITEM ID: ${menu.square_item_id}</span>
                                    <h2 class="font-black text-gray-800 text-base">${menu.name}</h2>
                                </div>
                            </div>
                            
                            <div class="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-xl shadow-sm">
                                <label class="text-[11px] font-bold text-gray-500 whitespace-nowrap pl-1">Square紐付け:</label>
                                <select id="change-square-select-${menu.id}" class="bg-gray-50 border border-gray-300 text-xs rounded-lg px-2 py-1.5 font-medium text-gray-700 focus:outline-none focus:bg-white">
                                    <option value="">-- 商品を選択 --</option>
                                    ${(this.state.availableSquareItems || []).map(sqItem => `
                                        <option value="${sqItem.id}">${sqItem.name} (${sqItem.variations.length}個のバリエーション)</option>
                                    `).join('')}
                                </select>
                                <button onclick="app.submitItemMappingChange(${menu.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap shadow-sm">
                                    変更適用
                                </button>
                            </div>
                        </div>

                        <div class="divide-y divide-gray-100 p-2 bg-white">
                            ${menu.variations.length === 0 ? '<p class="text-xs text-gray-400 p-4">バリエーション情報がありません。</p>' : ''}
                            ${menu.variations.map(v => `
                                <div class="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                                    <div class="flex items-center gap-2">
                                        <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                        <div>
                                            <span class="font-bold text-gray-700">${v.name}</span>
                                            <span class="text-xs text-gray-400 ml-2">¥${v.price.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    
                                    <div class="flex items-center gap-4 justify-between sm:justify-end">
                                        <div class="flex items-center gap-1.5">
                                            <label class="text-xs text-gray-500 font-medium">在庫数:</label>
                                            <input type="number" id="v-stock-${v.id}" value="${v.remaining}" min="0" class="w-16 border border-gray-300 rounded-md px-2 py-1 text-center font-bold text-sm bg-gray-50 focus:bg-white focus:outline-none" />
                                        </div>
                                        <div class="flex items-center gap-1.5">
                                            <label class="text-xs text-gray-500 font-medium">表示状態:</label>
                                            <select id="v-visible-${v.id}" class="border border-gray-300 rounded-md px-2 py-1 text-xs font-bold bg-gray-50 focus:bg-white">
                                                <option value="1" ${v.is_visible === 1 ? 'selected' : ''}>ON（表示）</option>
                                                <option value="0" ${v.is_visible === 0 ? 'selected' : ''}>OFF（非表示）</option>
                                            </select>
                                        </div>
                                        <button onclick="app.saveVariationSettings(${v.id})" class="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-gray-900 transition">
                                            保存
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('');

        } catch (err) {
            container.innerHTML = `<p class="text-center text-red-500 py-12 text-sm">エラー: ${err.message}</p>`;
        }
    },

    // 3. セレクター要素にSquareカタログ情報を流し込む共通処理
    populateSquareItemSelectors() {
        const selector = document.getElementById('new-square-item-selector');
        if (!selector) return;

        selector.innerHTML = '<option value="">Squareのカタログから商品を選択...</option>' + 
            this.state.squareCatalogItems.map(item => `
                <option value="${item.id}">${item.name}</option>
            `).join('');
    },

    // 4. ITEM（親商品）の表示順序（sort_order）を変更する処理
    async moveMenuOrder(menuId, currentIndex, direction) {
        // バックエンドに送る並び順配列を構築するために再度API呼び出し等からリストを操作
        try {
            const res = await fetch('/api/admin/menus');
            const data = await res.json();
            const currentMenus = data.menus;

            // 位置を入れ替え
            const targetIndex = currentIndex + direction;
            if (targetIndex < 0 || targetIndex >= currentMenus.length) return;

            const temp = currentMenus[currentIndex];
            currentMenus[currentIndex] = currentMenus[targetIndex];
            currentMenus[targetIndex] = temp;

            // 新しい sort_order の割り当て
            const orderPayload = currentMenus.map((m, index) => ({
                id: m.id,
                sort_order: index
            }));

            const saveRes = await fetch('/api/admin/menus/update-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orders: orderPayload })
            });

            if (saveRes.ok) {
                this.loadAdminMenuList(); // リスト再描画
            } else {
                alert("並び替えの保存に失敗しました");
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
    },

    // 5. SquareメニューセレクターによるITEM変更（マッピング修正）の処理

    /**
     * 個別更新ボタンが押された際、選択されたSquare商品への紐付け変更を確実に実行する
     * @param {number} menuId - アプリ側DBのmenus.id
     */
    async submitItemMappingChange(menuId) {
        // 1. 対象のセレクトボックス要素を特定して値を取得
        const selector = document.getElementById(`change-square-select-${menuId}`);
        if (!selector) return;
        
        const newSquareItemId = selector.value;
        if (!newSquareItemId) {
            alert("切り替えるSquare商品を選択してください。");
            return;
        }

        // 2. Squareカタログ全量データから、選択された商品の詳細構造を特定
        const catalogItems = this.state.availableSquareItems || [];
        const selectedSqItem = catalogItems.find(item => item && item.id === newSquareItemId);
        
        if (!selectedSqItem) {
            alert("選択されたSquare商品のデータが見つかりません。");
            return;
        }

        // 3. 実行前の最終確認
        const confirmMessage = `このメニュー項目を Squareの「${selectedSqItem.name}」に変更してよろしいですか？\n\n※注意: 変更を適用すると、この項目に紐づいていた古いバリエーション情報、在庫数、表示フラグはすべてリセットされ、新しい商品のバリエーション構造に書き換わります。`;
        if (!confirm(confirmMessage)) {
            // キャンセルされた場合は現在のDBの状態に戻すためリストを再描画
            await this.loadAdminMenuList();
            return;
        }

        // 4. 新しい商品構造に合わせてバリエーション配列をフォーマット
        const variationsSrc = selectedSqItem.variations || [];
        const formattedVariations = variationsSrc.map(v => ({
            square_variation_id: v?.id || "",
            name: v?.name || "通常",
            price: v?.price || 0,
            remaining: 0 // 初期在庫は0
        })).filter(v => v.square_variation_id !== ""); // 不正なバリエーションを除外

        try {
            // 5. バックエンドAPIへ更新リクエストを送信
            const res = await fetch('/api/admin/menus/change-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    menu_id: menuId,
                    square_item_id: selectedSqItem.id,
                    name: selectedSqItem.name || "名称未設定の商品",
                    variations: formattedVariations
                })
            });

            const result = await res.json();

            if (res.ok && result.success) {
                alert(`「${selectedSqItem.name}」への変更が正常にテーブルへ反映されました。`);
                
                // 6. 【重要】非同期処理の完了を待ち、画面を最新の状態に強制レンダリング
                // 登録済みメニュー階層一覧の再取得と再描画
                await this.initMenuEditPage();
                // 最下部の「新規追加用プルダウン（未登録リスト）」も同期して更新
                if (typeof this.loadAvailableSquareItems === 'function') {
                    await this.loadAvailableSquareItems();
                }
            } else {
                alert("データベースの更新に失敗しました: " + (result.message || "未知のエラー"));
                await this.initMenuEditPage(); // 状態を戻す
            }
        } catch (e) {
            alert("通信エラーが発生したため、変更を適用できませんでした: " + e.message);
            await this.initMenuEditPage();
        }
    },

    // 6. バリエーションの表示フラグと在庫数の変更を反映する処理
    async saveVariationSettings(varId) {
        const stockInput = document.getElementById(`v-stock-${varId}`);
        const visibleSelect = document.getElementById(`v-visible-${varId}`);
        
        if (!stockInput || !visibleSelect) return;

        const remaining = parseInt(stockInput.value, 10) || 0;
        const is_visible = parseInt(visibleSelect.value, 10);

        try {
            const res = await fetch('/api/admin/menus/update-variation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    variation_id: varId,
                    remaining: remaining,
                    is_visible: is_visible
                })
            });

            const result = await res.json();
            if (res.ok && result.success) {
                alert("バリエーション設定を更新しました。");
                this.loadAdminMenuList();
            } else {
                alert("更新に失敗しました: " + result.message);
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
    },

    // 1. メニュー編集画面を開いたときに最初に呼び出す初期化処理
    async initMenuEditPage() {
        // A. まずSquareの未登録商品リストをバックエンドから取得
        await this.loadAvailableSquareItems();
        
        // B. 次に登録済みメニューの階層構造一覧を描画
        await this.loadAdminMenuList();
    },

    // 2. バックエンドから「未登録のSquare商品」のみを取得してstateに格納
    async loadAvailableSquareItems() {
        try {
            const res = await fetch('/api/admin/square-catalog'); 
            if (!res.ok) throw new Error("Squareカタログの取得に失敗しました");
            const data = await res.json();
            
            // 未登録のアイテムだけがバックエンドから返ってくる
            this.state.availableSquareItems = data.items || [];
            
            // 最下部にある「新規追加用セレクター」の選択肢を再構築
            this.populateNewItemSelector();
        } catch (e) {
            console.error("Squareアイテムロードエラー:", e);
        }
    },

    // 3. 新規追加用セレクターのHTML（<option>）を動的に組み立てる
    populateNewItemSelector() {
        const selector = document.getElementById('new-square-item-selector');
        if (!selector) return;

        if (this.state.availableSquareItems.length === 0) {
            selector.innerHTML = '<option value="">追加可能な新しいSquare商品はすべて登録済みです</option>';
            selector.disabled = true;
            return;
        }

        selector.disabled = false;
        selector.innerHTML = '<option value="">Squareのカタログから商品を選択...</option>' + 
            this.state.availableSquareItems.map(item => `
                <option value="${item.id}">${item.name} (${item.variations.length}個のバリエーション)</option>
            `).join('');
    },

    // 4. 【重要】最下部から新規ITEMを追加したあとの処理
    async addNewItemFromSquare() {
        const selector = document.getElementById('new-square-item-selector');
        if (!selector || !selector.value) return alert("追加するSquare商品を選択してください");

        const selectedSqItem = this.state.availableSquareItems.find(item => item.id === selector.value);
        if (!selectedSqItem) return;

        const formattedVariations = (selectedSqItem.variations || []).map(v => ({
            square_variation_id: v.id,
            name: v.name,
            price: v.price || 0,
            remaining: 0
        }));

        try {
            const res = await fetch('/api/admin/menus/add-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    square_item_id: selectedSqItem.id,
                    name: selectedSqItem.name,
                    variations: formattedVariations
                })
            });

            const result = await res.json();
            if (res.ok && result.success) {
                alert(`「${selectedSqItem.name}」をメニューに追加しました。`);
                
                // ★追加が完了したら、未登録リストを再ロードしてセレクターから今追加した商品を消去する
                await this.loadAvailableSquareItems();
                
                // 階層一覧リストを更新
                await this.loadAdminMenuList();
            } else {
                alert("追加に失敗しました: " + result.message);
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
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
        if (container) container.innerHTML = '<p class="text-center text-gray-500 py-8">メニューを読み込み中...</p>';

        try {
            const res = await fetch('/api/menus');
            if (!res.ok) throw new Error("メニューの取得に失敗しました");
            
            const data = await res.json();
            this.state.menus = Array.isArray(data) ? data : (data.menus || []); 
            
            this.renderMenus(); 
        } catch (e) {
            console.error("メニューロードエラー:", e);
            if (container) container.innerHTML = '<p class="text-center text-red-500 py-8">メニューの読み込みに失敗しました。</p>';
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