// ============================================
// canvas.js
// ============================================

export const SHEET_SIZES = {
  'MediaCarta':       { w: 21.59, h: 13.97, label: 'Media Carta 21.59 × 13.97 cm (8.5" × 5.5")' },
  'Carta':            { w: 21.59, h: 27.94, label: 'Carta (Letter) 21.59 × 27.94 cm (8.5" × 11")' },
  'CartaHorizontal':  { w: 27.94, h: 21.59, label: 'Carta Horizontal 27.94 × 21.59 cm (11" × 8.5")' }, /* ✅ NUEVO */
  'Oficio':           { w: 21.59, h: 35.56, label: 'Oficio / Legal 21.59 × 35.56 cm (8.5" × 14")' },
  'A4':               { w: 21,    h: 29.7,  label: 'A4 21 × 29.7 cm (8.27" × 11.69")' },
  'A4Horizontal':     { w: 29.7,  h: 21,    label: 'A4 Horizontal 29.7 × 21 cm' },
  'DobleCarta':       { w: 43.18, h: 27.94, label: 'Doble Carta 43.18 × 27.94 cm (17" × 11")' },
  'Tabloide':         { w: 27.94, h: 43.18, label: 'Tabloide 27.94 × 43.18 cm (11" × 17")' },
  'FotoInfantil':     { w: 2.5,   h: 3.0,   label: 'Foto infantil 2.5 × 3.0 cm' },
  'FotoPostal':       { w: 10.2,  h: 15.2,  label: 'Foto Postal 10.2 × 15.2 cm (4" × 6")' },
  'Foto5x7':          { w: 12.7,  h: 17.8,  label: '12.7 × 17.8 cm (5" × 7")' },
  'Foto6x8':          { w: 15.24, h: 20.32, label: '15.24 × 20.32 cm (6" × 8")' },
  'Foto8x10':         { w: 20.32, h: 25.4,  label: '20.32 × 25.4 cm (8" × 10")' }
};

export const PX_PER_CM = 37.795;
const SNAP_THRESHOLD = 8;

export let canvas = null;
export let currentSize = { w: 21.59, h: 27.94 };
export let currentKey = 'Carta';
export let currentZoom = 1;
export let marginCm = 0.6;
export let marginPx = marginCm * PX_PER_CM;

let dimensionOverlay = null;
let rulerH = null;
let rulerV = null;
let rulerCorner = null;
let snapLines = { v: null, h: null };
let marginGuide = null;

// ===== INIT =====
export function initCanvas() {
  canvas = new fabric.Canvas('c', {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true
  });

  initOverlay();
  setTimeout(() => {
    initRulers();
    initMarginGuide();
    initSnapLines();
    setSheetSize('Carta');
  }, 100);

  initFabricEvents();
  return canvas;
}

// ===== OVERLAY =====
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
  const wCm = (obj.width * obj.scaleX) / PX_PER_CM;
  const hCm = (obj.height * obj.scaleY) / PX_PER_CM;
  dimensionOverlay.textContent = `${wCm.toFixed(2)} × ${hCm.toFixed(2)} cm`;
  dimensionOverlay.classList.remove('hidden');

  const bound = obj.getBoundingRect(true, true);
  const canvasEl = canvas.upperCanvasEl;
  const canvasRect = canvasEl.getBoundingClientRect();
  const zoom = currentZoom;

  const centerX = canvasRect.left + (bound.left + bound.width / 2) * zoom;
  const bottomY = canvasRect.top + (bound.top + bound.height) * zoom - 12;

  dimensionOverlay.style.left = centerX + 'px';
  dimensionOverlay.style.top = bottomY + 'px';
}

export function hideDimensionOverlay() {
  if (dimensionOverlay) dimensionOverlay.classList.add('hidden');
}

// ===== REGLAS =====
function initRulers() {
  const container = document.querySelector('.canvas-container');
  if (!container) return;

  rulerH = document.createElement('div');
  rulerH.className = 'ruler ruler-h';
  container.appendChild(rulerH);

  rulerV = document.createElement('div');
  rulerV.className = 'ruler ruler-v';
  container.appendChild(rulerV);

  rulerCorner = document.createElement('div');
  rulerCorner.className = 'ruler-corner';
  container.appendChild(rulerCorner);
}

