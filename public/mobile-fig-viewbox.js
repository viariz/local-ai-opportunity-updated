(function () {
  'use strict';

  var MQ = '(max-width:700px)';

  var VIEW_RULES = [
    {
      sel: '#introduction svg.supply-demand-chart',
      full: '0 0 720 420',
      mobile: '0 0 720 420'
    },
    {
      sel: '#the-grid svg.ichart-diagram',
      full: '0 0 720 360',
      mobile: '42 4 662 356'
    },
    {
      sel: '#the-state svg.ichart-bars',
      full: '0 0 720 290',
      mobile: '88 0 632 290'
    },
    {
      sel: '.cutout-chart-wide svg.ichart-bars',
      full: '0 0 704 300',
      mobile: 'dynamicAmazonBars'
    },
    {
      sel: 'figure.fig-stack-compare svg',
      full: '0 0 720 360',
      mobile: '0 0 720 360'
    }
  ];

  var DONUT_CENTERS = [[140, 136], [360, 136], [580, 136]];
  var DONUT_MOBILE_TARGETS = [[180, 138], [180, 398], [180, 658]];

  function amazonBarsMobileViewBox(svg) {
    var bars = svg.querySelectorAll('.ichart-bar');
    if (!bars.length) return '167 0 370 300';
    var minX = Infinity;
    var maxX = -Infinity;
    bars.forEach(function (bar) {
      var x = parseFloat(bar.getAttribute('x'));
      var w = parseFloat(bar.getAttribute('width'));
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + w);
    });
    var cx = (minX + maxX) / 2;
    var vbW = maxX - minX + 128;
    var vbX = cx - vbW / 2;
    return vbX + ' 0 ' + vbW + ' 300';
  }

  function applyViewBoxes(mq) {
    var mobile = mq.matches;
    VIEW_RULES.forEach(function (rule) {
      document.querySelectorAll(rule.sel).forEach(function (svg) {
        if (!svg.dataset.figVbFull) {
          svg.dataset.figVbFull = svg.getAttribute('viewBox') || rule.full;
        }
        if (mobile) {
          if (rule.mobile === 'dynamicAmazonBars') {
            svg.setAttribute('viewBox', amazonBarsMobileViewBox(svg));
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          } else {
            svg.setAttribute('viewBox', rule.mobile);
            svg.removeAttribute('preserveAspectRatio');
          }
        } else {
          svg.setAttribute('viewBox', svg.dataset.figVbFull);
          svg.removeAttribute('preserveAspectRatio');
        }
      });
    });
    document.querySelectorAll('figure.fig-mobile-lg svg').forEach(function (svg) {
      if (!svg.dataset.figVbFull) {
        svg.dataset.figVbFull = svg.getAttribute('viewBox') || '0 0 720 250';
      }
      if (!mobile) svg.setAttribute('viewBox', svg.dataset.figVbFull);
    });
  }

  function applyNeighborDonuts(mq) {
    document.querySelectorAll('#the-neighbors svg.ichart-donuts').forEach(function (svg) {
      if (!svg.dataset.figVbFull) {
        svg.dataset.figVbFull = svg.getAttribute('viewBox') || '0 0 720 270';
      }
      var groups = svg.querySelectorAll('g.party-donut');
      if (groups.length < 3) return;
      if (mq.matches) {
        svg.setAttribute('viewBox', '-24 0 408 780');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        for (var i = 0; i < 3; i++) {
          var c = DONUT_CENTERS[i];
          var t = DONUT_MOBILE_TARGETS[i];
          groups[i].setAttribute(
            'transform',
            'translate(' + (t[0] - c[0]) + ' ' + (t[1] - c[1]) + ')'
          );
        }
        groups.forEach(function (g) {
          g.querySelectorAll('circle.ichart-seg').forEach(function (seg) {
            seg.setAttribute('stroke-width', '26');
          });
          g.querySelectorAll('circle:not(.ichart-seg)').forEach(function (ring) {
            var sw = ring.getAttribute('stroke-width');
            if (sw === '24' || sw === '28') ring.setAttribute('stroke-width', '26');
          });
          g.querySelectorAll('text').forEach(function (txt, idx) {
            if (idx === 0) txt.setAttribute('font-size', '28');
            else if (idx === 1) txt.setAttribute('font-size', '12');
            else if (idx === 2) txt.setAttribute('font-size', '14');
          });
        });
      } else {
        svg.setAttribute('viewBox', svg.dataset.figVbFull);
        svg.removeAttribute('preserveAspectRatio');
        groups.forEach(function (g) {
          g.removeAttribute('transform');
          g.querySelectorAll('circle.ichart-seg').forEach(function (seg) {
            seg.setAttribute('stroke-width', '24');
          });
          g.querySelectorAll('circle:not(.ichart-seg)').forEach(function (ring) {
            if (ring.getAttribute('stroke-width') === '26') ring.setAttribute('stroke-width', '24');
          });
          g.querySelectorAll('text').forEach(function (txt, idx) {
            if (idx === 0) txt.setAttribute('font-size', '26');
            else if (idx === 1) txt.setAttribute('font-size', '11');
            else if (idx === 2) txt.setAttribute('font-size', '14.5');
          });
        });
      }
    });
  }

  function applyChipBottleneck(mq) {
    document.querySelectorAll('.chip-bottleneck-chart').forEach(function (svg) {
      if (!svg.dataset.figVbFull) {
        svg.dataset.figVbFull = svg.getAttribute('viewBox') || '0 0 700 260';
      }
      svg.setAttribute('viewBox', mq.matches ? '0 0 340 562' : svg.dataset.figVbFull);
    });
  }

  function applyCapabilityCharts(mq) {
    var capMobile = '0 0 320 592';
    var capDesktop = '0 0 640 250';
    var comMobile = '0 0 320 470';
    var comDesktop = '0 0 640 260';
    document.querySelectorAll('.capability-chart').forEach(function (svg) {
      if (!svg.dataset.figVbFull) {
        svg.dataset.figVbFull = svg.getAttribute('viewBox') || capDesktop;
      }
      svg.setAttribute('viewBox', mq.matches ? capMobile : svg.dataset.figVbFull);
    });
    document.querySelectorAll('.agentic-commerce').forEach(function (svg) {
      if (!svg.dataset.figVbFull) {
        svg.dataset.figVbFull = svg.getAttribute('viewBox') || comDesktop;
      }
      svg.setAttribute('viewBox', mq.matches ? comMobile : svg.dataset.figVbFull);
    });
  }

  function injectMobileFigCss() {
    var style = document.getElementById('mobile-fig-extra-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'mobile-fig-extra-css';
      document.head.appendChild(style);
    }
    style.textContent =
      '@media (max-width:700px){' +
      'figure.fig-mobile-lg svg .figtext{font-size:11.5px!important;letter-spacing:.06em!important;}' +
      'figure.fig-mobile-lg svg text{font-size:11.5px!important;}' +
      '}';
  }

  function applyAll(mq) {
    injectMobileFigCss();
    applyViewBoxes(mq);
    applyNeighborDonuts(mq);
    applyChipBottleneck(mq);
    applyCapabilityCharts(mq);
  }

  function boot() {
    var mq = window.matchMedia(MQ);
    applyAll(mq);
    window.reflowMobileFigs = function () {
      applyAll(mq);
      if (window.reflowCapabilityRadars) window.reflowCapabilityRadars();
      if (window.ichartRefresh) window.ichartRefresh();
    };
    if (mq.addEventListener) mq.addEventListener('change', applyAll);
    else mq.addListener(applyAll);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
