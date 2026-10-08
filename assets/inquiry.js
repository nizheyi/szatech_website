(() => {
  'use strict';
  const form = document.getElementById('inquiry-form');
  if (!form) return;
  const zh = document.documentElement.lang.startsWith('zh');
  const email = 'steven@szatech.com';
  const status = document.getElementById('inquiry-status');
  const draft = document.getElementById('inquiry-draft');
  const copy = document.getElementById('copy-email');
  const required = ['name', 'part'].map(name => form.elements.namedItem(name));
  const validate = () => {
    required.forEach(field => field.setCustomValidity(field.value.trim() ? '' : (zh ? '请填写此项。' : 'Please fill out this field.')));
  };
  form.addEventListener('input', () => {
    validate();
    draft.hidden = true;
    draft.removeAttribute('href');
    status.textContent = '';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    validate();
    if (!form.reportValidity()) return;
    const value = name => form.elements.namedItem(name).value.trim();
    const labels = zh ? ['姓名', '公司', '零件 / 产品', '需求 / 备注'] : ['Name', 'Company', 'Part / Product', 'Requirements / Notes'];
    const values = ['name', 'company', 'part', 'notes'].map(value);
    const body = labels.map((label, i) => `${label}: ${values[i] || (zh ? '未填写' : 'Not specified')}`).join('\r\n\r\n')
      + '\r\n\r\n' + (zh ? '请在发送前附上 STEP / PDF 图纸（如有）。' : 'Please attach STEP / PDF drawings before sending, if available.');
    const subject = (zh ? 'SZATech 项目询盘 — ' : 'SZATech project inquiry — ') + value('part');
    draft.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    draft.hidden = false;
    status.textContent = zh ? '正在尝试打开邮件草稿，尚未发送。若未打开，请点击下方链接重试，或复制邮箱地址手动发送。' : 'Opening your email draft; nothing has been sent. If it does not open, try the link below or copy our email address to compose it manually.';
    draft.click();
  });
  copy.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(email);
      status.textContent = zh ? '邮箱地址已复制：' + email : 'Email address copied: ' + email;
    } catch {
      status.textContent = zh ? '无法自动复制，请选择并复制：' + email : 'Automatic copying is unavailable. Select and copy: ' + email;
    }
  });
  // No cookies, storage, analytics or network submission. Keep entries only in this page.
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      form.reset(); status.textContent = ''; draft.hidden = true; draft.removeAttribute('href');
      required.forEach(field => field.setCustomValidity(''));
    }
  });
  form.querySelectorAll('button').forEach(button => { button.disabled = false; });
})();
