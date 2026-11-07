(function () {
  'use strict';

  var VIEW = '0 0 900 620';
  var VIEW_MOBILE = '-55 -48 1010 716';
  var CX = 450;
  var CY = 310;
  var ORBIT = 248;
  var HEX_R = 13;
  var CLUSTER_R = 8.5;
  var ENTITY_HEX_R = HEX_R - 2;
  /** Radial distance from cluster center where stems begin (just outside cluster hex outline). */
  var STEM_OUTER_CLUSTER = ENTITY_HEX_R + 1.35;
  /** Inner radius for vendor photo (inset inside the former hex size). */
  var ENTITY_FACE_INSET = 0.65;
  var OVERVIEW_SCALE_DESKTOP = 1.14;
  var OVERVIEW_SCALE_MOBILE = 1.46;

  // Truffle logo path from truffle.svg (viewBox 0 0 60 34); drawn centered at hub.
  var TRUFFLE_HUB_PATH_D =
    'M29.9733 0.000381872C37.2159 0.0188329 42.4027 0.518861 48.322 2.77829C56.9007 6.05566 61.3379 13.928 59.6433 22.7564C58.1427 30.5812 52.8422 34.6482 45.0715 33.9157C42.1649 33.6891 39.286 33.1762 36.4743 32.384C32.1887 31.0618 27.623 31.0469 23.3292 32.3412C20.5929 33.1022 17.7935 33.5975 14.9675 33.8205C6.34265 34.6672 0.414228 29.3968 0.0217687 20.478C-0.366073 11.74 4.44501 5.03298 13.1391 2.24555C18.6012 0.52362 23.3444 -0.0165062 29.9733 0.000381872Z';

  function isMobileOverview() {
    return window.matchMedia('(max-width:700px)').matches;
  }

  function overviewScale() {
    return isMobileOverview() ? OVERVIEW_SCALE_MOBILE : OVERVIEW_SCALE_DESKTOP;
  }

  function overviewFocus() {
    return { x: CX, y: CY };
  }

  function syncSvgViewBox(svg) {
    svg.setAttribute('viewBox', isMobileOverview() ? VIEW_MOBILE : VIEW);
  }

  function branchLabelOffsetY() {
    return isMobileOverview() ? 36 : 28;
  }

  function entityCaptionRadius() {
    return isMobileOverview() ? HEX_R + 48 : HEX_R + 34;
  }

  function entityCaptionNameDy() {
    return isMobileOverview() ? -9 : -7;
  }

  function entityCaptionRoleDy() {
    return isMobileOverview() ? 11 : 8;
  }

  function branchHitPad() {
    return isMobileOverview() ? 22 : 10;
  }

  function syncMobileTypography(root) {
    var mobile = isMobileOverview();
    var branchFs = mobile ? '16' : '8';
    var entityNameFs = mobile ? '15.5' : '8.5';
    var entityRoleFs = mobile ? '12.5' : '7.5';
    var hubFs = mobile ? '15' : '8';
    root.querySelectorAll('.sc-map-branch-label').forEach(function (t) {
      t.setAttribute('font-size', branchFs);
    });
    root.querySelectorAll('.sc-map-entity-name').forEach(function (t) {
      t.setAttribute('font-size', entityNameFs);
    });
    root.querySelectorAll('.sc-map-entity-role').forEach(function (t) {
      t.setAttribute('font-size', entityRoleFs);
    });
    root.querySelectorAll('.sc-map-hub-label').forEach(function (t) {
      t.setAttribute('font-size', hubFs);
    });
  }

  var BRANCHES = [
    {
      id: 'distribution',
      label: 'Distribution',
      entities: [
        {
          name: 'Arrow',
          role: 'Distributor',
          url: 'https://www.arrow.com/',
          icon: 'arrow.png'
        }
      ]
    },
    {
      id: 'compute',
      label: 'Compute & silicon',
      entities: [
        {
          name: 'NVIDIA',
          role: 'AGX Orin SOMs · compute today',
          url: 'https://www.nvidia.com/',
          icon: 'nvidia.png'
        },
        {
          name: 'Houmo',
          role: 'AI NPUs, Shanghai · the M50',
          url: 'https://www.houmo.ai/',
          icon: 'houmo.png'
        }
      ]
    },
    {
      id: 'china',
      label: 'China manufacturing',
      entities: [
        {
          name: 'SKYSI',
          role: 'Designs + builds T1 boards',
          url: 'https://skysi.com.cn/en',
          icon: 'skysi.png'
        },
        {
          name: 'Nex PCB',
          role: 'Manufacturing interface',
          url: 'https://www.nexpcb.com/',
          icon: 'nex-pcb.png'
        }
      ]
    },
    {
      id: 'fab',
      label: 'US fab & thermal',
      entities: [
        {
          name: 'Roehr Tool',
          role: 'Mold tooling · Sterling, MA',
          url: 'https://www.roehrtool.com/',
          icon: 'roehr-tool.png'
        },
        {
          name: 'Boyd',
          role: 'Thermal · copper heat sinks',
          url: 'https://www.boydcorp.com/',
          icon: 'boyd.png'
        }
      ]
    },
    {
      id: 'contractors',
      label: 'Contract engineers',
      entities: [
        { name: 'Kirsch', role: 'Contract EE · carrier board', icon: 'kirsch.png' },
        { name: 'Dang · BK', role: 'Contract EE · USB-C, LED', icon: 'dang-bk.png' },
        { name: 'Andrew · AJ', role: 'Contract CAD · shell design', icon: 'andrew-aj.png' }
      ]
    },
    {
      id: 'design',
      label: 'Design',
      entities: [
        {
          name: 'Welcome.JPEG',
          role: 'Creative leadership',
          url: 'https://www.welcomejpeg.com/',
          icon: 'welcome-jpeg.png'
        },
        {
          name: 'Nuova',
          role: 'Industrial design lead',
          url: 'https://nuova.us/',
          icon: 'nuova.png'
        },
        {
          name: 'Moniker',
          role: 'Brand lead',
          url: 'https://moniker.com/',
          icon: 'moniker.png'
        },
        { name: 'FNDR', role: 'Narrative lead', icon: 'fndr.png' },
        { name: 'X.Ourstudios', role: 'Metal CNC', icon: 'x-ourstudios.png' },
        {
          name: 'SNL Creative',
          role: 'Packaging tooling',
          url: 'https://snlcreative.com/',
          icon: 'snl-creative.png'
        },
        {
          name: 'FROM Lighting',
          role: 'LED engineering',
          url: 'https://www.from.lighting/',
          icon: 'from-lighting.png'
        }
      ]
    },
    {
      id: 'compliance',
      label: 'Compliance & RF',
      entities: [
        {
          name: 'SGS',
          role: 'FCC · EMC · safety',
          url: 'https://www.sgs.com/',
          icon: 'sgs.png'
        },
        {
          name: 'Taoglas',
          role: 'Antennas',
          url: 'https://www.taoglas.com/',
          icon: 'taoglas.png'
        },
        { name: 'CTC Taiwan', role: 'EMC lab', icon: 'ctc-taiwan.png' }
      ]
    }
  ];

  BRANCHES.forEach(function (b, i) {
    var a = -Math.PI / 2 + i * ((2 * Math.PI) / BRANCHES.length);
    b.x = CX + ORBIT * Math.cos(a);
    b.y = CY + ORBIT * Math.sin(a);
    b.angle = a;
  });

  function ns(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  function branchById(id) {
    for (var i = 0; i < BRANCHES.length; i++) {
      if (BRANCHES[i].id === id) return BRANCHES[i];
    }
    return null;
  }

  function hexPoints(cx, cy, r) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 180) * (60 * i - 30);
      pts.push((cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2));
    }
    return pts.join(' ');
  }

  function hexPoly(cx, cy, r, cls) {
    var p = ns('polygon');
    p.setAttribute('points', hexPoints(cx, cy, r));
    p.setAttribute('class', cls);
    return p;
  }

  function branchClusterHex(cx, cy, active) {
    var cls = 'sc-map-hex sc-map-hex-entity' + (active ? ' is-cluster-active' : '');
    return hexPoly(cx, cy, ENTITY_HEX_R, cls);
  }

  function bundleCurve(x1, y1, x2, y2, bend) {
    var b = bend == null ? 0.42 : bend;
    var mx = x1 + (x2 - x1) * b;
    return (
      'M ' +
      x1.toFixed(1) +
      ' ' +
      y1.toFixed(1) +
      ' C ' +
      mx.toFixed(1) +
      ' ' +
      y1.toFixed(1) +
      ', ' +
      mx.toFixed(1) +
      ' ' +
      y2.toFixed(1) +
      ', ' +
      x2.toFixed(1) +
      ' ' +
      y2.toFixed(1)
    );
  }

  var HONEY = [
    [0, 0],
    [1.75, 0],
    [0.875, 1.52],
    [-0.875, 1.52],
    [-1.75, 0],
    [-0.875, -1.52],
    [0.875, -1.52],
    [2.625, 0],
    [1.312, 2.28],
    [-1.312, 2.28],
    [-2.625, 0],
    [-1.312, -2.28],
    [1.312, -2.28]
  ];

  function entityPositions(n, scale) {
    var out = [];
    var s = scale || CLUSTER_R;
    for (var i = 0; i < n && i < HONEY.length; i++) {
      out.push({ dx: HONEY[i][0] * s, dy: HONEY[i][1] * s });
    }
    return out;
  }

  function setAttr(el, map) {
    Object.keys(map).forEach(function (k) {
      el.setAttribute(k, map[k]);
    });
  }

  function vendorIconHref(file) {
    if (!file) return '';
    return 'icons/vendors/' + file;
  }

  function ensureSvgDefs(svg) {
    var d = svg.querySelector('defs');
    if (!d) {
      d = ns('defs');
      svg.insertBefore(d, svg.firstChild);
    }
    return d;
  }

  var VENDOR_PHOTO_CLIP_ID = 'sc-map-vendor-photo-clip';

  function ensureVendorPhotoClip(defs) {
    if (!defs || defs.querySelector('#' + VENDOR_PHOTO_CLIP_ID)) return;
    var cp = ns('clipPath');
    cp.setAttribute('id', VENDOR_PHOTO_CLIP_ID);
    cp.setAttribute('clipPathUnits', 'objectBoundingBox');
    var c = ns('circle');
    c.setAttribute('cx', '0.5');
    c.setAttribute('cy', '0.5');
    c.setAttribute('r', '0.5');
    cp.appendChild(c);
    defs.appendChild(cp);
  }

  function init(root) {
    var svg = root.querySelector('.sc-map-svg');
    var backBtn = root.querySelector('.sc-map-back');
    var hint = root.querySelector('.sc-map-hint');
    var world = ns('g');
    world.setAttribute('class', 'sc-map-world');
    var hud = ns('g');
    hud.setAttribute('class', 'sc-map-hud');
    svg.appendChild(world);
    svg.appendChild(hud);

    var state = { mode: 'overview', branch: null };
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function clearG(g) {
      while (g.firstChild) g.removeChild(g.firstChild);
    }

    function renderFrame(g) {
      var ring = ns('polygon');
      var ringPts = [];
      BRANCHES.forEach(function (b) {
        ringPts.push(b.x.toFixed(1) + ',' + b.y.toFixed(1));
      });
      ring.setAttribute('points', ringPts.join(' '));
      ring.setAttribute('class', 'sc-map-macro-hex');
      g.appendChild(ring);
    }

    function renderSpokes(g) {
      BRANCHES.forEach(function (b) {
        var line = ns('line');
        setAttr(line, {
          x1: CX,
          y1: CY,
          x2: b.x,
          y2: b.y,
          class: 'sc-map-spoke',
          'data-branch': b.id
        });
        g.appendChild(line);
      });
    }

    function metaArcPath(x1, y1, x2, y2, bulge) {
      var midx = (x1 + x2) / 2;
      var midy = (y1 + y2) / 2;
      var sdx = x2 - x1;
      var sdy = y2 - y1;
      var slen = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
      var mx = midx + (-sdy / slen) * bulge;
      var my = midy + (sdx / slen) * bulge;
      return (
        'M ' +
        x1 +
        ' ' +
        y1 +
        ' Q ' +
        mx +
        ' ' +
        my +
        ' ' +
        x2 +
        ' ' +
        y2
      );
    }

    function renderMeta(g) {
      var compute = branchById('compute');
      var china = branchById('china');
      var fab = branchById('fab');
      var bulge = 78;
      if (compute) {
        var lever = ns('path');
        setAttr(lever, {
          d: metaArcPath(CX, CY, compute.x, compute.y, bulge),
          class: 'sc-map-meta sc-map-meta-lever'
        });
        g.appendChild(lever);
      }
      if (china && fab) {
        var riv = ns('path');
        setAttr(riv, {
          d: metaArcPath(china.x, china.y, fab.x, fab.y, bulge),
          class: 'sc-map-meta sc-map-meta-rivalry'
        });
        g.appendChild(riv);
      }
    }

    function drawClusterShell(g, cx, cy, count, active) {
      g.appendChild(branchClusterHex(cx, cy, active));
    }

    function renderHub(g) {
      var gHub = ns('g');
      gHub.setAttribute('class', 'sc-map-hub');
      var gMark = ns('g');
      gMark.setAttribute('class', 'sc-map-hub-mark');
      gMark.setAttribute(
        'transform',
        'translate(' + CX + ' ' + CY + ') scale(0.46) translate(-30 -17)'
      );
      var logo = ns('path');
      setAttr(logo, {
        d: TRUFFLE_HUB_PATH_D,
        class: 'sc-map-hub-shape',
        fill: 'var(--paper)',
        stroke: 'var(--ink)',
        'stroke-width': '0.85',
        'vector-effect': 'non-scaling-stroke'
      });
      gMark.appendChild(logo);
      gHub.appendChild(gMark);
      var t = ns('text');
      setAttr(t, { x: CX, y: CY + 22, 'text-anchor': 'middle', class: 'sc-map-hub-label' });
      t.textContent = 'TRUFFLE 1';
      gHub.appendChild(t);
      g.appendChild(gHub);
    }

    function renderBranches(g) {
      BRANCHES.forEach(function (b) {
        var gB = ns('g');
        gB.setAttribute('class', 'sc-map-branch');
        gB.setAttribute('data-branch', b.id);
        gB.setAttribute('role', 'button');
        gB.setAttribute('tabindex', '0');
        gB.setAttribute('aria-label', b.label + ', ' + b.entities.length + ' vendors. Click to zoom in.');

        var hit = hexPoly(b.x, b.y, HEX_R + branchHitPad(), 'sc-map-hex-hit');
        gB.appendChild(hit);

        var gOverview = ns('g');
        gOverview.setAttribute('class', 'sc-map-branch-overview');
        drawClusterShell(gOverview, b.x, b.y, b.entities.length, false);
        var labelOverview = ns('text');
        setAttr(labelOverview, {
          x: b.x,
          y: b.y + branchLabelOffsetY(),
          'text-anchor': 'middle',
          class: 'sc-map-branch-label'
        });
        labelOverview.textContent = b.label.toUpperCase();
        gOverview.appendChild(labelOverview);
        gB.appendChild(gOverview);

        var gFocus = ns('g');
        gFocus.setAttribute('class', 'sc-map-branch-focus');
        gFocus.appendChild(branchClusterHex(b.x, b.y, false));
        var labelFocus = ns('text');
        setAttr(labelFocus, {
          x: b.x,
          y: b.y + layoutEntitySlots(b).extent + 18,
          'text-anchor': 'middle',
          class: 'sc-map-branch-label sc-map-branch-label-focus'
        });
        labelFocus.textContent = b.label.toUpperCase();
        gFocus.appendChild(labelFocus);
        gB.appendChild(gFocus);

        g.appendChild(gB);
      });
    }

    function layoutEntitySlots(branch) {
      var n = branch.entities.length;
      var bx = branch.x;
      var by = branch.y;
      var ringR = 36 + n * 9.5;
      var start = -Math.PI / 2;
      var slots = [];
      var maxR = ringR;
      for (var i = 0; i < n; i++) {
        var a = start + i * ((2 * Math.PI) / n);
        var ux = Math.cos(a);
        var uy = Math.sin(a);
        var ex = bx + ux * ringR;
        var ey = by + uy * ringR;
        var captionR = entityCaptionRadius();
        var cx = ex + ux * captionR;
        var cy = ey + uy * captionR;
        maxR = Math.max(maxR, Math.hypot(cx - bx, cy - by) + 20);
        slots.push({
          ex: ex,
          ey: ey,
          tx: cx,
          ty: cy + entityCaptionNameDy(),
          rx: cx,
          ry: cy + entityCaptionRoleDy()
        });
      }
      return { slots: slots, spread: ringR, extent: maxR };
    }

    function renderEntityRing(g, branch, slots) {
      if (slots.length < 3) return;
      var ring = ns('polygon');
      var pts = slots.map(function (s) {
        return s.ex.toFixed(1) + ',' + s.ey.toFixed(1);
      });
      ring.setAttribute('points', pts.join(' '));
      ring.setAttribute('class', 'sc-map-entity-ring');
      g.appendChild(ring);
    }

    function renderEntities(g, branch) {
      var layout = layoutEntitySlots(branch);
      var slots = layout.slots;
      var bx = branch.x;
      var by = branch.y;

      var chrome = ns('g');
      chrome.setAttribute('class', 'sc-map-entity-chrome');
      slots.forEach(function (slot) {
        var stem = ns('line');
        var dx = slot.ex - bx;
        var dy = slot.ey - by;
        var dist = Math.hypot(dx, dy) || 1;
        var ux = dx / dist;
        var uy = dy / dist;
        var vendorR = ENTITY_HEX_R;
        var inner = Math.min(dist - 0.25, Math.max(STEM_OUTER_CLUSTER, vendorR + 0.25));
        setAttr(stem, {
          x1: bx + ux * inner,
          y1: by + uy * inner,
          x2: slot.ex,
          y2: slot.ey,
          class: 'sc-map-entity-stem'
        });
        chrome.appendChild(stem);
      });
      renderEntityRing(chrome, branch, slots);
      g.appendChild(chrome);

      var defs = ensureSvgDefs(svg);
      ensureVendorPhotoClip(defs);

      branch.entities.forEach(function (ent, i) {
        var slot = slots[i];
        var ex = slot.ex;
        var ey = slot.ey;
        var role =
          ent.role.length > 40 ? ent.role.slice(0, 38).replace(/\s+\S*$/, '') + '…' : ent.role;

        var row = ns('g');
        row.setAttribute('class', 'sc-map-entity');
        row.setAttribute('data-ex', String(ex));
        row.setAttribute('data-ey', String(ey));
        row.style.setProperty('--i', String(i));
        row.addEventListener('click', function (e) {
          e.stopPropagation();
        });

        var innerPhotoR = ENTITY_HEX_R - ENTITY_FACE_INSET;

        var face = ns('circle');
        setAttr(face, {
          cx: ex,
          cy: ey,
          r: ENTITY_HEX_R.toFixed(2),
          class: 'sc-map-entity-face'
        });

        var caption = ns('g');
        caption.setAttribute('class', 'sc-map-entity-caption');

        var nameEl = ns('text');
        setAttr(nameEl, {
          x: slot.tx,
          y: slot.ty,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          class: 'sc-map-entity-name'
        });
        nameEl.textContent = ent.name;

        var tRole = ns('text');
        setAttr(tRole, {
          x: slot.rx,
          y: slot.ry,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          class: 'sc-map-entity-role'
        });
        tRole.textContent = role;

        caption.appendChild(nameEl);
        caption.appendChild(tRole);

        row.appendChild(face);
        var hrefIcon = vendorIconHref(ent.icon);
        if (hrefIcon) {
          var side = 2 * innerPhotoR;
          var img = ns('image');
          setAttr(img, {
            href: hrefIcon,
            x: (ex - innerPhotoR).toFixed(2),
            y: (ey - innerPhotoR).toFixed(2),
            width: side.toFixed(2),
            height: side.toFixed(2),
            preserveAspectRatio: 'xMidYMid slice',
            class: 'sc-map-entity-photo'
          });
          img.setAttribute('clip-path', 'url(#' + VENDOR_PHOTO_CLIP_ID + ')');
          row.appendChild(img);
        }
        var hit = ns('circle');
        setAttr(hit, {
          cx: ex,
          cy: ey,
          r: Math.max(ENTITY_HEX_R * 0.92, innerPhotoR * 0.98).toFixed(2),
          class: 'sc-map-entity-hit'
        });
        row.appendChild(hit);
        row.appendChild(caption);
        g.appendChild(row);
      });
    }

    function worldTransform(scale, focusX, focusY) {
      var tx = CX - focusX * scale;
      var ty = CY - focusY * scale;
      world.setAttribute(
        'transform',
        'translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ') scale(' + scale.toFixed(3) + ')'
      );
    }

    function applyZoom() {
      if (state.mode !== 'branch' || !state.branch) {
        var focus = overviewFocus();
        worldTransform(overviewScale(), focus.x, focus.y);
        return;
      }
      var b = branchById(state.branch);
      if (!b) return;
      var layout = layoutEntitySlots(b);
      var maxScale = isMobileOverview() ? 1.95 : 1.42;
      var scale = Math.min(maxScale, (isMobileOverview() ? 1.05 : 0.92) + layout.extent / 118);
      worldTransform(scale, b.x, b.y);
    }

    function renderMinimap() {
      clearG(hud);
      if (isMobileOverview()) return;
      if (state.mode !== 'branch' || !state.branch) return;

      var mm = ns('g');
      mm.setAttribute('class', 'sc-map-minimap');
      var bg = ns('rect');
      setAttr(bg, { x: '48', y: '64', width: '108', height: '78', rx: '4', class: 'sc-map-minimap-bg' });
      mm.appendChild(bg);

      var sx = 96 / 900;
      var sy = 72 / 620;
      var ox = 48 + 54;
      var oy = 64 + 39;

      BRANCHES.forEach(function (b) {
        var c = ns('circle');
        var hot = b.id === state.branch;
        setAttr(c, {
          cx: ox + (b.x - CX) * sx,
          cy: oy + (b.y - CY) * sy,
          r: hot ? '3.2' : '2',
          class: hot ? 'sc-map-minimap-dot is-hot' : 'sc-map-minimap-dot'
        });
        mm.appendChild(c);
      });
      var hub = ns('circle');
      setAttr(hub, { cx: ox, cy: oy, r: '2.5', class: 'sc-map-minimap-hub' });
      mm.appendChild(hub);

      var tag = ns('text');
      setAttr(tag, { x: '48', y: '58', class: 'sc-map-minimap-label' });
      tag.textContent = branchById(state.branch).label.toUpperCase();
      mm.appendChild(tag);

      hud.appendChild(mm);
    }

    function clickInsideMapInteractive(el) {
      var node = el;
      while (node && node !== svg) {
        if (node.getAttribute) {
          var cls = node.getAttribute('class') || '';
          if (
            cls.indexOf('sc-map-entity') !== -1 ||
            cls.indexOf('sc-map-entity-link') !== -1 ||
            cls.indexOf('sc-map-entity-stem') !== -1 ||
            cls.indexOf('sc-map-entity-ring') !== -1 ||
            cls.indexOf('sc-map-layer-entities') !== -1 ||
            cls.indexOf('sc-map-branch') !== -1
          ) {
            return true;
          }
        }
        node = node.parentNode;
      }
      return false;
    }

    var entityLayers = {};
    var worldBuilt = false;
    var animGen = 0;
    var isTransitioning = false;
    var ZOOM_MS = 680;
    var NODE_MS = 460;
    var NODE_STAGGER = 26;
    var NODE_START_SCALE = 0.22;

    function resetEntityLayers() {
      Object.keys(entityLayers).forEach(function (id) {
        var layer = entityLayers[id];
        layer.classList.remove('is-visible', 'nodes-revealed', 'stems-visible', 'labels-visible');
        layer.querySelectorAll('.sc-map-entity').forEach(function (row) {
          row.classList.remove('is-entering');
          row.removeAttribute('transform');
          row.style.opacity = '';
        });
      });
      root.classList.remove('branch-labels-visible');
    }

    function entityBurstTransform(bx, by, ex, ey, scale, progress) {
      var t = progress;
      var cx = bx + (ex - bx) * t;
      var cy = by + (ey - by) * t;
      return (
        'translate(' +
        cx.toFixed(3) +
        ' ' +
        cy.toFixed(3) +
        ') scale(' +
        scale.toFixed(4) +
        ') translate(' +
        (-ex).toFixed(3) +
        ' ' +
        (-ey).toFixed(3) +
        ')'
      );
    }

    function showBranchInstant(branchId) {
      resetEntityLayers();
      var layer = entityLayers[branchId];
      if (!layer) return;
      layer.classList.add('is-visible', 'nodes-revealed', 'stems-visible', 'labels-visible');
      root.classList.add('branch-labels-visible');
    }

    function animateEntitiesFromCenter(layer, branch, token) {
      var rows = layer.querySelectorAll('.sc-map-entity');
      var bx = branch.x;
      var by = branch.y;
      var s0 = NODE_START_SCALE;
      rows.forEach(function (row, i) {
        var ex = parseFloat(row.getAttribute('data-ex'));
        var ey = parseFloat(row.getAttribute('data-ey'));
        var delay = 50 + i * NODE_STAGGER;
        row.classList.add('is-entering');
        row.__scAnimStart = null;

        function frame(ts) {
          if (token !== animGen) return;
          if (row.__scAnimStart == null) row.__scAnimStart = ts;
          var elapsed = ts - row.__scAnimStart - delay;
          if (elapsed < 0) {
            row.setAttribute('transform', entityBurstTransform(bx, by, ex, ey, s0, 0));
            row.style.opacity = '0';
            requestAnimationFrame(frame);
            return;
          }
          var p = Math.min(1, elapsed / NODE_MS);
          var ease = 1 - Math.pow(1 - p, 3);
          var s = s0 + (1 - s0) * ease;
          row.setAttribute('transform', entityBurstTransform(bx, by, ex, ey, s, ease));
          row.style.opacity = String(0.06 + 0.94 * ease);
          if (p < 1) requestAnimationFrame(frame);
          else {
            row.removeAttribute('transform');
            row.style.opacity = '';
            row.classList.remove('is-entering');
            row.__scAnimStart = null;
          }
        }
        requestAnimationFrame(frame);
      });
      return rows.length;
    }

    function animateEntitiesToCenter(layer, branch, token, onComplete) {
      var rows = layer.querySelectorAll('.sc-map-entity');
      var bx = branch.x;
      var by = branch.y;
      var s0 = NODE_START_SCALE;
      var count = rows.length;
      var done = 0;
      if (!count) {
        if (onComplete) onComplete();
        return;
      }
      rows.forEach(function (row, i) {
        var ex = parseFloat(row.getAttribute('data-ex'));
        var ey = parseFloat(row.getAttribute('data-ey'));
        var rev = count - 1 - i;
        var delay = 50 + rev * NODE_STAGGER;
        row.classList.add('is-entering');
        row.__scAnimStart = null;

        function frame(ts) {
          if (token !== animGen) return;
          if (row.__scAnimStart == null) row.__scAnimStart = ts;
          var elapsed = ts - row.__scAnimStart - delay;
          if (elapsed < 0) {
            requestAnimationFrame(frame);
            return;
          }
          var p = Math.min(1, elapsed / NODE_MS);
          var ease = 1 - Math.pow(1 - p, 3);
          var s = 1 - (1 - s0) * ease;
          var t = 1 - ease;
          row.setAttribute('transform', entityBurstTransform(bx, by, ex, ey, s, t));
          row.style.opacity = String(Math.max(0, 1 - 0.94 * ease));
          if (p < 1) requestAnimationFrame(frame);
          else {
            row.setAttribute('transform', entityBurstTransform(bx, by, ex, ey, s0, 0));
            row.style.opacity = '0';
            row.classList.remove('is-entering');
            row.__scAnimStart = null;
            done += 1;
            if (done === count && onComplete) onComplete();
          }
        }
        requestAnimationFrame(frame);
      });
    }

    function updateBranchChrome() {
      root.setAttribute('data-mode', state.mode);
      if (state.branch) root.setAttribute('data-branch', state.branch);
      else root.removeAttribute('data-branch');

      world.querySelectorAll('.sc-map-branch').forEach(function (gB) {
        var id = gB.getAttribute('data-branch');
        var active = state.mode === 'branch' && state.branch === id;
        if (active) gB.setAttribute('data-active', '1');
        else gB.removeAttribute('data-active');
        var hit = gB.querySelector('.sc-map-hex-hit');
        if (hit) hit.removeAttribute('pointer-events');
      });

      if (backBtn) backBtn.hidden = state.mode !== 'branch';
      if (hint) hint.hidden = state.mode === 'branch';
    }

    function playBranchExit(onDone) {
      animGen += 1;
      var token = animGen;
      var branchId = state.branch;
      var layer = branchId ? entityLayers[branchId] : null;
      var branch = branchId ? branchById(branchId) : null;

      if (!layer || !branch) {
        state.mode = 'overview';
        state.branch = null;
        updateBranchChrome();
        resetEntityLayers();
        applyZoom();
        renderMinimap();
        isTransitioning = false;
        if (onDone) onDone();
        return;
      }

      layer.classList.remove('labels-visible');
      root.classList.remove('branch-labels-visible');

      window.setTimeout(function () {
        if (token !== animGen) return;
        layer.classList.remove('stems-visible');
      }, 40);

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (token !== animGen) return;
          state.mode = 'overview';
          state.branch = null;
          updateBranchChrome();
          root.classList.remove('is-hovering');
          applyZoom();
          layer.classList.remove('nodes-revealed');
          animateEntitiesToCenter(layer, branch, token, function () {
            if (token !== animGen) return;
            layer.classList.remove('is-visible');
          });
          window.setTimeout(function () {
            if (token !== animGen) return;
            resetEntityLayers();
            renderMinimap();
            isTransitioning = false;
            if (onDone) onDone();
          }, ZOOM_MS + 40);
        });
      });
    }

    function playBranchEnter(branchId) {
      animGen += 1;
      var token = animGen;
      resetEntityLayers();
      var layer = entityLayers[branchId];
      var branch = branchById(branchId);
      if (!layer || !branch) return;

      var prepRows = layer.querySelectorAll('.sc-map-entity');
      prepRows.forEach(function (row) {
        var ex = parseFloat(row.getAttribute('data-ex'));
        var ey = parseFloat(row.getAttribute('data-ey'));
        row.setAttribute(
          'transform',
          entityBurstTransform(branch.x, branch.y, ex, ey, NODE_START_SCALE, 0)
        );
        row.classList.add('is-entering');
      });

      layer.classList.add('is-visible');

      requestAnimationFrame(function () {
        applyZoom();
        requestAnimationFrame(function () {
          if (token !== animGen) return;
          layer.classList.add('nodes-revealed');
          var n = animateEntitiesFromCenter(layer, branch, token);
          var stemDelay = Math.min(ZOOM_MS * 0.42, 90 + NODE_MS * 0.5);
          var labelsDelay = 90 + (n - 1) * NODE_STAGGER + NODE_MS * 0.88;
          window.setTimeout(function () {
            if (token !== animGen) return;
            layer.classList.add('stems-visible');
          }, stemDelay);
          window.setTimeout(function () {
            if (token !== animGen) return;
            layer.classList.add('labels-visible');
            root.classList.add('branch-labels-visible');
          }, labelsDelay);
        });
      });
    }

    function buildWorld() {
      if (worldBuilt) return;
      worldBuilt = true;

      var layerBack = ns('g');
      layerBack.setAttribute('class', 'sc-map-layer-back sc-map-fade-bg');
      renderFrame(layerBack);
      renderSpokes(layerBack);
      renderMeta(layerBack);
      world.appendChild(layerBack);

      var layerHub = ns('g');
      layerHub.setAttribute('class', 'sc-map-layer-hub sc-map-fade-bg');
      renderHub(layerHub);
      world.appendChild(layerHub);

      var layerFront = ns('g');
      layerFront.setAttribute('class', 'sc-map-layer-front sc-map-fade-bg');
      renderBranches(layerFront);
      world.appendChild(layerFront);

      BRANCHES.forEach(function (b) {
        var layerEnt = ns('g');
        layerEnt.setAttribute('class', 'sc-map-layer-entities');
        layerEnt.setAttribute('data-branch', b.id);
        layerEnt.addEventListener('click', function (e) {
          e.stopPropagation();
        });
        renderEntities(layerEnt, b);
        entityLayers[b.id] = layerEnt;
        world.appendChild(layerEnt);
      });

      bindEvents();
    }

    function syncMode() {
      updateBranchChrome();
      root.classList.remove('is-hovering');

      if (state.mode === 'branch' && state.branch) {
        if (reduced) {
          showBranchInstant(state.branch);
          requestAnimationFrame(applyZoom);
        } else {
          isTransitioning = true;
          playBranchEnter(state.branch);
          window.setTimeout(function () {
            isTransitioning = false;
          }, ZOOM_MS + NODE_MS + 120);
        }
      } else {
        animGen += 1;
        resetEntityLayers();
        requestAnimationFrame(applyZoom);
      }

      renderMinimap();
    }

    function openBranch(id) {
      if (isTransitioning) return;
      animGen += 1;
      isTransitioning = false;
      state.mode = 'branch';
      state.branch = id;
      syncMode();
    }

    function goOverview() {
      if (state.mode !== 'branch' || isTransitioning) return;
      if (reduced) {
        state.mode = 'overview';
        state.branch = null;
        syncMode();
        return;
      }
      isTransitioning = true;
      playBranchExit(function () {});
    }

    function bindEvents() {
      world.querySelectorAll('.sc-map-branch').forEach(function (node) {
        if (node.__scBound) return;
        node.__scBound = true;
        node.addEventListener('mouseenter', function () {
          if (state.mode !== 'overview') return;
          root.classList.add('is-hovering');
          root.setAttribute('data-hover', node.getAttribute('data-branch'));
        });
        node.addEventListener('mouseleave', function () {
          root.classList.remove('is-hovering');
          root.removeAttribute('data-hover');
        });
        node.addEventListener('click', function (e) {
          e.stopPropagation();
          openBranch(node.getAttribute('data-branch'));
        });
        node.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openBranch(node.getAttribute('data-branch'));
          }
        });
      });

    }

    if (backBtn) backBtn.addEventListener('click', goOverview);
    svg.addEventListener('click', function (e) {
      if (state.mode === 'overview') return;
      if (clickInsideMapInteractive(e.target)) return;
      goOverview();
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') goOverview();
    });

    syncSvgViewBox(svg);
    setAttr(svg, {
      role: 'img',
      'aria-hidden': 'false',
      'aria-label':
        'Interactive vendor network: Truffle at center, seven branch clusters on a hex ring. Click a cluster to zoom in and reveal vendor nodes.'
    });

    if (!reduced) root.classList.add('sc-map-animated');
    buildWorld();
    syncMobileTypography(root);
    syncMode();

    var mqOverview = window.matchMedia('(max-width:700px)');
    function onOverviewMq() {
      syncSvgViewBox(svg);
      syncMobileTypography(root);
      root.querySelectorAll('.sc-map-branch').forEach(function (gB) {
        var b = branchById(gB.getAttribute('data-branch'));
        if (!b) return;
        var overviewLabel = gB.querySelector('.sc-map-branch-overview .sc-map-branch-label');
        if (overviewLabel) overviewLabel.setAttribute('y', b.y + branchLabelOffsetY());
      });
      applyZoom();
      renderMinimap();
    }
    if (mqOverview.addEventListener) mqOverview.addEventListener('change', onOverviewMq);
    else mqOverview.addListener(onOverviewMq);
  }

  function boot() {
    document.querySelectorAll('.sc-map').forEach(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
