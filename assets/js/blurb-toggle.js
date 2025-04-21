// assets/js/blurb-toggle.js
console.log('✅ blurb‑toggle.js loaded');

(function(){
  // At this point, this script is at the end of <body>, so DOM is parsed.
  const btn   = document.getElementById('blurbToggle');
  const panel = document.getElementById('blurbLong');
  console.log('🔍 blurb‑init:', { btn, panel });

  if (!btn || !panel) {
    console.warn('⚠️ blurb‑init: missing element(s)', { btn, panel });
    return;
  }

  console.log('🗝️ blurb‑init: binding click handler');
  btn.addEventListener('click', ()=>{
    console.log('🔘 blurb‑click');
    const open = panel.classList.toggle('open');
    btn.textContent = open
      ? 'Hide details ↑'
      : 'Show more details ↓';
    btn.setAttribute('aria-expanded', open);
    panel.setAttribute('aria-hidden', !open);
  });
})();