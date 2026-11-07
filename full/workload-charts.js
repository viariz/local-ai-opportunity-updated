(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var computing = [
    { t: .07, title: 'Move the mouse', short: ['Move', 'mouse'], detail: 'Your computer draws the pointer and updates the screen.', cloud: false },
    { t: .24, title: 'Google search', short: ['Google', 'search'], detail: 'A search runs on cloud servers, then the results return to your computer.', cloud: true },
    { t: .41, title: 'Scroll a page', short: ['Scroll', 'page'], detail: 'Your computer lays out and scrolls the page already in memory.', cloud: false },
    { t: .58, title: 'Open a website', short: ['Open a', 'website'], detail: 'A web server sends the page; your computer takes over to display it.', cloud: true },
    { t: .75, title: 'Write a document', short: ['Write', 'document'], detail: 'Typing, editing, and laying out the document happen on your computer.', cloud: false },
    { t: .92, title: 'Send an email', short: ['Send an', 'email'], detail: 'A mail server delivers the message, then the work returns to your computer.', cloud: true }
  ];
  var ai = [
    { t: .07, title: 'Read your context', short: ['Read', 'context'], detail: 'Keep track of the information you are working with.', cloud: false },
    { t: .24, title: 'Read new emails', short: ['Read', 'emails'], detail: 'Read and sort routine messages as they arrive.', cloud: false },
    { t: .41, title: 'Analyze a blood report', short: ['Blood', 'report'], detail: 'Ask a more capable cloud model to reason through a difficult report.', cloud: true },
    { t: .58, title: 'Order lunch', short: ['Order', 'lunch'], detail: 'Choose a meal and place a routine order on your behalf.', cloud: false },
    { t: .75, title: 'Solve a hard problem', short: ['Hard', 'problem'], detail: 'Call a more capable cloud model for a difficult reasoning task.', cloud: true },
    { t: .92, title: 'Draft a reply', short: ['Draft', 'reply'], detail: 'Write an everyday reply with your personal context.', cloud: false }
  ];

  function el(tag, attrs, text) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text) node.textContent = text;
    return node;
  }

  var tipHost = document.createElement('div');
  tipHost.className = 'workload-chart-tooltip';
  tipHost.setAttribute('aria-hidden', 'true');
  var tipTitle = document.createElement('span');
  tipTitle.className = 'workload-tip-title';
  var tipSub = document.createElement('span');
  tipSub.className = 'workload-tip-sub';
  tipHost.appendChild(tipTitle);
  tipHost.appendChild(tipSub);
  document.body.appendChild(tipHost);

  function positionTipGlobal(clientX, clientY) {
    tipHost.style.left = '0';
    tipHost.style.top = '0';
    var pad = 10;
    var tw = tipHost.offsetWidth;
    var th = tipHost.offsetHeight;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var x = clientX + pad;
    var y = clientY + pad;
    if (x + tw > vw - 8) x = Math.max(8, clientX - tw - pad);
    if (y + th > vh - 8) y = Math.max(8, clientY - th - pad);
    tipHost.style.left = x + 'px';
    tipHost.style.top = y + 'px';
  }

  function hideTipGlobal() {
    tipHost.classList.remove('is-visible');
    tipHost.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('[data-workload]').forEach(function (figure) {
    var svg = figure.querySelector('svg');
    var kind = figure.dataset.workload;
    var events = kind === 'computing' ? computing : ai;
    var comparison = kind === 'ai-comparison';
    var allCloud = kind === 'cloud-ai' || (comparison && location.hash !== '#inference-comparison');
    var mix = allCloud ? 1 : 0;
    var motionFrame = 0;
    var updateGeometry;
    var updateCost = function () {};
    var tabs = Array.from(figure.querySelectorAll('[data-ai-mode]'));
    var active = -1;
    var points, highlights, groups, annotations;
    var cycleTimer = 0;
    var inView = false;
    var hovering = false;
    var keyboardFocus = false;
    var inputType = 'pointer';
    var lastPointerType = 'pointer';
    var holdUntil = 0;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var DWELL = 3600;

    function tipLines(event) {
      if (comparison) {
        var desc = description(event);
        return { title: event.title, sub: desc.where };
      }
      return {
        title: event.title,
        sub: event.cloud
          ? (kind === 'computing' ? 'Needs a cloud service.' : 'Needs a frontier model for deeper reasoning.')
          : 'Can run locally.'
      };
    }

    function showTip(clientX, clientY, event) {
      var lines = tipLines(event);
      tipTitle.textContent = lines.title;
      tipSub.textContent = lines.sub;
      tipHost.classList.add('is-visible');
      tipHost.setAttribute('aria-hidden', 'false');
      positionTipGlobal(clientX, clientY);
    }

    function stopCycle() {
      clearTimeout(cycleTimer);
      cycleTimer = 0;
    }

    function scheduleCycle(delay) {
      stopCycle();
      if (comparison || !inView || document.hidden || hovering || keyboardFocus || reducedMotion.matches) return;
      var wait = Math.max(delay === undefined ? DWELL : delay, holdUntil - Date.now());
      cycleTimer = setTimeout(function () {
        cycleTimer = 0;
        select((active + 1) % events.length, true);
        scheduleCycle();
      }, wait);
    }

    function description(event) {
      var where = allCloud || event.cloud ? 'Cloud' : 'On device';
      var copy = allCloud
        ? (event.cloud ? event.detail : event.detail + ' Today, even this routine task calls a cloud model.')
        : event.detail;
      return { where: where, copy: copy };
    }

    function select(index, automatic) {
      active = index;
      var hasUserFocus =
        keyboardFocus || (hovering && lastPointerType !== 'touch');
      figure.classList.toggle('is-active', hasUserFocus);
      groups.forEach(function (group, i) { group.classList.toggle('is-active', i === index); });
      highlights.forEach(function (line, i) { line.classList.toggle('is-active', i === index); });
      annotations.forEach(function (annotation, i) { annotation.classList.toggle('is-active', i === index); });
      updateCost();
    }

    function syncMode() {
      tabs.forEach(function (tab) {
        var selected = (tab.dataset.aiMode === 'cloud') === allCloud;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      var panel = figure.querySelector('[role="tabpanel"]');
      if (panel) panel.setAttribute('aria-labelledby', allCloud ? 'ai-cloud-tab' : 'ai-hybrid-tab');
      if (comparison) svg.setAttribute('aria-label', allCloud
        ? 'AI today: every task runs in the cloud, including routine work.'
        : 'Optimized AI: routine work runs locally; difficult tasks call the cloud.');
      if (groups) groups.forEach(function (group, index) {
        var ev = events[index];
        var info = description(ev);
        group.setAttribute('aria-label', ev.title + '. ' + info.where + '. ' + info.copy);
      });
      if (active >= 0) select(active);
    }

    function animateMode() {
      cancelAnimationFrame(motionFrame);
      var target = allCloud ? 1 : 0;
      var from = mix;
      var start = performance.now();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        mix = target;
        updateGeometry();
        return;
      }
      function tick(now) {
        var t = Math.min(1, (now - start) / 560);
        var eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        mix = from + (target - from) * eased;
        updateGeometry();
        motionFrame = t < 1 ? requestAnimationFrame(tick) : 0;
      }
      motionFrame = requestAnimationFrame(tick);
    }

    function setMode(mode) {
      var next = mode === 'cloud';
      if (allCloud === next) return;
      allCloud = next;
      syncMode();
      animateMode();
      scheduleCycle();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { setMode(tab.dataset.aiMode); });
      tab.addEventListener('keydown', function (e) {
        var next;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        else return;
        e.preventDefault();
        tabs[next].focus();
        setMode(tabs[next].dataset.aiMode);
      });
    });
    if (comparison) window.addEventListener('hashchange', function () {
      if (location.hash === '#inference-comparison') setMode('hybrid');
      else if (location.hash === '#fig-ai-today') setMode('cloud');
    });

    function render() {
      cancelAnimationFrame(motionFrame);
      var previous = active;
      var contentWidth = Math.round(figure.getBoundingClientRect().width);
      var mobile = contentWidth < 560 || window.matchMedia('(max-width:700px)').matches;
      var width = Math.max(240, contentWidth + (mobile ? 26 : 0));
      var height = mobile ? 360 : 320;
      // Keep the rotated desktop axis labels flush with the essay text.
      var left = mobile ? 52 : 19;
      var right = width - (mobile ? 0 : 12);
      var bottom = height - (mobile ? 72 : 42);
      var threshold = mobile ? 177 : 170;
      var labelStep = mobile ? 20 : 16;
      var plotWidth = right - left;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.replaceChildren();
      svg.appendChild(el('desc', {}, comparison
        ? 'A schematic workload over time. Shading shows all paid cloud inference at once. In cloud mode the whole workload is shaded. In hybrid mode only the two peaks above the on-device threshold are shaded and marked with dollar signs. Hover or focus an activity to inspect it.'
        : 'A schematic workload over time. Annotations advance automatically. Hover or focus an activity to pause and inspect it. The upward arrow means cloud required; the downward arrow means the work can be done locally. The dashed line is the on-device threshold.'));

      function label(x, y, text, attrs) {
        var node = el('text', Object.assign({ x: x, y: y }, attrs || {}), text);
        svg.appendChild(node);
        return node;
      }
      // The axes describe where work runs, not a measured volume of CPU cycles or tokens.
      svg.appendChild(el('path', { d: 'M ' + left + ' 44 V ' + bottom, class: 'workload-axis', fill: 'none' }));
      svg.appendChild(el('path', { d: 'M ' + (left - 3) + ' 49 L ' + left + ' 44 L ' + (left + 3) + ' 49 M ' + (left - 3) + ' ' + (bottom - 5) + ' L ' + left + ' ' + bottom + ' L ' + (left + 3) + ' ' + (bottom - 5), class: 'workload-axis', fill: 'none' }));
      var axisLabelX = mobile ? 26 : left - 8;
      label(axisLabelX, 44, 'Cloud required', {
        'text-anchor': 'end',
        'dominant-baseline': mobile ? 'text-before-edge' : 'auto',
        transform: 'rotate(-90 ' + axisLabelX + ' 44)'
      });
      label(axisLabelX, bottom, 'Can be local', {
        'text-anchor': 'start',
        'dominant-baseline': mobile ? 'text-before-edge' : 'auto',
        transform: 'rotate(-90 ' + axisLabelX + ' ' + bottom + ')'
      });
      svg.appendChild(el('line', { x1: left, x2: right, y1: threshold, y2: threshold, class: 'workload-threshold' }));
      if (mobile && kind === 'computing') {
        // The first CPU spike is earlier than the AI spikes; use the clear gap beside it.
        var thresholdLabelX = left + events[2].t * plotWidth;
        label(thresholdLabelX, threshold + 18, 'On-device', { class: 'workload-threshold-label', 'text-anchor': 'middle' });
        label(thresholdLabelX, threshold + 36, 'threshold', { class: 'workload-threshold-label', 'text-anchor': 'middle' });
      } else if (mobile && contentWidth < 300) {
        label(left + 8, threshold + 18, 'On-device', { class: 'workload-threshold-label' });
        label(left + 8, threshold + 36, 'threshold', { class: 'workload-threshold-label' });
      } else {
        label(left + 8, threshold + 18, 'On-device threshold', { class: 'workload-threshold-label' });
      }

      function y(t) {
        var localBaseline = bottom - 49;
        var baseline = (mobile ? 145 : 115) * mix + localBaseline * (1 - mix);
        var value = baseline + Math.sin(t * 46) * 3 + Math.sin(t * 107) * 1.4;
        events.forEach(function (event) {
          if (event.cloud) {
            var d = (t - event.t) / .019;
            value -= ((mobile ? 54 : 28) * mix + (localBaseline - 91) * (1 - mix)) * Math.exp(-d * d / 2);
          }
        });
        return value;
      }
      function path(from, to) {
        var d = '';
        var count = Math.max(2, Math.ceil((to - from) * plotWidth / 2));
        for (var i = 0; i <= count; i++) {
          var t = from + (to - from) * i / count;
          d += (i ? ' L ' : 'M ') + (left + t * plotWidth).toFixed(2) + ' ' + y(t).toFixed(2);
        }
        return d;
      }
      var clipId = 'workload-cost-clip-' + figure.id;
      var defs = el('defs');
      var clip = el('clipPath', { id: clipId });
      clip.appendChild(el('rect', { x: left, y: 0, width: plotWidth, height: threshold }));
      defs.appendChild(clip);
      svg.appendChild(defs);
      var costGroup = el('g', { class: 'workload-cost', role: 'img', 'aria-label': 'Marginal cloud cost', 'aria-hidden': 'true' });
      var costArea = el('path', { class: 'workload-cost-area', 'clip-path': 'url(#' + clipId + ')' });
      var costSymbol = el('text', {
        class: comparison ? 'workload-cost-label' : 'workload-cost-symbol',
        'text-anchor': 'middle', 'dominant-baseline': 'central'
      }, comparison ? 'Pay for inference $' : '$');
      costGroup.appendChild(costArea);
      costGroup.appendChild(costSymbol);
      var spikeCosts = comparison ? events.filter(function (event) { return event.cloud; }).map(function (event) {
        var symbol = el('text', { class: 'workload-cost-symbol', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, '$');
        costGroup.appendChild(symbol);
        return { event: event, symbol: symbol };
      }) : [];
      svg.appendChild(costGroup);
      var wave = el('path', { d: path(0, 1), class: 'workload-line' });
      svg.appendChild(wave);
      points = events.map(function (event) { return { x: left + event.t * plotWidth, y: y(event.t) }; });
      highlights = [];
      groups = [];
      annotations = [];
      var geometry = [];

      var routineIndex = 0;
      events.forEach(function (event, index) {
        var point = points[index];
        var start = index ? (events[index - 1].t + event.t) / 2 : 0;
        var end = index < events.length - 1 ? (events[index + 1].t + event.t) / 2 : 1;
        var highlight = el('path', { d: path(start, end), class: 'workload-highlight' });
        svg.appendChild(highlight);
        highlights.push(highlight);
        var annotation = el('g', { class: 'workload-annotation', 'pointer-events': 'none' });
        svg.appendChild(annotation);
        annotations.push(annotation);
        var binding = { start: start, end: end, highlight: highlight };
        if (event.cloud) {
          binding.leader = el('line', { x1: point.x, x2: point.x, y1: mobile ? 83 : 66, y2: point.y - 9, class: 'workload-label-leader' });
          annotation.appendChild(binding.leader);
          var words = mobile ? event.short : [event.title];
          words.forEach(function (word, line) {
            annotation.appendChild(label(point.x, (mobile ? 55 : 58) + line * labelStep, word, { 'text-anchor': 'middle', class: 'workload-spike-label' }));
          });
        } else {
          // Stagger short labels on phones so neighboring tasks remain distinct.
          var row = routineIndex % 2;
          binding.cloudY = mobile ? 16 + row * 83 : 38 + row * 40;
          binding.localY = bottom - (mobile ? 26 : 18) + (mobile ? row * 44 : 0);
          var labelY = binding.cloudY * mix + binding.localY * (1 - mix);
          var labelX = point.x + (index === 0 ? (mobile ? 8 : 12) : 0);
          var words = mobile ? event.short : [event.title];
          binding.cloudOffset = (words.length - 1) * labelStep + 8;
          binding.leader = el('line', { x1: point.x, x2: point.x, class: 'workload-label-leader' });
          annotation.appendChild(binding.leader);
          binding.labels = words.map(function (word, line) {
            return annotation.appendChild(label(labelX, labelY + line * labelStep, word, { 'text-anchor': 'middle', class: 'workload-routine-label' }));
          });
          routineIndex++;
        }
        var info = description(event);
        var group = el('g', {
          class: 'workload-event',
          tabindex: '0',
          role: 'button',
          'aria-label': event.title + '. ' + info.where + '. ' + info.copy
        });
        var hitTop = mobile && (allCloud || comparison) ? 12 : 38;
        var hitRect = el('rect', { x: left + start * plotWidth, y: hitTop, width: (end - start) * plotWidth, height: bottom - hitTop + (mobile ? 38 : 0), fill: 'transparent' });
        group.appendChild(hitRect);
        binding.dot = el('circle', { cx: point.x, cy: point.y, r: 3.2, class: 'workload-dot' });
        group.appendChild(binding.dot);
        function onHitPointerEnter(e) {
          if (e.pointerType === 'touch') return;
          lastPointerType = e.pointerType;
          hovering = true;
          stopCycle();
          select(index);
          showTip(e.clientX, e.clientY, event);
        }
        function onHitPointerMove(e) {
          if (e.pointerType === 'touch') return;
          if (!tipHost.classList.contains('is-visible')) return;
          positionTipGlobal(e.clientX, e.clientY);
        }
        function onHitPointerLeave(e) {
          if (e.pointerType === 'touch') return;
          if (keyboardFocus) return;
          var rel = e.relatedTarget;
          if (rel && svg.contains(rel)) return;
          hovering = false;
          hideTipGlobal();
          figure.classList.remove('is-active');
          if (active >= 0) {
            groups[active].classList.remove('is-active');
            highlights[active].classList.remove('is-active');
            annotations[active].classList.remove('is-active');
          }
          scheduleCycle(1000);
        }
        hitRect.addEventListener('pointerenter', onHitPointerEnter);
        hitRect.addEventListener('pointermove', onHitPointerMove);
        hitRect.addEventListener('pointerleave', onHitPointerLeave);
        group.addEventListener('click', function () {
          select(index);
          if (inputType === 'touch') {
            holdUntil = Date.now() + 5000;
            var lines = tipLines(event);
            tipTitle.textContent = lines.title;
            tipSub.textContent = lines.sub;
            tipHost.classList.add('is-visible');
            tipHost.setAttribute('aria-hidden', 'false');
            var box = binding.dot.getBoundingClientRect();
            positionTipGlobal(box.left + box.width / 2, box.top + box.height / 2);
          }
          scheduleCycle();
        });
        group.addEventListener('focus', function () {
          keyboardFocus = inputType === 'keyboard';
          if (keyboardFocus) stopCycle();
          select(index);
          var lines = tipLines(event);
          tipTitle.textContent = lines.title;
          tipSub.textContent = lines.sub;
          tipHost.classList.add('is-visible');
          tipHost.setAttribute('aria-hidden', 'false');
          var box = binding.dot.getBoundingClientRect();
          positionTipGlobal(box.left + box.width / 2, box.top);
        });
        group.addEventListener('blur', function () {
          if (!keyboardFocus) hideTipGlobal();
        });
        group.addEventListener('keydown', function (e) {
          inputType = 'keyboard';
          keyboardFocus = true;
          stopCycle();
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(index); }
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            groups[(index + (e.key === 'ArrowRight' ? 1 : events.length - 1)) % events.length].focus();
          }
          if (e.key === 'Escape') { keyboardFocus = false; hideTipGlobal(); group.blur(); scheduleCycle(1000); }
        });
        svg.appendChild(group);
        groups.push(group);
        geometry.push(binding);
      });
      updateCost = function () {
        if (comparison) {
          // The same clipped area shows the whole cloud bill or the two hybrid peaks.
          // It depends on the selected mode, never the hovered or active activity.
          costGroup.classList.add('is-visible');
          costGroup.setAttribute('aria-hidden', 'false');
          costGroup.setAttribute('aria-label', allCloud
            ? 'Pay for inference: the entire workload uses paid cloud compute.'
            : 'Pay for inference only at the two cloud peaks. Routine work runs locally.');
          costArea.setAttribute('d', path(0, 1) + ' L ' + right + ' ' + threshold + ' L ' + left + ' ' + threshold + ' Z');
          costSymbol.setAttribute('x', left + plotWidth / 2);
          costSymbol.setAttribute('y', (y(.5) + threshold) / 2);
          costSymbol.style.opacity = Math.max(0, (mix - .6) / .4);
          costSymbol.setAttribute('aria-hidden', String(!allCloud));
          spikeCosts.forEach(function (cost) {
            cost.symbol.setAttribute('x', left + cost.event.t * plotWidth);
            cost.symbol.setAttribute('y', (y(cost.event.t) + threshold) / 2);
            cost.symbol.style.opacity = 1 - mix;
            cost.symbol.setAttribute('aria-hidden', String(allCloud));
          });
          return;
        }
        var point = active >= 0 ? points[active] : null;
        var show = point && point.y < threshold - 8;
        costGroup.classList.toggle('is-visible', !!show);
        costGroup.setAttribute('aria-hidden', String(!show));
        if (!show) return;
        var binding = geometry[active];
        var startX = left + binding.start * plotWidth;
        var endX = left + binding.end * plotWidth;
        costArea.setAttribute('d', path(binding.start, binding.end) + ' L ' + endX + ' ' + threshold + ' L ' + startX + ' ' + threshold + ' Z');
        costSymbol.setAttribute('x', point.x);
        costSymbol.setAttribute('y', (point.y + threshold) / 2);
      };
      updateGeometry = function () {
        wave.setAttribute('d', path(0, 1));
        geometry.forEach(function (binding, index) {
          var point = points[index];
          point.y = y(events[index].t);
          binding.dot.setAttribute('cy', point.y);
          binding.highlight.setAttribute('d', path(binding.start, binding.end));
          if (binding.labels) {
            // Switch label positions only while invisible, rather than dragging text through the curve.
            var labelY = mix > .5 ? binding.cloudY : binding.localY;
            var labelOpacity = Math.pow(Math.max(0, (Math.abs(2 * mix - 1) - .55) / .45), 2);
            binding.labels.forEach(function (node, line) {
              node.setAttribute('y', labelY + line * labelStep);
              node.style.opacity = labelOpacity;
            });
            binding.leader.style.opacity = .45 * labelOpacity;
            var fromY = point.y + 9 - 18 * mix;
            var toY = labelY + binding.cloudOffset * mix - 22 * (1 - mix);
            binding.leader.setAttribute('y1', fromY);
            binding.leader.setAttribute('y2', toY);
            var clearsLabel = mix >= .5 ? fromY > toY + 3 : toY > fromY + 3;
            binding.leader.style.visibility = clearsLabel ? 'visible' : 'hidden';
          } else {
            binding.leader.setAttribute('y2', point.y - 9);
            binding.leader.style.visibility = point.y - 9 > (mobile ? 83 : 66) + 3 ? 'visible' : 'hidden';
          }
        });
        updateCost();
      };
      updateGeometry();
      syncMode();
      if (previous >= 0) select(previous, !hovering && !keyboardFocus);
      else if (inView && !comparison) select(0, true);
      if (Math.abs(mix - (allCloud ? 1 : 0)) > .001) animateMode();
      scheduleCycle();
    }

    svg.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'touch') {
        lastPointerType = e.pointerType;
        hovering = true;
        stopCycle();
      }
    });
    svg.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'touch') return;
      if (keyboardFocus) return;
      var rel = e.relatedTarget;
      if (rel && figure.contains(rel)) return;
      hovering = false;
      hideTipGlobal();
      figure.classList.remove('is-active');
      if (active >= 0) {
        groups[active].classList.remove('is-active');
        highlights[active].classList.remove('is-active');
        annotations[active].classList.remove('is-active');
      }
      scheduleCycle(1000);
    });
    svg.addEventListener('pointerdown', function (e) {
      inputType = e.pointerType === 'touch' ? 'touch' : 'pointer';
      keyboardFocus = false;
      if (inputType === 'touch') { holdUntil = Date.now() + 5000; scheduleCycle(); }
    });
    svg.addEventListener('focusout', function (e) {
      if (!svg.contains(e.relatedTarget)) {
        keyboardFocus = false;
        hideTipGlobal();
        scheduleCycle(1000);
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Tab') inputType = 'keyboard'; }, true);
    document.addEventListener('pointerdown', function (e) {
      if (!figure.contains(e.target)) {
        keyboardFocus = false;
        holdUntil = 0;
        hideTipGlobal();
        scheduleCycle(1000);
      }
    });
    var lastWidth = 0;
    new ResizeObserver(function (entries) {
      var width = Math.round(entries[0].contentRect.width);
      if (width === lastWidth || width === 0) return;
      lastWidth = width;
      render();
    }).observe(figure);
    render();
    if (document.fonts) document.fonts.ready.then(function () { render(); });
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .25;
      if (inView && active < 0 && !comparison) select(0, true);
      scheduleCycle();
    }, { threshold: .25 }).observe(svg);
    document.addEventListener('visibilitychange', function () { scheduleCycle(); });
    reducedMotion.addEventListener('change', function () { scheduleCycle(); });
  });
})();
