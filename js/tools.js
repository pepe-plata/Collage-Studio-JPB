// ============================================
// tools.js — Recortar, máscaras, vectores, papel
// ============================================

import { canvas, addImageFromDataURL, PX_PER_CM } from './canvas.js';

// ===== RECORTAR (REDISEÑADO) =====
let cropState = {
  img: null,
  imgW: 0,
  imgH: 0,
  displayScale: 1,
  selection: null,
  fabricCanvas: null,
  displayW: 0,
  displayH: 0
};

export function openCropModal() {
  const obj = canvas.getActiveObject();
  if (!obj || obj.type !== 'image') {
    alert('Selecciona una imagen primero');
    return;
  }

  const modal = document.getElementById('cropModal');
  modal.classList.add('show');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setupCropCanvas(obj);
    });
  });
}

function setupCropCanvas(obj) {
  const cropCanvas = document.getElementById('cropCanvas');
  const wrapper = cropCanvas.parentElement;

  if (cropState.fabricCanvas) {
    cropState.fabricCanvas.dispose();
    cropState.fabricCanvas = null;
  }

  const originalImg = obj._element;
  const imgW = originalImg.naturalWidth || originalImg.width;
  const imgH = originalImg.naturalHeight || originalImg.height;

  const wrapperW = wrapper.clientWidth || 600;
  const wrapperH = wrapper.clientHeight || 400;

  const maxW = Math.min(wrapperW - 20, window.innerWidth * 0.85);
  const maxH = Math.min(window.innerHeight * 0.55, 500);

  const scale = Math.min(maxW / imgW, maxH / imgH, 1);

  const displayW = Math.max(200, Math.round(imgW * scale));
  const displayH = Math.max(200, Math.round(imgH * scale));

  cropCanvas.width = displayW;
  cropCanvas.height = displayH;
  cropCanvas.style.width = displayW + 'px';
  cropCanvas.style.height = displayH + 'px';

  cropState.img = originalImg;
  cropState.imgW = imgW;
  cropState.imgH = imgH;
  cropState.displayScale = scale;
  cropState.displayW = displayW;
  cropState.displayH = displayH;

  // ✅ Fondo blanco, no negro
  const fCanvas = new fabric.Canvas('cropCanvas', {
    backgroundColor: '#ffffff',
    selection: false,
    preserveObjectStacking: true
  });
  cropState.fabricCanvas = fCanvas;

  // ✅ La imagen se dibuja UNA SOLA VEZ
  const bgImg = new fabric.Image(originalImg, {
    left: 0,
    top: 0,
    selectable: false,
    evented: false
  });
  bgImg.scaleToWidth(displayW);
  fCanvas.add(bgImg);

  // ✅ Overlay oscuro (60%) encima de la imagen
  const darkOverlay = new fabric.Rect({
    left: 0,
    top: 0,
    width: displayW,
    height: displayH,
    fill: 'rgba(0,0,0,0.55)',
    selectable: false,
    evented: false,
    excludeFromExport: false
  });
  fCanvas.add(darkOverlay);

  // ✅ Frame de recorte interactivo con "agujero" transparente
  const selW = displayW * 0.7;
  const selH = displayH * 0.7;
  const selLeft = (displayW - selW) / 2;
  const selTop = (displayH - selH) / 2;

  // Rectángulo de selección interactivo (bordes + handles)
  const sel = new fabric.Rect({
    left: selLeft,
    top: selTop,
    width: selW,
    height: selH,
    fill: 'transparent',
    stroke: '#4f46e5',
    strokeWidth: 2,
    strokeDashArray: [6, 4],
    cornerColor: '#4f46e5',
    cornerStrokeColor: '#ffffff',
    cornerSize: 20,
    cornerStyle: 'circle',
    transparentCorners: false,
    borderColor: '#4f46e5',
    borderScaleFactor: 2,
    hasRotatingPoint: false,
    lockRotation: true,
    objectCaching: false
  });
  fCanvas.add(sel);
  fCanvas.setActiveObject(sel);
  fCanvas.renderAll();

  cropState.selection = sel;

  // ✅ Fondo de la selección (una imagen clonada SIN overlay, con clipPath al rect)
  // Esto hace que dentro del frame se vea la imagen "iluminada"
  const clearImg = new fabric.Image(originalImg, {
    left: 0,
    top: 0,
    selectable: false,
    evented: false,
    objectCaching: false
  });
  clearImg.scaleToWidth(displayW);
  fCanvas.add(clearImg);
  fCanvas.sendToBack(clearImg);

  // Reordenar: bgImg (imagen) → darkOverlay → clearImg (recortada) → sel
  fCanvas.remove(bgImg);
  fCanvas.add(bgImg);
  fCanvas.sendToBack(bgImg);

  // Función para actualizar el clipPath del clearImg
  function updateClear() {
    const s = cropState.selection;
    const rectW = s.width * s.scaleX;
    const rectH = s.height * s.scaleY;
    const rectL = s.left;
    const rectT = s.top;

    clearImg.set({
      left: 0,
      top: 0,
      width: displayW,
      height: displayH,
      scaleX: 1,
      scaleY: 1,
      clipPath: new fabric.Rect({
        width: rectW,
        height: rectH,
        left: rectL,
        top: rectT,
        absolutePositioned: true
      })
    });
    clearImg.scaleToWidth(displayW);

    // ✅ Reaplicar clipPath después de escalar
    clearImg.set('clipPath', new fabric.Rect({
      width: rectW,
      height: rectH,
      left: rectL,
      top: rectT,
      absolutePositioned: true
    }));

    const wCm = (rectW / cropState.displayScale) / PX_PER_CM;
    const hCm = (rectH / cropState.displayScale) / PX_PER_CM;
    document.getElementById('cropSize').textContent =
      `Área seleccionada: ${wCm.toFixed(2)} × ${hCm.toFixed(2)} cm`;

    fCanvas.renderAll();
  }

  // ✅ Limitar el frame para que no salga de la imagen
  function limitSelection() {
    const s = cropState.selection;
    const rectW = s.width * s.scaleX;
    const rectH = s.height * s.scaleY;

    // Limitar tamaño máximo
    const maxW = displayW;
    const maxH = displayH;
    const sX = rectW > maxW ? maxW / (s.width) : s.scaleX;
    const sY = rectH > maxH ? maxH / (s.height) : s.scaleY;
    if (sX !== s.scaleX || sY !== s.scaleY) {
      s.set({ scaleX: sX, scaleY: sY });
    }

    const newW = s.width * s.scaleX;
    const newH = s.height * s.scaleY;

    // Limitar posición
    let newLeft = s.left;
    let newTop = s.top;

    if (newLeft < 0) newLeft = 0;
    if (newTop < 0) newTop = 0;
    if (newLeft + newW > displayW) newLeft = displayW - newW;
    if (newTop + newH > displayH) newTop = displayH - newH;

    s.set({ left: newLeft, top: newTop });
    s.setCoords();
  }

  sel.on('moving', () => { limitSelection(); updateClear(); });
  sel.on('scaling', () => { limitSelection(); updateClear(); });
  sel.on('modified', () => { limitSelection(); updateClear(); });
  sel.on('rotating', () => {
    // Bloquear rotación
    sel.set('angle', 0);
    sel.setCoords();
  });

  updateClear();

  // Botones
  document.getElementById('cropCancel').onclick = closeCropModal;
  document.getElementById('cropApply').onclick = applyCrop;
  document.getElementById('cropReset').onclick = () => {
    const s = cropState.selection;
    const selW2 = cropState.displayW * 0.7;
    const selH2 = cropState.displayH * 0.7;
    s.set({
      left: (cropState.displayW - selW2) / 2,
      top: (cropState.displayH - selH2) / 2,
      width: selW2,
      height: selH2,
      scaleX: 1,
      scaleY: 1
    });
    s.setCoords();
    updateClear();
  };
}

