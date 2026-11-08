/* Title ↔ chapter body — smooth eased snap; separate scroll-up / scroll-down corridors. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var DURATION = 520;
  var SCROLL_SETTLE_MS = 75;

  var snap = { animating: false, raf: 0, targetY: 0, lastIntent: 0 };

  function blocked() {
    var html = document.documentElement;
    return html.classList.contains('letter-modal-open') || html.classList.contains('cap-article-open');
  }

  function scrollY() {
    return window.scrollY || window.pageYOffset || 0;
  }

  function titles() {
    return Array.prototype.slice.call(document.querySelectorAll('section.titlepage'));
  }

  function partAfter(title) {
    var el = title.nextElementSibling;
    return el && el.classList.contains('part') ? el : null;
  }

  function scrollPadTop() {
    var v = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
    return isNaN(v) ? 0 : v;
  }

  function vh() {
    return window.innerHeight || document.documentElement.clientHeight || 800;
  }

  function titleSlice(title) {
    var rect = title.getBoundingClientRect();
    var h = vh();
    return Math.max(0, Math.min(rect.bottom, h) - Math.max(rect.top, 0));
  }

  function onTitleScreen(title) {
    var rect = title.getBoundingClientRect();
    var h = vh();
    return rect.top <= h * 0.14 && rect.bottom >= h * 0.52;
  }

  function refreshSnapY(ctx) {
    var title = ctx.title;
    var part = ctx.part;
    var h = vh();
    var top = title.getBoundingClientRect().top + scrollY();
    ctx.center = Math.max(0, Math.min(
      Math.max(0, document.documentElement.scrollHeight - h),
      top + title.offsetHeight * 0.5 - h * 0.5
    ));
    ctx.p0 = part.getBoundingClientRect().top + scrollY() - scrollPadTop();
    ctx.exitUp = ctx.index === 0 ? null : Math.max(0, top - Math.min(h * 0.45, 400));
  }

  function handoffMode(title, part, goingDown) {
    var h = vh();
    var tr = title.getBoundingClientRect();
    var pr = part.getBoundingClientRect();
    var slice = titleSlice(title);

    if (goingDown) {
      if (onTitleScreen(title) || slice >= h * 0.38) return 'on-title';
      if (slice >= h * 0.1 && pr.top < h * 0.32) return 'bridge';
      if (tr.top > h * 0.58 && tr.top < h * 1.24) return 'approach-below';
      if (tr.top > h * 0.22 && tr.top < h * 0.94 && slice >= h * 0.035 && slice < h * 0.36) {
        return 'rise-into';
      }
      if (pr.top > -24 && pr.top < h * 0.11 && tr.bottom > 0 && tr.bottom < h * 0.2) {
        return 'part-entry';
      }
      return false;
    }

    if (onTitleScreen(title) || slice >= h * 0.38) return 'on-title';
    if (tr.top > h * 0.5 && tr.top < h * 1.3) return 'approach-below';
    if (tr.bottom > 0 && slice >= h * 0.025 && pr.top < h * 0.5) return 'return-title';
    if (slice >= h * 0.07 && pr.top < h * 0.36) return 'bridge';
    if (pr.top > -24 && pr.top < h * 0.14 && tr.bottom > 0 && tr.bottom < h * 0.26) {
      return 'part-entry';
    }
    return false;
  }

  function findHandoff(goingDown) {
    var list = titles();
    var best = null;
    var bestScore = -1;
    var i;
    for (i = 0; i < list.length; i++) {
      var title = list[i];
      var part = partAfter(title);
      if (!part) continue;
      var mode = handoffMode(title, part, goingDown);
      if (!mode) continue;
      var score = titleSlice(title);
      if (mode === 'approach-below') score += vh() * 0.5;
      if (mode === 'return-title') score += vh() * 0.2;
      if (mode === 'part-entry') score += vh() * 0.08;
      if (score > bestScore) {
        bestScore = score;
        best = { title: title, part: part, index: i, mode: mode };
      }
    }
    return best;
  }

  function resolveTarget(handoff, goingDown) {
    var ctx = {
      title: handoff.title,
      part: handoff.part,
      index: handoff.index,
      center: 0,
      p0: 0,
      exitUp: null,
    };
    refreshSnapY(ctx);
    var mode = handoff.mode;

    if (goingDown) {
      if (mode === 'part-entry') return null;
      if (mode === 'on-title') return ctx.p0;
      if (mode === 'approach-below' || mode === 'rise-into') return ctx.center;
      if (mode === 'bridge') {
        if (onTitleScreen(ctx.title)) return ctx.p0;
        return ctx.center;
      }
      return null;
    }

    if (mode === 'on-title') return ctx.exitUp;
    return ctx.center;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function restoreScrollBehavior() {
    if (document.documentElement.getAttribute('data-smooth-scroll')) {
      document.documentElement.style.scrollBehavior = 'smooth';
    } else {
      document.documentElement.style.scrollBehavior = '';
    }
  }

  function cancelSnap() {
    if (snap.raf) cancelAnimationFrame(snap.raf);
    snap.raf = 0;
    snap.animating = false;
  }

  function runSnap(targetY) {
    cancelSnap();
    var y = scrollY();
    if (Math.abs(targetY - y) < 4) return;

    snap.animating = true;
    snap.targetY = targetY;
    document.documentElement.style.scrollBehavior = 'auto';

    var start = y;
    var delta = targetY - start;
    var t0 = performance.now();

    function frame(now) {
      if (!snap.animating) return;
      var t = Math.min(1, (now - t0) / DURATION);
      window.scrollTo(0, start + delta * easeInOutCubic(t));
      if (t >= 1) {
        window.scrollTo(0, targetY);
        snap.animating = false;
        snap.raf = 0;
        restoreScrollBehavior();
        return;
      }
      snap.raf = requestAnimationFrame(frame);
    }
    snap.raf = requestAnimationFrame(frame);
  }

  function trySnap(goingDown) {
    var handoff = findHandoff(goingDown);
    if (!handoff) return false;
    var target = resolveTarget(handoff, goingDown);
    if (target === null) return false;
    if (Math.abs(target - scrollY()) < 4) return true;
    runSnap(target);
    return true;
  }

  function onWheel(e) {
    if (blocked()) return;
    if (e.ctrlKey || e.metaKey) return;

    var goingDown = e.deltaY > 0;
    if (e.deltaY !== 0) snap.lastIntent = goingDown ? 1 : -1;

    var handoff = findHandoff(goingDown);
    if (!handoff) return;

    var target = resolveTarget(handoff, goingDown);

    if (snap.animating) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    if (target === null) return;

    var y = scrollY();
    if (Math.abs(target - y) < 4) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    runSnap(target);
  }

  function afterScrollSettle() {
    if (blocked() || snap.animating) return;
    var up = snap.lastIntent < 0;
    var down = snap.lastIntent > 0;
    if (!up && !down) return;
    trySnap(up ? false : down);
  }

  window.addEventListener('wheel', onWheel, { passive: false, capture: true });

  var scrollTimer = 0;
  window.addEventListener(
    'scroll',
    function () {
      if (blocked() || snap.animating) return;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(afterScrollSettle, SCROLL_SETTLE_MS);
    },
    { passive: true }
  );
})();
