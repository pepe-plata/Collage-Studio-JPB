// ============================================
// canvas.js — Canvas, objetos, zoom, fondo
// ============================================

export const SHEET_SIZES = {
  'MediaCarta':   { w: 21.59, h: 13.97, label: 'Media Carta 21.59 × 13.97 cm (8.5" × 5.5")' },
  'Carta':        { w: 21.59, h: 27.94, label: 'Carta (Letter) 21.59 × 27.94 cm (8.5" × 11")' },
  'Oficio':       { w: 21.59, h: 35.56, label: 'Oficio / Legal 21.59 × 35.56 cm (8.5" × 14")' },
  'A4':           { w: 21,    h: 29.7,  label: 'A4 21 × 29.7 cm (8.27" × 11.69")' },
  'DobleCarta':   { w: 43.18, h: 27.94, label: 'Doble Carta 43.18 × 27.94 cm (17" × 11")' },
  'Tabloide':     { w: 27.94, h: 43.18, label: 'Tabloide 27.94 × 43.18 cm (11" × 17")' },
  'FotoInfantil': { w: 2.5,   h: 3.0,   label: 'Foto infantil 2.5 × 3.0 cm' },
  'FotoPostal':   { w: 10.2,  h: 15.2,  label: 'Foto Postal 10.2 × 15.2 cm (4" × 6")' },
  'Foto5x7':      { w: 12.7,  h: 17.8,  label: '12.7 × 17.8 cm (5" × 7")' },
  'Foto6x8':      { w: 15.24, h: 20.32, label: '15.24 × 20.32 cm (6" × 8")' },
  'Foto8x10':     { w: 20.32, h: 25.4,  label: '20.32 × 25.4 cm (8" × 10")' }
};

export const PX_PER_CM = 37.795;

export let canvas = null;
export let currentSize = { w: 21.59, h: 27.94 };
export let currentKey = 'Carta';
export let currentZoom = 1;

let dimensionOverlay = null;

// Estado para las interacciones manuales
let state = {
  isPanning: false,
  isDraggingObject: false,
  isPinching: false,
  pointerDownPos: { x: 0, y: 0 },
  pointerDownTarget: null,
  panStart: { scrollLeft: 0, scrollTop: 0, x: 0, y: 0 },
  dragStart: { left: 0, top: 0, x: 0, y: 0 },
  pinchStart: { distance: 0, zoom: 1, midX: 0, midY: 0, scrollLeft: 0, scrollTop: 0 }
};

// ===== INICIALIZACIÓN =====
export function initCanvas() {
  canvas = new fabric.Canvas('c', {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: false,
    skipTargetFind: false,
    fireRightClick: false,
    stopContextMenu: true,
    // Desactivar interacciones internas de Fabric
    allowTouchScrolling: true,
    // Desactivar el sistema de selección de Fabric
    interactive: false
  });

  // Crear overlay de dimensiones
  initDimensionOverlay();

  // Inicializar interacciones manuales
  initInteractions();

  setSheetSize('Carta');

  return canvas;
}

// ===== OVERLAY =====
function initDimensionOverlay() {
  dimensionOverlay = document.getElementById('dimensionOverlay');
  if (!dimensionOverlay) {
    dimensionOverlay = document.createElement('div');
    dimensionOverlay.id = 'dimensionOverlay';
    dimensionOverlay.className = 'dimension-overlay hidden';
    document.body.appendChild(dimensionOverlay);
  }
}

export function updateDimensionOverlay() {
  if (!dimensionOverlay) return;
  const obj = canvas.getActiveObject();
  if (!obj) {
    dimensionOverlay.classList.add('hidden');
    return;
  }

  const w = (obj.width * obj.scaleX) / PX_PER_CM;
  const h = (obj.height * obj.scaleY) / PX_PER_CM;
  dimensionOverlay.textContent = `${w.toFixed(2)} × ${h.toFixed(2)} cm`;
  dimensionOverlay.classList.remove('hidden');

  const rect = obj.getBoundingRect(true);
  const canvasEl = canvas.upperCanvasEl;
  const canvasRect = canvasEl.getBoundingClientRect();

  const left = canvasRect.left + rect.left + rect.width / 2;
  const top = canvasRect.top + rect.top - 10;

  dimensionOverlay.style.left = left + 'px';
  dimensionOverlay.style.top = top + 'px';
}

export function hideDimensionOverlay() {
  if (dimensionOverlay) dimensionOverlay.classList.add('hidden');
}

