(() => {
  const container = document.getElementById('widgets');
  const editButton = document.getElementById('edit-layout');
  if (!container || !editButton) return;

  const STORAGE_KEY = 'pronote-dashboard-widget-sizes-v1';
  const defaults = {
    schedule: { width: 12, height: 12 },
    grades: { width: 6, height: 10 },
    homework: { width: 6, height: 8 },
    agenda: { width: 6, height: 8 },
    documents: { width: 12, height: 6 },
    'grade-trend': { width: 6, height: 8 },
    'grade-subject-bars': { width: 6, height: 8 },
    'grade-percentage': { width: 4, height: 7 },
    'grade-pie': { width: 8, height: 8 }
  };
  const sizes = {};
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved && typeof saved === 'object') {
      for (const [id, value] of Object.entries(saved)) {
        if (Number.isInteger(value?.width) && Number.isInteger(value?.height)) {
          sizes[id] = { width: Math.min(12, Math.max(3, value.width)), height: Math.min(30, Math.max(4, value.height)) };
        }
      }
    }
  } catch {}

  const persist = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes)); } catch {}
  };
  const isMobile = () => matchMedia('(max-width: 680px)').matches;
  const applySize = (widget) => {
    const id = widget.dataset.widget;
    const size = sizes[id];
    if (!size) return;
    if (isMobile()) {
      widget.style.gridColumn = '1 / -1';
      widget.style.gridRow = `span ${size.height}`;
    } else {
      widget.style.gridColumn = `span ${size.width}`;
      widget.style.gridRow = `span ${size.height}`;
    }
  };

  const handlePointerDown = (event) => {
    const handle = event.target.closest('.widget-resize');
    if (!handle || editButton.getAttribute('aria-pressed') !== 'true') return;
    const widget = handle.closest('.widget');
    if (!widget) return;
    const id = widget.dataset.widget;
    const current = sizes[id] || { ...(defaults[id] || { width: 6, height: 8 }) };
    sizes[id] = { ...current };
    const bounds = container.getBoundingClientRect();
    const style = getComputedStyle(container);
    const gapX = parseFloat(style.columnGap) || 0;
    const gapY = parseFloat(style.rowGap) || 0;
    const columns = isMobile() ? 1 : 12;
    const cellWidth = (container.clientWidth - gapX * (columns - 1)) / columns;
    const cellHeight = (parseFloat(style.gridAutoRows) || 24) + gapY;
    const startWidth = current.width;
    const startHeight = current.height;
    const startX = event.clientX;
    const startY = event.clientY;
    event.preventDefault();
    event.stopPropagation();
    handle.setPointerCapture?.(event.pointerId);

    const move = (pointerEvent) => {
      if (pointerEvent.pointerId !== event.pointerId) return;
      const size = sizes[id];
      size.width = isMobile() ? 1 : Math.min(12, Math.max(3, startWidth + Math.round((pointerEvent.clientX - startX) / (cellWidth + gapX))));
      size.height = Math.min(30, Math.max(4, startHeight + Math.round((pointerEvent.clientY - startY) / cellHeight)));
      applySize(widget);
    };
    const finish = (pointerEvent) => {
      if (pointerEvent.pointerId !== event.pointerId) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      persist();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
  };

  const handleKeyDown = (event) => {
    const handle = event.target.closest('.widget-resize');
    if (!handle || editButton.getAttribute('aria-pressed') !== 'true') return;
    const widget = handle.closest('.widget');
    if (!widget) return;
    const id = widget.dataset.widget;
    const size = sizes[id] || { ...(defaults[id] || { width: 6, height: 8 }) };
    const delta = event.shiftKey ? 2 : 1;
    if (event.key === 'ArrowRight' && !isMobile()) size.width = Math.min(12, size.width + delta);
    else if (event.key === 'ArrowLeft' && !isMobile()) size.width = Math.max(3, size.width - delta);
    else if (event.key === 'ArrowDown') size.height = Math.min(30, size.height + delta);
    else if (event.key === 'ArrowUp') size.height = Math.max(4, size.height - delta);
    else return;
    sizes[id] = size;
    applySize(widget);
    persist();
    event.preventDefault();
  };

  const initialize = (widget) => {
    const id = widget.dataset.widget;
    const initial = defaults[id] || { width: 6, height: 8 };
    if (!sizes[id]) sizes[id] = { ...initial };
    applySize(widget);
    if (widget.querySelector('.widget-resize')) return;
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'widget-resize';
    handle.setAttribute('aria-label', `Agrandir ou réduire ${widget.querySelector('h2')?.textContent || 'ce widget'}`);
    handle.title = 'En mode Personnaliser, tire pour redimensionner. Flèches du clavier pour ajuster.';
    handle.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M17 7v10H7M17 12l-5 5M17 3v1M13 3v1M9 3v1M3 17h1M3 13h1M3 9h1"/></svg>';
    widget.append(handle);
  };

  [...container.querySelectorAll('.widget')].forEach(initialize);
  container.addEventListener('pointerdown', handlePointerDown);
  container.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', () => container.querySelectorAll('.widget').forEach(applySize));
  new MutationObserver(() => container.querySelectorAll('.widget:not([data-resize-ready])').forEach((widget) => {
    widget.dataset.resizeReady = 'true'; initialize(widget);
  })).observe(container, { childList: true });
  container.querySelectorAll('.widget').forEach((widget) => { widget.dataset.resizeReady = 'true'; });
})();
