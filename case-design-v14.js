(() => {
  // Source artwork keeps its own proportions. Only page previews receive rounding.
  // The full-screen viewers continue displaying the complete original slides.
  document.querySelectorAll('main .figure img').forEach(img => {
    const setRatio = () => {
      if (img.naturalWidth && img.naturalHeight) {
        img.closest('figure').style.setProperty('--work-ratio', img.naturalWidth / img.naturalHeight);
      }
    };
    if (img.complete) setRatio();
    else img.addEventListener('load', setRatio, {once:true});
  });
})();