// ===== INTERACCIONES MANUALES ESTILO CANVA =====
function initInteractions() {
  const upperCanvas = canvas.upperCanvasEl;
  const workspace = document.getElementById('workspace');

  // --- POINTER DOWN ---
  upperCanvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && e.isPrimary === false) return;

    state.pointerDownPos = { x: e.clientX, y: e.clientY };
    state.pointerDownTarget = canvas.findTarget(e);

    if (state.pointerDownTarget) {
      // Hay un objeto debajo
      const wasSelected = canvas.getActiveObject() === state.pointerDownTarget;
      canvas.setActiveObject(state.pointerDownTarget);
      updateDimensionOverlay();
      canvas.renderAll();

      // Si YA estaba seleccionado, permitir arrastrarlo
      if (wasSelected) {
        state.isDraggingObject = true;
        state.dragStart = {
          left: state.pointerDownTarget.left,
          top: state.pointerDownTarget.top,
          x: e.clientX,
          y: e.clientY
        };
      }
    } else {
      // No hay objeto → iniciar paneo
      state.isPanning = true;
      state.panStart = {
        scrollLeft: workspace.scrollLeft,
        scrollTop: workspace.scrollTop,
        x: e.clientX,
        y: e.clientY
      };
      canvas.discardActiveObject();
      hideDimensionOverlay();
      canvas.renderAll();
      upperCanvas.style.cursor = 'grabbing';
    }

    upperCanvas.setPointerCapture(e.pointerId);
  });

  // --- POINTER MOVE ---
  upperCanvas.addEventListener('pointermove', (e) => {
    if (state.isPanning) {
      const dx = e.clientX - state.panStart.x;
      const dy = e.clientY - state.panStart.y;
      workspace.scrollLeft = state.panStart.scrollLeft - dx;
      workspace.scrollTop = state.panStart.scrollTop - dy;
    } else if (state.isDraggingObject && state.pointerDownTarget) {
      const dx = e.clientX - state.dragStart.x;
      const dy = e.clientY - state.dragStart.y;
      state.pointerDownTarget.set({
        left: state.dragStart.left + dx,
        top: state.dragStart.top + dy
      });
      state.pointerDownTarget.setCoords();
      canvas.renderAll();
      updateDimensionOverlay();
    }
  });

  // --- POINTER UP ---
  upperCanvas.addEventListener('pointerup', (e) => {
    const dx = Math.abs(e.clientX - state.pointerDownPos.x);
    const dy = Math.abs(e.clientY - state.pointerDownPos.y);
    const moved = dx > 5 || dy > 5;

    if (state.isPanning) {
      // Si no se movió → fue un click en el vacío → deseleccionar
      if (!moved) {
        canvas.discardActiveObject();
        hideDimensionOverlay();
        canvas.renderAll();
      }
      state.isPanning = false;
      upperCanvas.style.cursor = 'default';
    } else if (state.isDraggingObject) {
      state.isDraggingObject = false;
      canvas.fire('object:modified', { target: state.pointerDownTarget });
    } else if (state.pointerDownTarget) {
      // Fue un click sobre un objeto sin arrastrar → seleccionarlo
      // Ya está seleccionado, solo confirmar
      updateDimensionOverlay();
    }

    state.pointerDownTarget = null;
  });

  // --- POINTER CANCEL ---
  upperCanvas.addEventListener('pointercancel', () => {
    state.isPanning = false;
    state.isDraggingObject = false;
    state.pointerDownTarget = null;
    upperCanvas.style.cursor = 'default';
  });

  // --- WHEEL ZOOM (Shift + scroll = zoom) ---
  workspace.addEventListener('wheel', (e) => {
    if (e.shiftKey) {
      e.preventDefault();
      // Zoom centrado en la posición del mouse
      const rect = workspace.getBoundingClientRect();
      const focalX = e.clientX - rect.left;
      const focalY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      applyZoomAtPoint(currentZoom + delta, focalX, focalY);
    }
  }, { passive: false });

  // --- PINCH ZOOM (táctil) ---
  initPinchZoom();
}

