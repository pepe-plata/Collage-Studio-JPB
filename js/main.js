// ============================================
// main.js — Inicialización y orquestación
// ============================================

import * as CV from './canvas.js';
import * as UI from './ui.js';
import * as HIST from './history.js';
import * as TOOLS from './tools.js';

window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Collage Studio JPB');

  CV.initCanvas();

  // Menú lateral
  const btnMenu = document.getElementById('btnMenu');
  const sideMenu = document.getElementById('sideMenu');
  const overlay = document.getElementById('overlay');

  btnMenu.onclick = () => {
    sideMenu.classList.toggle('open');
    if (sideMenu.classList.contains('open')) overlay.classList.add('show');
    else overlay.classList.remove('show');
  };

  // Items del menú
  document.querySelectorAll('.side-menu li').forEach(li => {
    li.onclick = () => {
      UI.openPanel(li.dataset.panel);
      sideMenu.classList.remove('open');
    };
  });

  // Cerrar panel
  document.getElementById('btnCerrarPanel').onclick = UI.closePanel;
  overlay.onclick = () => {
    UI.closePanel();
    sideMenu.classList.remove('open');
    overlay.classList.remove('show');
  };

  // Undo/Redo
  document.getElementById('btnUndo').onclick = HIST.undo;
  document.getElementById('btnRedo').onclick = HIST.redo;

  // Action bar (flotante)
  UI.bindActionBar();
  UI.makeBarDraggable();

  // Atajos de teclado
  bindKeyboard();

  // Zoom
  bindWheelZoom();
  bindPinchZoom();

  // Modal de recorte
  document.getElementById('cropCancel').onclick = TOOLS.closeCropModal;
  document.getElementById('cropApply').onclick = TOOLS.applyCrop;

  CV.updateCanvasInfo();
  CV.updateObjectInfo();

  // Eventos del canvas
  CV.canvas.on('selection:created', CV.updateObjectInfo);
  CV.canvas.on('selection:updated', CV.updateObjectInfo);
  CV.canvas.on('selection:cleared', CV.updateObjectInfo);
  CV.canvas.on('object:modified', CV.updateObjectInfo);
  CV.canvas.on('object:moving', CV.updateDimensionOverlay);
  CV.canvas.on('object:scaling', CV.updateDimensionOverlay);
  CV.canvas.on('object:rotating', CV.updateDimensionOverlay);

  // Historial
  HIST.initHistory();

  // Service Worker
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('✅ SW registrado'))
      .catch(err => console.log('⚠️ SW error:', err));
  }

  console.log('✅ App lista');
});

function bindKeyboard() {
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const activeObj = CV.canvas?.getActiveObject();
    if (activeObj && activeObj.isEditing) return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && CV.canvas?.getActiveObject()) {
      e.preventDefault();
      CV.deleteActive();
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      CV.duplicateActive();
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      HIST.undo();
    }

    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      HIST.redo();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); CV.zoomReset(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); CV.zoomIn(); }
    if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); CV.zoomOut(); }
  });
}

function bindWheelZoom() {
  const wrapper = document.getElementById('workspace');
  if (!wrapper) return;
  wrapper.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) CV.zoomIn(); else CV.zoomOut();
    }
  }, { passive: false });
}

function bindPinchZoom() {
  const el = CV.canvas?.upperCanvasEl;
  if (!el) return;
  let initialDist = 0, initialZoom = 1;

  function getDistance(touches) {
    const [a, b] = touches;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  el.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      initialDist = getDistance(e.touches);
      initialZoom = CV.currentZoom;
    }
  }, { passive: true });

  el.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialDist > 0) {
      e.preventDefault();
      const scale = getDistance(e.touches) / initialDist;
      CV.setZoom(initialZoom * scale);
    }
  }, { passive: false });

  el.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) initialDist = 0;
  }, { passive: true });
}