// ============================================
// canvas.js
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

// Estado interno de interacciones
const S = {
  mode: 'idle', // 'idle' | 'panning' | 'dragging' | 'pinching'
  startX: 0, startY: 0,
  startScrollLeft: 0, startScrollTop: 0,
  dragObj: null, dragStartLeft: 0, dragStartTop: 0,
  pinchStartDist: 0, pinchStartZoom: 1
};

// ===== INIT =====
export function initCanvas() {
  canvas = new fabric.Canvas('c', {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: false,
    interactive: false,        // ✅ CLAVE: desactivar interacción interna
    skipTargetFind: false,
    fireRightClick: false,
    stopContextMenu: true
  });

  initOverlay();
  initEvents();

  setSheetSize('Carta');
  return canvas;
}

// ===== OVERLAY (anclado dentro del objeto, parte inferior) =====
function initOverlay() {
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

  // Tamaño en cm
  const wCm = (obj.width * obj.scaleX) / PX_PER_CM;
  const hCm = (obj.height * obj.scaleY) / PX_PER_CM;
  dimensionOverlay.textContent = `${wCm.toFixed(2)} × ${hCm.toFixed(2)} cm`;
  dimensionOverlay.classList.remove('hidden');

  // ✅ Posicionar en la parte INFERIOR INTERNA del objeto:
  //    - Centro horizontal del objeto
  //    - Borde inferior del objeto menos un pequeño offset (queda "dentro")
  const canvasEl = canvas.upperCanvasEl;
  const canvasRect = canvasEl.getBoundingClientRect();
  const objRect = obj.getBoundingRect(true, true);

  const centerX = canvasRect.left + (objRect.left + objRect.width / 2) * currentZoom;
  const bottomY = canvasRect.top + (objRect.top + objRect.height) * currentZoom - 6; // 6px dentro

  dimensionOverlay.style.left = centerX + 'px';
  dimensionOverlay.style.top = bottomY + 'px';
}

export function hideDimensionOverlay() {
  if (dimensionOverlay) dimensionOverlay.classList.add('hidden');
}

// ===== EVENTOS (Canva-style) =====
function initEvents() {
  const upper = canvas.upperCanvasEl;
  const workspace = document.getElementById('workspace');

  // ===== POINTER DOWN (mouse y touch) =====
  upper.addEventListener('pointerdown', (e) => {
    if (S.mode === 'pinching') return;

    S.startX = e.clientX;
    S.startY = e.clientY;

    const target = findObjectAt(e.clientX, e.clientY);

    if (target) {
      // Hay objeto debajo
      const alreadySelected = canvas.getActiveObject() === target;
      canvas.setActiveObject(target);
      canvas.renderAll();
      updateDimensionOverlay();

      // Si ya estaba seleccionado → arrastrar
      if (alreadySelected) {
        S.mode = 'dragging';
        S.dragObj = target;
        S.dragStartLeft = target.left;
        S.dragStartTop = target.top;
      } else {
        S.mode = 'idle';
      }
    } else {
      // Fondo → paneo
      S.mode = 'panning';
      S.startScrollLeft = workspace.scrollLeft;
      S.startScrollTop = workspace.scrollTop;
      canvas.discardActiveObject();
      canvas.renderAll();
      hideDimensionOverlay();
      upper.style.cursor = 'grabbing';
    }

    upper.setPointerCapture(e.pointerId);
  });

  // ===== POINTER MOVE =====
  upper.addEventListener('pointermove', (e) => {
    if (S.mode === 'panning') {
      const dx = e.clientX - S.startX;
      const dy = e.clientY - S.startY;
      workspace.scrollLeft = S.startScrollLeft - dx;
      workspace.scrollTop = S.startScrollTop - dy;
    } else if (S.mode === 'dragging' && S.dragObj) {
      const dx = (e.clientX - S.startX) / currentZoom;
      const dy = (e.clientY - S.startY) / currentZoom;
      S.dragObj.set({
        left: S.dragStartLeft + dx,
        top: S.dragStartTop + dy
      });
      S.dragObj.setCoords();
      canvas.renderAll();
      updateDimensionOverlay();
    }
  });

  // ===== POINTER UP =====
  upper.addEventListener('pointerup', (e) => {
    if (S.mode === 'dragging' && S.dragObj) {
      canvas.fire('object:modified', { target: S.dragObj });
    }
    S.mode = 'idle';
    S.dragObj = null;
    upper.style.cursor = 'default';
  });

  upper.addEventListener('pointercancel', () => {
    S.mode = 'idle';
    S.dragObj = null;
    upper.style.cursor = 'default';
  });

  // ===== WHEEL con SHIFT (zoom) =====
  workspace.addEventListener('wheel', (e) => {
    if (e.shiftKey) {
      e.preventDefault();
      const rect = workspace.getBoundingClientRect();
      const fx = e.clientX - rect.left;
      const fy = e.clientY - rect.top;
      const newZoom = e.deltaY > 0 ? currentZoom - 0.1 : currentZoom + 0.1;
      zoomAtPoint(newZoom, fx, fy);
    }
  }, { passive: false });

  // ===== PINCH ZOOM =====
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let pinchFocalX = 0;
  let pinchFocalY = 0;

  upper.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      S.mode = 'pinching';
      const [a, b] = e.touches;
      pinchStartDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchStartZoom = currentZoom;
      const rect = workspace.getBoundingClientRect();
      pinchFocalX = (a.clientX + b.clientX) / 2 - rect.left;
      pinchFocalY = (a.clientY + b.clientY) / 2 - rect.top;
    }
  }, { passive: false });

  upper.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && S.mode === 'pinching') {
      e.preventDefault();
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const scale = dist / pinchStartDist;
      const newZoom = Math.max(0.1, Math.min(pinchStartZoom * scale, 5));
      zoomAtPoint(newZoom, pinchFocalX, pinchFocalY);
    }
  }, { passive: false });

  upper.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) S.mode = 'idle';
  });
}