// ===== PINCH ZOOM con punto focal =====
function initPinchZoom() {
  const el = canvas.upperCanvasEl;
  const workspace = document.getElementById('workspace');

  el.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const [a, b] = e.touches;
      const midX = (a.clientX + b.clientX) / 2;
      const midY = (a.clientY + b.clientY) / 2;
      const rect = workspace.getBoundingClientRect();

      state.isPinching = true;
      state.pinchStart = {
        distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom: currentZoom,
        midX,
        midY,
        scrollLeft: workspace.scrollLeft,
        scrollTop: workspace.scrollTop,
        focalX: midX - rect.left + workspace.scrollLeft,
        focalY: midY - rect.top + workspace.scrollTop
      };
    }
  }, { passive: false });

  el.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && state.isPinching) {
      e.preventDefault();
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const scale = dist / state.pinchStart.distance;
      const newZoom = Math.max(0.1, Math.min(state.pinchStart.zoom * scale, 5));

      applyZoomAtPoint(newZoom, state.pinchStart.midX, state.pinchStart.midY);
    }
  }, { passive: false });

  el.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      state.isPinching = false;
    }
  }, { passive: true });
}

// ===== APLICAR ZOOM =====
function applyZoomAtPoint(newZoom, focalX, focalY) {
  const workspace = document.getElementById('workspace');
  const wrapper = document.getElementById('canvasWrapper');
  if (!wrapper || !workspace) return;

  const oldZoom = currentZoom;
  currentZoom = Math.max(0.1, Math.min(newZoom, 5));

  // Recalcular tamaño del wrapper
  wrapper.style.width = (canvas.width * currentZoom) + 'px';
  wrapper.style.height = (canvas.height * currentZoom) + 'px';

  // Ajustar el canvas interno con zoom CSS
  wrapper.style.zoom = currentZoom;

  // Recalcular scroll para mantener el punto focal
  const ratio = currentZoom / oldZoom;
  const newScrollLeft = (workspace.scrollLeft + focalX) * ratio - focalX;
  const newScrollTop = (workspace.scrollTop + focalY) * ratio - focalY;

  workspace.scrollLeft = newScrollLeft;
  workspace.scrollTop = newScrollTop;

  updateCanvasInfo();
  updateDimensionOverlay();
}

export function zoomIn() {
  const workspace = document.getElementById('workspace');
  const cx = workspace.clientWidth / 2;
  const cy = workspace.clientHeight / 2;
  applyZoomAtPoint(currentZoom * 1.15, cx, cy);
}

export function zoomOut() {
  const workspace = document.getElementById('workspace');
  const cx = workspace.clientWidth / 2;
  const cy = workspace.clientHeight / 2;
  applyZoomAtPoint(currentZoom / 1.15, cx, cy);
}

export function zoomFitToScreen() {
  const workspace = document.getElementById('workspace');
  if (!workspace) return;

  const availableW = workspace.clientWidth - 40;
  const availableH = workspace.clientHeight - 40;

  const fitZoom = Math.min(
    availableW / canvas.width,
    availableH / canvas.height,
    1
  );

  currentZoom = Math.max(fitZoom, 0.1);
  applyZoom();
}

export function zoomReset() {
  zoomFitToScreen();
}

export function setZoom(z) {
  currentZoom = Math.max(0.1, Math.min(z, 5));
  applyZoom();
}

function applyZoom() {
  const wrapper = document.getElementById('canvasWrapper');
  const workspace = document.getElementById('workspace');
  if (!wrapper || !workspace) return;

  wrapper.style.zoom = currentZoom;
  wrapper.style.width = (canvas.width * currentZoom) + 'px';
  wrapper.style.height = (canvas.height * currentZoom) + 'px';

  // Centrar scroll
  workspace.scrollLeft = 0;
  workspace.scrollTop = 0;

  updateCanvasInfo();
  updateDimensionOverlay();
}

export function scrollLeft() {
  const workspace = document.getElementById('workspace');
  if (!workspace) return;
  workspace.scrollBy({ left: -200, behavior: 'smooth' });
}

export function scrollRight() {
  const workspace = document.getElementById('workspace');
  if (!workspace) return;
  workspace.scrollBy({ left: 200, behavior: 'smooth' });
}

// ===== INFO =====
export function updateCanvasInfo() {
  const el = document.querySelector('.app-header h1');
  if (!el) return;
  let label = SHEET_SIZES[currentKey]?.label;
  if (currentKey === 'Personalizado') {
    label = `Personalizado ${currentSize.w.toFixed(1)} × ${currentSize.h.toFixed(1)} cm`;
  }
  el.textContent = `${label} · Zoom ${Math.round(currentZoom * 100)}%`;
}

export function updateObjectInfo() {
  updateDimensionOverlay();
}

