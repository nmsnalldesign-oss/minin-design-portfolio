(() => {
  const viewer = document.querySelector('.book-viewer');
  if (!viewer) return;
  const page = viewer.querySelector('.book-page');
  const counter = viewer.querySelector('.book-counter');
  const thumbs = [...viewer.querySelectorAll('.book-thumb')];
  const prev = viewer.querySelector('.book-prev');
  const next = viewer.querySelector('.book-next');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0, origin = null, request = 0, touchX = null;
  function show(index, animate = true) {
    current = Math.max(0, Math.min(thumbs.length - 1, index));
    const serial = ++request;
    const src = `/assets/eywa/page-${String(current + 1).padStart(2, '0')}.webp`;
    const img = new Image();
    img.onload = () => {
      if (serial !== request) return;
      page.src = src;
      page.alt = `Брендбук EYWA, страница ${current + 1}`;
      if (animate && !reduced) page.animate([{opacity: .2, transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}], {duration:400,easing:'cubic-bezier(.16,1,.3,1)'});
    };
    img.src = src;
    counter.textContent = `${String(current + 1).padStart(2, '0')} / ${thumbs.length}`;
    thumbs.forEach((b, i) => b.setAttribute('aria-current', String(i === current)));
    thumbs[current].scrollIntoView({block:'nearest',inline:'nearest',behavior:reduced?'instant':'smooth'});
    prev.disabled = current === 0; next.disabled = current === thumbs.length - 1;
    if (current + 1 < thumbs.length) new Image().src = `/assets/eywa/page-${String(current + 2).padStart(2,'0')}.webp`;
  }
  document.querySelectorAll('.book-open').forEach(b => b.addEventListener('click', () => {
    origin = b; viewer.showModal(); show(0, false);
  }));
  viewer.querySelector('.book-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => origin?.focus({preventScroll:true}));
  prev.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  thumbs.forEach((b, i) => b.addEventListener('click', () => show(i)));
  viewer.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(current + (e.key === 'ArrowRight' ? 1 : -1)); }
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); show(e.key === 'Home' ? 0 : thumbs.length - 1); }
  });
  const stage = viewer.querySelector('.book-stage');
  stage.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, {passive:true});
  stage.addEventListener('touchend', e => {
    if (touchX !== null) { const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 55) show(current + (dx < 0 ? 1 : -1)); }
    touchX = null;
  }, {passive:true});
})();
