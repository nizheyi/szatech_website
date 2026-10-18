const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../docs/assets/inquiry.js'), 'utf8');

// Isolated DOM fixtures exercise the shipped script. All network calls are stubs.
function fixture({ endpoint = 'https://formspree.io/f/xwlvzero', lang = 'en', fetch, clipboard } = {}) {
  class Element {
    constructor(value = '') { this.value = value; this.dataset = {}; this.attrs = {}; this.handlers = {}; this.textContent = ''; this.disabled = true; this.hidden = true; }
    addEventListener(type, fn) { this.handlers[type] = fn; }
    setAttribute(key, value) { this.attrs[key] = value; }
    getAttribute(key) { return this.attrs[key] ?? null; }
    removeAttribute(key) { delete this.attrs[key]; }
    setCustomValidity(message) { this.validation = message; }
    focus() { this.focused = true; }
    select() { this.selected = true; }
  }
  const fields = Object.fromEntries(['email','name','company','quantity','timing','message','_gotcha'].map(name => [name,new Element()]));
  fields.email.value = 'szatech-test@example.com'; fields.message.value = 'TEST non-sensitive inquiry';
  const ids = Object.fromEntries(['inquiry-form','inquiry-status','inquiry-copy-status','contact-copy-status','inquiry-submit','inquiry-manual','inquiry-manual-text','copy-inquiry','copy-email'].map(id => [id,new Element()]));
  const form = ids['inquiry-form']; form.attrs.action = endpoint;
  form.elements = { namedItem: name => fields[name] };
  form.reportValidity = () => !fields.email.validation && !fields.message.validation && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value);
  const calls = []; const timers = [];
  vm.runInNewContext(source, {
    document: { documentElement: {lang}, getElementById: id => ids[id], querySelectorAll: () => [ids['copy-email']] },
    navigator: { clipboard: clipboard || { writeText: async value => { ids.clipboard = value; } } },
    FormData, AbortController,
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout: () => {},
    fetch: (...args) => { calls.push(args); return fetch ? fetch(...args) : Promise.resolve({ok:true,status:200,json:async()=>({ok:true})}); }
  });
  return { fields, ids, calls, timers, send: () => form.handlers.submit({preventDefault(){}}), edit: (name,value) => {fields[name].value=value; form.handlers.input({target:fields[name]});} };
}

test('only reply email and requirements are required; personal email and blank optional fields submit', async () => {
  const f=fixture(); await f.send();
  assert.equal(f.calls.length,1);
  const [url,request]=f.calls[0];
  assert.equal(url,'https://formspree.io/f/xwlvzero');
  assert.equal(request.method,'POST'); assert.equal(request.body.get('email'),'szatech-test@example.com');
  assert.equal(request.body.get('name'),''); assert.equal(request.body.get('message'),'TEST non-sensitive inquiry');
  assert.equal(f.ids['inquiry-status'].dataset.state,'success');
  assert.equal(f.ids['inquiry-submit'].disabled,true);
});
test('missing endpoint never sends data or reports success', async () => {
  const f=fixture({endpoint:''}); await f.send();
  assert.equal(f.calls.length,0); assert.equal(f.ids['inquiry-submit'].disabled,true);
  assert.equal(f.ids['inquiry-status'].dataset.state,'error');
});
test('blank or malformed required values block requests', async () => {
  const f=fixture(); f.edit('message','  '); await f.send(); assert.equal(f.calls.length,0);
  f.edit('message','TEST'); f.edit('email','broken'); await f.send(); assert.equal(f.calls.length,0);
});
test('concurrent clicks and a repeated successful payload send only once', async () => {
  let finish; const f=fixture({fetch:()=>new Promise(resolve=>{finish=resolve;})});
  const first=f.send(); await f.send();
  assert.equal(f.calls.length,1); assert.equal(f.ids['inquiry-submit'].disabled,true);
  assert.equal(f.fields.message.readOnly,true);
  finish({ok:true,status:200,json:async()=>({ok:true})}); await first; await f.send();
  assert.equal(f.calls.length,1); assert.equal(f.fields.message.readOnly,false);
  f.edit('message','TEST updated requirement'); assert.equal(f.ids['inquiry-submit'].disabled,false);
});
test('server error preserves every input and allows a successful retry', async () => {
  let count=0; const f=fixture({fetch:async()=> ++count===1 ? {ok:false,status:500,json:async()=>({})}:{ok:true,status:200,json:async()=>({ok:true})}});
  f.edit('name','TEST'); f.edit('company','TEST Lab'); f.edit('quantity','2'); f.edit('timing','TEST timing');
  const before=JSON.stringify(Object.fromEntries(Object.entries(f.fields).map(([key,e])=>[key,e.value])));
  await f.send();
  assert.equal(f.ids['inquiry-status'].dataset.state,'error'); assert.equal(f.ids['inquiry-submit'].disabled,false);
  assert.equal(JSON.stringify(Object.fromEntries(Object.entries(f.fields).map(([key,e])=>[key,e.value]))),before);
  await f.send(); assert.equal(f.calls.length,2); assert.equal(f.ids['inquiry-status'].dataset.state,'success');
});
test('connection loss and timeout retain content and permit retry', async () => {
  const f=fixture({lang:'zh',fetch:(_url,request)=>new Promise((_resolve,reject)=>request.signal.addEventListener('abort',()=>reject(new Error('timeout'))))});
  const attempt=f.send(); f.timers[0](); await attempt;
  assert.equal(f.fields.message.value,'TEST non-sensitive inquiry'); assert.equal(f.ids['inquiry-submit'].disabled,false);
  assert.match(f.ids['inquiry-status'].textContent,/暂时无法确认/);
});
test('rate limit, field error, and malformed success body are never success', async () => {
  for (const response of [
    {ok:false,status:429,json:async()=>({})},
    {ok:false,status:422,json:async()=>({errors:[{field:'email',message:'untrusted server text'}]})},
    {ok:true,status:200,json:async()=>{throw new Error('invalid JSON');}}
  ]) {
    const f=fixture({fetch:async()=>response}); await f.send();
    assert.equal(f.ids['inquiry-status'].dataset.state,'error'); assert.equal(f.ids['inquiry-submit'].disabled,false);
    assert.doesNotMatch(f.ids['inquiry-status'].textContent,/untrusted server text/);
  }
});
test('honeypot blocks an automated submission before the network', async () => {
  const f=fixture(); f.fields._gotcha.value='spam'; await f.send();
  assert.equal(f.calls.length,0); assert.notEqual(f.ids['inquiry-status'].dataset.state,'success');
});
test('copy failure exposes selectable details and never changes submission status', async () => {
  const f=fixture({clipboard:{writeText:async()=>{throw new Error('denied');}}}); await f.send();
  await f.ids['copy-inquiry'].handlers.click();
  assert.equal(f.ids['inquiry-manual'].hidden,false);
  assert.match(f.ids['inquiry-manual-text'].value,/TEST non-sensitive inquiry/);
  assert.equal(f.ids['inquiry-status'].dataset.state,'success');
});