// ===== HANDLES ESTILO CANVA =====
function applyCanvaHandles(obj) {
  obj.set({
    cornerColor: '#ffffff',
    cornerStrokeColor: 'rgb(184,184,184)',
    borderColor: '#4f46e5',
    borderScaleFactor: 2,
    transparentCorners: false,
    padding: 3,
    cornerSize: 16
  });

  obj.setControlsVisibility({
    mt: true, mb: true, ml: true, mr: true, mtr: true
  });
}

// ===== TAMAÑO DEL LIENZO =====
export function setSheetSize(key, customSize = null) {
  if (key === 'Personalizado' && customSize) {
    currentKey = 'Personalizado';
    currentSize = { w: customSize.w, h: customSize.h };
  } else {
    const size = SHEET_SIZES[key];
    if (!size) return;
    currentKey = key;
    currentSize = { w: size.w, h: size.h };
  }

  const wPx = Math.round(currentSize.w * PX_PER_CM);
  const hPx = Math.round(currentSize.h * PX_PER_CM);

  canvas.setWidth(wPx);
  canvas.setHeight(hPx);

  setTimeout(() => zoomFitToScreen(), 50);
  canvas.renderAll();
  updateCanvasInfo();
}

// ===== AGREGAR IMAGEN =====
export function addImageFromDataURL(dataURL, options = {}) {
  return new Promise((resolve) => {
    const imgEl = new Image();
    imgEl.onload = () => {
      const img = new fabric.Image(imgEl, {
        left: options.left ?? canvas.width / 2,
        top: options.top ?? canvas.height / 2,
        originX: 'center',
        originY: 'center'
      });

      applyCanvaHandles(img);

      const maxSize = Math.min(canvas.width, canvas.height) * 0.6;
      if (imgEl.width > maxSize || imgEl.height > maxSize) {
        const scale = maxSize / Math.max(imgEl.width, imgEl.height);
        img.scale(scale);
      }

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      updateDimensionOverlay();
      resolve(img);
    };
    imgEl.src = dataURL;
  });
}

// ===== FIGURAS =====
export function addShape(type, opts = {}) {
  let shape;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const base = {
    left: cx, top: cy,
    originX: 'center', originY: 'center',
    fill: opts.fill ?? '#4f46e5'
  };

  switch (type) {
    case 'rect': shape = new fabric.Rect({ ...base, width: 150, height: 100, rx: 8, ry: 8 }); break;
    case 'circle': shape = new fabric.Circle({ ...base, radius: 70 }); break;
    case 'triangle': shape = new fabric.Triangle({ ...base, width: 120, height: 120 }); break;
    case 'line': shape = new fabric.Line([-100, 0, 100, 0], { ...base, stroke: opts.fill ?? '#4f46e5', strokeWidth: 4, fill: undefined }); break;
    case 'heart': shape = makeHeart(base); break;
    case 'star': shape = makeStar(base); break;
    case 'hexagon': shape = makePolygon(base, 6, 70); break;
    case 'blob': shape = makeBlob(base); break;
    default: shape = new fabric.Rect({ ...base, width: 120, height: 120 });
  }

  applyCanvaHandles(shape);
  canvas.add(shape);
  canvas.setActiveObject(shape);
  canvas.renderAll();
  updateDimensionOverlay();
  return shape;
}

function makeHeart(base) {
  const path = 'M 50 30 C 50 10, 20 10, 20 30 C 20 50, 50 70, 50 90 C 50 70, 80 50, 80 30 C 80 10, 50 10, 50 30 Z';
  return new fabric.Path(path, { ...base, scaleX: 1.5, scaleY: 1.5 });
}
function makeStar(base) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 70 : 30;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return new fabric.Polygon(points, base);
}
function makePolygon(base, sides, radius) {
  const points = [];
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 / sides) * i - Math.PI / 2;
    points.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
  }
  return new fabric.Polygon(points, base);
}
function makeBlob(base) {
  const path = 'M 60 10 C 90 10, 110 40, 100 70 C 90 100, 60 110, 30 100 C 0 90, -10 60, 0 30 C 10 0, 30 10, 60 10 Z';
  return new fabric.Path(path, base);
}

