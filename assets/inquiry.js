(() => {
  'use strict';
  const form = document.getElementById('inquiry-form');
  if (!form) return;

  const zh = document.documentElement.lang.startsWith('zh');
  const email = 'steven@szatech.com';
  const status = document.getElementById('inquiry-status');
  const contactStatus = document.getElementById('contact-copy-status');
  const draft = document.getElementById('inquiry-draft');
  const manual = document.getElementById('inquiry-manual');
  const manualText = document.getElementById('inquiry-manual-text');
  const copyInquiry = document.getElementById('copy-inquiry');
  const required = ['name', 'part'].map(name => form.elements.namedItem(name));

  const value = name => form.elements.namedItem(name).value.trim();
  const validate = () => {
    required.forEach(field => field.setCustomValidity(
      field.value.trim() ? '' : (zh ? '请填写此项。' : 'Please fill out this field.')
    ));
  };
  const inquiry = () => {
    const labels = zh
      ? ['姓名', '公司', '零件 / 产品', '需求 / 备注']
      : ['Name', 'Company', 'Part / Product', 'Requirements / Notes'];
    const values = ['name', 'company', 'part', 'notes'].map(value);
    const body = labels.map((label, i) => `${label}: ${values[i] || (zh ? '未填写' : 'Not specified')}`).join('\r\n\r\n')
      + '\r\n\r\n' + (zh
        ? '请在发送前附上 STEP / PDF 图纸（如有）。'
        : 'Please attach STEP / PDF drawings before sending, if available.');
    const part = value('part');
    const subject = (zh ? 'SZATech 项目询盘' : 'SZATech project inquiry') + (part ? ` — ${part}` : '');
    const fullText = (zh ? `收件人：${email}\r\n主题：${subject}` : `To: ${email}\r\nSubject: ${subject}`)
      + `\r\n\r\n${body}`;
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { fullText, url };
  };
  const copyText = async text => {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
  };

  form.addEventListener('input', () => {
    validate();
    draft.hidden = true;
    draft.removeAttribute('href');
    manual.hidden = true;
    status.textContent = '';
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    validate();
    if (!form.reportValidity()) return;
    const details = inquiry();
    draft.href = details.url;
    draft.hidden = false;
    status.textContent = zh
      ? '已尝试打开邮件草稿；本页面尚未发送任何邮件。如果邮件软件没有打开，请复制询盘内容并使用您常用的邮箱发送。'
      : 'Attempted to open an email draft; nothing has been sent from this page. If no email app appears, copy your inquiry details and send them from your own email service.';
    draft.click();
  });

  copyInquiry.addEventListener('click', async () => {
    const details = inquiry();
    try {
      await copyText(details.fullText);
      manual.hidden = true;
      status.textContent = zh
        ? '询盘内容已复制。本页面尚未发送任何邮件。'
        : 'Inquiry details copied. Nothing has been sent from this page.';
    } catch {
      manualText.value = details.fullText;
      manual.hidden = false;
      manualText.focus();
      manualText.select();
      status.textContent = zh
        ? '无法自动复制，请从下方文本框手动选择并复制完整询盘内容。'
        : 'Automatic copying is unavailable. Select and copy the complete inquiry details in the box below.';
    }
  });

  document.querySelectorAll('[data-copy-email], #copy-email').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', async () => {
      const target = button.id === 'copy-email' ? status : contactStatus;
      try {
        await copyText(email);
        target.textContent = zh ? `邮箱地址已复制：${email}` : `Email address copied: ${email}`;
      } catch {
        target.textContent = zh
          ? `无法自动复制，请手动选择页面上显示的邮箱地址：${email}`
          : `Automatic copying is unavailable. Select the visible email address manually: ${email}`;
      }
    });
  });

  // No cookies, storage, analytics or network submission. Keep entries in this page.
  form.querySelectorAll('button').forEach(button => { button.disabled = false; });
})();
