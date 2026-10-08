(() => {
  'use strict';
  const contact = document.getElementById('case-contact');
  if (!contact) return;

  const zh = document.documentElement.lang.startsWith('zh');
  const email = 'steven@szatech.com';
  const openEmail = document.getElementById('case-open-email');
  const copyEmail = document.getElementById('case-copy-email');
  const status = document.getElementById('case-contact-status');
  const subjects = {
    p05: 'SZATech inquiry - Aerospace test unit',
    p09: 'SZATech inquiry - Research apparatus',
    installation: 'SZATech inquiry - On-site assembly',
    p03: 'SZATech inquiry - Ultrasonic process equipment',
    general: 'SZATech similar project inquiry'
  };
  const body = zh
    ? '我想咨询类似项目。\r\n零件 / 用途：\r\n数量：\r\n期望交期：'
    : 'I would like to discuss a similar project.\r\nPart / application:\r\nQuantity:\r\nTarget delivery date:';

  const selectCase = key => {
    const subject = subjects[key] || subjects.general;
    openEmail.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = zh
      ? '邮箱地址显示在上方，可手动复制；只有点击“打开邮件软件”才会尝试打开草稿。'
      : 'The email address above can be copied manually. Only “Open email app” attempts to open a draft.';
  };

  document.querySelectorAll('a[data-case]').forEach(link => {
    link.addEventListener('click', () => {
      selectCase(link.dataset.case);
      setTimeout(() => contact.focus({ preventScroll: true }), 0);
    });
  });

  copyEmail.disabled = false;
  copyEmail.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(email);
      status.textContent = zh ? `邮箱地址已复制：${email}` : `Email address copied: ${email}`;
    } catch {
      status.textContent = zh
        ? `无法自动复制，请手动选择上方邮箱地址：${email}`
        : `Automatic copying is unavailable. Select the visible email address above: ${email}`;
    }
  });
})();
