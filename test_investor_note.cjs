const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(options = {}) {
  let now = 0, next = 0, y = 12345;
  const timers = new Map(), frames = new Map(), closedEvents = [], scrolls = [];
  function style() {
    const values = new Map();
    return { getPropertyValue: key => values.get(key)?.[0] || '', getPropertyPriority: key => values.get(key)?.[1] || '',
      setProperty(key, value, priority = '') { values.set(key, [value, priority]); }, removeProperty(key) { values.delete(key); } };
  }
  function element() {
    const classes = new Set(), listeners = new Map(), attrs = new Map();
    return {
      style: style(), children: [], scrollTop: 0, clientHeight: 500, scrollHeight: 1600, offsetWidth: 576,
      classList: { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)), contains: x => classes.has(x),
        toggle(x, on) { if (on) classes.add(x); else classes.delete(x); } },
      addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
      removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
      emit(type, extra = {}) { const e = { target: this, preventDefault() {}, stopPropagation() {}, ...extra }; [...(listeners.get(type) || [])].forEach(fn => fn(e)); },
      setAttribute: (key, value) => attrs.set(key, value), removeAttribute: key => attrs.delete(key), getAttribute: key => attrs.get(key),
      appendChild(node) { if (node.parentNode) node.remove(); this.children.push(node); node.parentNode = this; },
      remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(x => x !== this); this.parentNode = null; },
      focus(value) { this.focusOptions = value; }, blur() {},
      getBoundingClientRect() { return { top: 300, left: 400, width: 576, height: 204, bottom: 504 }; }
    };
  }
  const root = element(), body = element(), trigger = element(), source = element(), slot = element(), modal = element(), stage = element(), panel = element(), window = element();
  slot.appendChild(source);
  body.style.setProperty('width', '88%', 'important');
  panel.getBoundingClientRect = () => ({ top: options.panelTop || 0, bottom: (options.panelTop || 0) + 900, height: 900 });
  source.closest = () => panel;
  source.cloneNode = () => { const clone = element(); clone.closeButton = element(); clone.querySelector = () => clone.closeButton; return clone; };
  modal.querySelector = () => stage;
  modal.getBoundingClientRect = () => ({ top: 0, left: 0 });
  modal.open = false;
  modal.showModal = () => { modal.open = true; };
  modal.close = () => { modal.open = false; if (options.asyncClose) closedEvents.push(() => modal.emit('close')); else modal.emit('close'); };
  const document = { documentElement: root, body,
    querySelector: selector => selector.endsWith('.letter-cover') ? trigger : source,
    getElementById: () => modal };
  window.innerHeight = 900; window.innerWidth = 1440;
  Object.defineProperty(window, 'scrollY', { get: () => body.style.getPropertyValue('position') === 'fixed' ? 0 : y });
  window.scrollX = 0;
  window.matchMedia = query => ({ matches: query.includes('reduced') && !!options.reduced });
  window.scrollTo = value => { assert.ok(root.classList.contains('letter-scroll-restoring')); y = value.top; scrolls.push(value); };
  window.setTimeout = (fn, delay) => { timers.set(++next, { at: now + delay, fn }); return next; };
  window.clearTimeout = id => timers.delete(id);
  function advance(ms) {
    const end = now + ms;
    while (now < end) {
      now = Math.min(end, now + 16);
      const tasks = [...frames.values()]; frames.clear(); tasks.forEach(fn => fn(now));
      for (const [id, task] of [...timers]) if (task.at <= now) { timers.delete(id); task.fn(); }
    }
  }
  vm.runInNewContext(fs.readFileSync('full/investor-note.js', 'utf8'), {
    document, window,
    getComputedStyle(node) { return {
      fontSize: '16px', scrollPaddingTop: '40px', scrollMarginTop: '-40px', backgroundColor: 'rgb(244, 244, 244)',
      getPropertyValue: name => ({ '--paper': '#f4f4f4', '--ink': '#1f2122', '--ink-soft': '#62686b', '--sans': 'sans-serif', '--display': 'display' }[name] || '')
    }; },
    requestAnimationFrame(fn) { frames.set(++next, fn); return next; }, cancelAnimationFrame(id) { frames.delete(id); }
  });
  return { root, body, trigger, source, slot, modal, stage, window, scrolls, advance,
    open: () => trigger.emit('click'), close: () => modal.emit('cancel'),
    flushClosed: () => { closedEvents.splice(0).forEach(fn => fn()); },
    get clone() { return stage.children[0]; }, get y() { return y; }
  };
}

