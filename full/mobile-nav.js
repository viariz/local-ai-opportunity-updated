(function () {
  if (document.getElementById('nav-toggle')) return;
  var rail = document.getElementById('rail');
  var topbar = document.getElementById('topbar');
  if (!rail || !topbar) return;

  var inner = topbar.querySelector('.inner');
  if (!inner) return;

  var style = document.createElement('style');
  style.textContent = [
    '@media (max-width:999px){',
    '  #topbar .toc-link{display:none;}',
    '  #topbar{opacity:1!important; pointer-events:auto!important;}',
    '  #topbar .where{transition:opacity .25s ease;}',
    '  #topbar:not(.show) .where{opacity:0; visibility:hidden;}',
    '  body.mobile-nav-open #topbar.show .where{opacity:.5; visibility:visible;}',
    '  #topbar .inner{align-items:center; min-height:44px; padding-block:0; padding-right:0;}',
    '  #nav-toggle{',
    '    display:flex; flex-direction:column; justify-content:center; align-items:center; gap:5px;',
    '    flex:0 0 auto; position:relative; z-index:14;',
    '    width:44px; height:44px; margin:0 0 0 8px; padding:0; margin-right:-8px;',
    '    border:none; background:transparent; cursor:pointer; color:var(--ink);',
    '    -webkit-tap-highlight-color:transparent;',
    '  }',
    '  #nav-toggle .bar{display:block; width:18px; height:1px; background:currentColor;',
    '    transition:transform .28s cubic-bezier(.33,1,.38,1), opacity .2s ease, width .28s ease; transform-origin:center;}',
    '  #nav-toggle[aria-expanded="true"] .bar:nth-child(1){transform:translateY(6px) rotate(45deg);}',
    '  #nav-toggle[aria-expanded="true"] .bar:nth-child(2){opacity:0; width:0;}',
    '  #nav-toggle[aria-expanded="true"] .bar:nth-child(3){transform:translateY(-6px) rotate(-45deg);}',
    '  #mobile-nav-panel{',
    '    position:fixed; z-index:13; left:0; right:0; top:0; bottom:0;',
    '    overflow:auto; -webkit-overflow-scrolling:touch;',
    '    background:var(--paper); border-bottom:1px solid var(--rule);',
    '    padding:0 max(18px, env(safe-area-inset-right, 0px)) max(28px, env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px));',
    '    padding-top:calc(env(safe-area-inset-top, 0px) + 44px);',
    '    box-sizing:border-box; font-family:var(--sans);',
    '    opacity:0; visibility:hidden; pointer-events:none;',
    '    transform:translateY(-6px);',
    '    transition:opacity .28s ease, transform .32s cubic-bezier(.33,1,.38,1), visibility 0s linear .32s;',
    '  }',
    '  #mobile-nav-panel.open{opacity:1; visibility:visible; pointer-events:auto; transform:none; transition:opacity .28s ease, transform .32s cubic-bezier(.33,1,.38,1), visibility 0s;}',
    '  #mobile-nav-panel .mobile-nav-list{display:flex; flex-direction:column;}',
    '  #mobile-nav-panel .mobile-nav-list a:active{opacity:.7;}',
    '  #mobile-nav-backdrop{',
    '    position:fixed; inset:0; z-index:12;',
    '    background:color-mix(in srgb, var(--ink) 12%, transparent);',
    '    opacity:0; visibility:hidden; pointer-events:none;',
    '    transition:opacity .25s ease, visibility 0s linear .25s;',
    '  }',
    '  #mobile-nav-backdrop.open{opacity:1; visibility:visible; pointer-events:auto; transition:opacity .25s ease, visibility 0s;}',
    '  body.mobile-nav-open #topbar, html.mobile-nav-open #topbar{z-index:16; background:var(--paper); border-bottom-color:transparent;}',
    '  html.mobile-nav-open, body.mobile-nav-open{overflow:hidden;}',
    '}',
    '@media (min-width:1000px){',
    '  #nav-toggle, #mobile-nav-panel, #mobile-nav-backdrop{display:none!important;}',
    '}',
    '@media (prefers-reduced-motion: reduce){',
    '  #nav-toggle .bar, #mobile-nav-panel, #mobile-nav-backdrop{transition:none!important;}',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'nav-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'mobile-nav-panel');
  toggle.setAttribute('aria-label', 'Open contents');
  for (var b = 0; b < 3; b++) {
    var bar = document.createElement('span');
    bar.className = 'bar';
    bar.setAttribute('aria-hidden', 'true');
    toggle.appendChild(bar);
  }
  inner.appendChild(toggle);

  var backdrop = document.createElement('div');
  backdrop.id = 'mobile-nav-backdrop';
  backdrop.hidden = true;

  var panel = document.createElement('nav');
  panel.id = 'mobile-nav-panel';
  panel.setAttribute('aria-label', 'Contents');
  panel.hidden = true;

  var list = document.createElement('ol');
  list.className = 'mobile-nav-list';
  panel.appendChild(list);

  function labelFromRailAnchor(a) {
    if (!a) return '';
    var titleEl = a.querySelector('.rail-title');
    if (titleEl && titleEl.textContent) return titleEl.textContent.trim();
    return (a.getAttribute('aria-label') || a.textContent || '').trim();
  }

  function syncMobileNavState() {
    var sourceItems = rail.querySelectorAll('ol > li');
    var destItems = list.querySelectorAll('li');
    for (var i = 0; i < destItems.length && i < sourceItems.length; i++) {
      var dest = destItems[i];
      var src = sourceItems[i];
      dest.className = src.className;
      dest.removeAttribute('data-target');
      dest.classList.remove('passed');
    }
  }

  var railItems = rail.querySelectorAll('ol > li');
  railItems.forEach(function (li) {
    var srcA = li.querySelector('a[href]');
    if (!srcA) return;
    var label = labelFromRailAnchor(srcA);
    if (!label) return;
    var item = document.createElement('li');
    item.className = li.className;
    item.classList.remove('passed');
    item.removeAttribute('data-target');
    var a = document.createElement('a');
    a.href = srcA.getAttribute('href');
    a.textContent = label;
    item.appendChild(a);
    list.appendChild(item);
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);

  var open = false;
  var lockScrollY = 0;

  function lockPageScroll() {
    lockScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add('mobile-nav-open');
    document.body.classList.add('mobile-nav-open');
    document.body.style.position = 'fixed';
    document.body.style.top = -lockScrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  function scrollInstant(y) {
    var root = document.documentElement;
    var prevRoot = root.style.scrollBehavior;
    var prevBody = document.body.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    root.style.scrollBehavior = prevRoot;
    document.body.style.scrollBehavior = prevBody;
  }

  function unlockPageScroll() {
    var y = lockScrollY;
    document.documentElement.classList.remove('mobile-nav-open');
    document.body.classList.remove('mobile-nav-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    scrollInstant(y);
  }

  function setOpen(next) {
    var wasOpen = open;
    open = next;
    if (open) {
      syncMobileNavState();
      lockPageScroll();
    } else if (wasOpen) {
      unlockPageScroll();
    }
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close contents' : 'Open contents');
    panel.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    panel.hidden = !open;
    backdrop.hidden = !open;
  }

  toggle.addEventListener('click', function () {
    setOpen(!open);
  });

  backdrop.addEventListener('click', function () {
    setOpen(false);
  });

  panel.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;
    e.preventDefault();
    var href = link.getAttribute('href') || '';
    setOpen(false);
    if (!href) return;
    requestAnimationFrame(function () {
      if (href.charAt(0) === '#') {
        var id = href.slice(1);
        var target = id ? document.getElementById(id) : null;
        if (target) {
          try {
            target.scrollIntoView({ block: 'start', behavior: 'instant' });
          } catch (err) {
            target.scrollIntoView(true);
          }
        } else if (href.length > 1) location.hash = href;
      } else {
        location.href = href;
      }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      toggle.focus();
    }
  });

  window.matchMedia('(max-width:999px)').addEventListener('change', function (mq) {
    if (!mq.matches && open) setOpen(false);
  });
})();