export function updateRulers() {
  if (!rulerH || !rulerV) return;

  const wPx = canvas.width;
  const hPx = canvas.height;
  const pxPerCm = PX_PER_CM;

  rulerH.innerHTML = '';
  rulerV.innerHTML = '';
  rulerH.style.width = wPx + 'px';
  rulerV.style.height = hPx + 'px';

  for (let cm = 0; cm <= currentSize.w + 0.5; cm += 0.5) {
    const x = cm * pxPerCm;
    if (x > wPx + 1) break;
    const isMajor = Math.abs(cm - Math.round(cm)) < 0.01;
    const tick = document.createElement('div');
    tick.className = `ruler-tick ${isMajor ? 'major' : 'minor'}`;
    tick.style.left = x + 'px';
    rulerH.appendChild(tick);
    if (isMajor) {
      const label = document.createElement('div');
      label.className = 'ruler-label';
      label.style.left = x + 'px';
      label.textContent = Math.round(cm);
      rulerH.appendChild(label);
    }
  }

  for (let cm = 0; cm <= currentSize.h + 0.5; cm += 0.5) {
    const y = cm * pxPerCm;
    if (y > hPx + 1) break;
    const isMajor = Math.abs(cm - Math.round(cm)) < 0.01;
    const tick = document.createElement('div');
    tick.className = `ruler-tick ${isMajor ? 'major' : 'minor'}`;
    tick.style.top = y + 'px';
    rulerV.appendChild(tick);
    if (isMajor) {
      const label = document.createElement('div');
      label.className = 'ruler-label';
      label.style.top = y + 'px';
      label.textContent = Math.round(cm);
      rulerV.appendChild(label);
    }
  }
}

// ===== GUÍA DE MARGEN =====
function initMarginGuide() {
  const container = document.querySelector('.canvas-container');
  if (!container) return;
  marginGuide = document.createElement('div');
  marginGuide.className = 'margin-guide';
  marginGuide.style.display = 'none';
  container.appendChild(marginGuide);
}

export function updateMarginGuide() {
  if (!marginGuide) return;
  const m = marginPx;
  marginGuide.style.display = 'block';
  marginGuide.style.left = m + 'px';
  marginGuide.style.top = m + 'px';
  marginGuide.style.width = Math.max(0, canvas.width - 2 * m) + 'px';
  marginGuide.style.height = Math.max(0, canvas.height - 2 * m) + 'px';
}

// ===== SNAP LINES =====
function initSnapLines() {
  const container = document.querySelector('.canvas-container');
  if (!container) return;
  snapLines.v = document.createElement('div');
  snapLines.v.className = 'snap-line vertical';
  snapLines.v.style.display = 'none';
  container.appendChild(snapLines.v);

  snapLines.h = document.createElement('div');
  snapLines.h.className = 'snap-line horizontal';
  snapLines.h.style.display = 'none';
  container.appendChild(snapLines.h);
}

function showSnapLine(axis, positionPx) {
  const line = snapLines[axis];
  if (!line) return;
  line.style.display = 'block';
  line.classList.add('active');
  if (axis === 'v') line.style.left = positionPx + 'px';
  else line.style.top = positionPx + 'px';
}

function hideSnapLines() {
  if (snapLines.v) snapLines.v.classList.remove('active');
  if (snapLines.h) snapLines.h.classList.remove('active');
}

// ===== SNAP MAGNÉTICO =====
function applySnap(obj) {
  const objBound = obj.getBoundingRect(true, true);
  const zoom = currentZoom;
  const threshold = SNAP_THRESHOLD / zoom;

  const objLeft = objBound.left;
  const objRight = objBound.left + objBound.width;
  const objTop = objBound.top;
  const objBottom = objBound.top + objBound.height;
  const objCenterX = objBound.left + objBound.width / 2;
  const objCenterY = objBound.top + objBound.height / 2;

  const refPoints = {
    left: [0, marginPx],
    right: [canvas.width, canvas.width - marginPx],
    centerX: [canvas.width / 2],
    top: [0, marginPx],
    bottom: [canvas.height, canvas.height - marginPx],
    centerY: [canvas.height / 2]
  };

  let snapped = false;

  for (const refX of refPoints.left) {
    if (Math.abs(objLeft - refX) < threshold) {
      obj.set('left', obj.left - (objLeft - refX) / zoom);
      showSnapLine('v', refX);
      snapped = true;
      break;
    }
  }
  if (!snapped) {
    for (const refX of refPoints.right) {
      if (Math.abs(objRight - refX) < threshold) {
        obj.set('left', obj.left - (objRight - refX) / zoom);
        showSnapLine('v', refX);
        snapped = true;
        break;
      }
    }
  }
  if (!snapped) {
    for (const refX of refPoints.centerX) {
      if (Math.abs(objCenterX - refX) < threshold) {
        obj.set('left', obj.left - (objCenterX - refX) / zoom);
        showSnapLine('v', refX);
        snapped = true;
        break;
      }
    }
  }

  snapped = false;
  for (const refY of refPoints.top) {
    if (Math.abs(objTop - refY) < threshold) {
      obj.set('top', obj.top - (objTop - refY) / zoom);
      showSnapLine('h', refY);
      snapped = true;
      break;
    }
  }
  if (!snapped) {
    for (const refY of refPoints.bottom) {
      if (Math.abs(objBottom - refY) < threshold) {
        obj.set('top', obj.top - (objBottom - refY) / zoom);
        showSnapLine('h', refY);
        snapped = true;
        break;
      }
    }
  }
  if (!snapped) {
    for (const refY of refPoints.centerY) {
      if (Math.abs(objCenterY - refY) < threshold) {
        obj.set('top', obj.top - (objCenterY - refY) / zoom);
        showSnapLine('h', refY);
        snapped = true;
        break;
      }
    }
  }

  obj.setCoords();
}

