// ============================================
// filters.js — Filtros de imagen
// ============================================

import { canvas } from './canvas.js';

// ===== APLICAR FILTRO =====
export function applyFilter(tipo, valor = 1) {
  const obj = canvas.getActiveObject();
  if (!obj || obj.type !== 'image') {
    alert('Selecciona una imagen primero');
    return;
  }

  // Reiniciar filtros si es "ninguno"
  if (tipo === 'none') {
    obj.filters = [];
    obj.applyFilters();
    canvas.renderAll();
    return;
  }

  // Si ya tiene otros filtros, mantenerlos
  const currentFilters = obj.filters || [];
  const newFilters = currentFilters.filter(f => f.tipo !== tipo);

  let filter;
  switch (tipo) {
    case 'grayscale':
      filter = new fabric.Image.filters.Grayscale();
      break;
    case 'sepia':
      filter = new fabric.Image.filters.Sepia();
      break;
    case 'brightness':
      filter = new fabric.Image.filters.Brightness({ brightness: valor - 1 });
      break;
    case 'contrast':
      filter = new fabric.Image.filters.Contrast({ contrast: valor - 1 });
      break;
    case 'saturation':
      filter = new fabric.Image.filters.Saturation({ saturation: valor - 1 });
      break;
    case 'blur':
      filter = new fabric.Image.filters.Blur({ blur: parseFloat(valor) * 0.05 });
      break;
    case 'invert':
      filter = new fabric.Image.filters.Invert();
      break;
    case 'vintage':
      filter = new fabric.Image.filters.Vintage();
      break;
    case 'brownie':
      filter = new fabric.Image.filters.Brownie();
      break;
    case 'kodachrome':
      filter = new fabric.Image.filters.Kodachrome();
      break;
    default:
      return;
  }

  filter.tipo = tipo;
  newFilters.push(filter);

  obj.filters = newFilters;
  obj.applyFilters();
  canvas.renderAll();
}

// ===== REINICIAR FILTROS =====
export function resetFilters() {
  const obj = canvas.getActiveObject();
  if (!obj || obj.type !== 'image') return;
  obj.filters = [];
  obj.applyFilters();
  canvas.renderAll();
}