test('opening animates a copy while the source keeps its exact layout slot', () => {
  const p = setup(); p.open();
  assert.equal(p.slot.children.length, 1);
  assert.equal(p.slot.children[0], p.source);
  assert.notEqual(p.clone, p.source);
  assert.ok(p.source.classList.contains('letter-source-hidden'));
  assert.equal(p.body.style.getPropertyValue('top'), '-12345px');
  assert.equal(p.trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(p.modal.style.getPropertyValue('--letter-backdrop-color'), 'rgb(244, 244, 244)');
  assert.equal(p.clone.style.getPropertyValue('--paper'), '#f4f4f4');
});

test('closing restores the same scroll position once without a second movement', () => {
  const p = setup(); p.open(); p.advance(1200); p.clone.closeButton.emit('click');
  const clone = p.clone; clone.emit('transitionend', { propertyName: 'height' }); p.advance(5000);
  assert.equal(p.y, 12345); assert.equal(p.scrolls.length, 1);
  assert.equal(p.stage.children.length, 0); assert.equal(p.slot.children[0], p.source);
  assert.equal(p.body.style.getPropertyValue('position'), '');
  assert.equal(p.body.style.getPropertyValue('width'), '88%');
  assert.equal(p.body.style.getPropertyPriority('width'), 'important');
  assert.ok(!p.source.classList.contains('letter-source-hidden'));
  assert.ok(!p.root.classList.contains('letter-modal-open'));
  assert.ok(!p.root.classList.contains('letter-scroll-restoring'));
  assert.equal(p.trigger.focusOptions.preventScroll, true);
});

test('a close during opening cancels late settle callbacks', () => {
  const p = setup(); p.open(); p.advance(80); p.close(); p.advance(3000);
  assert.equal(p.modal.open, false); assert.equal(p.stage.children.length, 0);
  assert.ok(!p.modal.classList.contains('is-settled'));
  assert.ok(!p.modal.classList.contains('is-expanded'));
  assert.equal(p.scrolls.length, 1);
});

test('a note opened mid-scroll does not snap after closing without user input', () => {
  const p = setup({ panelTop: -80 }); p.open(); p.close(); p.advance(5000);
  assert.ok(p.root.classList.contains('letter-scroll-restoring'));
  assert.equal(p.scrolls.length, 1);
  p.window.emit('wheel');
  assert.ok(!p.root.classList.contains('letter-scroll-restoring'));
  assert.equal(p.scrolls.length, 1);
});

test('reduced motion opens and closes immediately while keeping the page stable', () => {
  const p = setup({ reduced: true }); p.open();
  assert.ok(p.modal.classList.contains('is-settled'));
  p.close(); assert.equal(p.modal.open, false); assert.equal(p.y, 12345);
  p.advance(1000); assert.equal(p.stage.children.length, 0);
});

test('a delayed close event cannot close a newly reopened note', () => {
  const p = setup({ reduced: true, asyncClose: true });
  p.open(); p.close(); p.open(); p.flushClosed();
  assert.equal(p.modal.open, true); assert.equal(p.stage.children.length, 1);
  p.close(); p.flushClosed(); p.advance(1000);
  assert.equal(p.scrolls.length, 2); assert.equal(p.y, 12345);
});

test('repeated open and close cycles never accumulate placeholders or layout drift', () => {
  const p = setup();
  for (let i = 0; i < 5; i++) {
    p.open(); p.advance(1200); p.close(); p.advance(1200);
    assert.equal(p.slot.children.length, 1); assert.equal(p.stage.children.length, 0);
    assert.equal(p.y, 12345);
  }
  assert.equal(p.scrolls.length, 5);
});

test('an externally closed dialog also releases the page lock', () => {
  const p = setup(); p.open(); p.modal.close(); p.advance(1500);
  assert.equal(p.body.style.getPropertyValue('position'), '');
  assert.equal(p.stage.children.length, 0); assert.equal(p.y, 12345);
});

test('both editions use the identical note controller', () => {
  assert.deepEqual(fs.readFileSync('full/investor-note.js'), fs.readFileSync('public/investor-note.js'));
});
