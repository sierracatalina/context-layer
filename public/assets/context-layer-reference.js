const scroll = document.querySelector('[data-diagram-scroll]');
const image = document.querySelector('[data-diagram-image]');
const output = document.querySelector('[data-diagram-zoom]');
const controls = document.querySelectorAll('[data-diagram-action]');

if (scroll && image && output) {
  const naturalWidth = 2200;
  const naturalHeight = 1960;
  const minScale = 0.28;
  const maxScale = 2;
  let scale = 0.75;
  let mode = 'reading';

  const fitScale = () => Math.max(minScale, Math.min(1, (scroll.clientWidth - 2) / naturalWidth));

  const render = (nextScale, nextMode = 'custom', preserveCenter = true) => {
    const priorWidth = image.getBoundingClientRect().width || naturalWidth * scale;
    const centerX = scroll.scrollLeft + scroll.clientWidth / 2;
    const centerY = scroll.scrollTop + scroll.clientHeight / 2;
    const ratioX = centerX / priorWidth;
    const ratioY = centerY / (priorWidth * (naturalHeight / naturalWidth));
    scale = Math.max(minScale, Math.min(maxScale, nextScale));
    mode = nextMode;
    image.style.width = Math.round(naturalWidth * scale) + 'px';
    output.value = mode === 'fit' ? 'Fit · ' + Math.round(scale * 100) + '%' : Math.round(scale * 100) + '%';
    if (preserveCenter) {
      requestAnimationFrame(() => {
        scroll.scrollLeft = Math.max(0, ratioX * naturalWidth * scale - scroll.clientWidth / 2);
        scroll.scrollTop = Math.max(0, ratioY * naturalHeight * scale - scroll.clientHeight / 2);
      });
    }
  };

  const fit = (preserveCenter = false) => render(fitScale(), 'fit', preserveCenter);
  const reading = () => {
    render(0.75, 'reading', false);
    requestAnimationFrame(() => {
      scroll.scrollLeft = Math.max(0, (naturalWidth * scale - scroll.clientWidth) / 2);
      scroll.scrollTop = 0;
    });
  };

  controls.forEach((control) => {
    control.addEventListener('click', () => {
      const action = control.dataset.diagramAction;
      if (action === 'fit') fit();
      if (action === 'reading') reading();
      if (action === 'actual') render(1, 'actual');
      if (action === 'in') render(scale * 1.2);
      if (action === 'out') render(scale / 1.2);
    });
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (mode === 'fit') fit();
      if (mode === 'reading') reading();
    }, 120);
  });

  image.addEventListener('load', () => reading());
  reading();
}
