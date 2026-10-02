// ============================================
// history.js — Deshacer / Rehacer
// ============================================

import { canvas, updateObjectInfo } from './canvas.js';

let history = [];
let historyIndex = -1;
let isRestoring = false;
const MAX_HISTORY = 50;

// ===== GUARDAR ESTADO =====
export function saveState() {
  if (isRestoring || !canvas) return;

  const json = JSON.stringify(canvas.toJSON(['selectable', 'evented']));

  // Si el estado es igual al último, no guardar
  if (historyIndex >= 0 && history[historyIndex] === json) return;

  // Truncar el futuro si estamos en medio
  history = history.slice(0, historyIndex + 1);
  history.push(json);

  // Limitar tamaño
  if (history.length > MAX_HISTORY) {
    history.shift();
  }

  historyIndex = history.length - 1;
  updateButtons();
}

// ===== DESHACER =====
export function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  restoreState(history[historyIndex]);
}

// ===== REHACER =====
export function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  restoreState(history[historyIndex]);
}

// ===== RESTAURAR =====
function restoreState(json) {
  isRestoring = true;

  canvas.loadFromJSON(json, () => {
    canvas.renderAll();
    isRestoring = false;
    updateObjectInfo();
    updateButtons();
  });
}

// ===== BOTONES =====
export function updateButtons() {
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  if (btnUndo) btnUndo.disabled = historyIndex <= 0;
  if (btnRedo) btnRedo.disabled = historyIndex >= history.length - 1;
}

// ===== INICIALIZAR =====
export function initHistory() {
  canvas.on('object:added', saveState);
  canvas.on('object:modified', saveState);
  canvas.on('object:removed', saveState);

  // Estado inicial
  saveState();
}

// ===== LIMPIAR =====
export function clearHistory() {
  history = [];
  historyIndex = -1;
  saveState();
}