const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function namedFunction(source, name) {
  const start = source.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, name + ' exists');
  const end = source.indexOf('\n  function ', start + 12);
  return source.slice(start, end < 0 ? source.length : end).trim();
}
function classes(...initial) {
  const values = new Set(initial);
  return { contains: x => values.has(x), remove: (...xs) => xs.forEach(x => values.delete(x)) };
}

for (const edition of ['full', 'public']) {
  const intro = fs.readFileSync(edition + '/_sources/introduction.html', 'utf8');

  test(edition + ': scroll UI updates are coalesced without delaying native scrolling', () => {
    const start = intro.indexOf('  var scrollFrame = 0;');
    const end = intro.indexOf("  window.addEventListener('resize'", start);
    assert.ok(start >= 0 && end > start);
    const frames = [];
    let listener, updates = 0;
    vm.runInNewContext(intro.slice(start, end), {
      window: { addEventListener(type, fn, options) { assert.equal(type, 'scroll'); assert.equal(options.passive, true); listener = fn; } },
      requestAnimationFrame(fn) { frames.push(fn); return 1; },
      onScroll() { updates++; }
    });
    for (let i = 0; i < 20; i++) listener();
    assert.equal(frames.length, 1);
    assert.equal(updates, 0);
    frames.shift()();
    assert.equal(updates, 1);
    for (let i = 0; i < 5; i++) listener();
    assert.equal(frames.length, 1);
    frames.shift()();
    assert.equal(updates, 2);
  });

  test(edition + ': offscreen intro charts do not perform drawing or step measurements', () => {
    const start = intro.indexOf('  function scrollyUpdate(){');
    const end = intro.indexOf('  var scrollFrame = 0;', start);
    assert.ok(end > start);
    for (const rect of [{ top: 1000, bottom: 2000 }, { top: -2000, bottom: -10 }]) {
      const removed = [];
      const context = {
        window: { innerHeight: 900, matchMedia() { throw Error('Offscreen chart queried'); } },
        document: { body: { classList: { remove: x => removed.push(x) } } },
        scrolly: { getBoundingClientRect: () => rect }, tokcurve: {}, steps: [{}, {}, {}, {}],
        mini: { classList: { remove: x => removed.push(x) } }
      };
      vm.createContext(context);
      vm.runInContext(intro.slice(start, end) + '\nscrollyUpdate();', context);
      assert.deepEqual(removed, ['show', 'scrolly-mini-active']);
    }
  });

  for (const [file, opener] of [['the-three-caps.html', 'openCap'], ['the-three-paths.html', 'openPath']]) {
    const source = fs.readFileSync(edition + '/_sources/' + file, 'utf8');

    test(edition + '/' + file + ': scroll lock precedes unhiding card content', () => {
      const events = [];
      const reachedMutation = new Error('reached first mutation');
      const sect = {
        parentNode: {}, nextSibling: null,
        removeAttribute(name) {
          assert.equal(name, 'hidden');
          assert.deepEqual(events, ['locked']);
          throw reachedMutation;
        }
      };
      const context = {
        state: { sect: null, closing: false }, window: { scrollY: 5500 }, document: { activeElement: null },
        hideEdgeNav() {}, morphCardBtn: x => x,
        lockScroll(y) { assert.equal(y, 5500); events.push('locked'); }
      };
      vm.createContext(context);
      vm.runInContext(namedFunction(source, opener), context);
      assert.throws(() => context[opener](sect, {}), error => error === reachedMutation);
    });

    test(edition + '/' + file + ': saved position is restored before snapping resumes', () => {
      for (const flag of ['cap-article-open', 'cap-article-open-compact']) {
        if (edition === 'public' && flag.endsWith('compact')) continue;
        const root = { classList: classes(flag), style: { scrollBehavior: '' } };
        const scrolls = [];
        const context = {
          document: { documentElement: root },
          state: { scrollY: 5500, prevHtmlScrollBehavior: 'smooth', compactScrollBlocker: null },
          window: { scrollTo(options) {
            assert.ok(root.classList.contains(flag), 'snapping stays disabled during restoration');
            assert.equal(options.behavior, 'instant');
            assert.equal(options.top, 5500);
            scrolls.push(options);
          } }
        };
        vm.createContext(context);
        vm.runInContext(namedFunction(source, 'unlockScroll') + '\nunlockScroll();', context);
        assert.equal(scrolls.length, 1);
        assert.equal(root.classList.contains(flag), false);
        assert.equal(root.style.scrollBehavior, 'smooth');
      }
    });
  }

  test(edition + ': mobile menu keeps snapping disabled until the body and position are restored', () => {
    const source = fs.readFileSync(edition + '/mobile-nav.js', 'utf8');
    const root = { classList: classes('mobile-nav-open'), style: {} };
    const body = { classList: classes('mobile-nav-open'), style: { position: 'fixed', top: '-3500px' } };
    let restores = 0;
    const context = {
      lockScrollY: 3500, document: { documentElement: root, body },
      scrollInstant(y) {
        assert.equal(y, 3500);
        assert.equal(body.style.position, '');
        assert.equal(body.style.top, '');
        assert.ok(root.classList.contains('mobile-nav-open'));
        restores++;
      }
    };
    vm.createContext(context);
    vm.runInContext(namedFunction(source, 'unlockPageScroll') + '\nunlockPageScroll();', context);
    assert.equal(restores, 1);
    assert.equal(root.classList.contains('mobile-nav-open'), false);
    assert.equal(body.classList.contains('mobile-nav-open'), false);
  });
}
