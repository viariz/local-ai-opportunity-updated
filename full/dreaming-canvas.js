(function () {
  'use strict';

  var W = 720;
  var H = 480;
  var CX = W * 0.5;
  var R = 460;
  var VISIBLE_FRAC = 0.25;
  var PHI_MAX = Math.acos(1 - 2 * VISIBLE_FRAC);
  var PHI_MIN = 0.012;
  var PHI_TOP = PHI_MAX - 0.012;
  var RINGS = 56;
  var MERIDIANS = 96;
  var SCY = H + 8 + R * 0.34;
  var POLE_Y = SCY - R;
  var HORIZON_Y = SCY - R * Math.cos(PHI_MAX);
  var SMOOTH = 24;
  var TIME = 0.52;
  var MAX_DRIFT = 0.134;
  var ICON_R = 24;
  var ICON_LINE_GAP = 9;
  var ICON_HOLD_SEC = 3;
  var ICON_GLYPH = 16.5;
  var ORBIT_LIFT = 58;
  var ARC_CX = CX;
  var ARC_CY = SCY;
  var ARC_R = R + ORBIT_LIFT;
  var ARC_A_CTR = Math.PI * 0.5;
  var ARC_Y_SIN = Math.max(0.01, Math.min(1, (ARC_CY - (H - 14)) / ARC_R));
  var ARC_X_COS_R = Math.max(-1, Math.min(1, (W - 16 - ARC_CX) / ARC_R));
  var ARC_X_COS_L = Math.max(-1, Math.min(1, (ARC_CX - 16) / ARC_R));
  var ARC_A_RIGHT = Math.max(Math.asin(ARC_Y_SIN), Math.acos(ARC_X_COS_R));
  var ARC_A_LEFT = Math.min(Math.PI - Math.asin(ARC_Y_SIN), Math.PI - Math.acos(ARC_X_COS_L));
  var ICON_THETA_GAP = 0.26;
  var ICON_TRAIN_SPEED = 0.23;
  var ICON_TRAIN_MIN_SEC = 0.68;
  var ICON_TRAIN_RENDER_SMOOTH = 52;
  var ICON_TRAIN_ARC_RENDER = 34;
  var ICON_SPAWN_OFFSET = 0.12;
  var ICON_GLYPH_INSET = 1.38;
  var FALL_DURATION_SEC = 1.45;
  var COSMOS_DURATION_SEC = 6;
  var COSMOS_BLEND_IN_SEC = 1.05;
  var COSMOS_BLEND_OUT_SEC = 0.75;
  var COSMOS_SMOOTH = 11;
  var WEIGHTS_LINE_STEP = 4;
  var WEIGHTS_START_IMPULSE_FRAC = 0.48;
  var FALL_PARTICLE_COUNT = 48;
  var FALL_ENTRY_Y = POLE_Y + (HORIZON_Y - POLE_Y) * 0.4;
  var STATUS_Y = H - 36;
  var ICON_TYPES = ['file', 'message', 'x', 'email'];
  var ICON_ASSETS = {
    file: 'dreaming-icons/file.svg',
    message: 'dreaming-icons/message.svg',
    x: 'dreaming-icons/x.svg',
    email: 'dreaming-icons/email.svg'
  };
  var INK_RGB = '31,33,34';

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function hash01(a, b) {
    var x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function fromAngles(theta, phi) {
    var sinP = Math.sin(phi);
    return {
      x: sinP * Math.cos(theta),
      y: Math.cos(phi),
      z: sinP * Math.sin(theta)
    };
  }

  function normalize(u) {
    var len = Math.hypot(u.x, u.y, u.z) || 1;
    return { x: u.x / len, y: u.y / len, z: u.z / len };
  }

  function dot3(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function slerp(u0, u1, alpha) {
    var dot = dot3(u0, u1);
    dot = Math.max(-1, Math.min(1, dot));
    if (dot > 0.9995) {
      return normalize({
        x: u0.x + (u1.x - u0.x) * alpha,
        y: u0.y + (u1.y - u0.y) * alpha,
        z: u0.z + (u1.z - u0.z) * alpha
      });
    }
    var omega = Math.acos(dot);
    var sinOmega = Math.sin(omega);
    var w0 = Math.sin((1 - alpha) * omega) / sinOmega;
    var w1 = Math.sin(alpha * omega) / sinOmega;
    return normalize({
      x: u0.x * w0 + u1.x * w1,
      y: u0.y * w0 + u1.y * w1,
      z: u0.z * w0 + u1.z * w1
    });
  }

  function clampDrift(anchorU, u, maxAngle) {
    var dot = dot3(anchorU, u);
    dot = Math.max(-1, Math.min(1, dot));
    var angle = Math.acos(dot);
    if (angle <= maxAngle) return u;
    return slerp(anchorU, u, maxAngle / angle);
  }

  function tangentBasis(u) {
    var ref = Math.abs(u.y) > 0.92 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    var e1x = ref.y * u.z - ref.z * u.y;
    var e1y = ref.z * u.x - ref.x * u.z;
    var e1z = ref.x * u.y - ref.y * u.x;
    var e1 = normalize({ x: e1x, y: e1y, z: e1z });
    var e2x = u.y * e1.z - u.z * e1.y;
    var e2y = u.z * e1.x - u.x * e1.z;
    var e2z = u.x * e1.y - u.y * e1.x;
    return { e1: e1, e2: { x: e2x, y: e2y, z: e2z } };
  }

  function cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  function projectTangent(u, v) {
    var dot = v.x * u.x + v.y * u.y + v.z * u.z;
    return {
      x: v.x - u.x * dot,
      y: v.y - u.y * dot,
      z: v.z - u.z * dot
    };
  }

  function potential(u, t, scale, seed) {
    var x = u.x;
    var y = u.y;
    var z = u.z;
    var s = seed * 9.17;
    var a = (x * 2.17 + y * 1.31 + s) * scale + t * 0.09;
    var b = (z * 2.43 - x * 1.73 + s * 0.6) * scale - t * 0.07;
    var c = (y * 3.19 + z * 1.87 - s * 0.4) * scale - t * 0.05;
    var d = (x * 1.47 + z * 2.77 + y * 0.93 + s * 1.2) * scale + t * 0.04;
    return (
      Math.sin(a) * Math.cos(b) +
      Math.sin(c) * 0.72 +
      Math.cos(d) * 0.48 +
      Math.sin(a * 0.53 + c * 0.71) * Math.cos(b * 0.61 - d * 0.34) * 0.36
    );
  }

  function streamAt(u, t, scale, seed) {
    var eps = 0.035;
    var basis = tangentBasis(u);
    var e1 = basis.e1;
    var e2 = basis.e2;
    var p0 = potential(u, t, scale, seed);
    var u1 = normalize({ x: u.x + e1.x * eps, y: u.y + e1.y * eps, z: u.z + e1.z * eps });
    var u2 = normalize({ x: u.x + e2.x * eps, y: u.y + e2.y * eps, z: u.z + e2.z * eps });
    var p1 = potential(u1, t, scale, seed);
    var p2 = potential(u2, t, scale, seed);
    var grad = {
      x: e1.x * (p1 - p0) / eps + e2.x * (p2 - p0) / eps,
      y: e1.y * (p1 - p0) / eps + e2.y * (p2 - p0) / eps,
      z: e1.z * (p1 - p0) / eps + e2.z * (p2 - p0) / eps
    };
    var swirl = projectTangent(u, cross(u, grad));
    var len = Math.hypot(swirl.x, swirl.y, swirl.z) || 1;
    return { x: swirl.x / len, y: swirl.y / len, z: swirl.z / len };
  }

  function organicStream(u, t, seed) {
    var s1 = streamAt(u, t, 1.55, seed);
    var s2 = streamAt(u, t * 1.08 + 2.1, 3.35, seed + 0.31);
    var s3 = streamAt(u, t * 0.92 + 4.7, 6.2, seed + 0.67);
    var wobble = 0.54 + 0.46 * Math.sin(t * 0.13 + seed * 6.28);
    return normalize({
      x: s1.x * 0.52 + s2.x * 0.33 * wobble + s3.x * 0.18,
      y: s1.y * 0.52 + s2.y * 0.33 * wobble + s3.y * 0.18,
      z: s1.z * 0.52 + s2.z * 0.33 * wobble + s3.z * 0.18
    });
  }

  function rotateAround(u, k, ang) {
    k = normalize(k);
    var c = Math.cos(ang);
    var s = Math.sin(ang);
    var ku = dot3(k, u);
    var cr = cross(k, u);
    return normalize({
      x: u.x * c + cr.x * s + k.x * ku * (1 - c),
      y: u.y * c + cr.y * s + k.y * ku * (1 - c),
      z: u.z * c + cr.z * s + k.z * ku * (1 - c)
    });
  }

  function streamBinormal(u, stream) {
    var b = cross(u, stream);
    var len = Math.hypot(b.x, b.y, b.z);
    if (len < 1e-4) return null;
    return { x: b.x / len, y: b.y / len, z: b.z / len };
  }

  function sphereTopOriginU() {
    return normalize(fromAngles(0, PHI_MIN + 0.018));
  }

  function splashLiftAt(u, impulse) {
    if (!impulse || impulse.age >= impulse.duration) return 0;
    var age = impulse.age;
    var ang = Math.acos(Math.max(-1, Math.min(1, dot3(u, impulse.u0))));
    var life = clamp01(age / impulse.duration);
    var fadeIn = smoothStep(clamp01(age / 0.12));
    var fadeOut = 1 - smoothStep(clamp01((age - impulse.duration * 0.72) / (impulse.duration * 0.28)));
    var fade = fadeIn * fadeOut * Math.exp(-age * 0.62);

    var core = Math.exp(-Math.pow(ang / impulse.core, 2));
    var rise = easeSmooth(clamp01(age / 0.42));
    var settle = 1 - easeSmooth(clamp01((age - 0.38) / 0.75));
    var coreLift = core * rise * settle * impulse.amp * 0.72;

    var front = age * impulse.speed;
    var lag = ang - front;
    var ring = Math.exp(-Math.pow(lag / impulse.width, 2));
    var crestPhase = clamp01(0.5 - lag / (impulse.width * 1.35));
    var crest = Math.sin(crestPhase * Math.PI) * ring;
    var arrive = smoothStep(clamp01((lag + impulse.width * 1.6) / (impulse.width * 0.75)));
    var ringLift = crest * arrive * impulse.amp * fade * 0.82;

    return (coreLift + ringLift) * (1 - life * 0.08);
  }

  function splashScreenShift(anchorU, pt, impulse) {
    var lift = splashLiftAt(anchorU, impulse);
    if (Math.abs(lift) < 0.001) return { x: pt.x, y: pt.y, lift: 0 };
    var epic = projectUnit(impulse.u0);
    if (!epic) return { x: pt.x, y: pt.y - lift * 12, lift: lift };
    var dx = pt.x - epic.x;
    var dy = pt.y - epic.y;
    var len = Math.hypot(dx, dy) || 1;
    var ux = dx / len;
    var uy = dy / len;
    var spread = lift * 9.5;
    return {
      x: pt.x + ux * spread * 0.34,
      y: pt.y - Math.abs(lift) * 14 + uy * spread * 0.12,
      lift: lift
    };
  }

  function triggerSphereImpulse(cycle) {
    cycle.impulse = {
      age: 0,
      duration: 2.45,
      u0: sphereTopOriginU(),
      speed: 1.22,
      width: 0.21,
      core: 0.09,
      amp: 0.68
    };
  }

  function averageUnitVectors(list) {
    var x = 0;
    var y = 0;
    var z = 0;
    for (var i = 0; i < list.length; i++) {
      x += list[i].x;
      y += list[i].y;
      z += list[i].z;
    }
    return normalize({ x: x, y: y, z: z });
  }

  function organicUnit(dot, t) {
    var anchorU = dot.anchorU;
    var tt = t * TIME;
    var p = dot.phase;
    var fieldT = tt + Math.sin(tt * 0.06) * 1.8;

    var stream = organicStream(anchorU, fieldT, dot.flowSeed);
    var streamB = organicStream(anchorU, fieldT * 0.9 + 2.4, dot.flowSeed + 0.27);
    var bin = streamBinormal(anchorU, stream);
    var binB = streamBinormal(anchorU, streamB);
    var u = anchorU;

    if (bin) {
      var along =
        dot.pathA * Math.sin(tt * dot.w1 + p) +
        dot.pathB * Math.sin(tt * dot.w2 + p * 1.67 + dot.w3);
      u = rotateAround(u, bin, along);
    }

    var side =
      dot.latA * Math.sin(tt * dot.w4 + p * 0.9) * Math.cos(tt * dot.w5 + p * 1.35);
    u = rotateAround(u, stream, side);

    if (binB) {
      var alongB = dot.pathC * Math.cos(tt * dot.w6 + p * 1.12 + dot.w7);
      u = rotateAround(u, binB, alongB * 0.62);
    }

    var ripple =
      dot.ripple * Math.sin(tt * dot.w8 + p * 1.4) * Math.sin(tt * dot.w9 + p * 0.55 + dot.w10);
    var basis = tangentBasis(anchorU);
    u = normalize({
      x: u.x + basis.e1.x * ripple + stream.x * ripple * 0.35,
      y: u.y + basis.e1.y * ripple + stream.y * ripple * 0.35,
      z: u.z + basis.e1.z * ripple + stream.z * ripple * 0.35
    });

    u = clampDrift(anchorU, u, MAX_DRIFT);

    var ang = {
      phi: Math.acos(Math.max(-1, Math.min(1, u.y))),
      theta: Math.atan2(u.z, u.x)
    };
    ang.phi = Math.max(PHI_MIN, Math.min(PHI_TOP, ang.phi));
    return fromAngles(ang.theta, ang.phi);
  }

  function isCosmosActive(cycle) {
    return !!(cycle && cycle.cosmos && cycle.cosmos.age < cycle.cosmos.duration);
  }

  function cosmosBlendWeight(cycle) {
    if (!isCosmosActive(cycle)) return 0;
    var c = cycle.cosmos;
    var enter = easeSmooth(clamp01(c.age / COSMOS_BLEND_IN_SEC));
    var exit = 1 - easeSmooth(clamp01((c.age - (c.duration - COSMOS_BLEND_OUT_SEC)) / COSMOS_BLEND_OUT_SEC));
    return enter * exit;
  }

  function isWeightsLineNode(dot) {
    return dot.ring % WEIGHTS_LINE_STEP === 0 && dot.meridian % WEIGHTS_LINE_STEP === 0;
  }

  function weightsLineUnit(dot, t, cosmosAge, mix) {
    var anchorU = dot.anchorU;
    var basis = tangentBasis(anchorU);
    var smoothMix = easeSmooth(mix);
    var tt = t * TIME * 0.32 + cosmosAge * 0.52;
    var merBand = Math.floor(dot.meridian / WEIGHTS_LINE_STEP);
    var ringBand = Math.floor(dot.ring / WEIGHTS_LINE_STEP);
    var merId = merBand / Math.max(1, Math.ceil(MERIDIANS / WEIGHTS_LINE_STEP));
    var ringT = ringBand / Math.max(1, Math.ceil(RINGS / WEIGHTS_LINE_STEP));

    var merWave =
      Math.sin(ringT * 6.4 + tt * 1.08 + merId * Math.PI * 2) +
      0.36 * Math.sin(ringT * 3.8 - tt * 0.82 + merId * 4.1) +
      0.28 * Math.sin(ringT * 9.5 + tt * 0.64 + dot.phase);
    var ringWave =
      0.48 * Math.sin(merId * Math.PI * 2 * 2.2 + tt * 0.92 + ringT * 2.6) +
      0.26 * Math.cos(merId * 5.5 - tt * 1.05 + dot.flowSeed * 3.1) +
      0.2 * Math.sin(tt * 0.74 + ringT * 5.2 + dot.w3 * 2);

    var amp = 0.036 * smoothMix;
    var lineU = normalize({
      x: anchorU.x + basis.e1.x * merWave * amp + basis.e2.x * ringWave * amp * 0.75,
      y: anchorU.y + basis.e1.y * merWave * amp + basis.e2.y * ringWave * amp * 0.75,
      z: anchorU.z + basis.e1.z * merWave * amp + basis.e2.z * ringWave * amp * 0.75
    });
    var u = slerp(anchorU, lineU, smoothMix);
    var driftCap = MAX_DRIFT * (0.42 + smoothMix * 1.35);
    u = clampDrift(anchorU, u, driftCap);

    var ang = {
      phi: Math.acos(Math.max(-1, Math.min(1, u.y))),
      theta: Math.atan2(u.z, u.x)
    };
    ang.phi = Math.max(PHI_MIN, Math.min(PHI_TOP, ang.phi));
    return fromAngles(ang.theta, ang.phi);
  }

  function organicUnitForDot(dot, t, cycle) {
    var base = organicUnit(dot, t);
    var mix = cosmosBlendWeight(cycle);
    if (mix < 0.001) return base;
    var cosmosAge = cycle.cosmos ? cycle.cosmos.age : 0;
    var dream = weightsLineUnit(dot, t, cosmosAge, mix);
    var blend = easeSmooth(mix);
    return slerp(base, dream, blend);
  }

  function drawWeightsLines(ctx, projectedByIdx, weightsMix, ink) {
    if (weightsMix < 0.06) return;
    var lineA = 0.1 * easeSmooth(weightsMix);
    var step = WEIGHTS_LINE_STEP;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.48;
    for (var ri = 0; ri <= RINGS; ri += step) {
      for (var mi = 0; mi < MERIDIANS; mi += step) {
        var idx = ri * MERIDIANS + mi;
        var a = projectedByIdx[idx];
        if (!a || a.alpha < 0.035) continue;
        if (ri + step <= RINGS) {
          var b = projectedByIdx[(ri + step) * MERIDIANS + mi];
          if (b && b.alpha > 0.035) {
            ctx.globalAlpha = lineA * Math.min(a.alpha, b.alpha);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        var idxM = ri * MERIDIANS + ((mi + step) % MERIDIANS);
        var c = projectedByIdx[idxM];
        if (c && c.alpha > 0.035) {
          ctx.globalAlpha = lineA * Math.min(a.alpha, c.alpha);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function isIconTrainFrozen(cycle) {
    return !!(cycle && cycle.iconTrainFrozen);
  }

  function freezeIconTrain(cycle, queue) {
    cycle.iconTrainFrozen = true;
    cycle.frozenLeadAnchor = cycle.leadAnchor;
    cycle.leadVel = 0;
    cycle.trainMoveDist = null;
    for (var i = 0; i < queue.length; i++) {
      var ic = queue[i];
      if (ic.phase !== 'arc') continue;
      ic.frozenTheta = ic.renderTheta != null ? ic.renderTheta : ic.theta;
      ic.theta = ic.frozenTheta;
      ic.renderTheta = ic.frozenTheta;
    }
  }

  function applyIconTrainFreeze(cycle, queue) {
    if (!isIconTrainFrozen(cycle)) return;
    cycle.leadAnchor = cycle.frozenLeadAnchor;
    cycle.leadTarget = cycle.frozenLeadAnchor;
    cycle.leadVel = 0;
    cycle.trainMoveDist = null;
    for (var i = 0; i < queue.length; i++) {
      var ic = queue[i];
      if (ic.phase !== 'arc' || ic.frozenTheta == null) continue;
      ic.theta = ic.frozenTheta;
      ic.renderTheta = ic.frozenTheta;
    }
  }

  function clearIconTrainFreeze(cycle, queue) {
    cycle.iconTrainFrozen = false;
    for (var i = 0; i < queue.length; i++) {
      delete queue[i].frozenTheta;
    }
  }

  function resumeIconTrainAfterWeights(cycle, queue, spawnRef) {
    if (cycle.pendingFallReindex) {
      reindexArcSlots(queue);
      cycle.pendingFallReindex = false;
    }

    var slot0 = null;
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].phase === 'arc' && queue[i].slot === 0) slot0 = queue[i];
    }

    var lead = cycle.frozenLeadAnchor != null ? cycle.frozenLeadAnchor : ARC_A_CTR;
    if (slot0) {
      lead = slot0.frozenTheta != null ? slot0.frozenTheta : slot0.renderTheta != null ? slot0.renderTheta : slot0.theta;
    }

    cycle.leadAnchor = lead;
    cycle.leadTarget = lead;
    cycle.leadVel = 0;
    cycle.trainMoveDist = null;
    cycle.trainMoveElapsed = 0;

    for (var j = 0; j < queue.length; j++) {
      var ic = queue[j];
      if (ic.phase !== 'arc') continue;
      ic.theta = lead + ic.slot * ICON_THETA_GAP;
      ic.renderTheta = ic.theta;
      delete ic.frozenTheta;
    }

    cycle.iconTrainFrozen = false;

    while (
      queue.filter(function (q) {
        return q.phase === 'arc' || q.phase === 'hold' || q.phase === 'fall';
      }).length < 4
    ) {
      spawnIconLeft(queue, spawnRef, cycle.leadTarget);
    }
    ensureSpawnTailOnArc(queue, cycle);

    for (var k = 0; k < queue.length; k++) {
      var arc = queue[k];
      if (arc.phase !== 'arc') continue;
      arc.theta = cycle.leadAnchor + arc.slot * ICON_THETA_GAP;
      arc.renderTheta = arc.theta;
    }
  }

  function ensureIconQueueCount(queue, spawnRef, cycle) {
    while (
      queue.filter(function (q) {
        return q.phase === 'arc' || q.phase === 'hold' || q.phase === 'fall';
      }).length < 4
    ) {
      spawnIconLeft(queue, spawnRef, cycle.leadTarget);
      ensureSpawnTailOnArc(queue, cycle);
    }
  }

  function refreshLabelAfterWeights(cycle, queue) {
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].phase === 'hold') {
        setCycleLabel(cycle, 'Analyzing context');
        return;
      }
    }
    setCycleLabel(cycle, '');
  }

  function endCosmosPhase(cycle, queue, spawnRef) {
    cycle.cosmos = null;
    cycle.weightsFocus = false;
    resumeIconTrainAfterWeights(cycle, queue, spawnRef);
    refreshLabelAfterWeights(cycle, queue);
  }

  function projectUnit(u) {
    var phi = Math.acos(Math.max(-1, Math.min(1, u.y)));
    if (phi > PHI_MAX + 0.004 || u.z < -0.02) return null;
    var depth = 0.84 + u.z * 0.16;
    return {
      x: CX + u.x * R * depth,
      y: SCY - u.y * R * depth,
      z: u.z,
      phi: phi
    };
  }

  function fadeForPoint(pt) {
    var band = HORIZON_Y - POLE_Y;
    if (band <= 0) return 0;
    var t = (pt.y - POLE_Y) / band;
    t = Math.max(0, Math.min(1, t));
    var topToBottom = 0.52 + 0.48 * Math.pow(1 - t, 0.82);
    var latFade = 0.68 + 0.32 * Math.pow(Math.cos(pt.phi), 0.38);
    var bottomFade = 1 - Math.pow(t, 1.35) * 0.42;
    return Math.max(0, Math.min(1, topToBottom * latFade * bottomFade));
  }

  function buildDots() {
    var dots = [];
    for (var ri = 0; ri <= RINGS; ri++) {
      var phi = (ri / RINGS) * PHI_MAX;
      for (var mi = 0; mi < MERIDIANS; mi++) {
        var theta = (mi / MERIDIANS) * Math.PI * 2;
        var u = fromAngles(theta, phi);
        var h0 = hash01(theta, phi);
        var h1 = hash01(theta * 1.7, phi * 2.3);
        var h2 = hash01(theta * 2.9, phi * 0.8);
        var h3 = hash01(theta * 0.4, phi * 3.1);
        dots.push({
          u: u,
          anchorU: u,
          anchorTheta: theta,
          anchorPhi: phi,
          ring: ri,
          meridian: mi,
          phase: (theta * 0.65 + phi * 1.45 + h0 * 6.28) % (Math.PI * 2),
          flowSeed: h1,
          w1: 0.22 + h0 * 0.28,
          w2: 0.14 + h1 * 0.22,
          w3: 0.31 + h2 * 0.26,
          w4: 2.8 + h3 * 3.6,
          w5: 0.26 + h1 * 0.2,
          w6: 1.6 + h2 * 2.4,
          w7: 0.19 + h3 * 0.18,
          w8: 0.24 + h0 * 0.2,
          w9: 0.16 + h2 * 0.14,
          w10: 0.21 + h1 * 0.17,
          w11: 0.38 + h2 * 0.3,
          w12: 0.52 + h3 * 0.35,
          pathA: 0.068 + h0 * 0.058,
          pathB: 0.042 + h1 * 0.038,
          pathC: 0.03 + h2 * 0.026,
          latA: 0.026 + h3 * 0.022,
          ripple: 0.012 + h0 * 0.011
        });
      }
    }
    return dots;
  }

  function arcPoint(theta) {
    return {
      x: ARC_CX + ARC_R * Math.cos(theta),
      y: ARC_CY - ARC_R * Math.sin(theta)
    };
  }

  function dist2(ax, ay, bx, by) {
    var dx = ax - bx;
    var dy = ay - by;
    return dx * dx + dy * dy;
  }

  function drawOrbitArc(ctx, iconCenters) {
    var cut = ICON_R + ICON_LINE_GAP;
    var cut2 = cut * cut;
    var steps = 220;
    ctx.strokeStyle = 'rgba(' + INK_RGB + ',0.12)';
    ctx.lineWidth = 1;
    var drawing = false;
    for (var i = 0; i <= steps; i++) {
      var th = ARC_A_RIGHT + ((ARC_A_LEFT - ARC_A_RIGHT) * i) / steps;
      var p = arcPoint(th);
      var near = false;
      for (var k = 0; k < iconCenters.length; k++) {
        var c = iconCenters[k];
        if (dist2(p.x, p.y, c.x, c.y) <= cut2) {
          near = true;
          break;
        }
      }
      if (!near) {
        if (!drawing) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          drawing = true;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      } else if (drawing) {
        ctx.stroke();
        drawing = false;
      }
    }
    if (drawing) ctx.stroke();
  }

  function loadIconImages(done) {
    var cache = {};
    var keys = Object.keys(ICON_ASSETS);
    var left = keys.length;
    keys.forEach(function (key) {
      var img = new Image();
      var finish = function () {
        left -= 1;
        if (left === 0) done(cache);
      };
      img.onload = finish;
      img.onerror = finish;
      img.src = window.truffleAssetURL ? window.truffleAssetURL(ICON_ASSETS[key]) : ICON_ASSETS[key];
      cache[key] = img;
    });
  }

  function drawIconImage(ctx, type, x, y, size, alpha, iconImages) {
    var img = iconImages && iconImages[type];
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x - size * 0.5, y - size * 0.5, size, size);
    ctx.restore();
  }

  function drawIconNode(ctx, x, y, type, alpha, scale, paper, iconImages) {
    if (x < -ICON_R || x > W + ICON_R || y < -ICON_R || y > H + ICON_R) return;
    var r = ICON_R * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = paper;
    ctx.fill();
    ctx.strokeStyle = 'rgba(' + INK_RGB + ',0.5)';
    ctx.lineWidth = 0.55;
    ctx.stroke();
    drawIconImage(ctx, type, x, y, ICON_GLYPH * scale * ICON_GLYPH_INSET, alpha, iconImages);
    ctx.restore();
  }

  function smoothToward(current, target, dt, rate) {
    return current + (target - current) * (1 - Math.exp(-rate * dt));
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function smoothStep(t) {
    return t * t * (3 - 2 * t);
  }

  function easeSmooth(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function easeTrainInOut(t) {
    return 0.5 * (1 - Math.cos(Math.PI * clamp01(t)));
  }

  function fallSinkPoint(seedA, seedB) {
    var phi = PHI_MIN + hash01(seedA, seedB) * (PHI_TOP - PHI_MIN);
    var theta = (hash01(seedB, seedA + 3.7) - 0.5) * Math.PI * 0.92;
    var pt = projectUnit(fromAngles(theta, phi));
    if (!pt) return { x: CX, y: POLE_Y + (HORIZON_Y - POLE_Y) * 0.35, phi: phi };
    return { x: pt.x, y: pt.y, phi: pt.phi };
  }

  function fallParticleCurve(sx, sy, tx, ty, seed, travel) {
    var midX = (sx + tx) * 0.5;
    var midY = (sy + ty) * 0.5;
    var lift = 10 + hash01(seed, 2.4) * 16;
    var bend = (hash01(seed, 9.1) - 0.5) * 18;
    var cpx = midX + bend;
    var cpy = midY - lift;
    var u = easeSmooth(travel);
    var inv = 1 - u;
    return {
      x: inv * inv * sx + 2 * inv * u * cpx + u * u * tx,
      y: inv * inv * sy + 2 * inv * u * cpy + u * u * ty
    };
  }

  function fallGlideAt(icon, t) {
    var g = easeSmooth(t);
    return {
      x: icon.ox + (CX - icon.ox) * g * 0.36,
      y: icon.oy + (FALL_ENTRY_Y - icon.oy) * g,
      g: g
    };
  }

  function iconSurfaceOffset(i, n, typeKey) {
    var golden = 2.399963229728653;
    var t = (i + 0.5) / n;
    var r = Math.sqrt(t) * ICON_R * 0.93;
    var ang = i * golden + (hash01(typeKey, i) - 0.5) * 0.42;
    return {
      ox: Math.cos(ang) * r,
      oy: Math.sin(ang) * r
    };
  }

  function createFallParticles(icon) {
    var parts = [];
    var sinks = [];
    var typeKey = 0;
    for (var c = 0; c < icon.type.length; c++) typeKey += icon.type.charCodeAt(c);
    for (var i = 0; i < FALL_PARTICLE_COUNT; i++) {
      var surface = iconSurfaceOffset(i, FALL_PARTICLE_COUNT, typeKey);
      var phi = PHI_MIN + hash01(i + typeKey * 0.17, i * 1.31) * (PHI_TOP - PHI_MIN);
      var theta = (hash01(i * 1.31, i + typeKey * 0.17) - 0.5) * Math.PI * 0.92;
      var uSink = normalize(fromAngles(theta, phi));
      var sink = projectUnit(uSink);
      if (!sink) {
        sink = { x: CX, y: POLE_Y + (HORIZON_Y - POLE_Y) * 0.35, phi: phi };
      }
      sinks.push(uSink);
      parts.push({
        ox: surface.ox,
        oy: surface.oy,
        tx: sink.x,
        ty: sink.y,
        phi: sink.phi,
        uSink: uSink,
        delay: hash01(i, 41) * 0.04,
        size: 0.44 + hash01(i, 17) * 0.54
      });
    }
    icon.particles = parts;
    icon.sinkU = averageUnitVectors(sinks);
    icon.impulseSent = false;
  }

  function fireFallImpulse(cycle, icon) {
    if (!cycle || icon.impulseSent) return;
    icon.impulseSent = true;
    triggerSphereImpulse(cycle);
  }

  function drawFallEffect(ctx, icon, paper, iconImages, ink) {
    var t = Math.min(1, icon.fall);
    var glide = fallGlideAt(icon, t);
    var morph = easeSmooth(clamp01(t / 0.52));
    var iconAlpha = Math.max(0, 1 - morph * 1.08);

    if (iconAlpha > 0.012) {
      drawIconNode(
        ctx,
        glide.x,
        glide.y,
        icon.type,
        iconAlpha,
        1 - morph * 0.08,
        paper,
        iconImages
      );
    }

    if (!icon.particles) return;

    for (var i = 0; i < icon.particles.length; i++) {
      var p = icon.particles[i];
      var stagger = p.delay * 0.22;
      var morphP = easeSmooth(clamp01((t - 0.02 - stagger) / 0.42));
      if (morphP <= 0.008) continue;

      var surfaceTight = 1 - morphP * 0.07;
      var sx = glide.x + p.ox * surfaceTight;
      var sy = glide.y + p.oy * surfaceTight;
      var infuse = easeSmooth(clamp01((t - 0.1 - stagger * 0.5) / 0.78));
      var pos = fallParticleCurve(sx, sy, p.tx, p.ty, i + p.delay * 11, infuse);

      var merge = infuse > 0.9 ? 1 - easeSmooth((infuse - 0.9) / 0.1) : 1;
      var alpha = morphP * (0.55 + 0.45 * glide.g) * merge * 0.97;
      if (alpha < 0.02) continue;

      var faux = { x: pos.x, y: pos.y, z: 0.35 + infuse * 0.55, phi: p.phi };
      alpha *= fadeForPoint(faux);
      var dotSize = p.size * (0.86 + infuse * 0.18);
      ctx.fillStyle = ink;
      ctx.globalAlpha = alpha;
      ctx.fillRect(pos.x - dotSize * 0.5, pos.y - dotSize * 0.5, dotSize, dotSize);
    }
    ctx.globalAlpha = 1;
  }

  function drawFallEffects(ctx, queue, paper, iconImages, ink) {
    if (!queue) return;
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].phase === 'fall') drawFallEffect(ctx, queue[i], paper, iconImages, ink);
    }
  }

  function arcSlotCount(queue) {
    var n = 0;
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].phase === 'arc') n += 1;
    }
    return n;
  }

  function reindexArcSlots(queue) {
    var arcIcons = [];
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].phase === 'arc') arcIcons.push(queue[i]);
    }
    arcIcons.sort(function (a, b) {
      return a.slot - b.slot;
    });
    for (var j = 0; j < arcIcons.length; j++) arcIcons[j].slot = j;
  }

  function createIconQueue() {
    var queue = [];
    queue.push({
      type: ICON_TYPES[0],
      slot: 0,
      theta: ARC_A_CTR,
      renderTheta: ARC_A_CTR,
      phase: 'hold',
      hold: ICON_HOLD_SEC,
      fall: 0,
      ox: 0,
      oy: 0
    });
    for (var i = 1; i < 4; i++) {
      var th = ARC_A_CTR + i * ICON_THETA_GAP;
      queue.push({
        type: ICON_TYPES[i % ICON_TYPES.length],
        slot: i,
        theta: th,
        renderTheta: th,
        phase: 'arc',
        hold: 0,
        fall: 0,
        ox: 0,
        oy: 0
      });
    }
    return queue;
  }

  function createCycleState() {
    return {
      leadAnchor: ARC_A_CTR,
      leadTarget: ARC_A_CTR,
      labelTarget: 'Analyzing context',
      labelAlpha: 0.78,
      labelPrev: '',
      labelPrevAlpha: 0,
      impulse: null,
      leadVel: 0,
      trainMoveDist: null,
      trainMoveElapsed: 0,
      trainMoveDur: 0,
      weightsFocus: false,
      cosmos: null,
      iconTrainFrozen: false,
      frozenLeadAnchor: ARC_A_CTR,
      pendingFallReindex: false
    };
  }

  function resetTrainMove(cycle, dist) {
    cycle.trainMoveDist = dist;
    cycle.trainMoveElapsed = 0;
    cycle.trainMoveDur = Math.max(ICON_TRAIN_MIN_SEC, dist / ICON_TRAIN_SPEED);
  }

  function setCycleLabel(cycle, label) {
    var next = label || '';
    if (cycle.labelTarget === next) return;
    if (cycle.labelTarget && cycle.labelAlpha > 0.04) {
      cycle.labelPrev = cycle.labelTarget;
      cycle.labelPrevAlpha = cycle.labelAlpha;
    } else {
      cycle.labelPrev = '';
      cycle.labelPrevAlpha = 0;
    }
    cycle.labelTarget = next;
    cycle.labelAlpha = 0;
  }

  function updateCycleLabel(cycle, dt) {
    if (cycle.labelPrev) {
      cycle.labelPrevAlpha = smoothToward(cycle.labelPrevAlpha, 0, dt, 5.5);
      if (cycle.labelPrevAlpha < 0.02) {
        cycle.labelPrev = '';
        cycle.labelPrevAlpha = 0;
      }
    }
    if (!cycle.labelTarget) {
      cycle.labelAlpha = smoothToward(cycle.labelAlpha, 0, dt, 5);
      return;
    }
    cycle.labelAlpha = smoothToward(cycle.labelAlpha, 1, dt, 3.4);
  }

  function spawnIconLeft(queue, spawnRef, leadAnchor) {
    spawnRef.n += 1;
    var slot = arcSlotCount(queue);
    var th = leadAnchor + slot * ICON_THETA_GAP;
    queue.push({
      type: ICON_TYPES[spawnRef.n % ICON_TYPES.length],
      slot: slot,
      theta: th,
      renderTheta: th,
      phase: 'arc',
      hold: 0,
      fall: 0,
      ox: 0,
      oy: 0
    });
  }

  function ensureSpawnTailOnArc(queue, cycle) {
    var maxSlot = -1;
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].phase !== 'arc') continue;
      if (queue[i].slot > maxSlot) maxSlot = queue[i].slot;
    }
    if (maxSlot < 0) return;
    var tailTheta = cycle.leadTarget + maxSlot * ICON_THETA_GAP;
    var minTail = ARC_A_LEFT + ICON_SPAWN_OFFSET;
    if (tailTheta < minTail) {
      var delta = minTail - tailTheta;
      cycle.leadTarget += delta;
      cycle.leadAnchor += delta;
      cycle.trainMoveDist = null;
    }
  }

  function updateTrainKinetics(cycle, dt) {
    var dist = cycle.leadAnchor - ARC_A_CTR;
    if (dist <= 0.0005) {
      cycle.leadAnchor = ARC_A_CTR;
      cycle.leadVel = 0;
      cycle.leadTarget = ARC_A_CTR;
      cycle.trainMoveDist = null;
      return true;
    }

    if (cycle.trainMoveDist == null) resetTrainMove(cycle, dist);

    cycle.trainMoveElapsed += dt;
    var t = clamp01(cycle.trainMoveElapsed / cycle.trainMoveDur);
    var eased = easeTrainInOut(t);
    var prev = cycle.leadAnchor;
    cycle.leadAnchor = ARC_A_CTR + cycle.trainMoveDist * (1 - eased);
    cycle.leadVel = (cycle.leadAnchor - prev) / Math.max(dt, 1e-4);
    cycle.leadTarget = cycle.leadAnchor;

    if (t >= 1 - 1e-5) {
      cycle.leadAnchor = ARC_A_CTR;
      cycle.leadVel = 0;
      cycle.leadTarget = ARC_A_CTR;
      cycle.trainMoveDist = null;
      return true;
    }
    return false;
  }

  function smoothIconRenderTheta(icon, dt) {
    if (icon.renderTheta == null) icon.renderTheta = icon.theta;
    if (icon.phase === 'arc') {
      icon.renderTheta = smoothToward(icon.renderTheta, icon.theta, dt, ICON_TRAIN_ARC_RENDER);
      return;
    }
    icon.renderTheta = smoothToward(icon.renderTheta, icon.theta, dt, ICON_TRAIN_RENDER_SMOOTH);
  }

  function updateIconQueue(queue, dt, spawnRef, cycle) {
    var cosmosActive = isCosmosActive(cycle);
    if (cosmosActive) setCycleLabel(cycle, 'Updating weights');

    var holding = false;
    for (var h = 0; h < queue.length; h++) {
      if (queue[h].phase !== 'hold') continue;
      holding = true;
      queue[h].hold -= dt;
      setCycleLabel(cycle, 'Analyzing context');
      if (queue[h].hold <= 0) {
        var hp = arcPoint(queue[h].theta);
        queue[h].phase = 'fall';
        queue[h].fall = 0;
        queue[h].ox = hp.x;
        queue[h].oy = hp.y;
        createFallParticles(queue[h]);
        cycle.weightsFocus = true;
        freezeIconTrain(cycle, queue);
        setCycleLabel(cycle, '');
      }
    }

    var trainFrozen = isIconTrainFrozen(cycle);
    if (trainFrozen) applyIconTrainFreeze(cycle, queue);

    if (!holding && !cosmosActive && !trainFrozen) {
      var settled = updateTrainKinetics(cycle, dt);

      var arcIcons = [];
      for (var i = 0; i < queue.length; i++) {
        if (queue[i].phase === 'arc') arcIcons.push(queue[i]);
      }
      arcIcons.sort(function (a, b) {
        return a.slot - b.slot;
      });

      for (var j = 0; j < arcIcons.length; j++) {
        arcIcons[j].theta = cycle.leadAnchor + arcIcons[j].slot * ICON_THETA_GAP;
        smoothIconRenderTheta(arcIcons[j], dt);
      }

      if (arcIcons.length && arcIcons[0].slot === 0 && settled) {
        arcIcons[0].theta = ARC_A_CTR;
        arcIcons[0].renderTheta = ARC_A_CTR;
        arcIcons[0].phase = 'hold';
        arcIcons[0].hold = ICON_HOLD_SEC;
        cycle.leadVel = 0;
        setCycleLabel(cycle, 'Analyzing context');
      }

      if (!arcIcons.length && !cycle.weightsFocus) setCycleLabel(cycle, '');
    }

    for (var s = 0; s < queue.length; s++) {
      if (queue[s].phase === 'hold' && !trainFrozen) smoothIconRenderTheta(queue[s], dt);
    }

    for (var k = queue.length - 1; k >= 0; k--) {
      var item = queue[k];
      if (item.phase !== 'fall') continue;
      item.fall += dt / FALL_DURATION_SEC;
      if (item.fall >= 0.68) fireFallImpulse(cycle, item);
      if (item.fall >= 1) {
        queue.splice(k, 1);
        if (trainFrozen) {
          cycle.pendingFallReindex = true;
        } else {
          reindexArcSlots(queue);
          var newLead = null;
          for (var n = 0; n < queue.length; n++) {
            if (queue[n].phase === 'arc' && queue[n].slot === 0) newLead = queue[n];
          }
          if (newLead) {
            cycle.leadAnchor = newLead.theta;
            cycle.leadTarget = newLead.theta;
            cycle.leadVel = 0;
            newLead.renderTheta = newLead.theta;
          } else {
            cycle.leadTarget = ARC_A_CTR + 3 * ICON_THETA_GAP;
            cycle.leadAnchor = cycle.leadTarget;
            cycle.leadVel = 0;
          }
          cycle.trainMoveDist = null;
          spawnIconLeft(queue, spawnRef, cycle.leadTarget);
          ensureSpawnTailOnArc(queue, cycle);
        }
        if (
          !cycle.weightsFocus &&
          !queue.some(function (q) {
            return q.phase === 'hold';
          })
        ) {
          setCycleLabel(cycle, '');
        }
      }
    }

    if (!trainFrozen) {
      while (
        queue.filter(function (q) {
          return q.phase === 'arc' || q.phase === 'hold' || q.phase === 'fall';
        }).length < 4
      ) {
        spawnIconLeft(queue, spawnRef, cycle.leadTarget);
        ensureSpawnTailOnArc(queue, cycle);
      }
    }

    updateCycleLabel(cycle, dt);
  }

  function iconDrawPoint(icon, animT) {
    var theta = icon.renderTheta != null ? icon.renderTheta : icon.theta;
    return arcPoint(theta);
  }

  function iconMotionScale(icon, cycle, animT) {
    if (cycle && isIconTrainFrozen(cycle) && icon.phase === 'arc') return 1;
    if (icon.phase === 'hold') {
      return animT == null ? 1 : 1 + Math.sin(animT * 1.35) * 0.011;
    }
    if (icon.phase !== 'arc' || !cycle) return 1;
    var v = cycle.leadVel || 0;
    var speed = clamp01(-v * 2.15);
    var slotDamp = 1 - icon.slot * 0.09;
    var breathe = animT == null ? 0 : Math.sin(animT * 2.05 + icon.slot * 0.58) * 0.0055;
    return 1 + speed * 0.034 * slotDamp + breathe;
  }

  function arcMaskCenters(queue) {
    var centers = [];
    for (var i = 0; i < queue.length; i++) {
      var item = queue[i];
      if (item.phase === 'arc' || item.phase === 'hold') {
        centers.push(iconDrawPoint(item, null));
        continue;
      }
      if (item.phase !== 'fall') continue;
      var t = Math.min(1, item.fall);
      var glide = fallGlideAt(item, t);
      centers.push({ x: glide.x, y: glide.y });
      if (t < 0.2) centers.push({ x: item.ox, y: item.oy });
    }
    return centers;
  }

  function drawIconQueue(ctx, queue, paper, iconImages, cycle, animT) {
    drawOrbitArc(ctx, arcMaskCenters(queue));

    for (var j = 0; j < queue.length; j++) {
      var icon = queue[j];
      if (icon.phase === 'arc' || icon.phase === 'hold') {
        var ap = iconDrawPoint(icon, animT);
        var scale = iconMotionScale(icon, cycle, animT);
        drawIconNode(ctx, ap.x, ap.y, icon.type, 1, scale, paper, iconImages);
      }
    }
  }

  function drawBottomFade(ctx, paper) {
    var top = Math.max(POLE_Y + 40, HORIZON_Y - 8);
    var grad = ctx.createLinearGradient(0, top, 0, H);
    grad.addColorStop(0, 'rgba(244,244,244,0)');
    grad.addColorStop(0.45, 'rgba(244,244,244,0.55)');
    grad.addColorStop(1, paper);
    ctx.fillStyle = grad;
    ctx.fillRect(0, top, W, H - top);
  }

  function drawStatusLine(ctx, text, inkSoft, alpha, animT, y) {
    if (!text || alpha < 0.02) return;
    var baseAlpha = 0.72 * alpha;
    var totalW = ctx.measureText(text).width;
    var x = CX - totalW * 0.5;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var w = ctx.measureText(ch).width;
      var shimmer = 0.76 + 0.24 * Math.sin(animT * 2.55 + i * 0.5 - 0.35);
      ctx.fillStyle = inkSoft;
      ctx.globalAlpha = baseAlpha * shimmer;
      ctx.fillText(ch, x, y);
      x += w;
    }
  }

  function drawStatusText(ctx, cycle, inkSoft, animT) {
    if (!cycle) return;
    var hasCurrent = cycle.labelTarget && cycle.labelAlpha > 0.02;
    var hasPrev = cycle.labelPrev && cycle.labelPrevAlpha > 0.02;
    if (!hasCurrent && !hasPrev) return;
    ctx.save();
    ctx.font = '300 15px "ABC Diatype Rounded", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (hasPrev) drawStatusLine(ctx, cycle.labelPrev, inkSoft, cycle.labelPrevAlpha, animT, STATUS_Y);
    if (hasCurrent) drawStatusLine(ctx, cycle.labelTarget, inkSoft, cycle.labelAlpha, animT, STATUS_Y);
    ctx.restore();
  }

  function drawFrame(ctx, ink, paper, inkSoft, dots, iconQueue, cycle, iconImages, animT) {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, W, H);

    var weightsMix = cycle ? cosmosBlendWeight(cycle) : 0;
    var projected = [];
    var projectedByIdx = [];
    for (var i = 0; i < dots.length; i++) {
      var pt = projectUnit(dots[i].u);
      if (!pt) continue;
      var shift =
        cycle && cycle.impulse
          ? splashScreenShift(dots[i].anchorU, pt, cycle.impulse)
          : { x: pt.x, y: pt.y, lift: 0 };
      var dot = dots[i];
      var alpha = fadeForPoint(pt);
      var item = {
        pt: pt,
        x: shift.x,
        y: shift.y,
        lift: shift.lift,
        dot: dot,
        alpha: alpha
      };
      projected.push(item);
      projectedByIdx[i] = item;
    }

    projected.sort(function (a, b) {
      return a.pt.z - b.pt.z;
    });

    drawWeightsLines(ctx, projectedByIdx, weightsMix, ink);

    for (var j = 0; j < projected.length; j++) {
      var item = projected[j];
      var alpha = item.alpha;
      if (alpha < 0.02) continue;
      var lift = item.lift;
      var dot = item.dot;
      var size = 0.45 + alpha * 0.55 + Math.max(0, lift) * 1.15;
      var drawAlpha = alpha;
      if (weightsMix > 0.04 && dot) {
        var lineMix = easeSmooth(weightsMix);
        if (isWeightsLineNode(dot)) {
          size *= 1 + lineMix * 0.08;
        } else {
          drawAlpha *= 1 - lineMix * 0.88;
          size *= 1 - lineMix * 0.35;
        }
      }
      ctx.fillStyle = ink;
      ctx.globalAlpha = Math.min(1, drawAlpha * (0.94 + Math.max(0, lift) * 0.22));
      ctx.fillRect(item.x - size * 0.5, item.y - size * 0.5, size, size);
    }
    ctx.globalAlpha = 1;

    drawFallEffects(ctx, iconQueue, paper, iconImages, ink);
    drawBottomFade(ctx, paper);
    if (iconQueue) drawIconQueue(ctx, iconQueue, paper, iconImages, cycle, animT);
    if (cycle) drawStatusText(ctx, cycle, inkSoft, animT || 0);
  }

  function initShell(shell) {
    if (shell.__dreamBound) return;
    shell.__dreamBound = true;

    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    shell.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var ink = cssVar('--ink', '#1F2122');
    var paper = cssVar('--paper', '#F4F4F4');
    var inkSoft = cssVar('--ink-soft', '#5c6164');
    var dots = buildDots();
    var cycle = createCycleState();
    var iconQueue = createIconQueue();
    var spawnRef = { n: 4 };
    var iconImages = null;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t0 = performance.now();
    var last = t0;
    var raf = 0;
    var running = true;

    function tick(now) {
      if (document.hidden) {
        stopLoop();
        return;
      }
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var t = (now - t0) * 0.001;
      var blend = 1 - Math.exp(-dt * SMOOTH);

      if (!reduced) {
        if (isCosmosActive(cycle)) {
          blend = 1 - Math.exp(-dt * COSMOS_SMOOTH);
        }
        for (var i = 0; i < dots.length; i++) {
          var target = organicUnitForDot(dots[i], t, cycle);
          dots[i].u = slerp(dots[i].u, target, blend);
        }
        updateIconQueue(iconQueue, dt, spawnRef, cycle);
        if (cycle.impulse) {
          cycle.impulse.age += dt;
          if (
            cycle.weightsFocus &&
            !cycle.cosmos &&
            cycle.impulse.age >= cycle.impulse.duration * WEIGHTS_START_IMPULSE_FRAC
          ) {
            cycle.cosmos = { age: 0, duration: COSMOS_DURATION_SEC };
            setCycleLabel(cycle, 'Updating weights');
          }
          if (cycle.impulse.age >= cycle.impulse.duration) {
            cycle.impulse = null;
            if (cycle.weightsFocus && !cycle.cosmos) {
              cycle.cosmos = { age: 0, duration: COSMOS_DURATION_SEC };
              setCycleLabel(cycle, 'Updating weights');
            }
          }
        }
        if (cycle.cosmos) {
          cycle.cosmos.age += dt;
          if (cycle.cosmos.age >= cycle.cosmos.duration) {
            endCosmosPhase(cycle, iconQueue, spawnRef);
          }
        }
      }

      drawFrame(ctx, ink, paper, inkSoft, dots, iconQueue, cycle, iconImages, t);
      if (!reduced && running) raf = requestAnimationFrame(tick);
    }

    function startLoop() {
      if (reduced || running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function stopLoop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    raf = requestAnimationFrame(tick);
    loadIconImages(function (cache) {
      iconImages = cache;
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          var vis = entries[0] && entries[0].isIntersecting;
          if (vis) startLoop();
          else stopLoop();
        },
        { root: null, rootMargin: '80px 0px', threshold: 0 }
      );
      io.observe(shell);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopLoop();
      else if (shell.getBoundingClientRect) {
        var r = shell.getBoundingClientRect();
        var vh = window.innerHeight || 0;
        if (r.bottom > -80 && r.top < vh + 80) {
          running = false;
          startLoop();
        }
      }
    });

    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function () {
        ink = cssVar('--ink', '#1F2122');
        paper = cssVar('--paper', '#F4F4F4');
        inkSoft = cssVar('--ink-soft', '#5c6164');
      });
      ro.observe(shell);
    }

    shell.__dreamStop = function () {
      stopLoop();
    };
  }

  function boot() {
    document.querySelectorAll('[data-dream-fig]').forEach(initShell);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