export function applyCrop() {
  const obj = canvas.getActiveObject();
  const s = cropState.selection;
  if (!obj || !s) return;

  const rectL = s.left;
  const rectT = s.top;
  const rectW = s.width * s.scaleX;
  const rectH = s.height * s.scaleY;

  const scale = cropState.displayScale;
  const origL = rectL / scale;
  const origT = rectT / scale;
  const origW = rectW / scale;
  const origH = rectH / scale;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = origW;
  tempCanvas.height = origH;
  const ctx = tempCanvas.getContext('2d');
  ctx.drawImage(cropState.img, origL, origT, origW, origH, 0, 0, origW, origH);

  const dataURL = tempCanvas.toDataURL('image/png');
  const pos = { left: obj.left, top: obj.top, angle: obj.angle };

  canvas.remove(obj);

  addImageFromDataURL(dataURL).then(newImg => {
    newImg.set(pos);
    newImg.setCoords();
    canvas.setActiveObject(newImg);
    canvas.renderAll();
  });

  closeCropModal();
}

export function closeCropModal() {
  document.getElementById('cropModal').classList.remove('show');
  if (cropState.fabricCanvas) {
    cropState.fabricCanvas.dispose();
    cropState.fabricCanvas = null;
  }
  cropState.selection = null;
}

