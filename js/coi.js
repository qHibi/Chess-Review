/* Cross-origin isolation for the threaded Stockfish (SharedArrayBuffer needs COOP/COEP headers).
   GitHub Pages can't send headers, so coi-sw.js (next to index.html) adds them. First visit: register it and reload once. */
(function(){
  if(window.crossOriginIsolated||!window.isSecureContext||!('serviceWorker' in navigator))return;
  let tried=false;try{tried=sessionStorage.getItem('coi-reload')==='1'}catch(e){}
  const reload=()=>{if(tried)return;try{sessionStorage.setItem('coi-reload','1')}catch(e){}location.reload()};
  navigator.serviceWorker.register(new URL('coi-sw.js',document.baseURI)).then(reg=>{
    if(reg.active&&!navigator.serviceWorker.controller)return reload();
    reg.addEventListener('updatefound',()=>{
      const w=reg.installing;
      if(w)w.addEventListener('statechange',()=>{if(w.state==='activated')reload()});
    });
  }).catch(e=>console.warn('coi-sw.js not registered:',e));
})();
