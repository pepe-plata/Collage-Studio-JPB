// ============================================
// history.js — Deshacer / Rehacer
// ============================================

import { canvas, updateObjectInfo } from './canvas.js';

let history = [];
let historyIndex = -1;
let isRestoring = false;
const MAX_HISTORY = 50;

export function saveState() {
  if (isRestoring || !canvas) return;
  const json = JSON.stringify(canvas.toJSON(['selectable', 'evented']));
  if (historyIndex >= 0 && history[historyIndex] === json) return;
  history = history.slice(0, historyIndex + 1);
  history.push(json);
  if (history.length > MAX_HISTORY) history.shift();
  historyIndex = history.length - 1;
  updateButtons();
}

export function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  restoreState(history[historyIndex]);
}

export function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  restoreState(history[historyIndex]);
}

function restoreState(json) {
  isRestoring = true;
  canvas.loadFromJSON(json, () => {
    canvas.renderAll();
    isRestoring = false;
    updateObjectInfo();
    updateButtons();
  });
}

export function updateButtons() {
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  if (btnUndo) btnUndo.disabled = historyIndex <= 0;
  if (btnRedo) btnRedo.disabled = historyIndex >= history.length - 1;
}

export function initHistory() {
  canvas.on('object:added', saveState);
  canvas.on('object:modified', saveState);
  canvas.on('object:removed', saveState);
  saveState();
}

export function clearHistory() {
  history = [];
  historyIndex = -1;
  saveState();
}