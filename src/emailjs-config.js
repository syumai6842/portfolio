// ============================================
// EmailJS設定ファイル
// ============================================
// 
// このファイルでEmailJSの設定を行います。
// 
// セットアップ手順:
// 1. https://www.emailjs.com/ にアクセスしてアカウントを作成
// 2. Email Serviceを設定（Gmail、Outlookなど）
// 3. Email Templateを作成
// 4. 以下の値を取得して設定してください:
//    - Public Key: EmailJSダッシュボードの「Account」→「General」から取得
//    - Service ID: EmailJSダッシュボードの「Email Services」から取得
//    - Template ID: EmailJSダッシュボードの「Email Templates」から取得
// 5. あなたのメールアドレスを設定してください

const env = typeof import.meta !== 'undefined' ? import.meta.env || {} : {};

export const emailjsConfig = {
  // EmailJSの公開キー（Public Key）
  publicKey: env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY',

  // EmailJSのサービスID（Service ID）
  serviceId: env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID',

  // EmailJSのテンプレートID（Template ID）
  templateId: env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID',

  // メールを受信するあなたのメールアドレス
  // EmailJSのテンプレートで {{to_email}} として使用されます
  toEmail: env.VITE_EMAILJS_TO_EMAIL || 'kmc2310@kamiyama.ac.jp',
};

// EmailJSテンプレートで使用する変数名
// テンプレート作成時に以下の変数名を使用してください:
// - {{from_name}}: 送信者の名前
// - {{from_email}}: 送信者のメールアドレス
// - {{message}}: メッセージ内容
// - {{to_email}}: 受信者のメールアドレス（上記のtoEmailの値）