// ===== EVENTOS FABRIC =====
function initFabricEvents() {
  canvas.on('selection:created', updateDimensionOverlay);
  canvas.on('selection:updated', updateDimensionOverlay);
  canvas.on('selection:cleared', hideDimensionOverlay);
  canvas.on('object:moving', (e) => {
    if (e.target) applySnap(e.target);
    updateDimensionOverlay();
  });
  canvas.on('object:scaling', updateDimensionOverlay);
  canvas.on('object:rotating', updateDimensionOverlay);
  canvas.on('object:modified', () => {
    hideSnapLines();
    updateDimensionOverlay();
  });
  canvas.on('mouse:up', hideSnapLines);
}

// ===== MÁRGENES =====
export function setMarginCm(cm) {
  marginCm = Math.max(0, cm);
  marginPx = marginCm * PX_PER_CM;
  updateMarginGuide();
  updateCanvasInfo();
}
export function getMarginCm() { return marginCm; }
export function toggleMarginGuide(show) {
  if (marginGuide) marginGuide.style.display = show ? 'block' : 'none';
}

// ===== ZOOM =====
export function zoomIn() {
  const ws = document.getElementById('workspace');
  zoomAtPoint(currentZoom * 1.15, ws.clientWidth / 2, ws.clientHeight / 2);
}
export function zoomOut() {
  const ws = document.getElementById('workspace');
  zoomAtPoint(currentZoom / 1.15, ws.clientWidth / 2, ws.clientHeight / 2);
}
export function zoomFitToScreen() {
  const ws = document.getElementById('workspace');
  if (!ws) return;
  const availW = ws.clientWidth - 140;
  const availH = ws.clientHeight - 140;
  const fit = Math.min(availW / canvas.width, availH / canvas.height, 1);
  currentZoom = Math.max(fit, 0.1);
  applyZoom();
  requestAnimationFrame(() => {
    ws.scrollLeft = Math.max(0, (canvas.width * currentZoom + 80 - ws.clientWidth) / 2 + 40);
    ws.scrollTop = Math.max(0, (canvas.height * currentZoom + 80 - ws.clientHeight) / 2 + 40);
  });
}
export function zoomReset() { zoomFitToScreen(); }
export function setZoom(z) {
  const ws = document.getElementById('workspace');
  zoomAtPoint(Math.max(0.1, Math.min(z, 5)), ws.clientWidth / 2, ws.clientHeight / 2);
}

function zoomAtPoint(newZoom, focalX, focalY) {
  newZoom = Math.max(0.1, Math.min(newZoom, 5));
  const ws = document.getElementById('workspace');
  if (!ws) return;
  const oldZoom = currentZoom;
  if (Math.abs(newZoom - oldZoom) < 0.001) return;
  const focalCanvasX = (ws.scrollLeft + focalX) / oldZoom;
  const focalCanvasY = (ws.scrollTop + focalY) / oldZoom;
  currentZoom = newZoom;
  applyZoom();
  requestAnimationFrame(() => {
    ws.scrollLeft = focalCanvasX * newZoom - focalX;
    ws.scrollTop = focalCanvasY * newZoom - focalY;
  });
  updateCanvasInfo();
}

