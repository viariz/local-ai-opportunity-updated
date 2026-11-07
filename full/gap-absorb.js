/**
 * "Where the unmet demand goes"
 * Chart draws, dots appear in the gap (no wedge fill tween), hold under the graph,
 * then spread to the cloud; dots wander for the remainder of DOTS_SEC before restart.
 */
(function () {
  'use strict';
  var figure = document.getElementById('distributed-demand');
  if (!figure) return;
  var svg = figure.querySelector('svg.gap-absorb');
  if (!svg) return;

  var NS = 'http://www.w3.org/2000/svg';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var DEMAND = [[40.0, 360.9], [55.5, 360.1], [71.0, 359.1], [86.5, 358.1], [102.0, 357.0], [117.5, 355.8], [133.0, 354.4], [148.5, 353.0], [164.0, 351.4], [179.5, 349.6], [195.0, 347.7], [210.5, 345.6], [226.0, 343.3], [241.5, 340.8], [257.0, 338.0], [272.5, 335.0], [288.0, 331.7], [303.5, 328.1], [319.0, 324.2], [334.5, 319.9], [350.0, 315.1], [365.5, 310.0], [381.0, 304.3], [396.5, 298.1], [412.0, 291.4], [427.5, 284.0], [443.0, 275.9], [458.5, 267.0], [474.0, 257.3], [489.5, 246.7], [505.0, 235.1], [520.5, 222.4], [536.0, 208.5], [551.5, 193.3], [567.0, 176.6], [582.5, 158.4], [598.0, 138.5], [613.5, 116.7], [629.0, 92.8], [644.5, 66.7], [660.0, 38.2]];
  var SUPPLY = [[40.0, 360.9], [55.5, 359.5], [71.0, 358.2], [86.5, 356.9], [102.0, 355.7], [117.5, 354.5], [133.0, 353.4], [148.5, 352.4], [164.0, 351.4], [179.5, 350.4], [195.0, 349.5], [210.5, 348.7], [226.0, 347.8], [241.5, 347.1], [257.0, 346.3], [272.5, 345.6], [288.0, 345.0], [303.5, 344.3], [319.0, 343.7], [334.5, 343.1], [350.0, 342.6], [365.5, 342.1], [381.0, 341.6], [396.5, 341.1], [412.0, 340.7], [427.5, 340.2], [443.0, 339.8], [458.5, 339.4], [474.0, 339.1], [489.5, 338.7], [505.0, 338.4], [520.5, 338.1], [536.0, 337.8], [551.5, 337.5], [567.0, 337.2], [582.5, 337.0], [598.0, 336.7], [613.5, 336.5], [629.0, 336.3], [644.5, 336.0], [660.0, 335.8]];

  var X_DATA_MIN = 40;
  var X_DATA_MAX = 660;
  var SPLIT_X = 221;
  var YEARS = [2026, 2027, 2028, 2029, 2030];
  var Y_DATA_TOP = 30;
  var Y_DATA_BOTTOM = 365;

  /** Seconds after the wedge fill finishes until the loop restarts (morph + spread + hang). */
  var DOTS_SEC = 10;
  var MORPH_IN_DOTS = 0.72;
  /** Dots sit in the wedge before spreading to the full cloud. */
  var HOLD_UNDER_GRAPH = 1;
  /** Time for the dot wave to fill the frame after morph (shorter = snappier graph→cloud transition). */
  var SPREAD_WINDOW = 2.15;
  var morphWindow = MORPH_IN_DOTS;
  var spreadWindow = SPREAD_WINDOW;
  var hangWindow = Math.max(0, DOTS_SEC - morphWindow - HOLD_UNDER_GRAPH - spreadWindow);
  var SEQ_PRE_DOTS = 4.6;
  var lineWindow = SEQ_PRE_DOTS * 0.62;
  var lineEnd = lineWindow;
  var fillEnd = lineEnd;
  var morphEnd = fillEnd + morphWindow;
  var holdEnd = morphEnd + HOLD_UNDER_GRAPH;
  var spreadEnd = holdEnd + spreadWindow;
  var cycleEnd = spreadEnd + hangWindow;

  var SUPPLY_DASH = '4 3';
  var TAU = Math.PI * 2;
  /** Dots move on a shared spatial field + slow drift; lower = calmer than the old fast jitter. */
  var FIELD_TIME_SCALE = 0.48;
  /** Wedge (under-graph gap) dots only — 30% softer, then another 15% on that. */
  var GAP_DOT_VIS = 0.7 * 0.85;

  var panel = figure.querySelector('.gap-chart-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'gap-chart-panel';
    svg.parentNode.insertBefore(panel, svg);
    panel.appendChild(svg);
  }
  var canvas = figure.querySelector('canvas.gap-lenia-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'gap-lenia-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    panel.appendChild(canvas);
  }

  var headingEl = figure.querySelector('.gap-chart-heading');

  var rafId = 0;
  var t0 = 0;
  var running = false;
  var animPaused = true;
  var futurePaths = [];
  var supplyFutureEl = null;
  var fillGroup = null;
  var chartLayerG = null;

  var fieldDots = null;
  var fieldSpacing = 5;
  var fieldMaxDist = 1;
  var fieldMobileLayout = false;
  var fieldCaptionBottom = 0;
  var plotGeom = null;
  var laidOutW = 0;
  var laidOutH = 0;
  var inkColor = '#1F2122';

  function node(tag, attrs, text) {
    var el = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (text != null) el.textContent = text;
    return el;
  }

  function clamp(t, a, b) {
    return Math.max(a, Math.min(b, t));
  }

  function smootherstep(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function parseHexColor(hex) {
    if (typeof hex !== 'string' || hex[0] !== '#') return null;
    var s = hex.slice(1);
    if (s.length === 3) {
      return {
        r: parseInt(s[0] + s[0], 16),
        g: parseInt(s[1] + s[1], 16),
        b: parseInt(s[2] + s[2], 16)
      };
    }
    if (s.length === 6) {
      return {
        r: parseInt(s.slice(0, 2), 16),
        g: parseInt(s.slice(2, 4), 16),
        b: parseInt(s.slice(4, 6), 16)
      };
    }
    return null;
  }

  function dataToScreen(plotL, plotT, plotW, plotH) {
    return {
      x: function (xd) {
        return plotL + ((xd - X_DATA_MIN) / (X_DATA_MAX - X_DATA_MIN)) * plotW;
      },
      y: function (yd) {
        return plotT + ((yd - Y_DATA_TOP) / (Y_DATA_BOTTOM - Y_DATA_TOP)) * plotH;
      }
    };
  }

  function splitIndicesAtX(pts, splitX) {
    var si = -1;
    var i;
    for (i = 0; i < pts.length; i++) {
      if (pts[i][0] >= splitX) {
        si = i;
        break;
      }
    }
    if (si < 0) return { past: [], future: [] };
    var past = [];
    var future = [];
    for (i = 0; i <= si; i++) past.push(i);
    for (i = si; i < pts.length; i++) future.push(i);
    return { past: past, future: future };
  }

  function pathFromIndices(pts, indices, map) {
    var s = '';
    var k;
    for (k = 0; k < indices.length; k++) {
      var p = pts[indices[k]];
      s += (k === 0 ? 'M ' : ' L ') + map.x(p[0]).toFixed(2) + ' ' + map.y(p[1]).toFixed(2);
    }
    return s;
  }

  function envelopeSlice(ptsD, ptsS, i0, i1, map) {
    if (i1 <= i0) return '';
    var s = '';
    var i;
    for (i = i0; i <= i1; i++) {
      var pd = ptsD[i];
      s += (i === i0 ? 'M ' : ' L ') + map.x(pd[0]).toFixed(2) + ' ' + map.y(pd[1]).toFixed(2);
    }
    for (i = i1; i >= i0; i--) {
      var ps = ptsS[i];
      s += ' L ' + map.x(ps[0]).toFixed(2) + ' ' + map.y(ps[1]).toFixed(2);
    }
    s += ' Z';
    return s;
  }

  function buildScreenPoly(map) {
    var poly = [];
    var i;
    for (i = 0; i < DEMAND.length; i++) {
      poly.push({ x: map.x(DEMAND[i][0]), y: map.y(DEMAND[i][1]) });
    }
    for (i = SUPPLY.length - 1; i >= 0; i--) {
      poly.push({ x: map.x(SUPPLY[i][0]), y: map.y(SUPPLY[i][1]) });
    }
    return poly;
  }

  function pointInPolygon(px, py, poly) {
    var inside = false;
    var n = poly.length;
    var i;
    var j;
    for (i = 0, j = n - 1; i < n; j = i++) {
      var xi = poly[i].x;
      var yi = poly[i].y;
      var xj = poly[j].x;
      var yj = poly[j].y;
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi) inside = !inside;
    }
    return inside;
  }

  function polyCentroid(poly) {
    var a = 0;
    var cx = 0;
    var cy = 0;
    var i;
    var j = poly.length - 1;
    for (i = 0; i < poly.length; j = i++) {
      var f = poly[j].x * poly[i].y - poly[i].x * poly[j].y;
      a += f;
      cx += (poly[j].x + poly[i].x) * f;
      cy += (poly[j].y + poly[i].y) * f;
    }
    a *= 0.5;
    if (Math.abs(a) < 1e-6) return { x: poly[0].x, y: poly[0].y };
    return { x: cx / (6 * a), y: cy / (6 * a) };
  }

  function captionBandPx(cssH, mobile) {
    return mobile ? 52 : 58;
  }

  function cloudFalloff(px, py, w, h, capBottom) {
    if (py >= capBottom - 2) return 0;
    var cx = w * 0.5;
    var cy = h * 0.34 + (capBottom / h) * 0.06 * h;
    var rx = w * 0.39;
    var ry = Math.max((capBottom - h * 0.06) * 0.5, h * 0.22);
    var dx = (px - cx) / rx;
    var dy = (py - cy) / ry;
    var e = dx * dx + dy * dy;
    var blob = Math.exp(-e * 0.72);
    var tEdge = clamp((py - h * 0.05) / (h * 0.14), 0, 1);
    var topFade = smootherstep(tEdge);
    var lEdge = clamp((px - w * 0.06) / (w * 0.1), 0, 1);
    var rEdge = clamp((w * 0.94 - px) / (w * 0.1), 0, 1);
    var bottomFade = smootherstep((capBottom - py - 6) / (h * 0.14));
    return blob * topFade * smootherstep(lEdge) * smootherstep(rEdge) * bottomFade;
  }

  function buildFieldDots(w, h, poly, cx, cy, capBottom) {
    var spacing = clamp(Math.sqrt((w * h) / 7200), 4.4, 7.4);
    var rowH = spacing * 0.8660254;
    var dots = [];
    var row = 0;
    var y;
    var maxDist = 1;
    var seed = 0;
    function rnd() {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    }
    var yMin = h * 0.07;
    var yMax = Math.min(capBottom - spacing * 1.1, h - spacing * 0.4);
    var xMin = w * 0.07;
    var xMax = w * 0.93;
    for (y = yMin; y < yMax; y += rowH) {
      var xoff = (row % 2) * spacing * 0.5;
      var x;
      for (x = xMin + xoff; x < xMax; x += spacing) {
        var jx = (rnd() - 0.5) * spacing * 0.6;
        var jy = (rnd() - 0.5) * spacing * 0.55;
        var px = clamp(x + jx, xMin, xMax);
        var py = clamp(y + jy, yMin, yMax);
        var mask = cloudFalloff(px, py, w, h, capBottom);
        if (mask < 0.07 && rnd() > 0.18) continue;
        if (mask < 0.04) continue;
        var inside = pointInPolygon(px, py, poly);
        var dist = Math.hypot(px - cx, py - cy);
        if (dist > maxDist) maxDist = dist;
        var nx = px / w;
        var ny = py / h;
        dots.push({
          bx: px,
          by: py,
          nx: nx,
          ny: ny,
          inFill: inside,
          dist: dist,
          mask0: mask,
          phase: rnd() * TAU,
          ax: 0.28 + rnd() * 0.45,
          ay: 0.26 + rnd() * 0.48,
          fx: 0.65 + rnd() * 1.15,
          fy: 0.62 + rnd() * 1.1,
          slowx: 0.16 + rnd() * 0.26,
          slowy: 0.15 + rnd() * 0.27
        });
      }
      row++;
    }
    return { dots: dots, spacing: spacing, maxDist: maxDist };
  }

  function fieldMotion(dot, t, w, h, capBottom) {
    var nx = dot.nx;
    var ny = dot.ny;
    var p = dot.phase;
    var ft = t * FIELD_TIME_SCALE;
    var sx = nx * 5.9;
    var sy = ny * 5.9;
    function flowAngle(px, py, seed) {
      return Math.sin(px * 2.05 + seed) * Math.cos(py * 1.78 - seed * 0.34)
        + 0.52 * Math.sin(px * 4.12 - py * 3.04 + seed * 0.53);
    }
    var seed = 0.71;
    var eps = 0.052;
    var a0 = flowAngle(sx, sy, seed);
    var aPx = flowAngle(sx + eps, sy, seed);
    var aMx = flowAngle(sx - eps, sy, seed);
    var aPy = flowAngle(sx, sy + eps, seed);
    var aMy = flowAngle(sx, sy - eps, seed);
    var gAx = (aPx - aMx) * 0.5;
    var gAy = (aPy - aMy) * 0.5;
    var a1 = flowAngle(sx * 1.9 + 0.38, sy * 1.9 - 0.31, 2.05);
    var theta = a0 * 2.32 + ft * 0.52 + a1 * 0.79 + p * 0.11;
    var amp = fieldSpacing * 1.05;
    var ox = amp * (Math.cos(theta) + 0.3 * Math.cos(theta * 2.06 - ft * 0.22));
    var oy = amp * (Math.sin(theta) + 0.3 * Math.sin(theta * 2.06 + ft * 0.2));
    var glen = Math.hypot(gAx, gAy) + 1e-6;
    var pxN = -gAy / glen;
    var pyN = gAx / glen;
    var curl = fieldSpacing * 0.28 * Math.sin(ft * 0.38 + a0 * 1.55);
    ox += pxN * curl;
    oy += pyN * curl;
    var slow = fieldSpacing * 0.165;
    ox += slow * Math.sin(ft * dot.slowx + ny * 2.35 + p);
    oy += slow * Math.cos(ft * dot.slowy - nx * 2.15 + p * 0.72);
    var grain = fieldSpacing * 0.092;
    ox += grain * dot.ax * Math.sin(ft * 0.55 + nx * 8.2 + p);
    oy += grain * dot.ay * Math.cos(ft * 0.52 + ny * 7.9 - p * 0.4);
    var px = dot.bx + ox;
    var py = dot.by + oy;
    var padX = w * 0.05;
    px = clamp(px, padX, w - padX);
    py = clamp(py, h * 0.06, capBottom - 10);
    return { x: px, y: py };
  }

  function drawField(ctx, cssW, cssH, elapsed) {
    ctx.setTransform(plotGeom.dpr, 0, 0, plotGeom.dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    if (!fieldDots) return;

    var morphEase = elapsed <= fillEnd ? 0 : (elapsed >= morphEnd ? 1 : smootherstep((elapsed - fillEnd) / morphWindow));
    var spreadEase = elapsed <= holdEnd ? 0 : (elapsed >= spreadEnd ? 1 : smootherstep((elapsed - holdEnd) / spreadWindow));
    if (morphEase <= 0) return;

    var fieldT = Math.max(0, elapsed - fillEnd);
    var baseR = fieldSpacing * 0.1;
    var capBottom = fieldCaptionBottom || cssH - captionBandPx(cssH, fieldMobileLayout);
    var capOp = smootherstep(clamp((spreadEase - 0.22) / 0.5, 0, 1));

    ctx.fillStyle = inkColor;

    var i;
    var dot;
    var appear;
    var pos;
    var drew = false;
    for (i = 0; i < fieldDots.length; i++) {
      dot = fieldDots[i];
      if (dot.inFill) {
        appear = morphEase;
      } else {
        appear = smootherstep(clamp((spreadEase - (dot.dist / fieldMaxDist) * 0.72) / 0.28, 0, 1));
        if (appear < 0.05) continue;
      }
      pos = fieldMotion(dot, fieldT, cssW, cssH, capBottom);
      var cf = cloudFalloff(pos.x, pos.y, cssW, cssH, capBottom);
      if (cf < 0.03) continue;
      var wander = dot.inFill ? morphEase * GAP_DOT_VIS : appear;
      var r = baseR * (0.75 + 0.5 * wander);
      var alpha = (0.12 + 0.88 * appear) * (0.5 + 0.5 * wander) * cf * (0.65 + 0.35 * (dot.mask0 || 1));
      if (alpha < 0.035) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, TAU);
      ctx.fill();
      drew = true;
    }
    ctx.globalAlpha = 1;

    if (drew && capOp > 0.02) {
      var capY = cssH - (fieldMobileLayout ? 24 : 28);
      ctx.save();
      var sansStack = getComputedStyle(document.documentElement).getPropertyValue('--sans').trim() || 'system-ui, sans-serif';
      ctx.font = '500 ' + (fieldMobileLayout ? '15px' : '16px') + ' ' + sansStack;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      var capText = 'A billion personal computers';
      var cx = cssW * 0.5;
      var baseA = 0.55 * capOp;

      if (reduced.matches) {
        ctx.fillStyle = inkColor;
        ctx.globalAlpha = baseA;
        ctx.fillText(capText, cx, capY);
      } else {
        var tw = ctx.measureText(capText).width;
        var rgb = parseHexColor(inkColor) || { r: 31, g: 33, b: 34 };
        function mixRgb(bright) {
          return 'rgb(' +
            Math.round(lerp(rgb.r, 255, bright)) + ',' +
            Math.round(lerp(rgb.g, 255, bright)) + ',' +
            Math.round(lerp(rgb.b, 255, bright)) + ')';
        }
        var sweep = elapsed * 1.1 + fieldT * 0.42;
        var u = (Math.sin(sweep) * 0.5 + 0.5);
        var span = Math.max(tw * 1.35, cssW * 0.38);
        var gCap = ctx.createLinearGradient(cx - span, capY, cx + span, capY);
        var w0 = clamp(u - 0.2, 0, 1);
        var w1 = clamp(u - 0.06, 0, 1);
        var w2 = clamp(u + 0.08, 0, 1);
        var w3 = clamp(u + 0.22, 0, 1);
        gCap.addColorStop(0, mixRgb(0.02));
        gCap.addColorStop(w0, mixRgb(0.06));
        gCap.addColorStop(w1, mixRgb(0.22));
        gCap.addColorStop(w2, mixRgb(0.55));
        gCap.addColorStop(w3, mixRgb(0.2));
        gCap.addColorStop(1, mixRgb(0.05));
        var twinkle = 0.92 + 0.08 * Math.sin(elapsed * 2.85 + 0.4);
        ctx.fillStyle = gCap;
        ctx.globalAlpha = baseA * twinkle;
        ctx.fillText(capText, cx, capY);
      }
      ctx.restore();
    }
  }

  var STROKE = {
    supply: { stroke: 'var(--ink-soft)', 'stroke-width': '1', 'stroke-opacity': '0.72', 'stroke-dasharray': SUPPLY_DASH },
    demand: { stroke: 'var(--ink)', 'stroke-width': '1.08', 'stroke-opacity': '0.92' }
  };

  var FILL_BASE = { fill: 'var(--ink)', 'fill-opacity': '0.055', stroke: 'none' };

  function applyFillPhase(fillEase) {
    var op = reduced.matches ? 1 : clamp(fillEase, 0, 1);
    if (fillGroup) fillGroup.setAttribute('opacity', op.toFixed(3));
  }

  function tick(now) {
    if (animPaused || reduced.matches) {
      rafId = 0;
      return;
    }
    rafId = requestAnimationFrame(tick);
    if (!plotGeom) return;

    if (!t0) t0 = now;
    var elapsed = (now - t0) / 1000;

    if (elapsed >= cycleEnd) {
      startAnim();
      return;
    }

    var lineEase = elapsed < lineEnd ? smootherstep(elapsed / lineWindow) : 1;
    var morphEase = elapsed <= fillEnd ? 0 : (elapsed >= morphEnd ? 1 : smootherstep((elapsed - fillEnd) / morphWindow));
    var spreadEase = elapsed <= holdEnd ? 0 : (elapsed >= spreadEnd ? 1 : smootherstep((elapsed - holdEnd) / spreadWindow));

    futurePaths.forEach(function (item) {
      var L = item.len;
      if (!L) return;
      if (lineEase >= 1) {
        if (item.el === supplyFutureEl) {
          item.el.setAttribute('stroke-dasharray', SUPPLY_DASH);
          item.el.removeAttribute('stroke-dashoffset');
        } else {
          item.el.removeAttribute('stroke-dasharray');
          item.el.removeAttribute('stroke-dashoffset');
        }
        return;
      }
      item.el.setAttribute('stroke-dasharray', L.toFixed(2));
      item.el.setAttribute('stroke-dashoffset', (L * (1 - lineEase)).toFixed(2));
    });

    if (fillGroup) {
      fillGroup.setAttribute('opacity', reduced.matches ? '1' : '0');
    }

    var chartFade = smootherstep(clamp((spreadEase - 0.42) / 0.58, 0, 1));
    if (svg) svg.style.opacity = chartFade > 0 ? String(1 - chartFade) : '';
    if (chartFade > 0.98) figure.classList.add('gap-lenia-active');
    else figure.classList.remove('gap-lenia-active');

    if (morphEase > 0) {
      canvas.style.opacity = '1';
      var ctx = canvas.getContext('2d');
      drawField(ctx, plotGeom.cssW, plotGeom.cssH, elapsed);
    } else if (canvas.style.opacity !== '0') {
      canvas.style.opacity = '0';
    }
  }

  function startAnim() {
    if (reduced.matches) return;
    cancelAnimationFrame(rafId);
    t0 = performance.now();
    running = true;
    figure.classList.remove('gap-lenia-active');
    if (headingEl) headingEl.style.opacity = '';
    if (svg) svg.style.opacity = '';
    canvas.style.opacity = '0';
    futurePaths.forEach(function (item) {
      var L = item.len;
      if (!L) return;
      item.el.setAttribute('stroke-dasharray', L.toFixed(2));
      item.el.setAttribute('stroke-dashoffset', L.toFixed(2));
    });
    applyFillPhase(0);
    rafId = requestAnimationFrame(tick);
  }

  function prepare() {
    var rect = panel.getBoundingClientRect();
    var w = Math.round(rect.width);
    var h = Math.round(rect.height);
    if (w < 8) return;
    if (h < 8) h = Math.round(w * 420 / 720);
    if (fieldDots && w === laidOutW && h === laidOutH) return;

    cancelAnimationFrame(rafId);
    rafId = 0;
    running = false;
    futurePaths = [];
    supplyFutureEl = null;
    fillGroup = null;
    chartLayerG = null;
    fieldDots = null;
    plotGeom = null;
    figure.classList.remove('gap-lenia-active');
    if (headingEl) headingEl.style.opacity = '';
    if (svg) svg.style.opacity = '';
    canvas.style.opacity = '0';

    laidOutW = w;
    laidOutH = h;
    var mobile = w < 520;
    fieldMobileLayout = mobile;
    var padL = mobile ? 44 : 56;
    var padR = mobile ? 88 : 100;
    var padT = mobile ? 48 : 52;
    var padB = mobile ? 64 : 72;

    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

    var plotL = padL;
    var plotR = w - padR;
    var plotT = padT;
    var plotB = h - padB;
    var plotW = plotR - plotL;
    var plotH = plotB - plotT;
    var map = dataToScreen(plotL, plotT, plotW, plotH);

    function xfYear(yr) {
      return plotL + ((yr - YEARS[0]) / (YEARS[YEARS.length - 1] - YEARS[0])) * plotW;
    }

    var dIdx = splitIndicesAtX(DEMAND, SPLIT_X);
    var fillD = envelopeSlice(DEMAND, SUPPLY, 0, DEMAND.length - 1, map);
    var poly = buildScreenPoly(map);
    var centroid = polyCentroid(poly);
    if (!pointInPolygon(centroid.x, centroid.y, poly)) {
      centroid = { x: (plotL + plotR) * 0.5, y: (plotT + plotB) * 0.55 };
    }
    var capBand = captionBandPx(h, mobile);
    fieldCaptionBottom = h - capBand;
    var built = buildFieldDots(w, h, poly, centroid.x, centroid.y, fieldCaptionBottom);
    fieldDots = built.dots;
    fieldSpacing = built.spacing;
    fieldMaxDist = built.maxDist;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    plotGeom = { cssW: w, cssH: h, dpr: dpr };

    inkColor = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#1F2122';

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    svg.replaceChildren();

    chartLayerG = node('g', { class: 'gap-chart-layer' });

    fillGroup = node('g', { class: 'gap-fill-layer' });
    if (fillD) fillGroup.appendChild(node('path', Object.assign({ class: 'gap-fill-unmet' }, FILL_BASE, { d: fillD })));
    chartLayerG.appendChild(fillGroup);

    var gg = node('g', { class: 'gap-grid' });
    var g;
    for (g = 0; g <= 4; g++) {
      var gy = plotT + (g / 4) * plotH;
      gg.appendChild(node('line', {
        x1: plotL, x2: plotR, y1: gy, y2: gy,
        stroke: 'var(--rule)', 'stroke-width': 0.65, opacity: 0.38
      }));
    }
    chartLayerG.appendChild(gg);

    var legLx = plotL + 6;
    var legY0 = plotT + 10;
    var legends = [
      { label: 'Token demand', line: { stroke: 'var(--ink)', 'stroke-width': '1.05', 'stroke-opacity': '0.9' }, y: legY0 },
      { label: 'Cloud supply', line: Object.assign({ 'stroke-dasharray': SUPPLY_DASH }, STROKE.supply), y: legY0 + 15 }
    ];
    var legG = node('g', { class: 'gap-legend-wrap' });
    var li;
    for (li = 0; li < legends.length; li++) {
      var lg = legends[li];
      legG.appendChild(node('line', Object.assign({
        x1: legLx, x2: legLx + 18, y1: lg.y, y2: lg.y,
        'stroke-linecap': 'round', fill: 'none'
      }, lg.line)));
      legG.appendChild(node('text', {
        class: 'gap-legend',
        x: legLx + 24,
        y: lg.y + 3.5,
        'text-anchor': 'start',
        fill: 'var(--ink-soft)'
      }, lg.label));
    }
    chartLayerG.appendChild(legG);

    var common = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

    var sIdx = splitIndicesAtX(SUPPLY, SPLIT_X);
    var supplyPast = sIdx.past.length > 1 ? pathFromIndices(SUPPLY, sIdx.past, map) : '';
    var supplyFuture = sIdx.future.length > 1 ? pathFromIndices(SUPPLY, sIdx.future, map) : '';
    if (supplyPast) {
      chartLayerG.appendChild(node('path', Object.assign({}, common, STROKE.supply, { d: supplyPast, class: 'gap-series gap-series-supply' })));
    }
    if (supplyFuture) {
      var sFut = node('path', Object.assign({}, common, STROKE.supply, { d: supplyFuture, class: 'gap-series gap-series-supply gap-future-line' }));
      chartLayerG.appendChild(sFut);
      supplyFutureEl = sFut;
      try {
        futurePaths.push({ el: sFut, len: sFut.getTotalLength() });
      } catch (e) {
        futurePaths.push({ el: sFut, len: 0 });
      }
    }

    var demandPast = dIdx.past.length > 1 ? pathFromIndices(DEMAND, dIdx.past, map) : '';
    var demandFuture = dIdx.future.length > 1 ? pathFromIndices(DEMAND, dIdx.future, map) : '';
    if (demandPast) {
      chartLayerG.appendChild(node('path', Object.assign({}, common, STROKE.demand, { d: demandPast, class: 'gap-series gap-series-demand' })));
    }
    if (demandFuture) {
      var dFut = node('path', Object.assign({}, common, STROKE.demand, { d: demandFuture, class: 'gap-series gap-series-demand gap-future-line' }));
      chartLayerG.appendChild(dFut);
      try {
        futurePaths.push({ el: dFut, len: dFut.getTotalLength() });
      } catch (e) {
        futurePaths.push({ el: dFut, len: 0 });
      }
    }

    var yearsG = node('g', { class: 'gap-x-axis' });
    var yi;
    for (yi = 0; yi < YEARS.length; yi++) {
      yearsG.appendChild(node('text', {
        class: 'gap-axis-year',
        x: xfYear(YEARS[yi]),
        y: h - (mobile ? 22 : 26),
        'text-anchor': 'middle'
      }, String(YEARS[yi])));
    }
    chartLayerG.appendChild(yearsG);
    svg.appendChild(chartLayerG);

    if (reduced.matches) {
      futurePaths.forEach(function (item) {
        if (item.el === supplyFutureEl) {
          item.el.setAttribute('stroke-dasharray', SUPPLY_DASH);
          item.el.removeAttribute('stroke-dashoffset');
        } else {
          item.el.removeAttribute('stroke-dasharray');
          item.el.removeAttribute('stroke-dashoffset');
        }
      });
      applyFillPhase(1);
    } else if (!animPaused) {
      startAnim();
    } else {
      futurePaths.forEach(function (item) {
        var L = item.len;
        if (!L) return;
        item.el.setAttribute('stroke-dasharray', L.toFixed(2));
        item.el.setAttribute('stroke-dashoffset', L.toFixed(2));
      });
      applyFillPhase(0);
    }
  }

  function armIfVisible() {
    var r = figure.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    var on = r.width > 0 && r.bottom > 40 && r.top < vh - 20;
    animPaused = !on;
    if (!on || reduced.matches) return;
    if (!running) startAnim();
    else if (!rafId) rafId = requestAnimationFrame(tick);
  }

  var io = new IntersectionObserver(function (ents) {
    var on = !!(ents[0] && ents[0].isIntersecting);
    animPaused = !on;
    if (!on || reduced.matches) return;
    if (!running) startAnim();
    else if (!rafId) rafId = requestAnimationFrame(tick);
  }, { threshold: 0.12, rootMargin: '40px 0px' });
  io.observe(figure);

  var resizeTimer = 0;
  new ResizeObserver(function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(prepare, 80);
  }).observe(panel);
  prepare();
  requestAnimationFrame(armIfVisible);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (running && !animPaused && !reduced.matches && !rafId) {
      rafId = requestAnimationFrame(tick);
    }
  });
  reduced.addEventListener('change', prepare);
})();
