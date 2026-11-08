/* Chapter title h1: grow left-to-right; each new letter scrambles then locks. */
(function () {
  var POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  var TICK_MS = 14;
  var SCRAMBLE_TICKS = 2;
  var SETTLE_MS = 8;
  var SPACE_MS = 5;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cssReady = false;

  function ensureCss() {
    if (cssReady) return;
    cssReady = true;
    var style = document.createElement('style');
    style.textContent =
      'section.titlepage h1.title-scramble-pending{visibility:hidden}' +
      'section.titlepage h1.title-reveal{position:relative;display:inline-block;visibility:visible}' +
      'section.titlepage h1.title-reveal .ts-ghost{visibility:hidden}' +
      'section.titlepage h1.title-reveal .ts-live{position:absolute;left:0;top:0;visibility:visible;line-height:inherit}' +
      '@media (min-width:701px){' +
      'section.titlepage h1.title-reveal,' +
      'section.titlepage h1.title-reveal .ts-ghost,' +
      'section.titlepage h1.title-reveal .ts-live{' +
      'white-space:nowrap!important;text-wrap:nowrap!important}' +
      'section.titlepage h1.title-reveal .ts-ghost{white-space:pre}' +
      'section.titlepage h1.title-reveal .ts-live{white-space:pre}' +
      '}' +
      '@media (max-width:700px){' +
      'section.titlepage h1.title-reveal{display:block;width:100%;max-width:100%;text-align:inherit}' +
      'section.titlepage h1.title-reveal,' +
      'section.titlepage h1.title-reveal .ts-ghost,' +
      'section.titlepage h1.title-reveal .ts-live{' +
      'white-space:normal!important;text-wrap:balance!important}' +
      'section.titlepage h1.title-reveal .ts-ghost{display:block}' +
      'section.titlepage h1.title-reveal .ts-live{right:0;text-align:inherit}' +
      '}';
    document.head.appendChild(style);
  }

  function playable(el) {
    return el && !el.closest('[hidden]') && !el.dataset.scrambleDone && !el.dataset.scrambleStarted;
  }

  function titleScreenReady(h1) {
    var section = h1.closest('section.titlepage');
    if (!section) return false;
    var h = window.innerHeight || document.documentElement.clientHeight || 800;
    var sr = section.getBoundingClientRect();
    var visible = Math.min(sr.bottom, h) - Math.max(sr.top, 0);
    if (visible < h * 0.68) return false;
    var hr = h1.getBoundingClientRect();
    return hr.bottom > h * 0.12 && hr.top < h * 0.88;
  }

  function randChar(avoid) {
    var ch = POOL[(Math.random() * POOL.length) | 0];
    if (avoid && ch === avoid && POOL.length > 1) {
      ch = POOL[(Math.random() * POOL.length) | 0];
    }
    return ch;
  }

  function isSpace(ch) {
    return ch === ' ' || ch === '\u00a0';
  }

  function stepMs(ch) {
    return isSpace(ch) ? SPACE_MS : SCRAMBLE_TICKS * TICK_MS + SETTLE_MS;
  }

  function finish(el, finalText) {
    el.classList.remove('title-reveal');
    el.removeAttribute('aria-label');
    el.style.minHeight = '';
    el.textContent = finalText;
    el.dataset.scrambleDone = '1';
  }

  function reveal(el) {
    if (!playable(el)) return;
    if (!titleScreenReady(el)) return;

    var finalText = el.getAttribute('data-scramble-text') || el.textContent;
    if (!finalText || !String(finalText).trim()) return;
    el.setAttribute('data-scramble-text', finalText);
    el.dataset.scrambleStarted = '1';

    if (reduced) {
      finish(el, finalText);
      return;
    }

    ensureCss();

    var len = finalText.length;
    var stepDur = [];
    for (var s = 0; s < len; s++) stepDur.push(stepMs(finalText.charAt(s)));

    function slotStart(index) {
      var t = 0;
      for (var j = 0; j < index; j++) t += stepDur[j];
      return t;
    }

    var totalMs = slotStart(len);

    function slotIndex(elapsed) {
      for (var i = 0; i < len; i++) {
        if (elapsed < slotStart(i) + stepDur[i]) return i;
      }
      return len;
    }

    el.textContent = '';
    el.classList.remove('title-scramble-pending');
    el.classList.add('title-reveal');
    el.setAttribute('aria-label', finalText);

    var ghost = document.createElement('span');
    ghost.className = 'ts-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.textContent = finalText;

    var live = document.createElement('span');
    live.className = 'ts-live';
    live.setAttribute('aria-hidden', 'true');

    el.appendChild(ghost);
    el.appendChild(live);

    if (window.matchMedia('(max-width:700px)').matches) {
      requestAnimationFrame(function () {
        var locked = el.offsetHeight;
        if (locked > 0) el.style.minHeight = locked + 'px';
      });
    }

    var tickCache = {};
    var shown = '';
    var start = performance.now();

    function frame(now) {
      if (!el.classList.contains('title-reveal')) return;
      var elapsed = now - start;
      if (elapsed >= totalMs) {
        finish(el, finalText);
        return;
      }

      var i = slotIndex(elapsed);
      var ch = finalText.charAt(i);
      var glyph = ch;
      if (!isSpace(ch)) {
        var tickIdx = Math.floor((elapsed - slotStart(i)) / TICK_MS);
        if (tickIdx < SCRAMBLE_TICKS) {
          var key = i + ':' + tickIdx;
          if (!tickCache[key]) tickCache[key] = randChar(ch);
          glyph = tickCache[key];
        }
      }
      var next = finalText.slice(0, i) + glyph;
      if (next !== shown) {
        live.textContent = next;
        shown = next;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function begin(el) {
    if (!playable(el)) return;
    function run() {
      reveal(el);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(run);
    } else {
      run();
    }
  }

  function tryAllPending() {
    var list = document.querySelectorAll('section.titlepage h1');
    for (var i = 0; i < list.length; i++) {
      var h1 = list[i];
      if (playable(h1) && titleScreenReady(h1)) begin(h1);
    }
  }

  function boot() {
    var sections = document.querySelectorAll('section.titlepage');
    if (!sections.length) return;

    sections.forEach(function (sec) {
      var h1 = sec.querySelector('h1');
      if (!h1) return;
      if (!h1.getAttribute('data-scramble-text')) {
        h1.setAttribute('data-scramble-text', h1.textContent);
      }
    });

    if (reduced) return;

    ensureCss();
    var first = document.querySelector('section#top.titlepage h1');
    document.querySelectorAll('section.titlepage h1').forEach(function (el) {
      if (el !== first) el.classList.add('title-scramble-pending');
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.intersectionRatio < 0.68) return;
          var h1 = en.target.querySelector('h1');
          if (!h1) return;
          if (titleScreenReady(h1)) begin(h1);
        });
      },
      { threshold: [0, 0.35, 0.68, 0.85] }
    );

    sections.forEach(function (sec) {
      io.observe(sec);
    });

    requestAnimationFrame(function () {
      tryAllPending();
    });

    var scrollTimer = 0;
    window.addEventListener(
      'scroll',
      function () {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(tryAllPending, 90);
      },
      { passive: true }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
