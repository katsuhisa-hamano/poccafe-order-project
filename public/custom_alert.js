/**
 * 共有カスタムダイアログ関数（Alert & Confirm 対応）
 * @param {string} message - 表示したいメッセージ
 * @param {string} textColor - 文字の色（省略時は黒 #333333）
 * @param {boolean} isConfirm - trueにすると「キャンセル」ボタンが付いたconfirmモードになります
 * @returns {Promise<boolean>} - OKならtrue、キャンセルならfalseを返します
 */
function sharedDialog(message, textColor = '#333333', isConfirm = false) {
  return new Promise((resolve) => {
    // 1. すでにダイアログが表示されている場合は重複して作らない（falseを返して終了）
    if (document.getElementById('shared-dialog-overlay')) {
      resolve(false);
      return;
    }

    // 2. 背景の黒いモヤ（オーバーレイ）を作成
    const overlay = document.createElement('div');
    overlay.id = 'shared-dialog-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0', left: '0',
      width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '99999',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    // 3. ダイアログの白枠を作成
    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      backgroundColor: '#ffffff',
      padding: '24px',
      borderRadius: '14px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      textAlign: 'center',
      maxWidth: '320px',
      width: '85%',
      boxSizing: 'border-box'
    });

    // 4. メッセージテキストを作成
    const text = document.createElement('p');
    text.textContent = message;
    Object.assign(text.style, {
      color: textColor,
      fontSize: '16px',
      lineHeight: '1.5',
      margin: '0 0 24px 0',
      whiteSpace: 'pre-wrap'
    });
    dialog.appendChild(text);

    // 5. ボタンを配置するエリア（コンテナ）を作成
    const buttonContainer = document.createElement('div');
    Object.assign(buttonContainer.style, {
      display: 'flex',
      justifyContent: isConfirm ? 'space-between' : 'center',
      gap: '12px'
    });

    // 共通のボタンスタイル定義
    const baseButtonStyle = {
      flex: '1',
      border: 'none',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'background 0.2s'
    };

    // --- キャンセルボタン（isConfirm が true の時だけ作成） ---
    if (isConfirm) {
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'キャンセル';
      Object.assign(cancelButton.style, baseButtonStyle, {
        backgroundColor: '#f2f2f7',
        color: '#ff3b30' // iOS風の赤色
      });
      cancelButton.onclick = function() {
        overlay.remove();
        resolve(false); // ★false（キャンセル）を返す
      };
      buttonContainer.appendChild(cancelButton);
    }

    // --- OKボタン ---
    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    Object.assign(okButton.style, baseButtonStyle, {
      backgroundColor: '#007aff', // iOS風の青色
      color: '#ffffff'
    });
    okButton.onclick = function() {
      overlay.remove();
      resolve(true); // ★true（OK）を返す
    };
    buttonContainer.appendChild(okButton);

    // 6. 組み立てて画面に追加
    dialog.appendChild(buttonContainer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });
}