function applyZoom() {
  const wrapper = document.getElementById('canvasWrapper');
  if (!wrapper) return;
  const container = wrapper.querySelector('.canvas-container');
  if (!container) return;

  const RULER_SPACE = 40;

  wrapper.style.width = (canvas.width * currentZoom + RULER_SPACE) + 'px';
  wrapper.style.height = (canvas.height * currentZoom + RULER_SPACE) + 'px';
  wrapper.style.margin = '30px auto';

  container.style.transform = `scale(${currentZoom})`;
  container.style.transformOrigin = 'top left';
  container.style.width = canvas.width + 'px';
  container.style.height = canvas.height + 'px';
  container.style.marginLeft = RULER_SPACE + 'px';
  container.style.marginTop = RULER_SPACE + 'px';

  updateCanvasInfo();
  updateRulers();
  updateMarginGuide();
  updateDimensionOverlay();
}

// ===== PAN =====
export function panUp() { document.getElementById('workspace').scrollBy({ top: -150, behavior: 'smooth' }); }
export function panDown() { document.getElementById('workspace').scrollBy({ top: 150, behavior: 'smooth' }); }
export function panLeft() { document.getElementById('workspace').scrollBy({ left: -150, behavior: 'smooth' }); }
export function panRight() { document.getElementById('workspace').scrollBy({ left: 150, behavior: 'smooth' }); }

// ===== INFO =====
export function updateCanvasInfo() {
  const el = document.querySelector('.app-header h1');
  if (!el) return;
  let label = SHEET_SIZES[currentKey]?.label;
  if (currentKey === 'Personalizado') {
    label = `Personalizado ${currentSize.w.toFixed(1)} × ${currentSize.h.toFixed(1)} cm`;
  }
  el.textContent = `${label} · Márgenes ${marginCm} cm · Zoom ${Math.round(currentZoom * 100)}%`;
}
export function updateObjectInfo() { updateDimensionOverlay(); }

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

// ===== TAMAÑO HOJA =====
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
  currentZoom = 1;
  applyZoom();
  updateRulers();
  updateMarginGuide();
  setTimeout(() => zoomFitToScreen(), 50);
  canvas.renderAll();
  updateCanvasInfo();
}

// ===== RESIZE OBJETO =====
export function resizeActiveObject(widthCm, heightCm, keepRatio = false) {
  const obj = canvas.getActiveObject();
  if (!obj) { alert('Selecciona un objeto primero'); return; }

  const currentWidthCm = (obj.width * obj.scaleX) / PX_PER_CM;
  const currentHeightCm = (obj.height * obj.scaleY) / PX_PER_CM;

  let newScaleX = (widthCm * PX_PER_CM) / obj.width;
  let newScaleY = (heightCm * PX_PER_CM) / obj.height;

  if (keepRatio) {
    const ratioW = widthCm / currentWidthCm;
    const ratioH = heightCm / currentHeightCm;
    const ratio = Math.min(ratioW, ratioH);
    newScaleX = obj.scaleX * ratio;
    newScaleY = obj.scaleY * ratio;
  }

  obj.set({ scaleX: newScaleX, scaleY: newScaleY });
  obj.setCoords();
  canvas.renderAll();
  updateDimensionOverlay();
}

export function getActiveObjectSizeCm() {
  const obj = canvas.getActiveObject();
  if (!obj) return null;
  return {
    w: (obj.width * obj.scaleX) / PX_PER_CM,
    h: (obj.height * obj.scaleY) / PX_PER_CM
  };
}

// ===== POSICIÓN Y ALINEACIÓN =====
export function setObjectPosition(xCm, yCm) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  const bound = obj.getBoundingRect(true, true);
  const currentLeftPx = bound.left;
  const currentTopPx = bound.top;
  const targetLeftPx = xCm * PX_PER_CM;
  const targetTopPx = yCm * PX_PER_CM;

  obj.set({
    left: obj.left + (targetLeftPx - currentLeftPx),
    top: obj.top + (targetTopPx - currentTopPx)
  });
  obj.setCoords();
  canvas.renderAll();
  updateDimensionOverlay();
}

export function getObjectPositionCm() {
  const obj = canvas.getActiveObject();
  if (!obj) return null;
  const bound = obj.getBoundingRect(true, true);
  return {
    x: bound.left / PX_PER_CM,
    y: bound.top / PX_PER_CM,
    w: bound.width / PX_PER_CM,
    h: bound.height / PX_PER_CM
  };
}

