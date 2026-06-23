// =========================================================
// 0. 管理者画面テンプレート定義 (adminView)
// =========================================================
const adminView = {
    render: () => {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
        });
        const [{ value: year }, , { value: month }, , { value: day }] = formatter.formatToParts(now);
        const todayStr = `${year}/${month}/${day}`;
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
                            メニューを管理する
                        </button>
                        <button onclick="router.go('holiday-edit')" class="bg-orange-500 text-white px-5 py-2.5 rounded-full font-bold hover:bg-orange-600 transition text-sm shadow-sm">
                            休日・制限を管理する
                        </button>
                    </div>
                </div>

                <!-- 簡易ステータスカード -->
                <div class="max-w-6xl mx-auto px-4 py-8">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-200 mb-6">
                        <div>
                            <h1 class="text-2xl font-black text-gray-800">当日販売・予約統計</h1>
                            <p class="text-xs text-gray-500 mt-1">当日の製造個数の調整、予約状況、レジ売上、実在庫の残り数をリアルタイムに確認します。</p>
                        </div>
                        <div class="mt-4 sm:mt-0 flex items-center gap-1.5">
                            <div class="mt-4 sm:mt-0 flex items-center space-x-1">
                                <label class="text-xs font-bold text-gray-500">表示日:</label>
                                <input type="date" id="stats-target-date" onchange="app.loadDailyStats()" class="bg-gray-50 p-2.5 rounded-xl text-sm font-bold border border-gray-200 focus:outline-none" value="${todayStr}">
                            </div>
                            <button onclick="app.loadAdminOrders()" class="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-md font-medium hover:bg-gray-50 active:bg-gray-100 transition">
                                同期リフレッシュ
                            </button>
                        </div>
                    </div>

                    <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-gray-50/70 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <th class="p-4">アイテム（バリエーション）名</th>
                                        <th class="p-4 text-center w-40">販売総数</th>
                                        <th class="p-4 text-center w-28">予約販売数</th>
                                        <th class="p-4 text-center w-28">店頭販売数</th>
                                        <th class="p-4 text-center w-28">残数</th>
                                    </tr>
                                </thead>
                                <tbody id="daily-stats-table-body" class="divide-y divide-gray-100 text-sm text-gray-700">
                                    </tbody>
                            </table>
                        </div>
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

                <div class="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm mb-12">
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

                <div class="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
                    <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
                        <h3 class="text-base font-black text-gray-800 mb-4 flex items-center">
                            <span class="w-2.5 h-2.5 bg-indigo-600 rounded-full mr-2"></span>
                            共有在庫マスター管理
                        </h3>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <input type="text" id="new-stock-group-name" placeholder="共有在庫名" class="bg-white border border-gray-300 h-10 px-3 rounded-lg text-sm focus:outline-none" />
                            <input type="number" id="new-stock-group-remaining" placeholder="在庫数" class="bg-white border border-gray-300 h-10 px-3 rounded-lg text-sm focus:outline-none" />
                            <button onclick="app.saveStockGroup()" class="bg-indigo-600 text-white h-10 rounded-lg font-bold hover:bg-indigo-700 text-xs transition shadow-sm">
                                新規共有在庫作成
                            </button>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse text-sm text-gray-700">
                                <thead>
                                    <tr class="border-b border-gray-100 font-bold text-gray-500 text-xs uppercase tracking-wider">
                                        <th class="pb-2">共有在庫名</th>
                                        <th class="pb-2 w-32">共有在庫数</th>
                                        <th class="pb-2 w-24 text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody id="admin-stock-group-list" class="divide-y divide-gray-50">
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
// 【追加】休日・注文制限管理画面テンプレート定義 (holidayEditView)
// =========================================================
const holidayEditView = {
    render: () => {
        return `
            <div class="max-w-4xl mx-auto px-4 py-8">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-gray-200 mb-8">
                    <div>
                        <h1 class="text-3xl font-black text-gray-800 tracking-tight">店舗休日・注文制限管理</h1>
                        <p class="text-sm text-gray-500 mt-1">一般注文カレンダーの定休日、臨時休業日、当日締め切り制限をカスタマイズします。</p>
                    </div>
                    <div class="mt-4 md:mt-0">
                        <button onclick="router.go('admin')" class="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-full font-bold hover:bg-gray-200 transition text-sm">
                            ダッシュボードに戻る
                        </button>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-8">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">定休日設定（曜日 × 第何週のマトリックス）</label>
                        <div class="bg-gray-50 p-4 rounded-2xl overflow-x-auto">
                            <p class="text-[11px] text-gray-400 mb-4">※休みにしたい該当のマス目にチェックを入れてください（未チェックの曜日は毎週営業になります）。</p>
                            
                            <table class="w-full text-left border-collapse min-w-[500px]">
                                <thead>
                                    <tr class="border-b border-gray-200">
                                        <th class="pb-3 text-xs font-bold text-gray-400 text-center w-16">週 / 曜日</th>
                                        <th class="pb-3 text-sm font-bold text-red-500 text-center">日</th>
                                        <th class="pb-3 text-sm font-bold text-gray-700 text-center">月</th>
                                        <th class="pb-3 text-sm font-bold text-gray-700 text-center">火</th>
                                        <th class="pb-3 text-sm font-bold text-gray-700 text-center">水</th>
                                        <th class="pb-3 text-sm font-bold text-gray-700 text-center">木</th>
                                        <th class="pb-3 text-sm font-bold text-gray-700 text-center">金</th>
                                        <th class="pb-3 text-sm font-bold text-blue-500 text-center">土</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    ${[1, 2, 3, 4, 5].map(w => `
                                        <tr>
                                            <td class="py-3 text-xs font-bold text-gray-500 text-center bg-gray-100/50 rounded-lg">第${w}週</td>
                                            ${[0, 1, 2, 3, 4, 5, 6].map(d => `
                                                <td class="py-3 text-center">
                                                    <label class="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200/50 cursor-pointer transition">
                                                        <input type="checkbox" class="holiday-matrix-checkbox w-4 h-4 accent-orange-500" data-week="${w}" data-day="${d}">
                                                    </label>
                                                </td>
                                            `).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">当日の注文締め切り時間</label>
                        <input type="time" id="cutoff-time" class="bg-gray-50 p-4 rounded-2xl text-sm font-bold focus:outline-none" value="14:00">
                        <p class="text-[10px] text-gray-400 mt-1.5">※現在時刻がこの時間を過ぎると、一般注文画面で「当日」が自動的に選択不可になります。</p>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">特定の臨時休業日を追加</label>
                        <div class="flex space-x-2 mb-3">
                            <input type="date" id="new-holiday" class="bg-gray-50 p-4 rounded-2xl text-sm font-bold focus:outline-none">
                            <button onclick="app.addSpecificHoliday()" class="bg-gray-900 text-white px-6 rounded-2xl text-sm font-bold hover:bg-gray-800 transition">追加</button>
                        </div>
                        <div id="admin-holiday-list" class="flex flex-wrap gap-2">
                            </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">注文期限月</label>
                        <input type="month" id="max-order-month" class="bg-gray-50 p-4 rounded-2xl text-sm font-bold focus:outline-none">
                        <p class="text-[10px] text-gray-400 mt-1.5">※ここで指定した月より先の未来日は、一般ユーザーの注文カレンダーで選択できなくなります（空欄にすると無制限になります）。</p>
                    </div>
                    <div class="pt-4 border-t border-gray-100">
                        <button onclick="app.saveHolidaySettings()" class="w-full bg-orange-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-orange-600 transition text-sm shadow-sm">
                            設定を保存する
                        </button>
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
                    app.loadDailyStats();
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

            case 'holiday-edit':
                const holidayTarget = document.getElementById('view-holiday-edit');
                holidayTarget.innerHTML = holidayEditView.render();
                app.loadAdminHolidaySettings();

            case 'home':
                setTimeout(() => {
                    app.loadMenus();
                    initOrderCalendar();
                }, 1);
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
        payload: {
            customer_id: null, // 注文主のID (本人 or 代理顧客)
            customer_name: null, // 注文主名
            customer_email: null,
            order_date: null,  // 指定された受取日,
            overallPrice: 0,     // カート全体の合計金額
            creater_id: null,  // 注文を作成したユーザーID（管理者が代理注文する場合は管理者のID）
            creater_name: null, //注文作成者名
            items: null
        },
        user: { id: null, name: null, email: null, isAdmin: false },
        adminCustomers: [], // ★【追加】管理者が選べる顧客リストの保管場所
        resetToken: null,
        squareCatalogItems: [],
        availableSquareItems: [],
        stockGroups: [], // 共有在庫グループの情報を保持する配列
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
                this.state.user.email = user.email;
                this.state.user.isAdmin = user.is_admin === 1; 
                
                localStorage.setItem('cafe_user_id', user.square_customer_id);
                localStorage.setItem('cafe_user_name', user.name);
                localStorage.setItem('cafe_user_email', user.email);
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

                /*const dateInput = document.getElementById('order-date');
                if (dateInput && !dateInput.value) {
                    dateInput.valueAsDate = new Date();
                }*/

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
        this.state.user = { id: null, name: null, email: null, isAdmin: false };
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
                const fp = document.getElementById('order-date')._flatpickr;
                if (fp) {
                    fp.setDate(new Date()); // または任意の変更したい日付
                }
            }
            return; 
        }

        const savedId = localStorage.getItem('cafe_user_id');
        const savedName = localStorage.getItem('cafe_user_name');
        const savedEmail = localStorage.getItem('cafe_user_email');
        const savedIsAdmin = localStorage.getItem('cafe_user_is_admin'); 
        
        if (document.getElementById('order-date')) {
            const fp = document.getElementById('order-date')._flatpickr;
            if (fp) {
                fp.setDate(new Date()); // または任意の変更したい日付
            }
        }

        if (savedId && savedName) {
            this.state.user.id = savedId;
            this.state.user.name = savedName;
            this.state.user.email = savedEmail;
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
        // 配置用のラッパー
        const wrapper = document.getElementById('admin-customer-selector-wrapper');
        if (!wrapper) return;

        // 管理者でなければ、中身を空にして非表示にする
        if (!this.state.user || !this.state.user.isAdmin) {
            wrapper.innerHTML = '';
            wrapper.classList.add('hidden');
            return;
        }

        wrapper.classList.remove('hidden');
        
        // =========================================================
        // 【重要】書き換え前に、現在ユーザーが選んでいる値を取得しておく
        // =========================================================
        const currentSelect = document.getElementById('admin-customer-select');
        // もしすでに要素が存在していればその選択値を、なければログイン中の本人IDをデフォルトにする
        const selectedValue = currentSelect ? currentSelect.value : this.state.user.id;
        
        // すでにカートに商品がある場合は変更不可にするための属性制御
        const isCartActive = Object.keys(this.state.cart || {}).length > 0;
        const disabledAttr = isCartActive ? 'disabled' : '';

        // 本人注文オプションの selected 判定
        const isUserSelected = selectedValue === this.state.user.id ? 'selected' : '';

        wrapper.innerHTML = `
            <div class="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <label for="admin-customer-select" class="block text-amber-900 font-bold text-sm mb-1.5 flex items-center">
                    <span class="bg-amber-600 text-white text-xs px-2 py-0.5 rounded font-black mr-2">管理者権限</span>
                    代理注文：対象の顧客（注文者）を選択してください
                </label>
                <select id="admin-customer-select" ${disabledAttr} class="w-full bg-white border border-amber-300 h-11 px-3 rounded-md text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition">
                    <option value="${this.state.user.id}" ${isUserSelected}>【本人として注文】 ${this.state.user.name}様</option>
                    ${(this.state.adminCustomers || []).map(cust => {
                        // 本人以外を表示
                        if (cust.square_customer_id === this.state.user.id) return '';
                        
                        // =========================================================
                        // 【重要】事前に退避したselectedValueと一致すれば 'selected' を付与
                        // =========================================================
                        const isSelected = cust.square_customer_id === selectedValue ? 'selected' : '';
                        
                        return `<option value="${cust.square_customer_id}" ${isSelected}>${cust.name}様 (${cust.email || 'メールなし'})</option>`;
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
                alert(`顧客「${name}」様を代理入力用として登録し、Squareに同期しました。x:${result.x}`);
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
                // データベースから取得した既存の曜日設定をパース (設定がなければ空配列)
                const allowedDays = menu.available_days ? JSON.parse(menu.available_days) : [];
                const isLimitOn = allowedDays.length > 0;

                return `
                    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-6" data-menu-id="${menu.id}">
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
                                        <option value="${sqItem.id}" ${menu.square_item_id === sqItem.id ? 'selected' : ''}>${sqItem.name} (${sqItem.variations.length}個のバリエーション)</option>
                                    `).join('')}
                                </select>
                                <button onclick="app.submitItemMappingChange(${menu.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap shadow-sm">
                                    変更適用
                                </button>
                            </div>
                        </div>

                        <div class="p-4 bg-amber-50/40 border-b border-gray-100">
                            <div class="flex items-center justify-between">
                                <div>
                                    <label class="block text-gray-800 font-bold text-sm">曜日限定設定</label>
                                    <p class="text-xs text-gray-400">特定の曜日のみ注文可能にする場合はONにします</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="menu-day-limit-toggle-${menu.id}" onchange="app.toggleMenuDayLimit(${menu.id}, this.checked)" class="sr-only peer" ${isLimitOn ? 'checked' : ''}>
                                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                </label>
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <p class="text-xs text-gray-500 font-semibold">販売を許可する曜日を選択（複数選択可）</p>
                                    <button onclick="app.saveMenuAvailableDays(${menu.id})" class="bg-gray-800 hover:bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-sm self-end sm:self-auto">
                                        曜日設定を保存
                                    </button>
                                </div>
                            </div>
                            <div id="menu-days-checkbox-wrapper-${menu.id}" class="${isLimitOn ? '' : 'hidden'} border-t border-gray-200/60 pt-3 mt-3">
                                <div class="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-2">
                                    ${['日', '月', '火', '水', '木', '金', '土'].map((day, dIdx) => {
                                        const isChecked = allowedDays.includes(dIdx.toString());
                                        return `
                                            <label class="flex items-center justify-center p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer hover:bg-gray-50 has-[:checked]:bg-orange-50 has-[:checked]:border-orange-400 has-[:checked]:text-orange-700 transition">
                                                <input type="checkbox" name="menu-available-days-${menu.id}" value="${dIdx}" class="sr-only" ${isChecked ? 'checked' : ''}>
                                                ${day}曜
                                            </label>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="divide-y divide-gray-100 p-2 bg-white">
                            ${menu.variations.length === 0 ? '<p class="text-xs text-gray-400 p-4">バリエーション情報がありません。</p>' : ''}
                            ${menu.variations.map(v => {
                                const isShared = v.stock_group_id !== null && v.stock_group_id !== undefined;
                                const currentGroup = this.state.stockGroups.find(g => g.id === v.stock_group_id);
                                const displayStock = isShared && currentGroup ? currentGroup.remaining : (v.remaining || 0);
                                return `
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
                                            <input type="number" id="v-stock-${v.id}" value="${displayStock}" min="0"
                                            ${isShared ? 'disabled class="w-16 p-1 text-center font-bold rounded border border-gray-200 bg-gray-200 text-gray-400 cursor-not-allowed"' : 'class="w-16 p-1 text-center font-bold rounded border border-gray-300 bg-white text-gray-800"'}>
                                            <select onchange="app.changeStockType('${v.id}', this.value)" class="text-xs bg-white border border-gray-300 p-1.5 rounded focus:outline-none">
                                                <option value="single" ${!isShared ? 'selected' : ''}>単独在庫管理</option>
                                                ${this.state.stockGroups.map(g => `
                                                    <option value="${g.id}" ${v.stock_group_id === g.id ? 'selected' : ''}>[共有] ${g.name}</option>
                                                `).join('')}
                                            </select>
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
                            `}).join('')}
                        </div>
                    </div>
                `;
            }).join('');

        } catch (err) {
            container.innerHTML = `<p class="text-center text-red-500 py-12 text-sm">エラー: ${err.message}</p>`;
        }
/*
        // メニューデータを読み込んだ直後の処理
        const toggle = document.getElementById('menu-day-limit-toggle');

        if (availableDays && availableDays.length > 0) {
            // 曜日限定データがあればスイッチをONにして表示
            toggle.checked = true;
            app.toggleDayLimitCheckboxes(true);

            // 一致する曜日のチェックボックスをONにする
            availableDays.forEach(dayIndex => {
                const cb = document.querySelector(`input[name="menu-available-days"][value="${dayIndex}"]`);
                if (cb) cb.checked = true;
            });
        } else {
            toggle.checked = false;
            app.toggleDayLimitCheckboxes(false);
        }*/
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

    toggleMenuDayLimit(menuId, isLimitOn) {
        // HTML側で埋め込んだ `${menu.id}` と完全に一致するIDを取得
        const wrapper = document.getElementById(`menu-days-checkbox-wrapper-${menuId}`);
        if (!wrapper) {
            console.error(`要素が見つかりません: menu-days-checkbox-wrapper-${menuId}`);
            return;
        }

        if (isLimitOn) {
            // ONになったら hidden クラスを削除して表示する
            wrapper.classList.remove('hidden');
        } else {
            // OFFになったら hidden クラスを追加して非表示にする
            wrapper.classList.add('hidden');
            
            // OFFにされた場合は、選択されていたチェックボックスをすべてクリアする
            const checkboxes = document.querySelectorAll(`input[name="menu-available-days-${menuId}"]`);
            checkboxes.forEach(cb => cb.checked = false);
        }
    },

    async saveMenuAvailableDays(menuId) {
        const toggle = document.getElementById(`menu-day-limit-toggle-${menuId}`);
        let availableDays = [];

        // トグルがONの場合のみ、選択された曜日（0〜6）を取得
        if (toggle && toggle.checked) {
            const checkedBoxes = document.querySelectorAll(`input[name="menu-available-days-${menuId}"]:checked`);
            availableDays = Array.from(checkedBoxes).map(cb => cb.value);
            
            if (availableDays.length === 0) {
                alert("曜日限定設定がONですが、曜日が一つも選択されていません。最低一つチェックするか、トグルをOFFにしてください。");
                return;
            }
        }

        try {
            const res = await fetch(`/api/admin/menus/${menuId}/available-days`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ available_days: JSON.stringify(availableDays) })
            });
            const result = await res.json();

            if (res.ok && result.success) {
                alert("曜日の販売制限設定を保存しました。");
                app.loadAdminMenuList(); // リスト再読み込み
            } else {
                alert(`保存失敗: ${result.message}`);
            }
        } catch (error) {
            console.error("曜日設定保存エラー:", error);
            alert("通信エラーが発生しました。");
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

        // メニューを保存する関数（送信データの組み立て部分）内で実行
        const toggle = document.getElementById('menu-day-limit-toggle');
        let availableDays = [];

        if (toggle && toggle.checked) {
            const checkedBoxes = document.querySelectorAll('input[name="menu-available-days"]:checked');
            availableDays = Array.from(checkedBoxes).map(cb => cb.value); // 例: ["1", "3"]
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
                    available_days: JSON.stringify(availableDays), // データベース保存用にJSON文字列化
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

    // 数量を1増やす（上限を10個にする場合）
    incrementModalQty() {
        const qtyDisplay = document.getElementById('modal-quantity-display');
        if (!qtyDisplay) return;
        
        let currentQty = parseInt(qtyDisplay.innerText, 10) || 1;
        if (currentQty < 10) { // 必要に応じて最大注文数を設定可能
            currentQty++;
            qtyDisplay.innerText = currentQty;
            
            // オプションによる合計金額の再計算ロジックが既にある場合はここで呼び出す
            if (typeof app.calculateModalPrice === 'function') app.calculateModalPrice();
        }
    },

    // 数量を1減らす（最小値は1個）
    decrementModalQty() {
        const qtyDisplay = document.getElementById('modal-quantity-display');
        if (!qtyDisplay) return;
        
        let currentQty = parseInt(qtyDisplay.innerText, 10) || 1;
        if (currentQty > 1) {
            currentQty--;
            qtyDisplay.innerText = currentQty;
            
            // オプションによる合計金額の再計算ロジックが既にある場合はここで呼び出す
            if (typeof app.calculateModalPrice === 'function') app.calculateModalPrice();
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
        //let currentTargetDate = '';
        
        for (let key in app.state.cart) {
            const item = app.state.cart[key];
            total += item.price * item.quantity;
            count += item.quantity;
            //currentTargetDate = item.orderDate;
        }
        
        const totalDisplay = document.getElementById('cart-total-display');
        const cartBar = document.getElementById('cart-bar');
        this.state.overallPrice = total; // カートの合計金額をstateに保存（必要に応じて他のコンポーネントからも参照可能にするため）
        
        if (count > 0) {
            if (totalDisplay) {
                totalDisplay.innerText = `【${this.state.selectedDate} 受取分】 合計: ¥${total.toLocaleString()}`;
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
                        app.state.payload = {
                            customer_id: null,
                            customer_name: null,
                            customer_email: null,
                            order_date: null,
                            overallPrice: 0,
                            creater_id: null,
                            creater_name: null,
                            items: null
                        }
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

        let currentDayOfWeek = null;
        
        if (app.state.selectedDate) {
            const selectedDateObj = new Date(app.state.selectedDate);
            currentDayOfWeek = selectedDateObj.getDay().toString(); // 例: 水曜日なら "3"
        }

        if (this.state.menus.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-8">メニューデータがありません。</p>';
            return;
        }

        // 💡 改善ポイント: 最初に .filter() を使って、表示すべき商品だけに絞り込みます
        const visibleMenus = this.state.menus.filter(item => {
            const allowedDays = item.available_days ? JSON.parse(item.available_days) : [];
            
            // 【超重要】曜日設定が空（[]）の場合は、制限なし（毎日販売）なので常に表示する(true)
            if (allowedDays.length === 0) {
                return true;
            }

            // 日付（曜日）が取得できていない初期状態の時は、念のためすべて表示させておく場合
            if (!currentDayOfWeek) {
                return true; 
            }

            // 曜日設定がある場合のみ、選択された曜日が含まれているかチェック
            return allowedDays.includes(currentDayOfWeek);
        });

        // もし選択された日のメニューが1つも残らなかった場合
        if (visibleMenus.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-8">選択された日付に提供可能なメニューはありません。</p>';
            return;
        }

        // 💡 絞り込まれた綺麗な配列（visibleMenus）に対してのみ HTML を生成して出力
        container.innerHTML = visibleMenus.map(item => {
            return `
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
            `;
        }).join('');
    },

    confirmOrder() {
        const content = document.getElementById('modal-content');
        if (!content) return;
        let html = '';
        let totalAmount = 0; // 合計金額の計算用

        for (let key in app.state.cart) {
            const cartItem = app.state.cart[key];
            
            // カートアイテムが存在し、数量が1以上の場合のみ処理
            if (cartItem && cartItem.quantity > 0) {
                const qty = parseInt(cartItem.quantity, 10);
                const unitPrice = parseInt(cartItem.price, 10) || 0;
                const subtotal = unitPrice * qty; // この商品の小計 (単価×数量)
                totalAmount += subtotal;

                // キー（例: "ITEM_ID:MOD_1,MOD_2"）から元のメニューIDだけを取り出す
                //const [menuId] = key.split(':');
                
                // キャッシュされている menus から該当の商品データを検索
                //const m = this.state.menus.find(x => x.square_item_id === menuId || x.id === menuId);
                const itemName = `${cartItem.itemName} ( ${cartItem.variationName} )`;

                // 【追加】もし選択されたトッピング等があれば、確認画面に副題として出すためのテキスト生成
                let modifierText = '';
                if (cartItem.modifiers && cartItem.modifiers.length > 0) {
                    let modName = "";
                    cartItem.modifiers.forEach(arr => modName += `${modName=="" ? "" : ","} ${arr.name}`);
                    // ※もしトッピング名も画面に細かく出したい場合は、ここに名前引きの処理を書けます。
                    // 今回はシンプルに「カスタマイズあり」などの表記、または選択数を小さく表示します。
                    modifierText = `<div class="text-xs text-gray-400 mt-0.5">カスタム: ${cartItem.modifiers.length}件 （${modName}）</div>`;
                }

                html += `
                <div class="flex justify-between items-center py-3 border-b border-gray-50">
                    <div class="flex flex-col">
                        <span class="font-medium text-gray-700">
                            ${itemName} 
                            <span class="text-orange-600 font-bold text-xl ml-1">x${qty}</span>
                        </span>
                        ${modifierText}
                    </div>
                    <span class="font-black text-gray-900">¥${subtotal.toLocaleString()}</span>
                </div>`;
            }
        }
        html += `
        <hr class="border-t-2 border-500 my-4" />
        <div class="flex justify-between items-center py-3 border-b border-gray-50">
            <div class="flex flex-col">
                <span class="font-medium text-gray-700">合計</span>
            </div>
            <span class="font-black text-gray-900">¥${totalAmount.toLocaleString()}</span>
        </div>`;

        const confirmTotalDisplay = document.getElementById('confirm-total-price');
        if (confirmTotalDisplay) {
            confirmTotalDisplay.innerText = `¥${totalAmount.toLocaleString()}`;
        }
        this.state.payload.overallPrice = totalAmount; // カート全体の合計金額をstateに保存（必要に応じて他の部分で参照可能）
        this.state.payload.items = this.state.cart

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
        const qtyDisplay = document.getElementById('modal-quantity-display');
        if (qtyDisplay) {
            qtyDisplay.innerText = "1"; // モーダルを開くたびに1個に初期化
        }

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
                                    ${optList.name} ${optList.max_selected_modifiers === 0 ? '(複数選択可・再タップで解除可)' : '(1つまで・再タップで解除可)'}
                                </label>
                                <div class="space-y-2">
                                    ${optList.modifiers.map((m, mIdx) => {
                                        const checkId = `mod_${m.id.replace(/[^a-zA-Z0-9]/g, '_')}_${oIdx}_${mIdx}`;
                                        const inputType = optList.max_selected_modifiers === 0 ? 'checkbox' : 'radio';
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

                    <div class="mb-4 p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                        <span class="font-bold text-sm text-gray-700">数量</span>
                        <div class="flex items-center space-x-3 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                            <button type="button" onclick="app.decrementModalQty()" class="w-8 h-8 rounded-full bg-gray-100 text-gray-800 font-bold flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all text-lg">
                                －
                            </button>
                            <span id="modal-quantity-display" class="w-8 text-center font-black text-gray-800 text-base">1</span>
                            <button type="button" onclick="app.incrementModalQty()" class="w-8 h-8 rounded-full bg-gray-100 text-gray-800 font-bold flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all text-lg">
                                ＋
                            </button>
                        </div>
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
        const qtyDisplay = document.getElementById('modal-quantity-display');
        const quantity = qtyDisplay ? (parseInt(qtyDisplay.innerText, 10) || 1) : 1;


        const selectedVar = document.querySelector('input[name="square_variation"]:checked');
        if (selectedVar) {
            total += Number(selectedVar.getAttribute('data-price')) || 0;
        }

        const checkedModifiers = document.querySelectorAll('input[name^="square_modifier_"]:checked');
        checkedModifiers.forEach(input => {
            total += Number(input.getAttribute('data-price')) || 0;
        });

        total *= quantity;

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

        const qtyDisplay = document.getElementById('modal-quantity-display');
        const quantity = qtyDisplay ? (parseInt(qtyDisplay.innerText, 10) || 1) : 1;

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
            const modPrice = Number(input.getAttribute('data-price'))
            totalPrice += modPrice || 0;
            const modName = input.closest('label').querySelector('.text-gray-700').innerText;
            selectedModifiers.push({ id: input.value, name: modName, price: modPrice });
        });

        // カートのキー（注文主ごとに別のカートアイテムとして保持できるよう顧客IDも結合）
        const cartKey = `${orderDate}_${targetCustomerId}_${itemId}_${variationId}_${selectedModifiers.map(m => m.id).sort().join('_')}`;
        
        if (!this.state.cart[cartKey]) {
            this.state.cart[cartKey] = {
                //orderDate, 
                //customerId: targetCustomerId,     // ★ カートの要素に注文対象の顧客IDを持たせる
                //customerName: targetCustomerName, // 表示用ネーム
                itemId,
                itemName,
                variationId,
                variationName,
                modifiers: selectedModifiers,
                price: totalPrice,
                quantity: quantity
            };
        } else {
            this.state.cart[cartKey].quantity += quantity;
        }

        this.state.payload.order_date = orderDate; // 受取日をpayloadにも保存しておく（注文確定時に参照するため）
        this.state.payload.customer_id = targetCustomerId; // 注文確定時に誰の注文か分かるように顧客IDも保存
        this.state.payload.customer_name = this.state.user.isAdmin ? this.state.adminCustomers.find(item => item.square_customer_id === targetCustomerId).name : this.state.user.name;
        this.state.payload.customer_email = this.state.user.isAdmin ? this.state.adminCustomers.find(item => item.square_customer_id === targetCustomerId).email : this.state.user.email;
        this.state.payload.creater_id = this.state.user.id; // 誰がこの注文を作成したか（管理者が代理で作る場合もあるので、実際の注文主とは分けて記録）
        this.state.payload.creater_name = this.state.user.name;

        alert(`【${orderDate} 受取分 / ${targetCustomerName}】\n${itemName} (${variationName}) を${quantity}個カートに追加しました！`);
        document.getElementById('option-modal').classList.add('hidden');
        
        this.updateCartBar();
        this.renderAdminCustomerSelector(); // カート追加後にセレクターを再描画（Disabledロックをかけるため）
    },

    // =========================================================
    // 注文送信・確定処理 (submitOrder)
    // =========================================================
    async submitOrder() {
        // 1. 基本バリデーションチェック
        if (!app.state.selectedDate) {
            alert("受取日を選択してください。");
            return;
        }

        const cartKeys = Object.keys(app.state.cart);
        if (cartKeys.length === 0) {
            alert("カートに商品が入っていません。");
            return;
        }

        // 2. 注文者ID（Squareの顧客ID）の特定
        // 管理者画面で代理注文の顧客が選ばれている場合はそのID、それ以外はログイン中本人のID
        let orderCustomerId = app.state.user.id;
        const adminCustomerSelect = document.getElementById('admin-customer-select');
        if (app.state.user.isAdmin && adminCustomerSelect) {
            orderCustomerId = adminCustomerSelect.value;
        }

        if (!orderCustomerId) {
            alert("注文ユーザーが特定できません。再度ログインしてください。");
            router.go('login');
            return;
        }

        if (!confirm("この内容で注文を確定しますか？")) return;

        // ボタンの二重押し（連打）防止制御
        const submitBtn = document.getElementById('order-submit-btn'); // HTML側の注文確定ボタンのID
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "注文を確定中...";
        }

        try {
            // 4. APIへのリクエスト送信
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.state.payload)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // 5. 注文成功時のクリーンアップ処理
                alert("注文が確定しました！ありがとうございます。");
                
                app.state.cart = {};          // カートの状態を空にする
                app.state.payload = {
                    customer_id: null,
                    customer_name: null,
                    customer_email: null,
                    order_date: null,
                    overallPrice: 0,
                    creater_id: null,
                    creater_name: null,
                    items: null
                }
                app.updateCartBar();          // 下部のカートバーUIをリフレッシュ

                // 必要に応じて、注文履歴画面などへ遷移させる
                if (app.state.user.isAdmin) {
                    router.go('admin');        // 管理者ならダッシュボードへ戻す
                } else {
                    router.go('history');      // 一般ユーザーなら注文履歴（history）へ
                }
            } else {
                // サーバーエラーや在庫切れなどのエラーハンドリング
                alert(`注文に失敗しました:\n${result.message || '未知のエラーが発生しました。'}`);
            }
        } catch (error) {
            console.error("注文送信エラー:", error);
            alert("通信エラーが発生しました。電波状況をご確認の上、再度お試しください。");
        } finally {
            // ボタン状態の復元
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "注文を確定する";
            }
        }
    },

    // 臨時保持用の特定休日配列
    adminSpecificHolidays: [],

    // 【追加】管理者画面：休日設定をAPIから読み込んでUIに反映
    loadAdminHolidaySettings: async function() {
        try {
            const res = await fetch('/api/holiday-settings');
            const data = await res.json();
            if (!data.success) return;

            const {
                disabledMatrix = [],
                cutoffTime = "14:00",
                specificHolidays = [],
                maxOrderMonth = ""
            } = data.settings;
            
            // マトリックスチェックボックスの復元
            document.querySelectorAll('.holiday-matrix-checkbox').forEach(el => {
                const w = el.getAttribute('data-week');
                const d = el.getAttribute('data-day');
                el.checked = disabledMatrix.includes(`${w}-${d}`);
            });

            // 💡 注文期限月の設定値を入力フォームに反映
            const maxMonthInput = document.getElementById('max-order-month');
            if (maxMonthInput) maxMonthInput.value = maxOrderMonth;

            // 締め切り時間
            const cutoffInput = document.getElementById('cutoff-time');
            if (cutoffInput) cutoffInput.value = cutoffTime;

            // 臨時休業日リストの同期と描画
            app.adminSpecificHolidays = specificHolidays;
            app.renderAdminHolidayList();
        } catch (e) {
            console.error("管理者設定読み込みエラー:", e);
        }
    },

    // 【追加】管理者画面：臨時休業日バッジのレンダリング
    renderAdminHolidayList: function() {
        const container = document.getElementById('admin-holiday-list');
        if (!container) return;
        const now = new Date();
        container.innerHTML = app.adminSpecificHolidays.filter(dateStr => {
            const targetDate = new Date(dateStr + "T00:00:00Z");
            return targetDate >= new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        }).map(d => `
            <span class="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold border border-red-100 inline-flex items-center">
                ${d}
                <button onclick="app.removeSpecificHoliday('${d}')" class="ml-2 text-red-400 hover:text-red-700 font-black text-sm">×</button>
            </span>
        `).join('');
    },

    // 【追加】管理者画面：日付追加アクション
    addSpecificHoliday: function() {
        const input = document.getElementById('new-holiday');
        if (!input || !input.value) return;
        const val = input.value;
        if (!app.adminSpecificHolidays.includes(val)) {
            app.adminSpecificHolidays.push(val);
            app.adminSpecificHolidays.sort();
            app.renderAdminHolidayList();
        }
        input.value = '';
    },

    // 【追加】管理者画面：日付削除アクション
    removeSpecificHoliday: function(dateStr) {
        app.adminSpecificHolidays = app.adminSpecificHolidays.filter(d => d !== dateStr);
        app.renderAdminHolidayList();
    },

    // 【追加】管理者画面：設定をD1へ保存
    saveHolidaySettings: async function() {
        const disabledMatrix = [];
        document.querySelectorAll('.holiday-matrix-checkbox:checked').forEach(el => {
            const w = el.getAttribute('data-week');
            const d = el.getAttribute('data-day');
            disabledMatrix.push(`${w}-${d}`);
        });

        const cutoffTime = document.getElementById('cutoff-time').value;
        // 💡 注文期限月の入力値 (例: "2026-08") を取得
        const maxOrderMonth = document.getElementById('max-order-month').value;

        try {
            const res = await fetch('/api/holiday-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    disabledMatrix,
                    cutoffTime,
                    maxOrderMonth, // 💡 追加した注文期限月の値も一緒に送る
                    specificHolidays: app.adminSpecificHolidays // API側で自動的に年月分解して保存されます
                })
            });

            const data = await res.json();
            if (data.success) {
                alert("休日および注文制限設定を細分化して保存しました。");
            } else {
                alert("保存に失敗しました: " + data.message);
            }
        } catch (err) {
            alert("通信エラーが発生しました: " + err.message);
        }
    },

    // =========================================================
    // 【修正版】管理者ダッシュボード：統計データの読み込みと描画（店舗休日連動版）
    // =========================================================
    loadDailyStats: async function() {
        const dateInput = document.getElementById('stats-target-date');
        const tbody = document.getElementById('daily-stats-table-body');
        if (!dateInput || !tbody) return;

        const targetDate = dateInput.value; // "YYYY-MM-DD"

        try {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-400">データを読み込み中...</td></tr>`;

            // 1. 統計データおよび休日設定を一括で取得（または個別にfetch）
            // ※既存の /api/holiday-settings からも休日ルールを取得します
            const [statsRes, holidayRes] = await Promise.all([
                fetch(`/api/admin/daily-stats?date=${targetDate}`),
                fetch('/api/holiday-settings')
            ]);

            const statsData = await statsRes.json();
            const holidayData = await holidayRes.json();

            if (!statsData.success || !holidayData.success) {
                tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500">設定データの読み込みに失敗しました。</td></tr>`;
                return;
            }

            // ---------------------------------------------------------
            // 💡【新設】選択された日が「店舗休日」に該当するかチェック
            // ---------------------------------------------------------
            const selectedDateObj = new Date(targetDate);
            const d = selectedDateObj.getDay(); // 曜日 (0:日 〜 6:土)
            const w = Math.ceil(selectedDateObj.getDate() / 7); // 第何週目か (1〜5)
            const currentMatrixKey = `${w}-${d}`;

            const { disabledMatrix = [], specificHolidays = [] } = holidayData.settings;

            // A. 定休日マトリックス判定
            const isMatrixHoliday = disabledMatrix.includes(currentMatrixKey);
            // B. 臨時休業日判定
            const isSpecificHoliday = specificHolidays.includes(targetDate);

            // 💡 どちらかの休日ルールに該当した場合、テーブルの中に警告を表示して処理を抜ける
            if (isMatrixHoliday || isSpecificHoliday) {
                const holidayReason = isSpecificHoliday ? '【臨時休業日】' : '【定休日】';
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="p-12 text-center bg-red-50/50 rounded-2xl">
                            <p class="text-base font-black text-red-600 flex items-center justify-center gap-1">
                                ⚠️ 選択された日付は ${holidayReason} に設定されています。
                            </p>
                            <p class="text-xs text-gray-400 mt-1">店舗休業日のため、一般注文の受付および当日統計情報の表示はありません。</p>
                        </td>
                    </tr>
                `;
                return;
            }
            // ---------------------------------------------------------

            // 2. 選択された日の曜日（"0"〜"6"）を割り出す
            const currentDayOfWeek = d.toString();

            // 3. 曜日限定メニューの設定に基づいてアイテムをフィルタリング
            const visibleStats = statsData.stats.filter(item => {
                if (!item.availableDays) return true;
                const allowedDays = JSON.parse(item.availableDays);
                if (allowedDays.length === 0) return true;
                return allowedDays.includes(currentDayOfWeek);
            });

            if (visibleStats.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-400">この日付（曜日）に提供可能なメニューアイテムはありません。</td></tr>`;
                return;
            }

            // 4. フィルタリングされたデータを使ってテーブルをレンダリング
            tbody.innerHTML = visibleStats.map(item => {
                const remainingClass = item.remainingCount < 0 ? 'text-red-600 font-black' : (item.remainingCount === 0 ? 'text-amber-600 font-bold' : 'text-green-600 font-bold');
                const inputBgClass = item.isAdjusted && !item.isOriginal ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-700';

                return `
                    <tr class="hover:bg-gray-50/50 transition">
                        <td class="p-4 font-bold text-gray-800">
                            ${item.itemName}
                            ${item.isAdjusted && !item.isOriginal ? '<span class="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-medium">当日値に変更中</span>' : ''}
                        </td>
                        <td class="p-4 text-center">
                            <div class="flex items-center justify-center space-x-1">
                                <input type="number" 
                                       id="m-count-${item.variationId}" 
                                       value="${item.manufactureCount}" 
                                       min="0"
                                       class="w-20 p-1.5 text-center font-bold text-xs rounded-lg border focus:outline-none transition ${inputBgClass}">
                                <button onclick="app.updateDailyManufacture('${item.variationId}')" 
                                        class="bg-gray-800 hover:bg-gray-900 text-white text-[11px] px-2 py-1.5 rounded-lg font-bold transition">
                                    更新
                                </button>
                            </div>
                        </td>
                        <td class="p-4 text-center font-semibold text-gray-600">${item.reservedCount}</td>
                        <td class="p-4 text-center font-semibold text-gray-600">${item.squareSalesCount}</td>
                        <td class="p-4 text-center text-base ${remainingClass}">${item.remainingCount}</td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500">通信エラー: ${err.message}</td></tr>`;
        }
    },

    // 【新設】管理者ダッシュボード：特定のアイテムの当日製造個数を更新
    updateDailyManufacture: async function(variationId) {
        const dateInput = document.getElementById('stats-target-date');
        const qtyInput = document.getElementById(`m-count-${variationId}`);
        if (!dateInput || !qtyInput) return;

        const targetDate = dateInput.value;
        const quantity = parseInt(qtyInput.value, 10);

        if (isNaN(quantity) || quantity < 0) {
            alert("正しいうち数（0以上の数値）を入力してください。");
            return;
        }

        try {
            const res = await fetch('/api/admin/daily-stats/adjust', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetDate,
                    variationId,
                    quantity
                })
            });

            const data = await res.json();
            if (data.success) {
                // 再読み込みして、残り数や「当日値に変更中」のバッジをリフレッシュ
                app.loadDailyStats();
            } else {
                alert("更新に失敗しました: " + data.message);
            }
        } catch (err) {
            alert("通信エラーが発生しました: " + err.message);
        }
    },

    // 共有在庫グループ一覧をロードして画面下部に描画、及びメニュー一覧にバインド
    async loadStockGroups() {
        try {
            const res = await fetch('/api/admin/stock-groups');
            const data = await res.json();
            if (!data.success) return console.error(data.message);
            
            this.state.stockGroups = data.groups; // 状態に保存
            
            // 画面最下部の一覧をレンダリング
            const tbody = document.getElementById('admin-stock-group-list');
            if (!tbody) return;
            
            if (data.groups.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" class="text-center text-gray-400 py-4 text-xs">登録済みの共有在庫はありません。</td></tr>`;
                return;
            }

            tbody.innerHTML = data.groups.map(g => `
                <tr>
                    <td class="py-2">
                        <input type="text" id="group-name-${g.id}" value="${g.name}" class="bg-transparent border-b border-transparent focus:border-gray-300 px-1 py-0.5 focus:bg-white text-sm font-medium w-full" />
                    </td>
                    <td class="py-2">
                        <input type="number" id="group-remaining-${g.id}" value="${g.remaining}" class="bg-transparent border-b border-transparent focus:border-gray-300 px-1 py-0.5 focus:bg-white text-sm font-bold w-20" />
                    </td>
                    <td class="py-2 text-center">
                        <button onclick="app.saveStockGroup(${g.id})" class="text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-800 transition font-bold">
                            更新
                        </button>
                    </td>
                </tr>
            `).join('');

        } catch (e) {
            console.error("共有在庫の読み込みに失敗しました", e);
        }
    },

    // 共有在庫の新規作成および個別変更の保存
    async saveStockGroup(id = null) {
        let name, remaining;
        if (id) {
            name = document.getElementById(`group-name-${id}`).value.trim();
            remaining = parseInt(document.getElementById(`group-remaining-${id}`).value, 10);
        } else {
            name = document.getElementById('new-stock-group-name').value.trim();
            remaining = parseInt(document.getElementById('new-stock-group-remaining').value, 10);
        }

        if (!name || isNaN(remaining)) return alert("共有在庫名とデフォルト在庫数を正しく入力してください");

        try {
            const res = await fetch('/api/admin/stock-groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name, remaining })
            });
            const result = await res.json();
            if (result.success) {
                if(!id) {
                    document.getElementById('new-stock-group-name').value = '';
                    document.getElementById('new-stock-group-remaining').value = '';
                }
                alert(result.message);
                // データの再ロードと再描画
                await this.initMenuEditPage();
            } else {
                alert(result.message);
            }
        } catch (e) {
            alert("通信エラーが発生しました");
        }
    },

    // 各バリエーションの在庫タイプ（単独 or 共有グループ）を変更した際のハンドラ
    async changeStockType(variationId, val) {
        const stockGroupId = val === 'single' ? null : parseInt(val, 10);
        
        try {
            const res = await fetch('/api/admin/variations/stock-type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variationId, stockGroupId })
            });
            const result = await res.json();
            if (result.success) {
                // UIと数値を最新状態に同期するためにメニュー編集面全体を再ビルド
                await this.initMenuEditPage();
            } else {
                alert(result.message);
            }
        } catch (e) {
            alert("在庫設定の更新に失敗しました");
        }
    },

    // メニュー管理ページの統合初期化ライフサイクルに共有在庫の読み込みを組み込む
    async initMenuEditPage() {
        // 1. 共有在庫マスターの読み込み
        await this.loadStockGroups();
        // 2. その後、最新のstockGroups情報を保持した状態で既存のメニュー階層一覧を描画
        if (typeof this.loadAdminMenuList === "function") {
            await this.loadAdminMenuList(); 
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
    window.addEventListener('popstate', function(e) {
        alert("この画面ではブラウザの「戻る」ボタンはご利用いただけません。アプリ内のボタン操作をお願いいたします。");
        window.history.pushState(null, null, window.location.href);
    });
})();

