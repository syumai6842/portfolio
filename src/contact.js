import './common.css';
import './contact.css';
import emailjs from '@emailjs/browser';
import { gsap } from 'gsap';
import { emailjsConfig } from './emailjs-config.js';
import { initAudio } from './audio-manager.js';

// ============================================
// 初期化
// ============================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    initContactPage();
  });
} else {
  initAudio();
  initContactPage();
}

// ============================================
// コンタクトページの初期化
// ============================================
function initContactPage() {
  const contactForm = document.getElementById('contact-form');
  const successMessage = document.getElementById('success-message');
  const errorMessage = document.getElementById('error-message');
  const errorText = errorMessage ? errorMessage.querySelector('.error-text') : null;
  
  if (!contactForm || !successMessage || !errorMessage) {
    console.error('Contact page elements not found');
    return;
  }
  
  initContactIntroMotion();

  // EmailJSの初期化
  // 注意: 実際の使用時は、EmailJSのPublic Key、Service ID、Template IDを設定してください
  // emailjs.init('YOUR_PUBLIC_KEY');
  
  // フォームの入力フィールドにフォーカス
  const firstInput = contactForm.querySelector('input, textarea');
  if (firstInput) {
    firstInput.focus();
  }

  // フォーム送信処理
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitButton = contactForm.querySelector('.contact-send-button');
    const buttonText = submitButton.querySelector('.button-text');
    
    // ボタンを無効化
    submitButton.disabled = true;
    buttonText.textContent = '送信中...';
    
    // フォームデータを取得
    const formData = new FormData(contactForm);
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');
    
    try {
    // EmailJSの設定を確認
      if (
        emailjsConfig.publicKey === 'YOUR_PUBLIC_KEY' ||
        emailjsConfig.serviceId === 'YOUR_SERVICE_ID' ||
      emailjsConfig.templateId === 'YOUR_TEMPLATE_ID' ||
      emailjsConfig.toEmail === 'your-email@example.com'
      ) {
        throw new Error('EmailJSの設定が未完了です。src/emailjs-config.js を更新してください。');
      }
      
      // EmailJSを初期化
      emailjs.init(emailjsConfig.publicKey);
      
      const templateParams = {
        from_name: name,
        from_email: email,
        message: message,
        to_email: emailjsConfig.toEmail,
      };
      
      // メール送信
      await emailjs.send(
        emailjsConfig.serviceId,
        emailjsConfig.templateId,
        templateParams,
        emailjsConfig.publicKey
      );
      
      // 成功メッセージを表示
      showSuccessMessage();
      
      // フォームをリセット
      contactForm.reset();
    } catch (error) {
      console.error('Email sending failed:', error);
      const message = error instanceof Error ? error.message : '送信に失敗しました。もう一度お試しください。';
      showErrorMessage(message);
    } finally {
      // ボタンを再有効化
      submitButton.disabled = false;
      buttonText.textContent = '送信';
    }
  });
  
  function showSuccessMessage() {
    successMessage.style.display = 'flex';
    errorMessage.style.display = 'none';
    
    // 5秒後に自動で非表示
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 5000);
  }
  
  function showErrorMessage(message) {
    if (errorText && message) {
      errorText.textContent = message;
    }
    errorMessage.style.display = 'flex';
    successMessage.style.display = 'none';
    
    // 5秒後に自動で非表示
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  }
  
  // エラーメッセージを閉じる
  successMessage.addEventListener('click', () => {
    successMessage.style.display = 'none';
  });
  
  errorMessage.addEventListener('click', () => {
    errorMessage.style.display = 'none';
  });
  
  console.log('Contact page initialized');
}

function initContactIntroMotion() {
  const page = document.querySelector('.contact-page');
  if (!page) return;

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  if (prefersReducedMotion) return;

  const background = page.querySelector('.contact-page-background');
  const title = page.querySelector('.contact-title');
  const navLabels = page.querySelectorAll('.contact-nav-label');
  const formPanel = page.querySelector('.contact-form-panel');
  const socialPanel = page.querySelector('.contact-social-panel');
  const formGroups = page.querySelectorAll('.contact-form .form-group');
  const sendButton = page.querySelector('.contact-send-button');

  gsap.set(background, { opacity: 0, scale: 1.04 });
  gsap.set([title, navLabels], { autoAlpha: 0, y: 24 });
  gsap.set([formPanel, socialPanel], {
    autoAlpha: 0,
    y: 30,
    rotateX: 6,
    transformOrigin: '50% 0%',
  });
  gsap.set(formGroups, { autoAlpha: 0, y: 12 });
  gsap.set(sendButton, { autoAlpha: 0, y: 12 });

  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro
    .to(background, { opacity: 1, scale: 1, duration: 1.1 })
    .to(title, { autoAlpha: 1, y: 0, duration: 0.7 }, '-=0.6')
    .to(
      navLabels,
      { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 },
      '-=0.55'
    )
    .to(formPanel, { autoAlpha: 1, y: 0, rotateX: 0, duration: 0.8 }, '-=0.3')
    .to(
      formGroups,
      { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08 },
      '-=0.4'
    )
    .to(sendButton, { autoAlpha: 1, y: 0, duration: 0.4 }, '-=0.2')
    .to(
      socialPanel,
      { autoAlpha: 1, y: 0, rotateX: 0, duration: 0.7 },
      '-=0.25'
    );
}
