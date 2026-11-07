(function () {
  'use strict';
  var mobile = window.matchMedia('(max-width:700px)');
  var CAP_MOBILE = '0 0 320 592';
  var CAP_DESKTOP = '0 0 640 250';
  var COM_MOBILE = '0 0 320 470';
  var COM_DESKTOP = '0 0 640 260';

  function resize() {
    var commerce = document.querySelector('.agentic-commerce');
    if (commerce) {
      if (!commerce.dataset.capVbFull) {
        commerce.dataset.capVbFull = commerce.getAttribute('viewBox') || COM_DESKTOP;
      }
      commerce.setAttribute('viewBox', mobile.matches ? COM_MOBILE : commerce.dataset.capVbFull);
    }
    document.querySelectorAll('.capability-chart').forEach(function (chart) {
      if (!chart.dataset.capVbFull) {
        chart.dataset.capVbFull = chart.getAttribute('viewBox') || CAP_DESKTOP;
      }
      chart.setAttribute('viewBox', mobile.matches ? CAP_MOBILE : chart.dataset.capVbFull);
    });
  }

  function boot() {
    resize();
    if (mobile.addEventListener) mobile.addEventListener('change', resize);
    else mobile.addListener(resize);
    window.addEventListener('pageshow', resize);
    window.reflowCapabilityRadars = resize;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
