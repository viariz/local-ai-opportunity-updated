/* Section rail: one horizontal dash per chapter; hover “wave” widens nearby dashes. */
(function(){
  window.createReadingRail = function(rail){
    var items = Array.from(rail.querySelectorAll('li'));
    var chapters = items.filter(function(item){ return !!item.querySelector('a'); });
    var list = rail.querySelector('ol');
    var ns = 'http://www.w3.org/2000/svg';

    var SECTION_STEP = 13; /* 1px line + 12px gap */
    var W_BASE = 12, W_HOVER0 = 32, W_HOVER1 = 24, W_HOVER2 = 16;
    var INK = '31,33,34';

    var chapterRegions = [];
    var marks = [];
    var hoverY = null;
    var frame = 0;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var WIDTH_SMOOTH = reduced ? 1 : 0.14;
    var WIDTH_EPS = 0.03;
    var currentIdx = 0;

    function resolveChapterRegions(){
      chapterRegions = [];
      items.forEach(function(li){
        var id = li.getAttribute('data-chapter-anchor');
        if(!id) return;
        var el = document.getElementById(id);
        if(el) chapterRegions.push({ li: li, el: el });
      });
    }

    function currentChapterIndex(){
      if(!chapterRegions.length) return -1;
      var y = (window.scrollY || 0) + Math.min(180, window.innerHeight * 0.22);
      var idx = 0;
      for(var i = 0; i < chapterRegions.length; i++){
        var top = chapterRegions[i].el.offsetTop;
        if(top <= y) idx = i;
        else break;
      }
      return idx;
    }

    function setChapterIndicator(){
      var idx = currentChapterIndex();
      currentIdx = idx < 0 ? 0 : idx;
      items.forEach(function(li){ li.classList.remove('here', 'soon', 'passed'); });
      chapterRegions.forEach(function(row, i){
        var a = row.li.querySelector('a');
        if(!a) return;
        a.removeAttribute('aria-current');
        if(idx < 0) return;
        if(i < idx) row.li.classList.add('passed');
        else if(i > idx) row.li.classList.add('soon');
        else{
          row.li.classList.add('here');
          a.setAttribute('aria-current', 'location');
        }
      });
    }

    function svgNode(tag, attrs){
      var node = document.createElementNS(ns, tag);
      Object.keys(attrs || {}).forEach(function(key){ node.setAttribute(key, attrs[key]); });
      return node;
    }

    var svg = svgNode('svg', { 'class': 'rail-track', 'aria-hidden': 'true', width: '40' });
    var pathInactive = svgNode('path', { 'class': 'rail-track-inactive', fill: 'none', 'stroke-linecap': 'butt' });
    var pathActive = svgNode('path', { 'class': 'rail-track-active', fill: 'none', 'stroke-linecap': 'butt' });
    svg.appendChild(pathInactive);
    svg.appendChild(pathActive);
    rail.appendChild(svg);

    function yForIndex(i){
      return SECTION_STEP * i + SECTION_STEP / 2;
    }

    function nearestChapterIndexFromLocalY(localY){
      if(localY == null || !marks.length) return -1;
      var best = 0, bestD = Infinity;
      for(var i = 0; i < marks.length; i++){
        var d = Math.abs(marks[i].y - localY);
        if(d < bestD){ bestD = d; best = i; }
      }
      return best;
    }

    function targetWidth(i, nearest){
      if(nearest < 0) return W_BASE;
      var dist = Math.abs(i - nearest);
      if(dist === 0) return W_HOVER0;
      if(dist === 1) return W_HOVER1;
      if(dist === 2) return W_HOVER2;
      return W_BASE;
    }

    function measure(){
      resolveChapterRegions();
      setChapterIndicator();
      var n = chapters.length;
      if(!n) return;

      marks = [];
      for(var i = 0; i < n; i++){
        marks.push({ y: yForIndex(i), width: W_BASE });
      }

      chapters.forEach(function(li){
        li.style.height = SECTION_STEP + 'px';
        li.style.minHeight = SECTION_STEP + 'px';
      });

      var listH = n * SECTION_STEP;
      svg.style.top = list.offsetTop + 'px';
      svg.setAttribute('height', String(Math.ceil(listH + 2)));
      svg.setAttribute('viewBox', '0 0 40 ' + (listH + 2));
      draw();
    }

    function draw(){
      var n = marks.length;
      if(!n) return;
      var nearest = hoverY === null ? -1 : nearestChapterIndexFromLocalY(hoverY);
      var cidx = currentChapterIndex();
      var here = cidx < 0 ? 0 : Math.min(n - 1, cidx);
      var fullIdx = nearest >= 0 ? nearest : here;

      var moving = false;
      for(var i = 0; i < n; i++){
        var tw = targetWidth(i, nearest);
        var w = reduced ? tw : marks[i].width + (tw - marks[i].width) * WIDTH_SMOOTH;
        if(Math.abs(tw - w) > WIDTH_EPS) moving = true;
        marks[i].width = w;
      }

      var dFull = [];
      var dMuted = [];
      for(i = 0; i < n; i++){
        var yy = Math.round(marks[i].y * 2) / 2;
        var seg = 'M0 ' + yy + 'h' + marks[i].width.toFixed(2);
        if(i === fullIdx) dFull.push(seg);
        else dMuted.push(seg);
      }

      pathInactive.setAttribute('d', dMuted.join(' '));
      pathActive.setAttribute('d', dFull.join(' '));
      pathInactive.setAttribute('stroke', 'rgba(' + INK + ',0.3)');
      pathInactive.setAttribute('stroke-width', '1');
      pathActive.setAttribute('stroke', 'rgba(' + INK + ',1)');
      pathActive.setAttribute('stroke-width', '1');

      if(moving && !frame){
        frame = requestAnimationFrame(function(){ frame = 0; draw(); });
      }
    }

    function paint(){
      var n = marks.length;
      if(!n) return;
      var nearest = hoverY === null ? -1 : nearestChapterIndexFromLocalY(hoverY);
      items.forEach(function(item, index){
        var chIdx = chapters.indexOf(item);
        var isNearest = hoverY !== null && chIdx === nearest;
        item.classList.toggle('preview', !!isNearest);
      });
      rail.classList.toggle('is-previewing', hoverY !== null);
      draw();
    }

    function update(){
      setChapterIndicator();
      paint();
    }

    function reset(){ hoverY = null; paint(); }

    function preview(event){
      if(event.pointerType === 'touch') return;
      hoverY = event.clientY - list.getBoundingClientRect().top;
      paint();
    }

    rail.addEventListener('pointerenter', preview);
    rail.addEventListener('pointermove', preview);
    rail.addEventListener('pointerleave', reset);
    rail.addEventListener('pointercancel', reset);
    rail.addEventListener('click', reset, true);
    window.addEventListener('blur', reset);
    window.addEventListener('pagehide', reset);
    window.addEventListener('pageshow', function(){ reset(); measure(); update(); requestAnimationFrame(update); });
    document.addEventListener('visibilitychange', function(){ if(document.hidden) reset(); else update(); });
    window.addEventListener('resize', function(){ reset(); measure(); update(); });
    var resize = new ResizeObserver(function(){ measure(); update(); });
    resize.observe(document.querySelector('.book') || document.body);
    if(document.fonts) document.fonts.ready.then(function(){ measure(); update(); });

    measure();
    update();
    rail.classList.add('show');
    return { update: update, measure: measure };
  };
})();
