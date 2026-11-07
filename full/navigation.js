/* Resolve older shared anchors without leaving opaque fragments in the address bar. */
(function(){
  var aliases = {
  "/introduction": {
    "part-i": "the-math-behind-agents",
    "r1": "reference-interactive-model",
    "introduction": "",
    "top": "",
    "overture": "",
    "the-math": "the-math-behind-agents"
  },
  "/the-three-caps": {
    "part-iii": "the-reality",
    "r2": "reference-grid-connection-delays",
    "r3": "reference-utility-investment",
    "r4": "reference-blocked-projects",
    "r5": "reference-local-opposition",
    "r6": "reference-voter-opposition",
    "r7": "reference-texas-permit-pause",
    "r8": "reference-texas-grid-requests",
    "r9": "reference-new-york-moratorium",
    "r10": "reference-datacenter-politics",
    "r11": "reference-power-demand",
    "r12": "reference-construction-delays",
    "r13": "reference-interest-rates",
    "r14": "reference-neocloud-financing",
    "r15": "reference-ai-debt",
    "r16": "reference-model-assumptions",
    "the-three-caps": "",
    "top": "",
    "part-ii": ""
  },
  "/the-three-paths": {
    "orbital": "put-them-into-space",
    "r17": "reference-capacity-forecasts",
    "r18": "reference-unpowered-gpus",
    "r19": "reference-project-suncatcher",
    "r20": "reference-orbital-gpus",
    "r21": "reference-space-economics",
    "top": "",
    "part-iv": ""
  },
  "/precedents": {
    "fig-hybrid": "inference-comparison",
    "owning-nothing": "the-customer-interface",
    "who-plays-this-game": "personal-computing-today",
    "r22": "reference-ken-olsen",
    "r23": "reference-customer-interface",
    "r24": "reference-dgx-spark",
    "precedents": "",
    "top": "",
    "part-v": ""
  },
  "/a-new-computer": {
    "a-new-computer": "",
    "top": "",
    "part-vi": ""
  },
  "/next-gen-chips": {
    "the-roadmap": "",
    "the-t1": "t1",
    "the-t2": "t2",
    "the-supply-chain": "supply-chain",
    "the-timeline": "product-timeline",
    "top": "",
    "roadmap": "",
    "next-gen-chips": ""
  },
  "/a-million-new-computers": {
    "after-the-pc": "after-the-pc-the-internet",
    "a-million-new-computers": "",
    "top": "",
    "million": ""
  },
  "/endnotes": {
    "n1": "note-interactive-model",
    "n2": "note-grid-connection-delays",
    "n3": "note-utility-investment",
    "n4": "note-blocked-projects",
    "n5": "note-local-opposition",
    "n6": "note-voter-opposition",
    "n7": "note-texas-permit-pause",
    "n8": "note-texas-grid-requests",
    "n9": "note-new-york-moratorium",
    "n10": "note-datacenter-politics",
    "n11": "note-power-demand",
    "n12": "note-construction-delays",
    "n13": "note-interest-rates",
    "n14": "note-neocloud-financing",
    "n15": "note-ai-debt",
    "n16": "note-model-assumptions",
    "n17": "note-capacity-forecasts",
    "n18": "note-unpowered-gpus",
    "n19": "note-project-suncatcher",
    "n20": "note-orbital-gpus",
    "n21": "note-space-economics",
    "n22": "note-ken-olsen",
    "n23": "note-customer-interface",
    "n24": "note-dgx-spark",
    "endnotes": "",
    "top": ""
  }
};
  function normalize(){
    var map=aliases[location.pathname.replace(/\/$/,'')];
    var hash; try{hash=decodeURIComponent(location.hash.slice(1));}catch(e){return;}
    if(!map || !hash) return;
    var target=Object.prototype.hasOwnProperty.call(map,hash) ? map[hash] : hash;
    window.__essayAnchorNavigation=true;
    history.replaceState(history.state,'',location.pathname+location.search+(target?'#'+target:''));
    function jump(){
      var element=target && document.getElementById(target);
      if(element){
        var landing=element.classList.contains('tabsect') ? element.parentElement.querySelector('.captabs') || element : element;
        landing.scrollIntoView({behavior:'instant',block:'start'});
      }
      else {
        history.replaceState(history.state,'',location.pathname+location.search);
        window.scrollTo({top:0,behavior:'instant'});
      }
    }
    function scheduleJump(){requestAnimationFrame(jump);}
    if(document.readyState!=='complete') window.addEventListener('load',scheduleJump,{once:true});
    else scheduleJump();
  }
  normalize();
  window.addEventListener('hashchange',normalize);
})();