// ===== MÁSCARAS =====
export function applyMask(tipo) {
  const obj = canvas.getActiveObject();
  if (!obj || obj.type !== 'image') {
    alert('Selecciona una imagen primero');
    return;
  }

  let clipPath;
  const w = obj.width;
  const h = obj.height;
  const size = Math.min(w, h);

  switch (tipo) {
    case 'circle':
      clipPath = new fabric.Circle({ radius: size / 2, originX: 'center', originY: 'center', left: 0, top: 0 });
      break;
    case 'heart': {
      const path = 'M 50 30 C 50 10, 20 10, 20 30 C 20 50, 50 70, 50 90 C 50 70, 80 50, 80 30 C 80 10, 50 10, 50 30 Z';
      clipPath = new fabric.Path(path, { originX: 'center', originY: 'center', left: 0, top: 0, scaleX: size / 100, scaleY: size / 100 });
      break;
    }
    case 'star': {
      const points = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 50 : 22;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      clipPath = new fabric.Polygon(points, { originX: 'center', originY: 'center', left: 0, top: 0, scaleX: size / 100, scaleY: size / 100 });
      break;
    }
    case 'hexagon': {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 / 6) * i - Math.PI / 2;
        points.push({ x: Math.cos(a) * 50, y: Math.sin(a) * 50 });
      }
      clipPath = new fabric.Polygon(points, { originX: 'center', originY: 'center', left: 0, top: 0, scaleX: size / 100, scaleY: size / 100 });
      break;
    }
    case 'rounded':
      clipPath = new fabric.Rect({ width: w, height: h, rx: 30, ry: 30, originX: 'center', originY: 'center', left: 0, top: 0 });
      break;
    case 'none':
      obj.set('clipPath', null);
      canvas.renderAll();
      return;
    default:
      return;
  }

  clipPath.absolutePositioned = true;
  obj.set('clipPath', clipPath);
  canvas.renderAll();
}

