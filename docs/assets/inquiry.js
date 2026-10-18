(() => {
  'use strict';
  const form = document.getElementById('inquiry-form');
  if (!form) return;

  const zh = document.documentElement.lang.startsWith('zh');
  const email = 'steven@szatech.com';
  const status = document.getElementById('inquiry-status');
  const copyStatus = document.getElementById('inquiry-copy-status');
  const contactStatus = document.getElementById('contact-copy-status');
  const submit = document.getElementById('inquiry-submit');
  const manual = document.getElementById('inquiry-manual');
  const manualText = document.getElementById('inquiry-manual-text');
  const copyInquiry = document.getElementById('copy-inquiry');
  const names = ['email', 'name', 'company', 'quantity', 'timing', 'message'];
  const fields = names.map(name => form.elements.namedItem(name));
  const required = ['email', 'message'].map(name => form.elements.namedItem(name));
  // Set the real Formspree endpoint in each form's action after account verification.
  // An absent endpoint fails closed; never send customer details to a placeholder.
  const endpoint = form.getAttribute('action') || '';
  const configured = /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint);
  let pending = false;
  let lastSuccess = '';
  const text = (en, cn) => zh ? cn : en;
  const value = name => form.elements.namedItem(name).value.trim();
  const fingerprint = () => JSON.stringify(names.map(value));
  const show = (message, state = '') => {
    status.textContent = message;
    status.dataset.state = state;
  };
  const unavailable = () => show(text(
    'Online submission is not available yet. Please email steven@szatech.com or copy your inquiry details below.',
    '在线提交尚未开通。请发送邮件至 steven@szatech.com，或复制下方询盘内容。'
  ), 'error');
  const refreshButton = () => {
    const alreadySent = lastSuccess && lastSuccess === fingerprint();
    submit.disabled = !configured || pending || Boolean(alreadySent);
    submit.textContent = pending ? text('Sending…', '正在提交…')
      : alreadySent ? text('Inquiry sent', '询盘已提交') : text('Send inquiry', '提交询盘');
  };
  const validate = () => {
    required.forEach(field => field.setCustomValidity(field.value.trim() ? '' : text('Please fill out this field.', '请填写此项。')));
  };
  const copyText = async content => {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(content);
  };

  form.addEventListener('input', event => {
    if (event.target && fields.includes(event.target)) {
      event.target.removeAttribute('aria-invalid');
      validate();
      manual.hidden = true;
      copyStatus.textContent = '';
      if (!pending) {
        if (configured) show(''); else unavailable();
      }
      refreshButton();
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || (lastSuccess && lastSuccess === fingerprint())) return;
    if (!configured) { unavailable(); return; }
    validate();
    if (!form.reportValidity()) return;
    if (value('_gotcha')) {
      show(text('Unable to submit this form. Please email steven@szatech.com.', '无法提交此表单，请发送邮件至 steven@szatech.com。'), 'error');
      return;
    }

    const submitted = fingerprint();
    const payload = new FormData();
    names.forEach(name => payload.append(name, value(name)));
    payload.append('_gotcha', '');
    payload.append('_subject', text('SZATech website inquiry', 'SZATech 网站询盘'));
    payload.append('language', zh ? 'zh' : 'en');
    pending = true;
    fields.forEach(field => { field.readOnly = true; field.removeAttribute('aria-invalid'); });
    form.setAttribute('aria-busy', 'true');
    refreshButton();
    show(text('Sending your inquiry…', '正在提交您的询盘…'));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST', body: payload, headers: { Accept: 'application/json' },
        signal: controller.signal, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin'
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.ok === true) {
        lastSuccess = submitted;
        show(text(
          'Thank you — your inquiry has been submitted successfully. SZATech will reply to the email you provided. To send drawings, email steven@szatech.com from the same address.',
          '您的询盘已成功提交。SZATech 将通过您填写的邮箱回复。如需补充图纸，请使用同一邮箱发送至 steven@szatech.com。'
        ), 'success');
        document.dispatchEvent?.(new Event('szatech:inquiry-success'));
        status.focus();
      } else {
        const errors = Array.isArray(data?.errors) ? data.errors : [];
        errors.forEach(error => {
          if (names.includes(error.field)) form.elements.namedItem(error.field).setAttribute('aria-invalid', 'true');
        });
        if (response.status === 429) {
          show(text('Too many submissions or the form limit has been reached. Your entries are kept. Please try again later or email steven@szatech.com.', '提交过于频繁或表单额度已满。您填写的内容已保留，请稍后重试，或发送邮件至 steven@szatech.com。'), 'error');
        } else if (errors.some(error => error.field === 'email')) {
          show(text('Please check your reply email and try again. Your entries are kept.', '请检查回复邮箱后重试。您填写的内容已保留。'), 'error');
        } else {
          show(text('We could not confirm your submission. Your entries are kept. Please try again or email steven@szatech.com.', '暂时无法确认提交成功。您填写的内容已保留，请重试，或发送邮件至 steven@szatech.com。'), 'error');
        }
        status.focus();
      }
    } catch {
      // A timeout can follow server acceptance: never claim the inquiry was not sent.
      show(text('We could not confirm delivery because the connection was interrupted or timed out. Your entries are kept. You can retry or email steven@szatech.com.', '网络中断或等待超时，暂时无法确认是否提交成功。您填写的内容已保留，可以重试或发送邮件至 steven@szatech.com。'), 'error');
      status.focus();
    } finally {
      clearTimeout(timer);
      pending = false;
      fields.forEach(field => { field.readOnly = false; });
      form.removeAttribute('aria-busy');
      refreshButton();
    }
  });

  copyInquiry.disabled = false;
  copyInquiry.addEventListener('click', async () => {
    const labels = zh ? ['回复邮箱', '姓名', '公司 / 实验室', '数量', '目标时间', '需求描述']
      : ['Reply email', 'Name', 'Company / Lab', 'Quantity', 'Target timing', 'Requirements'];
    const details = text(`To: ${email}`, `收件人：${email}`) + '\r\n\r\n'
      + names.map((name, i) => `${labels[i]}: ${value(name) || text('Not specified', '未填写')}`).join('\r\n\r\n');
    try {
      await copyText(details);
      manual.hidden = true;
      copyStatus.textContent = text('Inquiry details copied. Copying does not submit the form.', '询盘内容已复制。复制操作不会提交表单。');
    } catch {
      manualText.value = details;
      manual.hidden = false;
      manualText.focus();
      manualText.select();
      copyStatus.textContent = text('Automatic copying is unavailable. Select and copy the details below.', '无法自动复制，请手动选择并复制下方内容。');
    }
  });
  document.querySelectorAll('[data-copy-email], #copy-email').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', async () => {
      const target = button.id === 'copy-email' ? copyStatus : contactStatus;
      try {
        await copyText(email);
        target.textContent = text(`Email address copied: ${email}`, `邮箱地址已复制：${email}`);
      } catch {
        target.textContent = text(`Select and copy the visible address: ${email}`, `请手动选择并复制页面上的邮箱地址：${email}`);
      }
    });
  });
  if (!configured) unavailable();
  refreshButton();
})();
