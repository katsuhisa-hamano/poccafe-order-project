/**
 * 共有カスタムアラート関数
 * @param {string} message - 表示したいメッセージ
 * @param {string} textColor - 文字の色（省略時は赤色 #ff0000）
 */
function sharedAlert(message, textColor = '#ff0000') {
  // 1. すでにアラートが表示されている場合は重複して作らない
  if (document.getElementById('shared-alert-overlay')) return;

  // 2. 背景の黒いモヤ（オーバーレイ）を作成
  const overlay = document.createElement('div');
  overlay.id = 'shared-alert-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0', left: '0',
    width: '100%', height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '99999' // 最前面に表示
  });

  // 3. ダイアログの白枠を作成
  const dialog = document.createElement('div');
  Object.assign(dialog.style, {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    textAlign: 'center',
    maxWidth: '80%',
    minWidth: '280px',
    fontFamily: 'sans-serif'
  });

  // 4. メッセージテキストを作成（色を引数で可変に）
  const text = document.createElement('p');
  text.textContent = message;
  Object.assign(text.style, {
    color: textColor,
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 20px 0',
    whiteSpace: 'pre-wrap' // 改行を有効にする
  });

  // 5. 閉じるボタンを作成
  const button = document.createElement('button');
  button.textContent = 'OK';
  Object.assign(button.style, {
    backgroundColor: '#007aff', // iOS風のブルー
    color: '#ffffff',
    border: 'none',
    padding: '8px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '6px'
  });

  // ボタンを押したらアラートを消すイベント
  button.onclick = function() {
    overlay.remove();
  };

  // 6. 要素を組み立てて画面（DOM）に追加
  dialog.appendChild(text);
  dialog.appendChild(button);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}