export function alignActiveObject(tipo, ref = 'sheet') {
  const obj = canvas.getActiveObject();
  if (!obj) { alert('Selecciona un objeto primero'); return; }

  const bound = obj.getBoundingRect(true, true);
  const objW = bound.width;
  const objH = bound.height;
  const objLeft = bound.left;
  const objTop = bound.top;

  const refLeft = ref === 'margin' ? marginPx : 0;
  const refTop = ref === 'margin' ? marginPx : 0;
  const refRight = ref === 'margin' ? canvas.width - marginPx : canvas.width;
  const refBottom = ref === 'margin' ? canvas.height - marginPx : canvas.height;
  const refCenterX = (refLeft + refRight) / 2;
  const refCenterY = (refTop + refBottom) / 2;

  let dx = 0, dy = 0;

  switch (tipo) {
    case 'left':   dx = refLeft - objLeft; break;
    case 'center': dx = refCenterX - (objLeft + objW / 2); break;
    case 'right':  dx = refRight - (objLeft + objW); break;
    case 'top':    dy = refTop - objTop; break;
    case 'middle': dy = refCenterY - (objTop + objH / 2); break;
    case 'bottom': dy = refBottom - (objTop + objH); break;
  }

  obj.set({
    left: obj.left + dx,
    top: obj.top + dy
  });
  obj.setCoords();
  canvas.renderAll();
  updateDimensionOverlay();
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

// ===== NUEVO =====
export function newProject() {
  canvas.clear();
  canvas.backgroundColor = '#ffffff';
  canvas.setBackgroundImage(null, () => {});
  currentKey = 'Carta';
  currentSize = { w: 21.59, h: 27.94 };
  marginCm = 0.6;
  marginPx = marginCm * PX_PER_CM;
  const wPx = Math.round(currentSize.w * PX_PER_CM);
  const hPx = Math.round(currentSize.h * PX_PER_CM);
  canvas.setWidth(wPx);
  canvas.setHeight(hPx);
  currentZoom = 1;
  applyZoom();
  updateRulers();
  updateMarginGuide();
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
export function bringForward() { const o = canvas.getActiveObject(); if (o) { canvas.bringForward(o); canvas.renderAll(); } }
export function sendBackward() { const o = canvas.getActiveObject(); if (o) { canvas.sendBackwards(o); canvas.renderAll(); } }
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

export function setCornerRadius(radius) {
  const o = canvas.getActiveObject();
  if (!o) return;
  radius = Math.max(0, Math.min(radius, 100));

  if (o.type === 'rect') {
    o.set({ rx: radius, ry: radius });
    canvas.renderAll();
    return;
  }

  if (radius === 0) {
    o.set('clipPath', null);
  } else {
    const w = o.width;
    const h = o.height;
    const clipRect = new fabric.Rect({
      width: w,
      height: h,
      rx: radius,
      ry: radius,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0
    });
    o.set('clipPath', clipRect);
  }
  canvas.renderAll();
}

// ===== PEGAR =====
export async function pasteFromClipboard() {
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      alert('Tu navegador no soporta pegar desde el portapapeles. Usa Ctrl+V.');
      return;
    }
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          const reader = new FileReader();
          reader.onload = (ev) => addImageFromDataURL(ev.target.result);
          reader.readAsDataURL(blob);
          return;
        }
      }
    }
    alert('No hay imágenes en el portapapeles');
  } catch (err) {
    console.error(err);
    alert('No se pudo pegar. Verifica los permisos del portapapeles.\n\nTip: puedes usar Ctrl+V sobre el canvas.');
  }
}

export function initPasteShortcut() {
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (ev) => addImageFromDataURL(ev.target.result);
        reader.readAsDataURL(blob);
        e.preventDefault();
        return;
      }
    }
  });
}

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

