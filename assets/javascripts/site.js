function copySzaEmail(button) {
  const email = 'sdasstev@gmail.com';
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(email).then(() => showCopied(button));
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = email;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showCopied(button);
  }
}

function showCopied(button) {
  const originalText = button.textContent;
  button.textContent = button.dataset.copied || 'Copied';
  button.classList.add('sza-is-copied');
  setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove('sza-is-copied');
  }, 1800);
}

function openSzaInquiry(event, lang) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const isChinese = lang === 'zh';
  const subject = isChinese ? 'SZATech 询价' : 'RFQ to SZATech';

  const labels = isChinese ? {
    name: '姓名 / Name',
    company: '公司 / Company',
    product: '产品或零件 / Part',
    material: '材料 / Material',
    quantity: '数量 / Quantity',
    drawing: '图纸情况 / Drawing',
    message: '需求说明 / Requirements'
  } : {
    name: 'Name',
    company: 'Company',
    product: 'Part / Product',
    material: 'Material',
    quantity: 'Quantity',
    drawing: 'Drawing availability',
    message: 'Requirements'
  };

  const lines = [];
  for (const key of ['name', 'company', 'product', 'material', 'quantity', 'drawing', 'message']) {
    const value = (formData.get(key) || '').toString().trim();
    if (value) lines.push(`${labels[key]}: ${value}`);
  }

  lines.push('', isChinese
    ? '请将图纸作为附件添加到此邮件后发送。'
    : 'Please attach your drawing(s) to this email before sending.');

  window.location.href = `mailto:sdasstev@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  return false;
}

document.addEventListener('DOMContentLoaded', () => {
  if (location.pathname.startsWith('/zh')) {
    document.documentElement.lang = 'zh-CN';
  }
});