// ===== TEXTO =====
export function addText(text = 'Doble clic para editar', opts = {}) {
  const t = new fabric.IText(text, {
    left: canvas.width / 2,
    top: canvas.height / 2,
    originX: 'center', originY: 'center',
    fontFamily: opts.fontFamily ?? 'Arial',
    fontSize: opts.fontSize ?? 32,
    fill: opts.fill ?? '#1e293b',
    fontWeight: opts.fontWeight ?? 'normal',
    fontStyle: opts.fontStyle ?? 'normal',
    underline: opts.underline ?? false,
    linethrough: opts.linethrough ?? false,
    textAlign: 'center'
  });
  applyCanvaHandles(t);
  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.renderAll();
  updateDimensionOverlay();
  return t;
}

export function addEmoji(emoji) {
  const t = new fabric.Text(emoji, {
    left: canvas.width / 2,
    top: canvas.height / 2,
    originX: 'center', originY: 'center',
    fontSize: 80
  });
  applyCanvaHandles(t);
  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.renderAll();
  updateDimensionOverlay();
  return t;
}

// ===== FONDO =====
export function setSolidBackground(color) {
  canvas.setBackgroundImage(null, () => {});
  canvas.backgroundColor = color;
  canvas.renderAll();
}

export function setGradientBackground(c1, c2, tipo = 'linear-vertical') {
  canvas.backgroundColor = '';
  canvas.setBackgroundImage(null, () => {});

  const W = canvas.width, H = canvas.height;
  let coords;

  switch (tipo) {
    case 'linear-horizontal': coords = { x1: 0, y1: 0, x2: W, y2: 0 }; break;
    case 'linear-diagonal': coords = { x1: 0, y1: 0, x2: W, y2: H }; break;
    case 'linear-diagonal-inv': coords = { x1: W, y1: 0, x2: 0, y2: H }; break;
    case 'radial-center': coords = { x1: W/2, y1: H/2, r1: 0, x2: W/2, y2: H/2, r2: Math.max(W, H)/2 }; break;
    case 'radial-top-left': coords = { x1: 0, y1: 0, r1: 0, x2: 0, y2: 0, r2: Math.max(W, H) }; break;
    case 'radial-top-right': coords = { x1: W, y1: 0, r1: 0, x2: W, y2: 0, r2: Math.max(W, H) }; break;
    case 'radial-bottom-left': coords = { x1: 0, y1: H, r1: 0, x2: 0, y2: H, r2: Math.max(W, H) }; break;
    case 'radial-bottom-right': coords = { x1: W, y1: H, r1: 0, x2: W, y2: H, r2: Math.max(W, H) }; break;
    default: coords = { x1: 0, y1: 0, x2: 0, y2: H };
  }

  const isRadial = tipo.startsWith('radial');
  const grad = new fabric.Gradient({
    type: isRadial ? 'radial' : 'linear',
    coords,
    colorStops: [
      { offset: 0, color: c1 },
      { offset: 1, color: c2 }
    ]
  });

  const rect = new fabric.Rect({
    left: 0, top: 0, width: W, height: H,
    selectable: false, evented: false, fill: grad
  });

  canvas.setBackgroundImage(rect, canvas.renderAll.bind(canvas));
}

export function setImageBackground(dataURL) {
  const imgEl = new Image();
  imgEl.onload = () => {
    const img = new fabric.Image(imgEl);
    img.set({ left: 0, top: 0, selectable: false, evented: false });
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    img.scale(scale);
    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
  };
  imgEl.src = dataURL;
}

export function setTransparentBackground() {
  canvas.setBackgroundImage(null, () => {});
  canvas.backgroundColor = '';
  canvas.renderAll();
}

// ===== NUEVO =====
export function newProject() {
  canvas.clear();
  canvas.backgroundColor = '#ffffff';
  canvas.setBackgroundImage(null, () => {});
  currentZoom = 1;
  currentKey = 'Carta';
  currentSize = { w: 21.59, h: 27.94 };

  const wPx = Math.round(currentSize.w * PX_PER_CM);
  const hPx = Math.round(currentSize.h * PX_PER_CM);
  canvas.setWidth(wPx);
  canvas.setHeight(hPx);

  setTimeout(() => zoomFitToScreen(), 50);
  canvas.renderAll();
  updateCanvasInfo();
}

// ===== MANIPULACIÓN =====
export function duplicateActive() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.clone((clon) => {
    clon.set({ left: obj.left + 20, top: obj.top + 20 });
    applyCanvaHandles(clon);
    canvas.add(clon);
    canvas.setActiveObject(clon);
    canvas.renderAll();
    updateDimensionOverlay();
  });
}

