// ============================================
// tools.js — Recortar, máscaras, vectores, papel
// ============================================

import { canvas, addImageFromDataURL } from './canvas.js';

// ===== RECORTAR =====
export function openCropModal() {
  const obj = canvas.getActiveObject();
  if (!obj || obj.type !== 'image') {
    alert('Selecciona una imagen primero');
    return;
  }

  const modal = document.getElementById('cropModal');
  const cropCanvas = document.getElementById('cropCanvas');
  const ctx = cropCanvas.getContext('2d');

  const maxW = Math.min(window.innerWidth * 0.8, 600);
  const maxH = window.innerHeight * 0.5;
  const scale = Math.min(maxW / obj.width, maxH / obj.height, 1);

  cropCanvas.width = obj.width * scale;
  cropCanvas.height = obj.height * scale;
  ctx.drawImage(obj._element, 0, 0, cropCanvas.width, cropCanvas.height);

  modal.classList.add('show');
  modal.dataset.scale = scale;

  if (window._cropFabric) window._cropFabric.dispose();

  const cropFabric = new fabric.Canvas('cropCanvas', { selection: false });
  window._cropFabric = cropFabric;

  const sel = new fabric.Rect({
    left: 50, top: 50,
    width: cropCanvas.width * 0.5,
    height: cropCanvas.height * 0.5,
    fill: 'rgba(79,70,229,0.2)',
    stroke: '#4f46e5',
    strokeWidth: 2,
    strokeDashArray: [5, 5],
    cornerColor: '#4f46e5',
    cornerSize: 14,
    transparentCorners: false,
    hasRotatingPoint: false,
    lockRotation: true
  });

  cropFabric.add(sel);
  cropFabric.setActiveObject(sel);
  cropFabric.renderAll();
}

export function applyCrop() {
  const obj = canvas.getActiveObject();
  const cropFabric = window._cropFabric;
  if (!obj || !cropFabric) return;

  const sel = cropFabric.getObjects()[0];
  const scale = parseFloat(document.getElementById('cropModal').dataset.scale);

  const left = sel.left / scale;
  const top = sel.top / scale;
  const width = (sel.width * sel.scaleX) / scale;
  const height = (sel.height * sel.scaleY) / scale;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctx = tempCanvas.getContext('2d');
  ctx.drawImage(obj._element, left, top, width, height, 0, 0, width, height);

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
  if (window._cropFabric) {
    window._cropFabric.dispose();
    window._cropFabric = null;
  }
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

  const base = {
    left: cx, top: cy,
    originX: 'center', originY: 'center'
  };

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

  const base = {
    left: cx, top: cy,
    originX: 'center', originY: 'center'
  };

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