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
export const PX_PER_INCH = 96;
export const PX_PER_MM = 3.7795;

export let canvas = null;
export let currentSize = { w: 21.59, h: 27.94 };
export let currentKey = 'Carta';
export let currentZoom = 1;

// Estado para el paneo y selección estilo Canva
let isPanning = false;
let panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };
let pointerDownPos = { x: 0, y: 0 };
let pointerDownTarget = null;

let dimensionOverlay = null;

// ===== INICIALIZACIÓN =====
export function initCanvas() {
  canvas = new fabric.Canvas('c', {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: false,        // ❌ Desactivamos la selección de rectángulo
    skipTargetFind: false,
    fireRightClick: false,
    stopContextMenu: true
  });

  setSheetSize('Carta');
  initDimensionOverlay();
  initCanvaInteractions();

  return canvas;
}

// ===== CANVA-STYLE INTERACTIONS =====
function initCanvaInteractions() {
  const el = canvas.upperCanvasEl;
  const workspace = document.getElementById('workspace');

  // --- POINTER DOWN ---
  el.addEventListener('pointerdown', (e) => {
    pointerDownPos = { x: e.clientX, y: e.clientY };
    pointerDownTarget = canvas.findTarget(e);

    // Si el target NO es un objeto del canvas (es el fondo), iniciamos paneo
    if (!pointerDownTarget) {
      isPanning = true;
      panStart = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: workspace.scrollLeft,
        scrollTop: workspace.scrollTop
      };
      el.style.cursor = 'grabbing';
      canvas.discardActiveObject();
      canvas.renderAll();
    } else {
      // Hay objeto debajo → seleccionar inmediatamente (visual)
      canvas.setActiveObject(pointerDownTarget);
      canvas.renderAll();
    }
  });

  // --- POINTER MOVE ---
  el.addEventListener('pointermove', (e) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      workspace.scrollLeft = panStart.scrollLeft - dx;
      workspace.scrollTop = panStart.scrollTop - dy;
    }
  });

  // --- POINTER UP ---
  el.addEventListener('pointerup', (e) => {
    const dx = Math.abs(e.clientX - pointerDownPos.x);
    const dy = Math.abs(e.clientY - pointerDownPos.y);

    // Si el paneo estaba activo y no se movió mucho → fue un "click" en el fondo
    if (isPanning) {
      if (dx < 5 && dy < 5) {
        // Fue un click en el fondo → deseleccionar
        canvas.discardActiveObject();
        canvas.renderAll();
      }
      isPanning = false;
      el.style.cursor = 'default';
      return;
    }

    // Si había un objeto debajo y NO nos movimos → dejarlo seleccionado (ya lo está)
    // Si nos movimos, Fabric ya se encargó de moverlo (por el propio drag de Fabric)
    // Si NO había target y no fue paneo → deseleccionar
    if (!pointerDownTarget) {
      canvas.discardActiveObject();
      canvas.renderAll();
    }

    pointerDownTarget = null;
    updateDimensionOverlay();
  });

  // --- POINTER CANCEL ---
  el.addEventListener('pointercancel', () => {
    isPanning = false;
    pointerDownTarget = null;
    el.style.cursor = 'default';
  });

  // --- POINTER LEAVE ---
  el.addEventListener('pointerleave', () => {
    if (isPanning) {
      isPanning = false;
      el.style.cursor = 'default';
    }
  });
}

// ===== OVERLAY DE DIMENSIONES =====
function initDimensionOverlay() {
  dimensionOverlay = document.createElement('div');
  dimensionOverlay.className = 'dimension-overlay hidden';
  document.body.appendChild(dimensionOverlay);
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

  const left = canvasRect.left + (rect.left + rect.width / 2);
  const top = canvasRect.top + (rect.top + rect.height) + 15;

  dimensionOverlay.style.left = left + 'px';
  dimensionOverlay.style.top = top + 'px';
}

export function hideDimensionOverlay() {
  if (dimensionOverlay) dimensionOverlay.classList.add('hidden');
}

// ===== CONFIGURACIÓN DE HANDLES ESTILO CANVA =====
function applyCanvaHandles(obj) {
  // Colores
  const handleFill = '#ffffff';
  const handleBorder = 'rgb(184,184,184)';
  const borderColor = '#4f46e5';

  obj.set({
    cornerColor: handleFill,
    cornerStrokeColor: handleBorder,
    borderColor: borderColor,
    borderScaleFactor: 2,
    transparentCorners: false,
    padding: 3,
    cornerSize: 16
  });

  // Handles de las esquinas → círculos
  ['tl', 'tr', 'bl', 'br'].forEach(corner => {
    obj.setControlVisible(corner, true);
  });

  // Handles laterales → rectángulos
  // Fabric por defecto son cuadrados, pero podemos cambiar el tamaño visual
  obj.setControlsVisibility({
    mt: true,
    mb: true,
    ml: true,
    mr: true,
    mtr: true
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

  // Ajustar al viewport
  setTimeout(() => zoomFitToScreen(), 50);

  canvas.renderAll();
  updateCanvasInfo();
}

// ===== ZOOM =====
export function zoomIn() {
  currentZoom = Math.min(currentZoom * 1.15, 5);
  applyZoom();
}

export function zoomOut() {
  currentZoom = Math.max(currentZoom / 1.15, 0.1);
  applyZoom();
}

export function zoomFitToScreen() {
  const workspace = document.getElementById('workspace');
  if (!workspace) return;

  const availableW = workspace.clientWidth - 60;
  const availableH = workspace.clientHeight - 60;

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

// ===== APLICAR ZOOM =====
function applyZoom() {
  const wrapper = document.getElementById('canvasWrapper');
  const workspace = document.getElementById('workspace');
  if (!wrapper || !workspace) return;

  wrapper.style.zoom = currentZoom;

  const w = canvas.width * currentZoom;
  const h = canvas.height * currentZoom;
  wrapper.style.width = w + 'px';
  wrapper.style.height = h + 'px';

  // Centrado horizontal con margen auto
  wrapper.style.margin = '20px auto';

  updateCanvasInfo();
  updateDimensionOverlay();
}

// ===== SCROLL HORIZONTAL =====
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
      resolve(img);
    };
    imgEl.src = dataURL;
  });
}

// ===== AGREGAR FIGURA =====
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

// ===== NUEVO (reset total) =====
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
  });
}

export function deleteActive() {
  const objs = canvas.getActiveObjects();
  if (!objs.length) return;
  objs.forEach(o => canvas.remove(o));
  canvas.discardActiveObject();
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

// ===== PERSONALIZADO =====
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
  // cm ya es por defecto

  setSheetSize('Personalizado', { w: wCm, h: hCm });
}