export function deleteActive() {
  const objs = canvas.getActiveObjects();
  if (!objs.length) return;
  objs.forEach(o => canvas.remove(o));
  canvas.discardActiveObject();
  hideDimensionOverlay();
  canvas.renderAll();
}

export function bringForward() {
  const obj = canvas.getActiveObject();
  if (obj) { canvas.bringToFront(obj); canvas.renderAll(); }
}
export function sendBackward() {
  const obj = canvas.getActiveObject();
  if (obj) { canvas.sendToBack(obj); canvas.renderAll(); }
}
export function centerActive() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set({ left: canvas.width / 2, top: canvas.height / 2 });
  obj.setCoords();
  canvas.renderAll();
  updateDimensionOverlay();
}
export function rotateActive(deg) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.rotate((obj.angle || 0) + deg);
  canvas.renderAll();
  updateDimensionOverlay();
}
export function flipActive(axis) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  if (axis === 'h') obj.set('flipX', !obj.flipX);
  else obj.set('flipY', !obj.flipY);
  canvas.renderAll();
}
export function toggleLock() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  const locked = !obj.selectable;
  obj.set({
    selectable: !locked, evented: !locked,
    lockMovementX: locked, lockMovementY: locked,
    lockRotation: locked, lockScalingX: locked, lockScalingY: locked
  });
  canvas.discardActiveObject();
  if (!locked) canvas.setActiveObject(obj);
  canvas.renderAll();
  updateDimensionOverlay();
}

// ===== BORDES =====
export function applyBorder(width, color, style = 'solid') {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  if (width === 0 || width === null) {
    obj.set({ stroke: null, strokeWidth: 0, strokeDashArray: null });
  } else {
    obj.set({
      stroke: color,
      strokeWidth: width,
      strokeDashArray: style === 'dashed' ? [10, 5] : style === 'dotted' ? [2, 4] : null
    });
  }
  canvas.renderAll();
}

export function applyShadow(type) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  if (!type || type === 'none') obj.set('shadow', null);
  else if (type === 'soft') obj.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 20, offsetX: 0, offsetY: 4 }));
  else if (type === 'hard') obj.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.7)', blur: 0, offsetX: 6, offsetY: 6 }));
  else if (type === 'glow') obj.set('shadow', new fabric.Shadow({ color: '#4f46e5', blur: 30, offsetX: 0, offsetY: 0 }));
  canvas.renderAll();
}

export function setFillColor(color) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  if (color === null || color === 'transparent' || color === '') {
    if (obj.type === 'line') obj.set('stroke', 'transparent');
    else obj.set('fill', 'transparent');
    canvas.renderAll();
    return;
  }
  if (obj.type === 'line') obj.set('stroke', color);
  else obj.set('fill', color);
  canvas.renderAll();
}

export function setOpacity(value) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('opacity', value);
  canvas.renderAll();
}

export function toggleBold() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
  canvas.renderAll();
}
export function toggleItalic() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
  canvas.renderAll();
}
export function toggleUnderline() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('underline', !obj.underline);
  canvas.renderAll();
}
export function toggleStrike() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('linethrough', !obj.linethrough);
  canvas.renderAll();
}
export function setFontFamily(family) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('fontFamily', family);
  canvas.renderAll();
}
export function setFontSize(size) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('fontSize', size);
  canvas.renderAll();
}

// ===== EXPORTAR =====
export function exportPNG(multiplier = 2) {
  return canvas.toDataURL({ format: 'png', quality: 1, multiplier });
}
export function exportJPG(multiplier = 2) {
  return canvas.toDataURL({ format: 'jpeg', quality: 0.95, multiplier });
}
export async function exportPDF() {
  const { PDFDocument } = await import('https://esm.sh/pdf-lib@1.17.1');
  const png = exportPNG(2);
  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(png);
  const wPt = currentSize.w * 28.3465;
  const hPt = currentSize.h * 28.3465;
  const page = pdfDoc.addPage([wPt, hPt]);
  page.drawImage(pngImage, { x: 0, y: 0, width: wPt, height: hPt });
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export function setCustomSize(w, h, unit) {
  let wCm = w, hCm = h;
  if (unit === 'px') {
    wCm = w / PX_PER_CM;
    hCm = h / PX_PER_CM;
  } else if (unit === 'in') {
    wCm = w * 2.54;
    hCm = h * 2.54;
  } else if (unit === 'mm') {
    wCm = w / 10;
    hCm = h / 10;
  }
  setSheetSize('Personalizado', { w: wCm, h: hCm });
}