// ===== STICKERS VECTORIALES =====
export function addVectorSticker(tipo) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const base = { left: cx, top: cy, originX: 'center', originY: 'center' };
  let sticker;

  switch (tipo) {
    case 'arrow':
      sticker = new fabric.Path('M 0 20 L 60 20 L 60 0 L 100 30 L 60 60 L 60 40 L 0 40 Z', { ...base, fill: '#4f46e5' });
      break;
    case 'speech':
      sticker = new fabric.Path('M 10 10 L 110 10 Q 120 10 120 20 L 120 70 Q 120 80 110 80 L 60 80 L 40 100 L 40 80 L 20 80 Q 10 80 10 70 L 10 20 Q 10 10 10 10 Z', { ...base, fill: '#ffffff', stroke: '#4f46e5', strokeWidth: 3 });
      break;
    case 'badge': {
      const points = [];
      for (let i = 0; i < 16; i++) {
        const r = i % 2 === 0 ? 70 : 55;
        const a = (Math.PI / 8) * i - Math.PI / 2;
        points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      sticker = new fabric.Polygon(points, { ...base, fill: '#f59e0b' });
      break;
    }
    case 'ribbon':
      sticker = new fabric.Path('M 0 20 L 120 20 L 120 60 L 60 45 L 0 60 Z', { ...base, fill: '#ec4899' });
      break;
    case 'burst': {
      const points = [];
      const spikes = 12;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? 70 : 50;
        const a = (Math.PI / spikes) * i - Math.PI / 2;
        points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      sticker = new fabric.Polygon(points, { ...base, fill: '#facc15' });
      break;
    }
    case 'cloud':
      sticker = new fabric.Path('M 30 60 Q 0 60 0 40 Q 0 20 20 20 Q 25 0 50 0 Q 75 0 80 20 Q 110 20 110 40 Q 110 60 80 60 Z', { ...base, fill: '#93c5fd' });
      break;
    default: return;
  }

  canvas.add(sticker);
  canvas.setActiveObject(sticker);
  canvas.renderAll();
  return sticker;
}

// ===== PAPEL =====
export function addPaperEffect(tipo) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const base = { left: cx, top: cy, originX: 'center', originY: 'center' };
  let effect;

  switch (tipo) {
    case 'tape-h':
      effect = new fabric.Rect({ ...base, width: 140, height: 40, fill: 'rgba(250, 240, 200, 0.75)', stroke: 'rgba(200, 180, 130, 0.5)', strokeWidth: 1 });
      break;
    case 'tape-v':
      effect = new fabric.Rect({ ...base, width: 40, height: 140, fill: 'rgba(250, 240, 200, 0.75)', stroke: 'rgba(200, 180, 130, 0.5)', strokeWidth: 1 });
      break;
    case 'tape-diag':
      effect = new fabric.Rect({ ...base, width: 140, height: 40, fill: 'rgba(250, 240, 200, 0.75)', stroke: 'rgba(200, 180, 130, 0.5)', strokeWidth: 1, angle: -30 });
      break;
    case 'torn-paper':
      effect = new fabric.Path('M 0 0 L 200 0 L 200 20 L 190 25 L 200 30 L 185 40 L 200 50 L 190 60 L 200 70 L 180 80 L 200 90 L 195 100 L 0 100 L 5 90 L 0 80 L 15 70 L 0 60 L 10 50 L 0 40 L 15 30 L 0 20 Z', { ...base, fill: '#fef3c7' });
      break;
    case 'postit': {
      effect = new fabric.Rect({
        ...base,
        width: 150, height: 150,
        fill: '#fef08a',
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.2)', blur: 10, offsetX: 3, offsetY: 3 })
      });
      const text = new fabric.IText('Nota...', {
        left: cx, top: cy,
        originX: 'center', originY: 'center',
        fontSize: 18,
        fill: '#78350f',
        fontFamily: 'Comic Sans MS',
        textAlign: 'center',
        width: 130,
        splitByGrapheme: true
      });
      canvas.add(effect);
      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.renderAll();
      return;
    }
    case 'clip':
      effect = new fabric.Path('M 30 10 L 30 70 Q 30 90 50 90 Q 70 90 70 70 L 70 20 Q 70 0 50 0 Q 30 0 30 20 L 30 60', {
        ...base,
        fill: 'transparent',
        stroke: '#64748b',
        strokeWidth: 6,
        strokeLineCap: 'round'
      });
      break;
    case 'pin': {
      const circle = new fabric.Circle({ radius: 15, fill: '#dc2626', originX: 'center', originY: 'center', left: cx, top: cy });
      const shadow = new fabric.Circle({ radius: 6, fill: 'rgba(0,0,0,0.3)', originX: 'center', originY: 'center', left: cx + 4, top: cy + 4 });
      canvas.add(shadow);
      canvas.add(circle);
      canvas.setActiveObject(circle);
      canvas.renderAll();
      return;
    }
    default: return;
  }

  canvas.add(effect);
  canvas.setActiveObject(effect);
  canvas.renderAll();
  return effect;
}