// ===== PINCH ZOOM & 2-FINGER PAN (estilo Canva) =====
export function initWorkspacePinch() {
  const ws = document.getElementById('workspace');
  if (!ws) return;

  const gesture = {
    active: false,
    mode: null,              // 'zoom' | 'scroll-h' | 'scroll-v'
    startDist: 0,
    startMidX: 0,
    startMidY: 0,
    startZoom: 1,
    startScrollLeft: 0,
    startScrollTop: 0,
    // Punto focal del zoom (fijo durante el gesto)
    focalScreenX: 0,
    focalScreenY: 0,
    focalCanvasX: 0,
    focalCanvasY: 0
  };

  function getDist(touches) {
    const [a, b] = touches;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function getMid(touches) {
    const [a, b] = touches;
    return {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2
    };
  }

  // ===== TOUCHSTART (captura) =====
  ws.addEventListener('touchstart', (e) => {
    // Si ya estamos interceptando, ignorar dedos nuevos
    if (gesture.active) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Activar interceptación SOLO si hay 2+ dedos
    if (e.touches.length >= 2) {
      e.preventDefault();
      e.stopPropagation();

      const dist = getDist(e.touches);
      const mid = getMid(e.touches);
      const rect = ws.getBoundingClientRect();

      gesture.active = true;
      gesture.mode = null;
      gesture.startDist = dist;
      gesture.startMidX = mid.x;
      gesture.startMidY = mid.y;
      gesture.startZoom = currentZoom;
      gesture.startScrollLeft = ws.scrollLeft;
      gesture.startScrollTop = ws.scrollTop;

      // Punto focal del zoom (pantalla)
      gesture.focalScreenX = mid.x - rect.left;
      gesture.focalScreenY = mid.y - rect.top;

      // Punto focal en coordenadas del canvas (sin zoom)
      gesture.focalCanvasX = (ws.scrollLeft + gesture.focalScreenX) / currentZoom;
      gesture.focalCanvasY = (ws.scrollTop + gesture.focalScreenY) / currentZoom;
    }
  }, { capture: true, passive: false });

  // ===== TOUCHMOVE (captura) =====
  ws.addEventListener('touchmove', (e) => {
    if (!gesture.active) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.touches.length < 2) return;

    const dist = getDist(e.touches);
    const mid = getMid(e.touches);
    const dx = mid.x - gesture.startMidX;
    const dy = mid.y - gesture.startMidY;
    const dDist = dist - gesture.startDist;

    // ✅ Decidir el modo la primera vez que hay movimiento significativo
    if (!gesture.mode) {
      const totalMove = Math.hypot(dx, dy);
      const totalPinch = Math.abs(dDist);

      if (totalMove < 10 && totalPinch < 10) return;   // Aún no es significativo

      if (totalPinch > totalMove * 1.2) {
        gesture.mode = 'zoom';
      } else if (Math.abs(dx) > Math.abs(dy) * 1.2) {
        gesture.mode = 'scroll-h';
      } else if (Math.abs(dy) > Math.abs(dx) * 1.2) {
        gesture.mode = 'scroll-v';
      } else {
        return;   // Movimiento ambiguo, esperar más
      }
    }

    // ✅ Aplicar según el modo bloqueado
    if (gesture.mode === 'zoom') {
      const scale = dist / gesture.startDist;
      const newZoom = Math.max(0.1, Math.min(gesture.startZoom * scale, 5));
      applyPinchZoom(
        newZoom,
        gesture.focalScreenX,
        gesture.focalScreenY,
        gesture.focalCanvasX,
        gesture.focalCanvasY
      );
    } else if (gesture.mode === 'scroll-h') {
      ws.scrollLeft = gesture.startScrollLeft - dx;
    } else if (gesture.mode === 'scroll-v') {
      ws.scrollTop = gesture.startScrollTop - dy;
    }
  }, { capture: true, passive: false });

  // ===== TOUCHEND (captura) =====
  ws.addEventListener('touchend', (e) => {
    if (!gesture.active) return;

    // Bloquear el evento SOLO si aún hay dedos del gesto en pantalla
    if (e.touches.length >= 1) {
      e.stopPropagation();
    }

    // Si ya no hay dedos → fin del gesto
    if (e.touches.length === 0) {
      gesture.active = false;
      gesture.mode = null;
    }
  }, { capture: true, passive: false });

  // ===== TOUCHCANCEL =====
  ws.addEventListener('touchcancel', () => {
    gesture.active = false;
    gesture.mode = null;
  }, { capture: true });
}

// ✅ Zoom con punto focal fijo (uso interno de pinch)
function applyPinchZoom(newZoom, focalScreenX, focalScreenY, focalCanvasX, focalCanvasY) {
  const ws = document.getElementById('workspace');
  if (!ws) return;

  currentZoom = Math.max(0.1, Math.min(newZoom, 5));
  applyZoom();

  // Restaurar el punto focal para que no se mueva visualmente
  ws.scrollLeft = focalCanvasX * currentZoom - focalScreenX;
  ws.scrollTop = focalCanvasY * currentZoom - focalScreenY;

  updateCanvasInfo();
}