// ✅ Encontrar objeto en coordenadas de pantalla (compensando scroll y zoom)
function findObjectAt(clientX, clientY) {
  const rect = canvas.upperCanvasEl.getBoundingClientRect();
  const x = (clientX - rect.left) / currentZoom;
  const y = (clientY - rect.top) / currentZoom;

  const objects = canvas.getObjects();
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (!obj.selectable) continue;
    if (obj.containsPoint(new fabric.Point(x, y))) return obj;
  }
  return null;
}

// ===== ZOOM =====
function zoomAtPoint(newZoom, focalX, focalY) {
  newZoom = Math.max(0.1, Math.min(newZoom, 5));
  const workspace = document.getElementById('workspace');
  const wrapper = document.getElementById('canvasWrapper');
  if (!workspace || !wrapper) return;

  const oldZoom = currentZoom;
  if (Math.abs(newZoom - oldZoom) < 0.001) return;

  // Ajustar scroll para mantener el punto focal fijo
  const scrollX = workspace.scrollLeft;
  const scrollY = workspace.scrollTop;
  const ratio = newZoom / oldZoom;

  currentZoom = newZoom;
  applyZoomVisual();

  workspace.scrollLeft = (scrollX + focalX) * ratio - focalX;
  workspace.scrollTop = (scrollY + focalY) * ratio - focalY;

  updateCanvasInfo();
  updateDimensionOverlay();
}

export function zoomIn() {
  const ws = document.getElementById('workspace');
  zoomAtPoint(currentZoom * 1.15, ws.clientWidth / 2, ws.clientHeight / 2);
}

export function zoomOut() {
  const ws = document.getElementById('workspace');
  zoomAtPoint(currentZoom / 1.15, ws.clientWidth / 2, ws.clientHeight / 2);
}

export function zoomReset() {
  zoomFitToScreen();
}

export function zoomFitToScreen() {
  const ws = document.getElementById('workspace');
  if (!ws) return;
  const availW = ws.clientWidth - 40;
  const availH = ws.clientHeight - 40;
  const fit = Math.min(availW / canvas.width, availH / canvas.height, 1);
  currentZoom = Math.max(fit, 0.1);
  applyZoomVisual();
  ws.scrollLeft = 0;
  ws.scrollTop = 0;
  updateCanvasInfo();
  updateDimensionOverlay();
}

export function setZoom(z) {
  currentZoom = Math.max(0.1, Math.min(z, 5));
  applyZoomVisual();
}

