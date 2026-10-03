// ============================================
// main.js
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
  CV.initWorkspacePinch();   // ✅ Pinch en todo el workspace

  const btnMenu = document.getElementById('btnMenu');
  const sideMenu = document.getElementById('sideMenu');
  const overlay = document.getElementById('overlay');

  btnMenu.onclick = () => {
    sideMenu.classList.toggle('open');
    overlay.classList.toggle('show', sideMenu.classList.contains('open'));
  };

  document.querySelectorAll('.side-menu li').forEach(li => {
    li.onclick = () => { UI.openPanel(li.dataset.panel); sideMenu.classList.remove('open'); };
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
  UI.bindNavBar();

  bindKeyboard();

  // Zoom con Shift + scroll
  const workspace = document.getElementById('workspace');
  workspace.addEventListener('wheel', (e) => {
    if (e.shiftKey) {
      e.preventDefault();
      if (e.deltaY > 0) CV.zoomOut();
      else CV.zoomIn();
    }
  }, { passive: false });

  document.getElementById('cropCancel').onclick = TOOLS.closeCropModal;
  document.getElementById('cropApply').onclick = TOOLS.applyCrop;

  CV.updateCanvasInfo();
  CV.updateObjectInfo();

  HIST.initHistory();

  window.addEventListener('resize', () => { CV.updateDimensionOverlay(); });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      setInterval(() => reg.update(), 30 * 1000);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage('skipWaiting');
            setTimeout(() => location.reload(), 300);
          }
        });
      });
    }).catch(() => {});

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
  let cambios = false;
  CV.canvas.on('object:added', () => cambios = true);
  CV.canvas.on('object:modified', () => cambios = true);
  CV.canvas.on('object:removed', () => cambios = true);
  window.addEventListener('proyecto:guardado', () => cambios = false);
  window.addEventListener('proyecto:cargado', () => cambios = false);

  history.pushState({ page: 'collage' }, '', location.href);
  window.addEventListener('popstate', () => {
    if (cambios) {
      history.pushState({ page: 'collage' }, '', location.href);
      if (confirm('⚠️ Tienes cambios sin guardar.\n¿Guardar antes de salir?')) {
        import('./project.js').then(PROJ => {
          PROJ.saveProject();
          setTimeout(() => { if (confirm('Guardado. ¿Salir?')) history.back(); }, 300);
        });
      } else {
        if (confirm('¿Salir sin guardar?')) history.back();
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
    const o = CV.canvas?.getActiveObject();
    if (o && o.isEditing) return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && o) { e.preventDefault(); CV.deleteActive(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); CV.duplicateActive(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); HIST.undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); HIST.redo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); CV.zoomReset(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); CV.zoomIn(); }
    if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); CV.zoomOut(); }
  });
}