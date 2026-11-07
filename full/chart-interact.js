(function () {
  'use strict';

  var tip = document.createElement('div');
  tip.id = 'ichart-tip';
  tip.setAttribute('role', 'status');
  tip.setAttribute('aria-live', 'polite');
  tip.hidden = true;
  document.body.appendChild(tip);

  var style = document.createElement('style');
  style.textContent =
    '#ichart-tip{position:fixed;z-index:120;max-width:min(16em,72vw);padding:8px 11px;border:1px solid rgba(31,33,34,.28);border-radius:8px;background:#F4F4F4;color:#1F2122;font-family:"ABC Diatype Rounded","Helvetica Neue",Arial,sans-serif;font-weight:400;font-size:12.5px;line-height:1.35;pointer-events:none;box-shadow:0 10px 28px rgba(31,33,34,.08);transform:translate(-50%,calc(-100% - 12px));transition:opacity .12s ease;}' +
    '#ichart-tip.is-sub{transform:translate(-50%,calc(-100% - 8px));}' +
    '#ichart-tip .ichart-tip-main{display:block;font-weight:400;}' +
    '#ichart-tip .ichart-tip-sub{display:block;margin-top:3px;font-size:11px;color:#5c6164;}' +
    'svg.ichart-scrub{cursor:crosshair;touch-action:none;}' +
    'svg.ichart-donuts,svg.ichart-bars,svg.ichart-diagram,svg.ichart-lines{touch-action:pan-y;}' +
    'svg.ichart .ichart-cursor{fill:var(--ink);stroke:var(--paper);stroke-width:2;pointer-events:none;opacity:0;transition:opacity .12s ease;}' +
    'svg.ichart.is-scrubbing .ichart-cursor{opacity:1;}' +
    'svg.ichart .ichart-guide{stroke:var(--ink-soft);stroke-width:1;stroke-dasharray:3 4;pointer-events:none;opacity:0;transition:opacity .12s ease;}' +
    'svg.ichart.is-scrubbing .ichart-guide{opacity:.55;}' +
    'svg.ichart .ichart-scrub-area{fill:transparent;stroke:none;}' +
    '.ichart-hit{cursor:pointer;outline:none;}' +
    '.ichart-hit:focus-visible{outline:1px solid rgba(31,33,34,.35);outline-offset:2px;}' +
    'svg.ichart-bars .ichart-bar{transition:fill .2s ease,stroke-width .2s ease;}' +
    'svg.ichart-bars .ichart-bar.is-hot, svg.ichart-bars .ichart-bar:hover{fill:color-mix(in srgb,var(--ink) 8%,var(--wash));stroke-width:1.6;}' +
    'svg.ichart-bars.ichart-bars-hoverfill .ichart-bar{fill:transparent;}' +
    'svg.ichart-bars.ichart-bars-hoverfill .ichart-bar-hatch{pointer-events:none;}' +
    'svg.ichart-bars.ichart-bars-hoverfill .ichart-bar-group{cursor:pointer;}' +
    'svg.ichart-bars.ichart-bars-hoverfill .ichart-bar.is-hot, svg.ichart-bars.ichart-bars-hoverfill .ichart-bar:hover{fill:color-mix(in srgb,var(--ink) 8%,var(--wash));stroke-width:1.6;}' +
    'svg.ichart-donuts .ichart-seg{transition:opacity .2s ease;cursor:pointer;pointer-events:visibleStroke;}' +
    'svg.ichart-donuts.is-hovering .ichart-seg:not(.is-hot){opacity:.45;}' +
    'svg.ichart-donuts .ichart-seg.is-hot{opacity:1;}' +
    'svg.ichart-diagram .ichart-layer{cursor:pointer;transition:opacity .25s ease;}' +
    'svg.ichart-diagram line.ichart-layer{pointer-events:stroke;}' +
    'svg.ichart-diagram.is-hovering .ichart-layer:not(.is-hot){opacity:.35;}' +
    'svg.ichart-diagram .ichart-layer.is-hot{opacity:1;}' +
    'svg.ichart-lines .ichart-line{transition:opacity .25s ease;cursor:pointer;pointer-events:stroke;}' +
    'svg.ichart-lines.is-hovering path:not(.ichart-line){opacity:.45;}' +
    'svg.ichart-lines.is-hovering line:not(.ichart-line){opacity:.45;}' +
    'svg.ichart-lines.is-hovering .ichart-line:not(.is-hot){opacity:.35;}' +
    'svg.ichart-lines .ichart-line.is-hot{opacity:1;}' +
    'svg.ichart .figtext,svg.ichart text:not(.ichart-hit){pointer-events:none;}' +
    'table.worked tbody tr{transition:background .15s ease;}' +
    'table.worked tbody tr.is-hot{background:color-mix(in srgb,var(--ink) 5%,transparent);}' +
    '@media (max-width:700px){' +
    '#ichart-tip{font-size:15.5px;line-height:1.4;padding:11px 13px;max-width:min(22em,88vw);}' +
    '#ichart-tip .ichart-tip-sub{font-size:13px;margin-top:4px;}' +
    'svg.ichart-bars text{font-size:12px!important;letter-spacing:.03em!important;}' +
    'svg.ichart-scrub text{font-size:12px!important;}' +
    'svg.ichart-diagram text{font-size:12px!important;}' +
    'svg.ichart-donuts,svg.ichart-bars,svg.ichart-diagram,svg.ichart-lines{touch-action:pan-y;-webkit-user-select:none;user-select:none;}' +
    'svg.ichart-scrub{touch-action:none;}' +
    '}' +
    '@media (prefers-reduced-motion:reduce){#ichart-tip,svg.ichart .ichart-cursor,svg.ichart .ichart-guide,svg.ichart-bars .ichart-bar,svg.ichart-donuts .ichart-seg,svg.ichart-diagram .ichart-layer,table.worked tbody tr{transition:none;}}';
  document.head.appendChild(style);

  var activeTip = '';

  function showTip(main, sub, x, y) {
    var key = main + '|' + (sub || '');
    if (key !== activeTip) {
      tip.innerHTML =
        '<span class="ichart-tip-main">' + main + '</span>' +
        (sub ? '<span class="ichart-tip-sub">' + sub + '</span>' : '');
      activeTip = key;
    }
    tip.hidden = false;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
    tip.classList.toggle('is-sub', !!sub);
  }

  function hideTip() {
    tip.hidden = true;
    activeTip = '';
  }

  function parseJsonAttr(el, name, fallback) {
    try {
      var raw = el.getAttribute(name);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function clientToSvg(svg, clientX, clientY) {
    var pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    var m = svg.getScreenCTM();
    if (!m) return null;
    return pt.matrixTransform(m.inverse());
  }

  function nearestPathPoint(path, svgX, svgY) {
    var len = path.getTotalLength();
    var best = null;
    var bestD = Infinity;
    var steps = Math.max(24, Math.min(120, Math.round(len / 4)));
    for (var i = 0; i <= steps; i++) {
      var p = path.getPointAtLength((len * i) / steps);
      var d = (p.x - svgX) * (p.x - svgX) + (p.y - svgY) * (p.y - svgY);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  function yToValue(y, yBottom, yTop, vBottom, vTop, logScale) {
    var t = (yBottom - y) / (yBottom - yTop);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    if (logScale) {
      var lo = Math.log10(vBottom);
      var hi = Math.log10(vTop);
      return Math.pow(10, lo + t * (hi - lo));
    }
    return vBottom + t * (vTop - vBottom);
  }

  function formatValue(val, kind) {
    if (kind === 'percent') return val.toFixed(1).replace(/\.0$/, '') + '%';
    if (kind === 'index') return Math.round(val).toString();
    if (kind === 'gw') return val.toFixed(1).replace(/\.0$/, '') + ' GW';
    if (kind === 'billions') {
      if (val >= 1000) return '$' + (val / 1000).toFixed(2).replace(/\.00$/, '') + 'T';
      if (val >= 10) return '$' + Math.round(val) + 'B';
      return '$' + Math.round(val) + 'B';
    }
    if (kind === 'trillions') return '$' + val.toFixed(2).replace(/\.00$/, '') + 'T';
    if (kind === 'logkg') {
      var exp = Math.log10(val);
      if (exp >= 3) return '$' + Math.round(val).toLocaleString('en-US') + '/kg';
      if (val >= 100) return '$' + Math.round(val) + '/kg';
      return '$' + val.toFixed(0) + '/kg';
    }
    return String(Math.round(val * 10) / 10);
  }

  function xToLabel(x, x0, x1, labels) {
    if (!labels || !labels.length) return '';
    var t = (x - x0) / (x1 - x0);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    var idx = t * (labels.length - 1);
    var lo = Math.floor(idx);
    var hi = Math.ceil(idx);
    if (lo === hi || !labels[hi]) return labels[lo] || labels[labels.length - 1];
    return labels[lo] + ' – ' + labels[hi];
  }

  function bindHit(node, tipSource) {
    if (node.__ichartBound) return;
    node.__ichartBound = true;
    tipSource = tipSource || node;
    if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
    function onIn(e) {
      showTip(
        tipSource.getAttribute('data-ichart-tip') || '',
        tipSource.getAttribute('data-ichart-sub') || '',
        e.clientX,
        e.clientY
      );
    }
    function onMove(e) {
      if (!tip.hidden) showTip(
        tipSource.getAttribute('data-ichart-tip') || '',
        tipSource.getAttribute('data-ichart-sub') || '',
        e.clientX,
        e.clientY
      );
    }
    node.addEventListener('mouseenter', onIn);
    node.addEventListener('mousemove', onMove);
    node.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') onIn(e);
    });
    node.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'touch') onIn(e);
    });
    node.addEventListener('focus', onIn);
    node.addEventListener('blur', hideTip);
    node.addEventListener('mouseleave', hideTip);
  }

  function initHits() {
    document.querySelectorAll('[data-ichart-tip]').forEach(function (node) {
      node.classList.add('ichart-hit');
      bindHit(node);
    });
  }

  function initScrub(svg) {
    if (svg.__ichartScrub) return;
    svg.__ichartScrub = true;
    svg.classList.add('ichart');

    var path =
      svg.querySelector('path.ichart-path-scrub') ||
      svg.querySelector('path.ichart-path:not(.ichart-ignore)') ||
      svg.querySelector('path.ichart-path') ||
      svg.querySelector('path[fill="none"]:not(.ichart-ignore)') ||
      svg.querySelector('polyline.ichart-path');
    if (!path) return;

    var area = svg.querySelector('rect.ichart-scrub-area');
    if (!area) {
      area = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      area.classList.add('ichart-scrub-area');
    }
    var x0a = parseFloat(svg.getAttribute('data-ichart-x0'));
    var x1a = parseFloat(svg.getAttribute('data-ichart-x1'));
    var y0a = parseFloat(svg.getAttribute('data-ichart-y0'));
    var y1a = parseFloat(svg.getAttribute('data-ichart-y1'));
    if (!isNaN(x0a) && !isNaN(x1a) && !isNaN(y0a) && !isNaN(y1a)) {
      area.setAttribute('x', x0a);
      area.setAttribute('y', y1a);
      area.setAttribute('width', x1a - x0a);
      area.setAttribute('height', y0a - y1a);
    } else {
      var bb = path.getBBox();
      area.setAttribute('x', bb.x - 8);
      area.setAttribute('y', bb.y - 8);
      area.setAttribute('width', bb.width + 16);
      area.setAttribute('height', bb.height + 16);
    }
    svg.appendChild(area);

    var cursor = svg.querySelector('circle.ichart-cursor');
    if (!cursor) {
      cursor = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      cursor.classList.add('ichart-cursor');
      cursor.setAttribute('r', '5');
      svg.appendChild(cursor);
    }

    var guide = svg.querySelector('line.ichart-guide');
    if (!guide) {
      guide = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      guide.classList.add('ichart-guide');
      svg.appendChild(guide);
    }

    var x0 = parseFloat(svg.getAttribute('data-ichart-x0'));
    var x1 = parseFloat(svg.getAttribute('data-ichart-x1'));
    var y0 = parseFloat(svg.getAttribute('data-ichart-y0'));
    var y1 = parseFloat(svg.getAttribute('data-ichart-y1'));
    var yDomain = parseJsonAttr(svg, 'data-ichart-y-domain', [0, 100]);
    var labels = parseJsonAttr(svg, 'data-ichart-x-labels', []);
    var kind = svg.getAttribute('data-ichart-y-format') || 'index';
    var tipTitle = svg.getAttribute('data-ichart-tip-title') || '';

    function scrub(clientX, clientY) {
      var p = clientToSvg(svg, clientX, clientY);
      if (!p) return;
      var hit = nearestPathPoint(path, p.x, p.y);
      if (!hit) return;
      svg.classList.add('is-scrubbing');
      cursor.setAttribute('cx', hit.x);
      cursor.setAttribute('cy', hit.y);
      if (guide) {
        guide.setAttribute('x1', hit.x);
        guide.setAttribute('x2', hit.x);
        guide.setAttribute('y1', y0 || hit.y + 40);
        guide.setAttribute('y2', hit.y);
      }
      var xLab = xToLabel(hit.x, x0, x1, labels);
      var val = yToValue(hit.y, y0, y1, yDomain[0], yDomain[1], kind === 'logkg');
      var main = tipTitle ? tipTitle + ' · ' + formatValue(val, kind) : formatValue(val, kind);
      showTip(main, xLab, clientX, clientY);
    }

    function endScrub() {
      svg.classList.remove('is-scrubbing');
      hideTip();
    }

    area.addEventListener('pointerdown', function (e) {
      area.setPointerCapture(e.pointerId);
      scrub(e.clientX, e.clientY);
    });
    area.addEventListener('pointermove', function (e) {
      scrub(e.clientX, e.clientY);
    });
    area.addEventListener('pointerenter', function (e) {
      scrub(e.clientX, e.clientY);
    });
    area.addEventListener('pointerup', endScrub);
    area.addEventListener('pointercancel', endScrub);
    svg.addEventListener('mouseleave', endScrub);
  }

  function bindBarHover(bars, bar, hoverTarget) {
    bindHit(hoverTarget, bar);
    hoverTarget.addEventListener('mouseenter', function () {
      bars.forEach(function (b) { b.classList.remove('is-hot'); });
      bar.classList.add('is-hot');
    });
    hoverTarget.addEventListener('mouseleave', function () {
      bar.classList.remove('is-hot');
    });
  }

  function initBars(svg) {
    if (svg.__ichartBars) return;
    svg.__ichartBars = true;
    svg.classList.add('ichart', 'ichart-bars');
    var bars = svg.querySelectorAll('.ichart-bar');
    var hoverFill = svg.classList.contains('ichart-bars-hoverfill');
    bars.forEach(function (bar) {
      var group = bar.closest('.ichart-bar-group');
      var hoverTarget = hoverFill && group ? group : bar;
      if (hoverFill && group && group.__ichartBarGroup) return;
      if (hoverFill && group) group.__ichartBarGroup = true;
      bindBarHover(bars, bar, hoverTarget);
    });
  }

  function initDonuts(svg) {
    if (svg.__ichartDonuts) return;
    svg.__ichartDonuts = true;
    svg.classList.add('ichart', 'ichart-donuts');
    var segs = svg.querySelectorAll('.ichart-seg');
    segs.forEach(function (seg) {
      bindHit(seg);
      seg.addEventListener('mouseenter', function () {
        svg.classList.add('is-hovering');
        segs.forEach(function (s) { s.classList.remove('is-hot'); });
        seg.classList.add('is-hot');
      });
      seg.addEventListener('mouseleave', function () {
        seg.classList.remove('is-hot');
        svg.classList.remove('is-hovering');
      });
    });
  }

  function initLines(svg) {
    if (svg.__ichartLines) return;
    svg.__ichartLines = true;
    svg.classList.add('ichart', 'ichart-lines');
    var lines = svg.querySelectorAll('.ichart-line');
    lines.forEach(function (line) {
      if (line.hasAttribute('data-ichart-tip')) bindHit(line);
      line.addEventListener('mouseenter', function () {
        svg.classList.add('is-hovering');
        lines.forEach(function (l) { l.classList.remove('is-hot'); });
        line.classList.add('is-hot');
      });
      line.addEventListener('mouseleave', function () {
        line.classList.remove('is-hot');
        svg.classList.remove('is-hovering');
      });
      if (!line.hasAttribute('tabindex')) line.setAttribute('tabindex', '0');
    });
  }

  function initDiagram(svg) {
    if (svg.__ichartDiagram) return;
    svg.__ichartDiagram = true;
    svg.classList.add('ichart', 'ichart-diagram');
    var layers = svg.querySelectorAll('.ichart-layer');
    layers.forEach(function (layer) {
      if (layer.hasAttribute('data-ichart-tip')) bindHit(layer);
      layer.addEventListener('mouseenter', function () {
        svg.classList.add('is-hovering');
        layers.forEach(function (l) { l.classList.remove('is-hot'); });
        layer.classList.add('is-hot');
      });
      layer.addEventListener('mouseleave', function () {
        layer.classList.remove('is-hot');
        svg.classList.remove('is-hovering');
      });
      layer.setAttribute('tabindex', '0');
    });
  }

  function resetMovedIchart(svg) {
    if (!svg || !svg.classList) return;
    delete svg.__ichartScrub;
    delete svg.__ichartBars;
    delete svg.__ichartDonuts;
    delete svg.__ichartLines;
    delete svg.__ichartDiagram;
    svg.querySelectorAll('.ichart-bar-group').forEach(function (g) {
      delete g.__ichartBarGroup;
    });
  }

  function initTables() {
    document.querySelectorAll('table.worked tr').forEach(function (row) {
      if (row.__ichartRow) return;
      row.__ichartRow = true;
      row.addEventListener('mouseenter', function () {
        row.classList.add('is-hot');
      });
      row.addEventListener('mouseleave', function () {
        row.classList.remove('is-hot');
      });
    });
  }

  function bindLine(line, svg, lines) {
    if (line.__ichartLineBound) return;
    line.__ichartLineBound = true;
    if (line.hasAttribute('data-ichart-tip')) bindHit(line);
    line.addEventListener('mouseenter', function () {
      svg.classList.add('is-hovering');
      lines.forEach(function (l) { l.classList.remove('is-hot'); });
      line.classList.add('is-hot');
    });
    line.addEventListener('mouseleave', function () {
      line.classList.remove('is-hot');
      svg.classList.remove('is-hovering');
    });
    if (!line.hasAttribute('tabindex')) line.setAttribute('tabindex', '0');
  }

  function refreshLines(svg) {
    svg.classList.add('ichart', 'ichart-lines');
    var lines = svg.querySelectorAll('.ichart-line');
    lines.forEach(function (line) {
      bindLine(line, svg, lines);
    });
  }

  function initSupplyCharts() {
    document.querySelectorAll('.supply-demand-chart').forEach(function (chart) {
      if (chart.__supplyTipBound) return;
      chart.__supplyTipBound = true;
      var capsWrap = chart.querySelector('.fig-caps-label-wrap');
      if (!capsWrap) return;
      function hideCapsTip() {
        chart.classList.remove('show-caps-tooltip');
      }
      function showCapsTip() {
        chart.classList.add('show-caps-tooltip');
      }
      capsWrap.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
      });
      capsWrap.addEventListener('click', function (e) {
        e.stopPropagation();
        chart.classList.toggle('show-caps-tooltip');
      });
      var hit = capsWrap.querySelector('.fig-label-hit');
      if (hit) {
        hit.style.cursor = 'pointer';
        function syncCapsHit() {
          if (window.matchMedia('(max-width:700px)').matches) {
            hit.setAttribute('x', '392');
            hit.setAttribute('y', '272');
            hit.setAttribute('width', '280');
            hit.setAttribute('height', '56');
          } else {
            hit.setAttribute('x', '448');
            hit.setAttribute('y', '298');
            hit.setAttribute('width', '215');
            hit.setAttribute('height', '32');
          }
        }
        syncCapsHit();
        window.matchMedia('(max-width:700px)').addEventListener('change', syncCapsHit);
      }
      capsWrap.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          chart.classList.toggle('show-caps-tooltip');
        }
        if (e.key === 'Escape') hideCapsTip();
      });
      chart.__hideCapsTip = hideCapsTip;
    });
  }

  function dismissFloatingTips() {
    hideTip();
    document.querySelectorAll('.supply-demand-chart.show-caps-tooltip').forEach(function (chart) {
      chart.classList.remove('show-caps-tooltip');
    });
  }

  function boot() {
    initHits();
    document.querySelectorAll('svg.ichart-scrub').forEach(initScrub);
    document.querySelectorAll('svg.ichart-bars').forEach(initBars);
    document.querySelectorAll('svg.ichart-donuts').forEach(initDonuts);
    document.querySelectorAll('svg.ichart-diagram').forEach(initDiagram);
    document.querySelectorAll('svg.ichart-lines').forEach(initLines);
    initTables();
    initSupplyCharts();
    window.addEventListener('scroll', dismissFloatingTips, { passive: true });
    document.querySelectorAll('.cap-article-overlay').forEach(function (el) {
      el.addEventListener('scroll', dismissFloatingTips, { passive: true });
    });
    document.addEventListener('click', function (e) {
      if (e.target.closest('#ichart-tip')) return;
      if (e.target.closest('[data-ichart-tip]')) return;
      if (e.target.closest('.ichart-scrub-area')) return;
      if (e.target.closest('.fig-caps-label-wrap')) return;
      if (e.target.closest('.fig-caps-tooltip')) return;
      dismissFloatingTips();
    });
  }

  window.ichartRefresh = function () {
    initHits();
    document.querySelectorAll('svg.ichart-scrub').forEach(resetMovedIchart);
    document.querySelectorAll('svg.ichart-bars').forEach(resetMovedIchart);
    document.querySelectorAll('svg.ichart-donuts').forEach(resetMovedIchart);
    document.querySelectorAll('svg.ichart-diagram').forEach(resetMovedIchart);
    document.querySelectorAll('svg.ichart-lines').forEach(resetMovedIchart);
    document.querySelectorAll('svg.ichart-scrub').forEach(initScrub);
    document.querySelectorAll('svg.ichart-bars').forEach(initBars);
    document.querySelectorAll('svg.ichart-donuts').forEach(initDonuts);
    document.querySelectorAll('svg.ichart-diagram').forEach(initDiagram);
    document.querySelectorAll('svg.ichart-lines').forEach(refreshLines);
    initTables();
    initSupplyCharts();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
