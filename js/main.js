// ============================================
// main.js — Inicialización
// ============================================

import * as CV from './canvas.js';
import * as UI from './ui.js';
import * as HIST from './history.js';
import * as TOOLS from './tools.js';

window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Collage Studio JPB');

  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hide');
  }, 1500);

  CV.initCanvas();

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

  document.getElementById('btnUndo').onclick = HIST.undo;
  document.getElementById('btnRedo').onclick = HIST.redo;
  document.getElementById('btnExportar').onclick = () => UI.openPanel('exportar');

  UI.bindActionBar();

  bindKeyboard();

  document.getElementById('cropCancel').onclick = TOOLS.closeCropModal;
  document.getElementById('cropApply').onclick = TOOLS.applyCrop;

  CV.updateCanvasInfo();
  CV.updateObjectInfo();

  CV.canvas.on('selection:created', CV.updateObjectInfo);
  CV.canvas.on('selection:updated', CV.updateObjectInfo);
  CV.canvas.on('selection:cleared', CV.updateObjectInfo);
  CV.canvas.on('object:modified', CV.updateObjectInfo);
  CV.canvas.on('object:moving', CV.updateDimensionOverlay);
  CV.canvas.on('object:scaling', CV.updateDimensionOverlay);
  CV.canvas.on('object:rotating', CV.updateDimensionOverlay);

  HIST.initHistory();

  window.addEventListener('resize', () => {
    CV.updateDimensionOverlay();
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      setInterval(() => reg.update(), 30 * 1000);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
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

  setupBackButton();

  console.log('✅ App lista');
});

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