// ============================================
// main.js — Inicialización y orquestación
// ============================================

import * as CV from './canvas.js';
import * as UI from './ui.js';
import * as HIST from './history.js';
import * as TOOLS from './tools.js';

window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Collage Studio JPB');

  // Splash: ocultar a los 1.5s
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hide');
  }, 1500);

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

  document.querySelectorAll('.side-menu li').forEach(li => {
    li.onclick = () => {
      UI.openPanel(li.dataset.panel);
      sideMenu.classList.remove('open');
    };
  });

  document.getElementById('btnCerrarPanel').onclick = UI.closePanel;
  overlay.onclick = () => {
    UI.closePanel();
    sideMenu.classList.remove('open');
    overlay.classList.remove('show');
  };

  // Undo/Redo
  document.getElementById('btnUndo').onclick = HIST.undo;
  document.getElementById('btnRedo').onclick = HIST.redo;

  // Action bar
  UI.bindActionBar();
  UI.makeBarDraggable();

  // Atajos
  bindKeyboard();
  bindWheelZoom();
  bindPinchZoom();

  // Modal de recorte
  document.getElementById('cropCancel').onclick = TOOLS.closeCropModal;
  document.getElementById('cropApply').onclick = TOOLS.applyCrop;

  CV.updateCanvasInfo();
  CV.updateObjectInfo();

  // Eventos canvas
  CV.canvas.on('selection:created', CV.updateObjectInfo);
  CV.canvas.on('selection:updated', CV.updateObjectInfo);
  CV.canvas.on('selection:cleared', CV.updateObjectInfo);
  CV.canvas.on('object:modified', CV.updateObjectInfo);
  CV.canvas.on('object:moving', CV.updateDimensionOverlay);
  CV.canvas.on('object:scaling', CV.updateDimensionOverlay);
  CV.canvas.on('object:rotating', CV.updateDimensionOverlay);

  HIST.initHistory();

  // Auto-ajustar al redimensionar
  window.addEventListener('resize', () => {
    CV.updateDimensionOverlay();
  });

  // Service Worker con auto-update
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      console.log('✅ SW registrado');
      setInterval(() => reg.update(), 30 * 1000);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 Nueva versión disponible, recargando...');
            newWorker.postMessage('skipWaiting');
            setTimeout(() => location.reload(), 300);
          }
        });
      });
    }).catch(err => console.log('⚠️ SW error:', err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
  }

  // Botón atrás de Android
  setupBackButton();

  console.log('✅ App lista');
});

// ===== BOTÓN ATRÁS =====
function setupBackButton() {
  let hayCambiosSinGuardar = false;

  CV.canvas.on('object:added', () => hayCambiosSinGuardar = true);
  CV.canvas.on('object:modified', () => hayCambiosSinGuardar = true);
  CV.canvas.on('object:removed', () => hayCambiosSinGuardar = true);

  window.addEventListener('proyecto:guardado', () => hayCambiosSinGuardar = false);
  window.addEventListener('proyecto:cargado', () => hayCambiosSinGuardar = false);

  history.pushState({ page: 'collage' }, '', location.href);

  window.addEventListener('popstate', () => {
    if (hayCambiosSinGuardar) {
      history.pushState({ page: 'collage' }, '', location.href);
      const quiere = confirm(
        '⚠️ Tienes cambios sin guardar.\n\n' +
        '¿Quieres guardarlos antes de salir?\n\n' +
        'Aceptar = Guardar\n' +
        'Cancelar = Salir sin guardar'
      );
      if (quiere) {
        import('./project.js').then(PROJ => {
          PROJ.saveProject();
          setTimeout(() => {
            if (confirm('Proyecto guardado. ¿Salir ahora?')) {
              history.back();
            }
          }, 300);
        });
      } else {
        if (confirm('¿Seguro que quieres salir sin guardar?')) {
          history.back();
        }
      }
    } else {
      history.back();
    }
  });
}

// ===== ATAJOS =====
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

// ===== WHEEL ZOOM (centrado en el cursor) =====
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

// ===== PINCH ZOOM (centrado) =====
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