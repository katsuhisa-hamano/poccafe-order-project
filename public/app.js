const router = {
    go(view) {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        
        const target = document.getElementById(`view-${view}`);
        if (target) target.classList.remove('hidden');

        const header = document.getElementById('main-header');
        const cartBar = document.getElementById('cart-bar');

        if (view === 'login') {
            header.classList.add('hidden');
            cartBar.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
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
        user: { id: null, name: null },
        resetToken: null // パスワードリセット用一時保管
    },

    // ログイン処理（パスワード対応）
    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) return alert("メールアドレスとパスワードを入力してください");

        try {
            // 安全のため、GETパラメータにパスワードを付与して送信（既存のサーバー構造を維持）
            const res = await fetch(`/api/auth/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
            const result = await res.json();

            if (res.ok && result.success) {
                const user = result.user;
                this.state.user.id = user.square_customer_id;
                this.state.user.name = user.name;
                
                localStorage.setItem('cafe_user_id', user.square_customer_id);
                localStorage.setItem('cafe_user_name', user.name);
                
                document.getElementById('userDisplay').innerText = `ログイン中: ${user.name}様`;
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
        this.state.user = { id: null, name: null };
        this.state.cart = {};
        this.updateCartBar();
        router.go('login');
    },

    // 新規登録申請（パスワードをペイロードに含む）
    async submitRegister() {
        const btn = document.getElementById('reg-submit-btn');
        const data = {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            tel: document.getElementById('reg-tel').value,
            password: document.getElementById('reg-password').value // 追加
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
                throw new Error();
            }
        } catch (e) {
            alert("登録処理中にエラーが発生しました。");
        } finally {
            btn.innerText = "認証メールを送る";
            btn.disabled = false;
        }
    },

    // パスワードリセットメール申請の送信
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
        if (!this.state.resetToken) return alert("トークンが無効です。メールのリンクから再度やり直してください。");

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
                // URLパラメータをクリアしてログイン画面へ
                window.history.replaceState({}, document.title, window.location.pathname);
                router.go('login');
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
    init() {
        // URLのパラメータから "?token=xxxx" を取得
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        // 【修正】tokenがURLパラメータ（クエリ）に存在していれば、一瞬でリセット画面を開く
        if (token) {
            this.state.resetToken = token;
            
            // ページ全体の読み込み完了を待ってからモーダルを表示（念のための安全策）
            setTimeout(() => {
                const resetModal = document.getElementById('reset-modal');
                if (resetModal) {
                    resetModal.classList.remove('hidden');
                } else {
                    console.error("reset-modal が見つかりません");
                }
            }, 100);
            
            // ログインチェックや日付自動入力などの以降の処理はスキップ、または並行して実行
            document.getElementById('order-date').valueAsDate = new Date();
            return; // ログイン画面への自動遷移を防ぐためにここで処理を抜ける
        }

        // --- 以下は通常の起動時（トークンがない時）の処理 ---
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

    // モーダル表示切り替え
    showRegister() { document.getElementById('register-modal').classList.remove('hidden'); },
    closeRegister() { document.getElementById('register-modal').classList.add('hidden'); },
    showForgotPassword() { document.getElementById('forgot-modal').classList.remove('hidden'); },
    closeForgotPassword() { document.getElementById('forgot-modal').classList.add('hidden'); },
    closeModal() { document.getElementById('modal').classList.add('hidden'); },

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
    }
};

// 起動
app.init();