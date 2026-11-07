(function () {
  'use strict';

  var root = document.querySelector('.arc-tl');
  if (!root) return;
  var frame = root.querySelector('.arc-tl-frame');
  var arc = root.querySelector('.arc-tl-svg--arc');
  var selection = root.querySelector('.arc-tl-selection');
  var spine = root.querySelector('.arc-tl-spine');
  var spineCursor = root.querySelector('.arc-tl-spine-cursor');
  var buttons = Array.from(root.querySelectorAll('.arc-tl-hit'));
  var spineHits = Array.from(root.querySelectorAll('.arc-tl-spine-hit'));
  var ticks = Array.from(arc.querySelectorAll('.tick'));
  var stems = Array.from(arc.querySelectorAll('.stem'));
  var out = root.querySelector('.arc-tl-detail');
  var photo = root.querySelector('.arc-tl-photo');
  var mobile = window.matchMedia('(max-width:760px)');
  var finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
  var count = buttons.length;
  var currentState = -1;
  var initialState = 1;
  var position = (initialState + .5) / count;
  var target = position;
  var animation = 0;
  var previousTime = 0;
  var drag = null;
  var photoRevision = 0;
  var photoIndex = -1;
  var detailIndex = -1;

  // Both pictures remain mounted so a new image can fade over the old one.
  var secondPhoto = photo.cloneNode(false);
  secondPhoto.removeAttribute('src');
  photo.parentNode.appendChild(secondPhoto);
  var photos = [photo, secondPhoto];
  var detailLayers = [document.createElement('div'), document.createElement('div')];
  out.textContent = '';
  out.setAttribute('aria-atomic', 'true');
  detailLayers.forEach(function (layer) {
    layer.className = 'arc-tl-detail-layer';
    layer.setAttribute('aria-hidden', 'true');
    out.appendChild(layer);
  });
  buttons.forEach(function (button) {
    var image = new Image();
    image.src = button.dataset.img;
  });

  function clamp(value) {
    return Math.max(0, Math.min(1, value));
  }

  // Circle matching the Fig. 10 arc in viewBox 0 0 70 338 (curved horizontal segments only).
  var arcCx = -548.6789959016393;
  var arcCy = -168.62499999999997;
  var arcR = 629.9350902358387;
  var arcA0 = Math.atan2(10.6 - arcCy, 63 - arcCx);
  var arcA1 = Math.atan2(326.6 - arcCy, 63 - arcCx);

  function point(progress) {
    var radians = arcA0 + (arcA1 - arcA0) * progress;
    return [arcCx + arcR * Math.cos(radians), arcCy + arcR * Math.sin(radians)];
  }

  function paint() {
    var start = Math.max(0, position - .08);
    var end = Math.min(1, position + .08);
    var commands = [];
    for (var i = 0; i <= 16; i++) {
      var p = point(start + (end - start) * i / 16);
      commands.push((i ? 'L' : 'M') + p[0].toFixed(3) + ' ' + p[1].toFixed(3));
    }
    selection.setAttribute('d', commands.join(' '));
    ticks.forEach(function (tick) {
      var distance = Math.abs(Number(tick.dataset.progress) - position);
      tick.style.opacity = String(.25 + .6 * Math.max(0, 1 - distance / .16));
    });
    if (spineCursor) {
      var x = Math.max(5, Math.min(495, position * 500));
      spineCursor.setAttribute('x1', String(x));
      spineCursor.setAttribute('x2', String(x));
    }
  }

  function animate(now) {
    var dt = previousTime ? Math.min(64, now - previousTime) : 16;
    previousTime = now;
    position += (target - position) * (1 - Math.exp(-dt / 55));
    if (Math.abs(target - position) < .0001) position = target;
    paint();
    if (position !== target) animation = requestAnimationFrame(animate);
    else {
      animation = 0;
      previousTime = 0;
    }
  }

  function showContent(index) {
    var button = buttons[index];
    var nextDetail = (detailIndex + 1) % 2;
    var layer = detailLayers[nextDetail];
    layer.textContent = '';
    [button.dataset.detail, button.getAttribute('data-detail-2')].filter(Boolean).forEach(function (text) {
      var paragraph = document.createElement('p');
      paragraph.textContent = text;
      layer.appendChild(paragraph);
    });
    detailLayers.forEach(function (item, i) {
      item.classList.toggle('is-current', i === nextDetail);
      item.setAttribute('aria-hidden', String(i !== nextDetail));
    });
    detailIndex = nextDetail;

    var revision = ++photoRevision;
    var nextPhoto = (photoIndex + 1) % 2;
    var image = photos[nextPhoto];
    image.alt = button.getAttribute('aria-label');
    image.src = button.dataset.img;
    var ready = image.decode ? image.decode() : Promise.resolve();
    ready.catch(function () {}).then(function () {
      // Ignore a late image if the pointer has already crossed another boundary.
      if (revision !== photoRevision || !image.naturalWidth) return;
      photos.forEach(function (item, i) {
        item.classList.toggle('is-current', i === nextPhoto);
        item.setAttribute('aria-hidden', String(i !== nextPhoto));
      });
      photoIndex = nextPhoto;
    });
  }

  function setPosition(next, forceState) {
    target = clamp(next);
    var state = Math.min(count - 1, Math.floor(target * count));
    // A two-to-three-pixel dead band prevents flicker when resting on a boundary.
    if (!forceState && currentState >= 0 &&
        target >= currentState / count - .006 &&
        target <= (currentState + 1) / count + .006) state = currentState;
    if (state !== currentState) {
      currentState = state;
      root.dataset.on = String(state);
      buttons.forEach(function (button, i) {
        button.setAttribute('aria-pressed', String(i === state));
      });
      stems.forEach(function (stem) {
        stem.classList.toggle('is-active', stem.classList.contains('stem-' + state));
      });
      [arc, spine].forEach(function (control) {
        control.setAttribute('aria-valuenow', String(state + 1));
        control.setAttribute('aria-valuetext', buttons[state].getAttribute('aria-label'));
      });
      showContent(state);
    }
    if (reducedMotion.matches) {
      cancelAnimationFrame(animation);
      animation = 0;
      position = target;
      paint();
    } else if (!animation) animation = requestAnimationFrame(animate);
  }

  function selectState(index) {
    setPosition((Math.max(0, Math.min(count - 1, index)) + .5) / count, true);
  }

  function fromArc(event) {
    var bounds = arc.getBoundingClientRect();
    var x = (event.clientX - bounds.left) / bounds.width * 70;
    var y = (event.clientY - bounds.top) / bounds.height * 338;
    var angle = Math.atan2(y - arcCy, x - arcCx);
    var progress = (angle - arcA0) / (arcA1 - arcA0);
    return clamp(progress);
  }

  function fromSpine(event) {
    var bounds = spine.getBoundingClientRect();
    return (event.clientX - bounds.left) / bounds.width;
  }

  function stopDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.control.hasPointerCapture(event.pointerId)) drag.control.releasePointerCapture(event.pointerId);
    frame.classList.remove('is-dragging');
    drag = null;
  }

  frame.addEventListener('pointerdown', function (event) {
    if (mobile.matches || event.button !== 0) return;
    event.preventDefault();
    var button = event.target.closest('.arc-tl-hit');
    if (button) {
      button.focus({preventScroll:true});
      selectState(Number(button.dataset.ev));
    } else {
      arc.focus({preventScroll:true});
      setPosition(fromArc(event));
    }
    drag = {id:event.pointerId, control:frame};
    frame.setPointerCapture(event.pointerId);
    frame.classList.add('is-dragging');
  });
  frame.addEventListener('pointermove', function (event) {
    if (mobile.matches || (!drag && (event.pointerType !== 'mouse' || !finePointer.matches))) return;
    var button = !drag && event.target.closest('.arc-tl-hit');
    if (button) selectState(Number(button.dataset.ev));
    else setPosition(fromArc(event));
  });
  frame.addEventListener('pointerup', stopDrag);
  frame.addEventListener('pointercancel', stopDrag);
  frame.addEventListener('lostpointercapture', stopDrag);

  spine.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    event.stopPropagation();
    spine.focus({preventScroll:true});
    setPosition(fromSpine(event));
    drag = {id:event.pointerId, control:spine};
    spine.setPointerCapture(event.pointerId);
  });
  spine.addEventListener('pointermove', function (event) {
    if ((drag && drag.control === spine) || (event.pointerType === 'mouse' && finePointer.matches)) setPosition(fromSpine(event));
  });
  spine.addEventListener('pointerup', stopDrag);
  spine.addEventListener('pointercancel', stopDrag);
  spine.addEventListener('lostpointercapture', stopDrag);

  function keyboard(event) {
    var next = currentState;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next++;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next--;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    else return;
    event.preventDefault();
    selectState(next);
  }
  buttons.forEach(function (button, i) {
    button.addEventListener('click', function () {selectState(i);});
    button.addEventListener('focus', function () {selectState(i);});
    button.addEventListener('keydown', keyboard);
  });
  spineHits.forEach(function (btn, i) {
    btn.addEventListener('click', function () {selectState(i);});
  });
  arc.addEventListener('keydown', keyboard);
  spine.addEventListener('keydown', keyboard);
  selectState(initialState);
  paint();
})();
