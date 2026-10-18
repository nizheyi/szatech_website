const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../docs/assets/analytics.js'), 'utf8');

function run({ id = '', choice = null, pathname = '/', search = '?email=private@example.com', hash = '' } = {}) {
  class Element {
    constructor(tag = '') { this.tag = tag; this.children = []; this.handlers = {}; this.attrs = {}; this.hidden = false; }
    appendChild(child) { this.children.push(child); return child; }
    append(...children) { this.children.push(...children); }
    setAttribute(name, value) { this.attrs[name] = value; }
    getAttribute(name) { return this.attrs[name] || null; }
    addEventListener(name, fn) { this.handlers[name] = fn; }
  }
  const body = new Element('body'), head = new Element('head'), footer = new Element('footer');
  const handlers = {}, windowHandlers = {}, store = new Map();
  if (choice) store.set('szatech-analytics-consent-v1', choice);
  let reloads = 0;
  const document = {
    documentElement: { lang: 'en' }, readyState: 'complete',
    title: 'SZATech', referrer: 'https://example.com/private?person=secret',
    cookie: '', body, head, createElement: tag => new Element(tag),
    querySelector: selector => selector === 'footer' ? footer : null,
    addEventListener: (name, fn) => { handlers[name] = fn; }
  };
  const location = { origin: 'https://szatech.com', hostname: 'szatech.com',
    pathname, search, hash, reload: () => { reloads++; } };
  const window = { SZATECH_ANALYTICS: { measurementId: id },
    addEventListener: (name, fn) => { windowHandlers[name] = fn; } };
  vm.runInNewContext(source, {
    window, document, location, localStorage: {
      getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value)
    }, URL, URLSearchParams, Date
  });
  const banner = body.children.find(element => element.tag === 'aside');
  const buttons = banner?.children.find(element => element.tag === 'div')?.children || [];
  return { body, head, footer, handlers, windowHandlers, window, banner, buttons,
    store, location, get reloads() { return reloads; } };
}

test('no verified ID means no Google tag or consent UI', () => {
  const f = run();
  assert.equal(f.body.children.length, 0);
  assert.equal(f.head.children.length, 0);
});
test('declining does not load the tag or send an event', () => {
  const f = run({ id: 'G-ABCDEF12' });
  assert.equal(f.banner.hidden, false);
  f.buttons[1].handlers.click();
  f.handlers['szatech:inquiry-success']();
  assert.equal(f.head.children.some(e => e.tag === 'script'), false);
  assert.equal(f.window.dataLayer, undefined);
});
test('consent gates clean page, case and actual-success events', () => {
  const f = run({ id: 'G-ABCDEF12', pathname: '/case-supporting.html',
    hash: '#p05', search: '?email=private@example.com&utm_source=outreach&utm_medium=email' });
  f.handlers['szatech:inquiry-success']();
  assert.equal(f.window.dataLayer, undefined);
  f.buttons[0].handlers.click();
  const events = f.window.dataLayer.filter(entry => entry[0] === 'event');
  assert.equal(events.map(entry => entry[1]).join(','), 'page_view,case_view');
  f.handlers['szatech:inquiry-success']();
  const lead = f.window.dataLayer.at(-1);
  assert.equal(lead[1], 'generate_lead');
  assert.equal(lead[2].form_name, 'website_inquiry');
  const sent = JSON.stringify(f.window.dataLayer);
  assert.doesNotMatch(sent, /private@example.com|person=secret/);
  assert.match(sent, /campaign_source.*outreach/);
  assert.equal(f.head.children.filter(e => e.tag === 'script').length, 1);
  f.buttons[1].handlers.click();
  assert.equal(f.reloads, 1);
});

