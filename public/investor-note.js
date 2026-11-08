/* Animate a copy of the note. The source never leaves document flow. */
(function () {
  'use strict';
  var root = document.documentElement;
  var trigger = document.querySelector('#agentic-paradox-note .letter-cover');
  var source = document.querySelector('#agentic-paradox-note .letter-sheet');
  var modal = document.getElementById('agentic-letter-dialog');
  var stage = modal && modal.querySelector('.letter-stage');
  if (!trigger || !source || !modal || !stage) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = window.matchMedia('(hover: none), (pointer: coarse)');
  var phase = 'idle';
  var sheet = null;
  var saved = null;
  var timer = 0;
  var restoreFrame = 0;
  var inputs = ['wheel', 'touchstart', 'pointerdown', 'keydown', 'hashchange'];
  var bodyProperties = ['position', 'top', 'left', 'right', 'width'];
  source.setAttribute('aria-hidden', 'true');

  function resumeSnap() {
    if (restoreFrame) cancelAnimationFrame(restoreFrame);
    restoreFrame = 0;
    inputs.forEach(function (type) { window.removeEventListener(type, resumeSnap, true); });
    root.classList.remove('letter-scroll-restoring');
  }
  function lockPage() {
    saved = { x: window.scrollX || 0, y: window.scrollY || 0, styles: {} };
    bodyProperties.forEach(function (name) {
      saved.styles[name] = [document.body.style.getPropertyValue(name), document.body.style.getPropertyPriority(name)];
    });
    // Disable snapping before any change to the document's scroll container.
    root.classList.add('letter-modal-open');
    resumeSnap();
    document.body.style.setProperty('position', 'fixed');
    document.body.style.setProperty('top', -saved.y + 'px');
    document.body.style.setProperty('left', -saved.x + 'px');
    document.body.style.setProperty('right', '0');
    document.body.style.setProperty('width', '100%');
  }
  function unlockPage() {
    var previous = saved;
    saved = null;
    root.classList.add('letter-scroll-restoring');
    if (previous) bodyProperties.forEach(function (name) {
      var property = previous.styles[name];
      if (property[0]) document.body.style.setProperty(name, property[0], property[1]);
      else document.body.style.removeProperty(name);
    });
    root.classList.remove('letter-modal-open');
    if (previous) window.scrollTo({ left: previous.x, top: previous.y, behavior: 'instant' });
    inputs.forEach(function (type) { window.addEventListener(type, resumeSnap, { capture: true, passive: true }); });
    restoreFrame = requestAnimationFrame(function () {
      restoreFrame = requestAnimationFrame(function () {
        restoreFrame = 0;
        if (phase !== 'idle') return;
        var panel = source.closest('.snap-panel');
        if (!panel) { resumeSnap(); return; }
        var rect = panel.getBoundingClientRect();
        var inset = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
        var margin = parseFloat(getComputedStyle(panel).scrollMarginTop) || 0;
        var aligned = Math.abs(rect.top - inset - margin) < 2;
        var freelyInside = rect.top <= inset + margin && rect.bottom >= window.innerHeight;
        // If opened mid-gesture, wait for the next user input rather than
        // causing an unsolicited snap after the close animation finishes.
        if (aligned || freelyInside) resumeSnap();
      });
    });
  }
  function applyBox(prefix, rect) {
    var frame = modal.getBoundingClientRect();
    ['top', 'left', 'width', 'height'].forEach(function (name) {
      var value = rect[name] - (name === 'top' ? frame.top : name === 'left' ? frame.left : 0);
      sheet.style.setProperty('--' + prefix + '-' + name, value + 'px');
    });
  }
  function atEnd() {
    if (sheet) sheet.classList.toggle('at-end', sheet.scrollTop + sheet.clientHeight >= sheet.scrollHeight - 12);
  }
  function finish() {
    if (phase === 'idle') return;
    phase = 'idle';
    window.clearTimeout(timer);
    if (modal.open) modal.close();
    if (sheet) sheet.remove();
    sheet = null;
    source.classList.remove('letter-source-hidden');
    modal.classList.remove('is-dim', 'is-expanded', 'is-settled', 'is-closing');
    trigger.setAttribute('aria-expanded', 'false');
    unlockPage();
    if (coarse.matches) trigger.blur();
    else trigger.focus({ preventScroll: true });
  }
  function closeNote() {
    if (phase === 'idle' || phase === 'closing') return;
    phase = 'closing';
    window.clearTimeout(timer);
    sheet.scrollTop = 0;
    applyBox('from', source.getBoundingClientRect());
    modal.classList.add('is-closing');
    modal.classList.remove('is-settled', 'is-expanded');
    if (reduce.matches) { finish(); return; }
    timer = window.setTimeout(finish, 1000);
  }
  function openNote() {
    if (phase !== 'idle') return;
    var origin = source.getBoundingClientRect();
    var panel = source.closest('.snap-panel');
    modal.style.setProperty('--letter-backdrop-color', getComputedStyle(panel || root).backgroundColor);
    sheet = source.cloneNode(true);
    var current = sheet;
    var theme = getComputedStyle(source);
    ['--paper', '--ink', '--ink-soft', '--sans', '--display'].forEach(function (name) {
      var value = theme.getPropertyValue(name);
      if (value) sheet.style.setProperty(name, value);
    });
    sheet.removeAttribute('aria-hidden');
    sheet.classList.add('is-lifted');
    sheet.tabIndex = -1;
    phase = 'opening';
    lockPage();
    source.classList.add('letter-source-hidden');
    stage.appendChild(sheet);
    try { modal.showModal(); } catch (error) { finish(); throw error; }
    applyBox('from', origin);
    var narrow = window.innerWidth < 600;
    var rem = parseFloat(getComputedStyle(root).fontSize) || 16;
    var height = Math.min((narrow ? 40 : 42) * rem, window.innerHeight - (narrow ? 32 : 56));
    applyBox('to', { top: Math.max(narrow ? 16 : 28, (window.innerHeight - height) / 2), left: origin.left, width: origin.width, height: height });
    trigger.setAttribute('aria-expanded', 'true');
    var close = sheet.querySelector('.letter-modal-close');
    if (close) {
      close.setAttribute('aria-expanded', 'true');
      close.addEventListener('click', function (event) { event.preventDefault(); event.stopPropagation(); closeNote(); });
    }
    sheet.addEventListener('scroll', atEnd, { passive: true });
    sheet.addEventListener('transitionend', function (event) {
      if (phase === 'closing' && event.target === sheet && event.propertyName === 'height') finish();
    });
    function settle() {
      if (phase !== 'opening' || !modal.open || sheet !== current) return;
      phase = 'open';
      modal.classList.add('is-settled');
      if (!coarse.matches) sheet.focus({ preventScroll: true });
      atEnd();
    }
    if (reduce.matches) {
      modal.classList.add('is-dim', 'is-expanded');
      settle();
    } else {
      void sheet.offsetWidth;
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        if (phase === 'opening' && modal.open && sheet === current) modal.classList.add('is-dim', 'is-expanded');
      }); });
      timer = window.setTimeout(settle, 1160);
    }
  }
  trigger.addEventListener('click', openNote);
  modal.addEventListener('cancel', function (event) { event.preventDefault(); closeNote(); });
  modal.addEventListener('click', function (event) { if (event.target === modal) closeNote(); });
  modal.addEventListener('close', function () { if (!modal.open) finish(); });
})();