// 日付操作・顧客セレクターの変更を監視する処理
(function() {
    document.addEventListener('change', (e) => {
        // 1. 日付変更の監視
        if (e.target && e.target.id === 'order-date') {
            const cartCount = Object.keys(app.state.cart).length;

            if (cartCount > 0) {
                alert("すでにカートに商品が入っているため、受取日を変更できません。\n変更する場合は一度カートを空にしてください。");
                // カレンダーを元の選択状態に戻すため再同期
                initOrderCalendar(); 
            } else {
                app.state.selectedDate = e.target.value;
            }
        }
    });
})();

// 【追加】カレンダーを休日ルールに基づいてインライン（常時表示）初期化する関数
async function initOrderCalendar() {
    const dateInput = document.getElementById('order-date');
    if (!dateInput) return;

    try {
        const res = await fetch('/api/holiday-settings');
        const data = await res.json();
        if (!data.success) return;

        const { disabledMatrix = [], specificHolidays, cutoffTime, maxOrderMonth } = data.settings;

        const now = new Date();
        const formatter = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
        });
        const [{ value: year }, , { value: month }, , { value: day }] = formatter.formatToParts(now);
        const todayStr = `${year}/${month}/${day}`;
        const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffHour, cutoffMinute, 0, 0);

        const disableRules = [];

        // 締め切り判定
        if (now > cutoffDate) {
            disableRules.push(todayStr);
        }

        // 定休日マトリックス判定用ロジックの共通化
        function isMatrixHoliday(date) {
            const d = date.getDay(); // 曜日 (0:日 〜 6:土)
            const w = Math.ceil(date.getDate() / 7); // その月の第何週目か (1〜5)
            const currentKey = `${w}-${d}`;
            return disabledMatrix.includes(currentKey);
        }

        // ★マトリックス定休日判定ロジックをdisableRulesに追加
        if (disabledMatrix && disabledMatrix.length > 0) {
            disableRules.push(function(date) {
                return isMatrixHoliday(date);
            });
        }

        // 任意の臨時休業日
        if (specificHolidays && specificHolidays.length > 0) {
            specificHolidays.forEach(h => disableRules.push(h));
        }

        // 💡 注文期限月の「最終日」を計算する
        let maxCalendarDate = null;
        if (maxOrderMonth && maxOrderMonth.includes('-')) {
            const [y, m] = maxOrderMonth.split('-').map(Number);
            // 翌月の0日目を指定することで、指定した月の「最終日」を自動算出（例: 2026-08 指定なら 2026-08-31）
            const lastDayOfMaxMonth = new Date(y, m, 0); 
            maxCalendarDate = lastDayOfMaxMonth.getFullYear() + '-' + 
                               String(lastDayOfMaxMonth.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(lastDayOfMaxMonth.getDate()).padStart(2, '0');
        }

        // ---------------------------------------------------------
        // 💡【新設】自動でデフォルト日付（今日 or 翌営業日）を算出するロジック
        // ---------------------------------------------------------
        let defaultTargetDate = app.state.selectedDate; // すでに選択中ならそれを優先

        if (!defaultTargetDate) {
            // app.state.selectedDate が空（初期状態）の場合のみ自動計算
            let checkDate = new Date(); // 今日からチェック開始
            
            // 最大30日先までループして、休み（disable）じゃない一番近い日を探す
            for (let i = 0; i < 30; i++) {
                const checkStr = checkDate.getFullYear() + '-' + String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + String(checkDate.getDate()).padStart(2, '0');
                
                const isCutoff = (i === 0 && now > cutoffDate); // 今日かつ締め切りを過ぎているか
                const isMatrix = isMatrixHoliday(checkDate);   // 定休日か
                const isSpecific = specificHolidays && specificHolidays.includes(checkStr); // 臨時休業か

                // どの休みルールにも引っかからなければ、この日をデフォルト日に決定！
                if (!isCutoff && !isMatrix && !isSpecific) {
                    defaultTargetDate = checkStr;
                    break;
                }
                // 休みだったら次の日に進む
                checkDate.setDate(checkDate.getDate() + 1);
            }
            
            // アプリの状態（state）にも割り出した日付を保存しておく
            app.state.selectedDate = defaultTargetDate;
        }
        // ---------------------------------------------------------

        const fp = flatpickr("#order-date", {
            inline: true,
            appendTo: document.getElementById('inline-calendar-container'),
            locale: "ja",
            minDate: "today",
            maxDate: maxCalendarDate || null,
            disable: disableRules,
            dateFormat: "Y-m-d",
            defaultDate: defaultTargetDate || null, 
            onChange: function(selectedDates, dateStr) {
                const cartCount = Object.keys(app.state.cart).length;
                if (cartCount > 0) {
                    alert("すでにカートに商品が入っているため、受取日を変更できません。\n変更する場合は一度カートを空にしてください。");
                    initOrderCalendar();
                } else {
                    app.state.selectedDate = dateStr;
                    if (typeof app.renderMenus === "function") {
                        app.renderMenus();
                    }
                }
            },
            onReady: function(selectedDates, dateStr) {
                if (typeof app.renderMenus === "function") {
                    app.renderMenus();
                }
            }
        });

        // ---------------------------------------------------------
        // 💡【新設】起動時に選択色を強制的に反映させるコアロジック
        // ---------------------------------------------------------
        if (fp && defaultTargetDate) {
            // 第2引数を true にすると onChange イベントを発火させずに選択状態（色付け）だけを同期できます
            fp.setDate(defaultTargetDate, false); 
        }
        // ---------------------------------------------------------

    } catch (err) {
        console.error("カレンダー初期化エラー:", err);
    }
}