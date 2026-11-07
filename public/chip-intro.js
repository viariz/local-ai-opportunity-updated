(function () {
  'use strict';

  var chart = document.querySelector('.chip-bottleneck-chart');
  var mobile = window.matchMedia('(max-width:700px)');

  function resizeChart() {
    if (chart) chart.setAttribute('viewBox', mobile.matches ? '0 0 340 562' : '0 0 700 260');
  }
  resizeChart();
  if (mobile.addEventListener) mobile.addEventListener('change', resizeChart);
  else mobile.addListener(resizeChart);

  var bottleneckFig = document.querySelector('.chip-bottleneck-figure');
  if (bottleneckFig && 'IntersectionObserver' in window) {
    var style = document.createElement('style');
    style.setAttribute('data-chip-anim', '');
    style.textContent =
      '.chip-bottleneck-figure.is-offscreen .chip-packet{animation-play-state:paused!important;}';
    document.head.appendChild(style);
    bottleneckFig.classList.add('is-offscreen');
    var io = new IntersectionObserver(
      function (entries) {
        var e = entries[0];
        if (!e) return;
        bottleneckFig.classList.toggle('is-offscreen', !e.isIntersecting);
      },
      { root: null, rootMargin: '64px 0px', threshold: 0 }
    );
    io.observe(bottleneckFig);
  }

  var trigger = document.querySelector('.chip-video-trigger');
  var dialog = document.querySelector('.chip-video-dialog');
  if (!trigger || !dialog) return;
  var player = dialog.querySelector('iframe');
  trigger.addEventListener('click', function () {
    dialog.showModal();
    player.src = 'https://www.youtube-nocookie.com/embed/GVsUOuSjvcg?autoplay=1';
  });
  dialog.querySelector('.chip-video-close').addEventListener('click', function () {
    dialog.close();
  });
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', function () {
    player.src = 'about:blank';
    trigger.focus({ preventScroll: true });
  });
})();
