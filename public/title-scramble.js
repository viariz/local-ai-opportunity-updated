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

  function collect() {
    return Array.prototype.slice.call(
      document.querySelectorAll('section.titlepage h1')
    );
  }

  function boot() {
    var els = collect();
    if (!els.length) return;

    els.forEach(function (el) {
      if (!el.getAttribute('data-scramble-text')) {
        el.setAttribute('data-scramble-text', el.textContent);
      }
    });

    if (reduced) return;

    ensureCss();
    var first = document.querySelector('section#top.titlepage h1');
    els.forEach(function (el) {
      if (el !== first) el.classList.add('title-scramble-pending');
    });

    function begin(el) {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { reveal(el); });
      } else {
        reveal(el);
      }
    }

    /* Later titles: wait until the heading has risen into the upper two-thirds. */
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          begin(en.target);
          io.unobserve(en.target);
        });
      },
      { root: null, rootMargin: '0px 0px -36% 0px', threshold: 0.45 }
    );

    els.forEach(function (el) {
      if (el !== first) io.observe(el);
    });

    requestAnimationFrame(function () {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        if (el.dataset.scrambleDone || el.dataset.scrambleStarted) return;
        var r = el.getBoundingClientRect();
        var ready = el === first
          ? r.top < vh * 0.92 && r.bottom > 0
          : r.top < vh * 0.64 && r.bottom > 0;
        if (!ready) return;
        begin(el);
        io.unobserve(el);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