// ✅ Aplicar zoom visual SOLO al wrapper (con transform, no con zoom CSS)
function applyZoomVisual() {
  const wrapper = document.getElementById('canvasWrapper');
  if (!wrapper) return;
  // NO usar zoom CSS porque rompe el centrado en Android.
  // En su lugar, redimensionar el wrapper con transform scale.
  wrapper.style.transform = `scale(${currentZoom})`;
  wrapper.style.transformOrigin = 'top left';
  // El tamaño del wrapper debe ser el original * zoom para que el scroll funcione
  wrapper.style.width = (canvas.width * currentZoom) + 'px';
  wrapper.style.height = (canvas.height * currentZoom) + 'px';
  // Pero el contenido real es el canvas, así que hay que compensar con margen negativo
  // Solución: usar un contenedor que mantenga el tamaño del canvas original y aplicar scale
  // Mejor: NO usar scale, usar cambio de tamaño de canvas
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

// ===== HANDLES =====
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
  obj.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, mtr: true });
}

// ===== TAMAÑO =====
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
  // Resetear zoom a fit
  currentZoom = 1;
  applyZoomVisual();
  setTimeout(() => zoomFitToScreen(), 50);
  canvas.renderAll();
  updateCanvasInfo();
}

// ===== AGREGAR =====
export function addImageFromDataURL(dataURL, options = {}) {
  return new Promise((resolve) => {
    const imgEl = new Image();
    imgEl.onload = () => {
      const img = new fabric.Image(imgEl, {
        left: options.left ?? canvas.width / 2,
        top: options.top ?? canvas.height / 2,
        originX: 'center', originY: 'center'
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

export function addShape(type, opts = {}) {
  let shape;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const base = { left: cx, top: cy, originX: 'center', originY: 'center', fill: opts.fill ?? '#4f46e5' };

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
  return new fabric.Path('M 50 30 C 50 10, 20 10, 20 30 C 20 50, 50 70, 50 90 C 50 70, 80 50, 80 30 C 80 10, 50 10, 50 30 Z', { ...base, scaleX: 1.5, scaleY: 1.5 });
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
  return new fabric.Path('M 60 10 C 90 10, 110 40, 100 70 C 90 100, 60 110, 30 100 C 0 90, -10 60, 0 30 C 10 0, 30 10, 60 10 Z', base);
}

export function addText(text = 'Doble clic para editar', opts = {}) {
  const t = new fabric.IText(text, {
    left: canvas.width / 2, top: canvas.height / 2,
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
    left: canvas.width / 2, top: canvas.height / 2,
    originX: 'center', originY: 'center', fontSize: 80
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
    colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }]
  });
  const rect = new fabric.Rect({ left: 0, top: 0, width: W, height: H, selectable: false, evented: false, fill: grad });
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

export function newProject() {
  canvas.clear();
  canvas.backgroundColor = '#ffffff';
  canvas.setBackgroundImage(null, () => {});
  currentKey = 'Carta';
  currentSize = { w: 21.59, h: 27.94 };
  const wPx = Math.round(currentSize.w * PX_PER_CM);
  const hPx = Math.round(currentSize.h * PX_PER_CM);
  canvas.setWidth(wPx);
  canvas.setHeight(hPx);
  currentZoom = 1;
  applyZoomVisual();
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
export function bringForward() { const o = canvas.getActiveObject(); if (o) { canvas.bringToFront(o); canvas.renderAll(); } }
export function sendBackward() { const o = canvas.getActiveObject(); if (o) { canvas.sendToBack(o); canvas.renderAll(); } }
export function centerActive() {
  const o = canvas.getActiveObject();
  if (!o) return;
  o.set({ left: canvas.width / 2, top: canvas.height / 2 });
  o.setCoords(); canvas.renderAll(); updateDimensionOverlay();
}
export function rotateActive(deg) {
  const o = canvas.getActiveObject();
  if (!o) return;
  o.rotate((o.angle || 0) + deg);
  canvas.renderAll(); updateDimensionOverlay();
}
export function flipActive(axis) {
  const o = canvas.getActiveObject();
  if (!o) return;
  if (axis === 'h') o.set('flipX', !o.flipX); else o.set('flipY', !o.flipY);
  canvas.renderAll();
}
export function toggleLock() {
  const o = canvas.getActiveObject();
  if (!o) return;
  const locked = !o.selectable;
  o.set({ selectable: !locked, evented: !locked, lockMovementX: locked, lockMovementY: locked, lockRotation: locked, lockScalingX: locked, lockScalingY: locked });
  canvas.discardActiveObject();
  if (!locked) canvas.setActiveObject(o);
  canvas.renderAll(); updateDimensionOverlay();
}

// ===== EFECTOS =====
export function applyBorder(width, color, style = 'solid') {
  const o = canvas.getActiveObject(); if (!o) return;
  if (width === 0 || width === null) o.set({ stroke: null, strokeWidth: 0, strokeDashArray: null });
  else o.set({ stroke: color, strokeWidth: width, strokeDashArray: style === 'dashed' ? [10, 5] : style === 'dotted' ? [2, 4] : null });
  canvas.renderAll();
}
export function applyShadow(type) {
  const o = canvas.getActiveObject(); if (!o) return;
  if (!type || type === 'none') o.set('shadow', null);
  else if (type === 'soft') o.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 20, offsetX: 0, offsetY: 4 }));
  else if (type === 'hard') o.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.7)', blur: 0, offsetX: 6, offsetY: 6 }));
  else if (type === 'glow') o.set('shadow', new fabric.Shadow({ color: '#4f46e5', blur: 30, offsetX: 0, offsetY: 0 }));
  canvas.renderAll();
}
export function setFillColor(color) {
  const o = canvas.getActiveObject(); if (!o) return;
  if (color === null || color === 'transparent' || color === '') {
    if (o.type === 'line') o.set('stroke', 'transparent'); else o.set('fill', 'transparent');
    canvas.renderAll(); return;
  }
  if (o.type === 'line') o.set('stroke', color); else o.set('fill', color);
  canvas.renderAll();
}
export function setOpacity(value) { const o = canvas.getActiveObject(); if (o) { o.set('opacity', value); canvas.renderAll(); } }

export function toggleBold() { const o = canvas.getActiveObject(); if (o) { o.set('fontWeight', o.fontWeight === 'bold' ? 'normal' : 'bold'); canvas.renderAll(); } }
export function toggleItalic() { const o = canvas.getActiveObject(); if (o) { o.set('fontStyle', o.fontStyle === 'italic' ? 'normal' : 'italic'); canvas.renderAll(); } }
export function toggleUnderline() { const o = canvas.getActiveObject(); if (o) { o.set('underline', !o.underline); canvas.renderAll(); } }
export function toggleStrike() { const o = canvas.getActiveObject(); if (o) { o.set('linethrough', !o.linethrough); canvas.renderAll(); } }
export function setFontFamily(f) { const o = canvas.getActiveObject(); if (o) { o.set('fontFamily', f); canvas.renderAll(); } }
export function setFontSize(s) { const o = canvas.getActiveObject(); if (o) { o.set('fontSize', s); canvas.renderAll(); } }

// ===== EXPORT =====
export function exportPNG(multiplier = 2) { return canvas.toDataURL({ format: 'png', quality: 1, multiplier }); }
export function exportJPG(multiplier = 2) { return canvas.toDataURL({ format: 'jpeg', quality: 0.95, multiplier }); }
export async function exportPDF() {
  const { PDFDocument } = await import('https://esm.sh/pdf-lib@1.17.1');
  const png = exportPNG(2);
  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(png);
  const wPt = currentSize.w * 28.3465;
  const hPt = currentSize.h * 28.3465;
  const page = pdfDoc.addPage([wPt, hPt]);
  page.drawImage(pngImage, { x: 0, y: 0, width: wPt, height: hPt });
  return new Blob([await pdfDoc.save()], { type: 'application/pdf' });
}

export function setCustomSize(w, h, unit) {
  let wCm = w, hCm = h;
  if (unit === 'px') { wCm = w / PX_PER_CM; hCm = h / PX_PER_CM; }
  else if (unit === 'in') { wCm = w * 2.54; hCm = h * 2.54; }
  else if (unit === 'mm') { wCm = w / 10; hCm = h / 10; }
  setSheetSize('Personalizado', { w: wCm, h: hCm });
}