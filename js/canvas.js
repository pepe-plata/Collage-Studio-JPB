// ============================================
// canvas.js — Canvas, objetos, zoom, fondo
// ============================================

export const SHEET_SIZES = {
  'MediaCarta':   { w: 21.59, h: 13.97, label: 'Media Carta 21.59 × 13.97 cm' },
  'Carta':        { w: 21.59, h: 27.94, label: 'Carta (Letter) 21.59 × 27.94 cm' },
  'Oficio':       { w: 21.59, h: 35.56, label: 'Oficio / Legal 21.59 × 35.56 cm' },
  'A4':           { w: 21,    h: 29.7,  label: 'A4 21 × 29.7 cm' },
  'DobleCarta':   { w: 43.18, h: 27.94, label: 'Doble Carta 43.18 × 27.94 cm' },
  'Tabloide':     { w: 27.94, h: 43.18, label: 'Tabloide 27.94 × 43.18 cm' },
  'FotoInfantil': { w: 2.5,   h: 3.0,   label: 'Foto infantil 2.5 × 3.0 cm' },
  'FotoPostal':   { w: 10.2,  h: 15.2,  label: 'Foto Postal 10.2 × 15.2 cm' },
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

// ===== INICIALIZACIÓN =====
export function initCanvas() {
  canvas = new fabric.Canvas('c', {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: true
  });
  setSheetSize('Carta');
  initDimensionOverlay();
  return canvas;
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

// ===== TAMAÑO DEL LIENZO =====
export function setSheetSize(key) {
  const size = SHEET_SIZES[key];
  if (!size) return;

  currentKey = key;
  currentSize = { w: size.w, h: size.h };

  const wPx = Math.round(size.w * PX_PER_CM);
  const hPx = Math.round(size.h * PX_PER_CM);

  canvas.setWidth(wPx);
  canvas.setHeight(hPx);

  // ✅ Ajustar automáticamente al viewport
  zoomFitToScreen();

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

  // Espacio disponible (dejando margen de 20px a cada lado + padding)
  const availableW = workspace.clientWidth - 60;
  const availableH = workspace.clientHeight - 60;

  const fitZoom = Math.min(
    availableW / canvas.width,
    availableH / canvas.height,
    1  // no agrandar más de 100%
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

// ===== APLICAR ZOOM (centrado en ambos ejes) =====
function applyZoom() {
  const wrapper = document.getElementById('canvasWrapper');
  const workspace = document.getElementById('workspace');
  if (!wrapper || !workspace) return;

  // ✅ Usar CSS zoom: afecta al layout y permite centrado + scroll natural
  wrapper.style.zoom = currentZoom;

  // ✅ Ajustar tamaño del wrapper para que las barras de scroll funcionen bien
  const w = canvas.width * currentZoom;
  const h = canvas.height * currentZoom;
  wrapper.style.width = w + 'px';
  wrapper.style.height = h + 'px';

  // ✅ Centrado horizontal con margen auto
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
  const s = SHEET_SIZES[currentKey];
  el.textContent = `${s.label} · Zoom ${Math.round(currentZoom * 100)}%`;
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
        originY: 'center',
        cornerColor: '#4f46e5',
        cornerSize: 18,
        transparentCorners: false,
        borderColor: '#4f46e5',
        borderScaleFactor: 2,
        padding: 5
      });

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
    fill: opts.fill ?? '#4f46e5',
    cornerColor: '#4f46e5',
    cornerSize: 18,
    transparentCorners: false,
    borderColor: '#4f46e5',
    borderScaleFactor: 2,
    padding: 5
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
    textAlign: 'center',
    cornerColor: '#4f46e5',
    cornerSize: 18,
    transparentCorners: false,
    borderColor: '#4f46e5',
    borderScaleFactor: 2,
    padding: 5
  });
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
    fontSize: 80,
    cornerColor: '#4f46e5',
    cornerSize: 18,
    transparentCorners: false,
    borderColor: '#4f46e5',
    borderScaleFactor: 2,
    padding: 5
  });
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

// ===== MANIPULACIÓN =====
export function duplicateActive() {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.clone((clon) => {
    clon.set({ left: obj.left + 20, top: obj.top + 20 });
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

// ===== SOMBRAS =====
export function applyShadow(type) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  if (!type || type === 'none') obj.set('shadow', null);
  else if (type === 'soft') obj.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 20, offsetX: 0, offsetY: 4 }));
  else if (type === 'hard') obj.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.7)', blur: 0, offsetX: 6, offsetY: 6 }));
  else if (type === 'glow') obj.set('shadow', new fabric.Shadow({ color: '#4f46e5', blur: 30, offsetX: 0, offsetY: 0 }));
  canvas.renderAll();
}

// ===== RELLENO =====
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

// ===== OPACIDAD =====
export function setOpacity(value) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set('opacity', value);
  canvas.renderAll();
}

// ===== TEXTO =====
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