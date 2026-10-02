// ============================================
// project.js — Guardar / cargar proyecto
// ============================================

import { canvas, currentKey, setSheetSize, updateObjectInfo } from './canvas.js';
import { clearHistory } from './history.js';

const STORAGE_KEY = 'collage-jpb-project';

// ===== GUARDAR =====
export function saveProject() {
  try {
    const data = {
      version: 1,
      fecha: new Date().toISOString(),
      formato: currentKey,
      canvas: canvas.toJSON(['selectable', 'evented', 'clipPath'])
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    alert('✅ Proyecto guardado');
  } catch (e) {
    console.error(e);
    alert('❌ Error al guardar: ' + e.message);
  }
}

// ===== CARGAR =====
export function loadProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      alert('No hay proyecto guardado');
      return;
    }

    const data = JSON.parse(raw);

    // Restaurar formato
    if (data.formato) {
      setSheetSize(data.formato);
    }

    // Restaurar contenido
    canvas.loadFromJSON(data.canvas, () => {
      canvas.renderAll();
      clearHistory();
      updateObjectInfo();
      alert('✅ Proyecto cargado');
    });
  } catch (e) {
    console.error(e);
    alert('❌ Error al cargar: ' + e.message);
  }
}

// ===== ELIMINAR =====
export function deleteProject() {
  if (!confirm('¿Eliminar el proyecto guardado?')) return;
  localStorage.removeItem(STORAGE_KEY);
  alert('🗑️ Proyecto eliminado');
}

// ===== EXPORTAR JSON =====
export function exportProjectFile() {
  const data = {
    version: 1,
    fecha: new Date().toISOString(),
    formato: currentKey,
    canvas: canvas.toJSON(['selectable', 'evented', 'clipPath'])
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'proyecto-collage.json';
  a.click();
}

// ===== IMPORTAR JSON =====
export function importProjectFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.formato) setSheetSize(data.formato);
      canvas.loadFromJSON(data.canvas, () => {
        canvas.renderAll();
        clearHistory();
        updateObjectInfo();
        alert('✅ Proyecto importado');
      });
    } catch (err) {
      alert('❌ Archivo inválido');
    }
  };
  reader.readAsText(file);
}