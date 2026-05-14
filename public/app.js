const router = {
    go(view) {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        
        const target = document.getElementById(`view-${view}`);
        if (target) target.classList.remove('hidden');

        const header = document.getElementById('main-header');
        const cartBar = document.getElementById('cart-bar');

        if (view === 'login') {
            if (header) header.classList.add('hidden');
            if (cartBar) cartBar.classList.add('hidden');
        } else {
            if (header) header.classList.remove('hidden');
            if (view === 'home' && cartBar) cartBar.classList.remove('hidden');
            else if (cartBar) cartBar.classList.add('hidden');
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
        resetToken: null
    },

    // ログイン処理
    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) return alert("メールアドレスとパスワードを入力してください");

        try {
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
                throw new Error();
            }
        } catch (e) {
            alert("登録処理中にエラーが発生しました。");
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
                
                // モーダルを閉じる
                document.getElementById('reset-modal').classList.add('hidden');
                
                // 【修正】URLのトークン（?token= や #token=）を完全に消し去り、
                // ページをごそっと初期状態（ログイン画面）にリロードする
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

    // 起動時の認証チェック（ハッシュ対応版）
    init() {
        console.log("=== app.js が正常に起動しました ===");
        
        // URLの「#token=xxxx」の部分を解析する
        let token = null;
        if (window.location.hash && window.location.hash.startsWith('#token=')) {
            token = window.location.hash.split('=')[1];
        }

        console.log("ハッシュから検出したトークン:", token);

        // トークンが存在する場合（最優先パスワードリセット画面表示）
        if (token) {
            this.state.resetToken = token;
            
            setTimeout(() => {
                const resetModal = document.getElementById('reset-modal');
                if (resetModal) {
                    resetModal.classList.remove('hidden');
                    resetModal.style.display = 'flex'; // 強制表示
                }
            }, 300);

            if (document.getElementById('order-date')) {
                document.getElementById('order-date').valueAsDate = new Date();
            }
            return; // ログイン画面への自動遷移を防ぐ
        }

        // --- 以下、通常の通常ルート（変更なし） ---
        const savedId = localStorage.getItem('cafe_user_id');
        const savedName = localStorage.getItem('cafe_user_name');
        
        if (savedId && savedName) {
            this.state.user.id = savedId;
            this.state.user.name = savedName;
            const display = document.getElementById('userDisplay');
            if (display) display.innerText = `ログイン中: ${savedName}様`;
            router.go('home');
        } else {
            router.go('login');
        }
        
        if (document.getElementById('order-date')) {
            document.getElementById('order-date').valueAsDate = new Date();
        }
    },

    // モーダル表示切り替え
    showRegister() { document.getElementById('register-modal').classList.remove('hidden'); },
    closeRegister() { document.getElementById('register-modal').classList.add('hidden'); },
    showForgotPassword() { document.getElementById('forgot-modal').classList.remove('hidden'); },
    closeForgotPassword() { document.getElementById('forgot-modal').classList.add('hidden'); },
    closeModal() { document.getElementById('modal').classList.add('hidden'); },

    // 注文ロジック
    async loadMenus() {
        const dateElement = document.getElementById('order-date');
        if (!dateElement) return;
        const date = dateElement.value;
        try {
            const res = await fetch(`/api/menus?date=${date}`);
            if (!res.ok) throw new Error("メニューの取得に失敗しました");
            
            const data = await res.json();
            // 確実に配列である場合のみ代入、そうでなければ空の配列にする
            this.state.menus = Array.isArray(data) ? data : []; 
            this.renderMenus();
        } catch (e) {
            console.error(e);
            this.state.menus = []; // エラー時は空にする
            const container = document.getElementById('menu-list');
            if (container) container.innerHTML = '<p class="text-center text-gray-500 py-4">メニューを読み込めませんでした。</p>';
        }
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
        for (let id in this.state.cart) {
            const m = this.state.menus.find(x => x.square_item_id === id);
            if(m) total += m.price * this.state.cart[id];
        }
        const totalDisplay = document.getElementById('cart-total-display');
        if (totalDisplay) totalDisplay.innerText = `¥${total.toLocaleString()}`;
        
        const cartBar = document.getElementById('cart-bar');
        if (cartBar) cartBar.style.opacity = total > 0 ? "1" : "0.6";
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
                ${item.image_url ? `<img src="${item.image_url}" class="w-full h-40 object-cover">` : ''}
                <div class="p-4 flex flex-col flex-grow justify-between">
                    <div>
                        <h3 class="font-bold text-gray-800 text-lg">${item.name}</h3>
                        <p class="text-gray-500 text-sm mt-1 line-clamp-2">${item.description}</p>
                    </div>
                    <div class="mt-4 flex justify-between items-center">
                        <span class="text-main font-bold text-lg">¥${item.price.toLocaleString()}〜</span>
                        <button onclick="app.openOptionModal('${item.square_item_id}')" class="bg-main text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-opacity-90 transition">
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

    // Squareからリアルタイムにバリエーションとオプションを取得して画面に出す
    async openOptionModal(squareItemId) {
        // 画面上にダイアログ（モーダル）の枠が無い場合は作成する
        let modal = document.getElementById('option-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'option-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 hidden';
            document.body.appendChild(modal);
        }

        modal.innerHTML = '<div class="bg-white p-6 rounded-lg max-w-md w-full text-center">読み込み中...</div>';
        modal.classList.remove('hidden');

        try {
            const res = await fetch(`/api/menus?square_item_id=${squareItemId}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            const item = data.item;

            // モーダルの中身をリッチに書き換え
            modal.innerHTML = `
                <div class="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto p-6 relative flex flex-col justify-between">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800 mb-2">${item.name}</h2>
                        <p class="text-gray-500 text-sm mb-4">${item.description}</p>
                        
                        <div class="mb-4 text-left">
                            <label class="block text-gray-700 font-bold mb-2">サイズ / 種類</label>
                            <div class="space-y-2">
                                ${item.variations.map((v, idx) => `
                                    <label class="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <span class="flex items-center">
                                            <input type="radio" name="square_variation" value="${v.id}" data-price="${v.price}" ${idx === 0 ? 'checked' : ''} class="mr-2 text-main focus:ring-main">
                                            ${v.name}
                                        </span>
                                        <span class="font-bold text-gray-700">¥${Number(v.price).toLocaleString()}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        ${item.options.map(optList => `
                            <div class="mb-4 text-left">
                                <label class="block text-gray-700 font-bold mb-2">${optList.name}</label>
                                <div class="space-y-2">
                                    ${optList.modifiers.map(m => `
                                        <label class="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                            <span class="flex items-center">
                                                <input type="${optList.selection_type === 'SINGLE' ? 'radio' : 'checkbox'}" name="square_modifier_${optList.id}" value="${m.id}" data-price="${m.price}" class="mr-2 text-main focus:ring-main">
                                                ${m.name}
                                            </span>
                                            <span class="text-gray-500 text-sm">+¥${Number(m.price).toLocaleString()}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="mt-6 flex space-x-3">
                        <button onclick="document.getElementById('option-modal').classList.add('hidden')" class="w-1/2 border border-gray-300 py-3 rounded-full font-bold text-gray-600 hover:bg-gray-50">
                            キャンセル
                        </button>
                        <button onclick="app.confirmAddToCart('${item.id}', '${item.name}')" class="w-1/2 bg-main text-white py-3 rounded-full font-bold hover:bg-opacity-90">
                            カートに追加
                        </button>
                    </div>
                </div>
            `;
        } catch (e) {
            modal.innerHTML = `<div class="bg-white p-6 rounded-lg max-w-md w-full text-center text-red-500">エラー: ${e.message}</div>`;
        }
    },

    // カントへの最終追加処理
    confirmAddToCart(itemId, itemName) {
        const selectedVar = document.querySelector('input[name="square_variation"]:checked');
        if (!selectedVar) return alert("サイズを選択してください");

        const variationId = selectedVar.value;
        let totalPrice = Number(selectedVar.dataset.price);
        
        // 選択されたオプションの価格を加算
        const selectedModifiers = [];
        const modifierInputs = document.querySelectorAll('input[name^="square_modifier_"]:checked');
        modifierInputs.forEach(input => {
            totalPrice += Number(input.dataset.price);
            selectedModifiers.push(input.value);
        });

        // ここであなたのカートオブジェクトにデータを保存します
        console.log("カート投入:", { itemId, itemName, variationId, selectedModifiers, totalPrice });
        
        alert(`${itemName} をカートに追加しました！ (合計: ¥${totalPrice.toLocaleString()})`);
        document.getElementById('option-modal').classList.add('hidden');
    }
};

// 起動確認
app.init();

// =========================================================
// ブラウザの「戻る」ボタンを完全に無効化（ブロック）する処理
// =========================================================
(function() {
    // 現在のページの履歴（ダミー）を新しく1つ歴史に差し込む
    window.history.pushState(null, null, window.location.href);

    // ユーザーがブラウザの「戻る」を押した瞬間をキャッチ
    window.addEventListener('popstate', function(e) {
        // 警告アラートを出す場合（必要なければ alert の行は消してOKです）
        alert("この画面ではブラウザの「戻る」ボタンはご利用いただけません。アプリ内のボタン操作をお願いいたします。");

        // 強制的に歴史を1歩進めて、現在のURLに引き戻す
        window.history.pushState(null, null, window.location.href);
    });
})();