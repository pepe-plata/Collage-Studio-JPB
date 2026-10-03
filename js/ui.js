// ============================================
// ui.js
// ============================================

import * as CV from './canvas.js';
import * as TOOLS from './tools.js';
import * as FILTERS from './filters.js';
import * as PROJ from './project.js';

let activePanel = null;

export function openPanel(name) {
  const panel = document.getElementById('panel');
  const title = document.getElementById('panelTitle');
  const content = document.getElementById('panelContent');
  const overlay = document.getElementById('overlay');
  const sideMenu = document.getElementById('sideMenu');

  // ✅ Manejo especial de "Nuevo"
  if (name === 'nuevo') {
    const quiere = confirm(
      '¿Crear nuevo proyecto?\n\n' +
      'Se eliminará todo el contenido actual.\n\n' +
      'Aceptar = Nuevo proyecto\n' +
      'Cancelar = Guardar cambios primero'
    );
    if (quiere) {
      // Nuevo sin guardar
      CV.newProject();
      setTimeout(() => {
        openPanel('formato');
      }, 100);
    } else {
      // Guardar primero
      import('./project.js').then(PROJ => {
        PROJ.saveProject();
        CV.newProject();
        setTimeout(() => {
          openPanel('formato');
        }, 100);
      });
    }
    sideMenu.classList.remove('open');
    overlay.classList.remove('show');
    return;
  }

  activePanel = name;
  title.textContent = getPanelTitle(name);
  content.innerHTML = getPanelContent(name);

  panel.classList.add('open');
  overlay.classList.add('show');
  sideMenu.classList.remove('open');

  bindPanelEvents(name);

  document.querySelectorAll('.side-menu li').forEach(li => {
    li.classList.toggle('active', li.dataset.panel === name);
  });
}

export function closePanel() {
  document.getElementById('panel').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
  document.querySelectorAll('.side-menu li').forEach(li => li.classList.remove('active'));
  activePanel = null;
}

function getPanelTitle(name) {
  return {
    formato: '📐 Seleccionar tamaño de Lienzo',
    fondo: '🖼️ Fondo',
    imagenes: '📷 Insertar Imágenes',
    figuras: '🔷 Figuras geométricas',
    stickers: '⭐ Stickers y emojis',
    vector: '🎨 Stickers vectoriales',
    texto: '📝 Texto',
    efectos: '✨ Efectos',
    filtros: '🎞️ Filtros',
    papel: '📜 Efectos de papel',
    mascaras: '🎭 Máscaras',
    proyecto: '💾 Proyecto',
    exportar: '📤 Exportar',
    ayuda: '🆘 Ayuda'
  }[name] || 'Panel';
}

function getPanelContent(name) {
  switch (name) {
    case 'formato':
      return `
        ${Object.entries(CV.SHEET_SIZES).map(([key, s]) =>
          `<button class="btn ${key === CV.currentKey ? 'success' : 'secondary'}" data-size="${key}">${s.label}</button>`
        ).join('')}
        <button class="btn ${CV.currentKey === 'Personalizado' ? 'success' : 'secondary'}" data-size="Personalizado">📐 Personalizado...</button>
        <div id="customForm" style="display:${CV.currentKey === 'Personalizado' ? 'block' : 'none'}; margin-top:1rem;">
          <div class="form-group">
            <label>Ancho</label>
            <input type="number" id="customW" value="21" step="0.1" min="0.1">
          </div>
          <div class="form-group">
            <label>Alto</label>
            <input type="number" id="customH" value="29.7" step="0.1" min="0.1">
          </div>
          <div class="form-group">
            <label>Unidades</label>
            <select id="customUnit">
              <option value="px">Píxeles (px)</option>
              <option value="in">Pulgadas (in)</option>
              <option value="mm">Milímetros (mm)</option>
              <option value="cm" selected>Centímetros (cm)</option>
            </select>
          </div>
          <button class="btn success" id="btnAplicarCustom">✅ Aplicar tamaño personalizado</button>
        </div>
      `;

    case 'fondo':
      return `
        <div class="form-group">
          <label>Tipo de fondo</label>
          <select id="fondoTipo">
            <option value="transparente">Transparente</option>
            <option value="solido">Color sólido</option>
            <option value="gradiente">Gradiente</option>
            <option value="imagen">Imagen</option>
          </select>
        </div>
        <div id="fondoOpciones"></div>
      `;

    case 'imagenes':
      return `
        <label class="btn">📤 Subir imágenes
          <input type="file" id="inputImagenes" accept="image/*" multiple style="display:none">
        </label>
        <p style="font-size:0.75rem; color:var(--gray); margin-top:0.5rem;">
          Puedes subir varias a la vez.
        </p>
      `;

    case 'figuras':
      return `
        <div class="form-group">
          <label>Color de la figura</label>
          <input type="color" id="figColor" value="#4f46e5">
        </div>
        <div class="grid-btns">
          <button data-fig="rect"><span class="icon">⬛</span>Rectángulo</button>
          <button data-fig="circle"><span class="icon">⚫</span>Círculo</button>
          <button data-fig="triangle"><span class="icon">🔺</span>Triángulo</button>
          <button data-fig="line"><span class="icon">➖</span>Línea</button>
          <button data-fig="heart"><span class="icon">❤️</span>Corazón</button>
          <button data-fig="star"><span class="icon">⭐</span>Estrella</button>
          <button data-fig="hexagon"><span class="icon">⬡</span>Hexágono</button>
          <button data-fig="blob"><span class="icon">🫧</span>Blob</button>
        </div>
      `;

    case 'stickers': {
      const grupos = [
        { titulo: '😊 Caritas', items: ['😀','😃','😄','😁','😊','😍','🥰','😎','🤩','🥳','😇','🤗','😌','🤔','😴','🤤','😜','🤪','🥺','😭','😡','🤯','🥶','🤠'] },
        { titulo: '❤️ Corazones', items: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💕','💞','💓','💗','💖','💘','💝','❣️','💔'] },
        { titulo: '⭐ Estrellas', items: ['⭐','🌟','✨','💫','🌠','⚡','🔥','💥','❇️','✴️','☀️','🌙','🌈'] },
        { titulo: '🌸 Naturaleza', items: ['🌸','🌺','🌻','🌷','🌹','🌼','🍀','🌿','🍃','🌱','🌳','🌴','🌵','🦋','🐝','🐞','🐢','🐬','🐳'] },
        { titulo: '🎀 Fiesta', items: ['🎉','🎊','🎈','🎁','🎀','🎂','🍰','🧁','🍭','🍬','🎪','🎭','🎨','🎬','🎵','🎶'] },
        { titulo: '👑 Decorativos', items: ['👑','💎','🔮','📌','📍','📎','🖇️','✂️','🖊️','🖌️','🎯','🏆','🥇','🎖️','🏅'] },
        { titulo: '💬 Bocadillos', items: ['💬','💭','🗯️','🗨️','❗','❓','‼️','⁉️','💯','✅','❌','🔔','🔕','🔊','📢'] },
        { titulo: '🦄 Animales', items: ['🦄','🐉','🦖','🐙','🦑','🦀','🐠','🐡','🦈','🐊','🦁','🐯','🐻','🐼','🐨','🐵','🐧','🐦','🦉','🦅'] }
      ];
      return grupos.map(g => `
        <div class="form-group">
          <label>${g.titulo}</label>
          <div class="grid-btns">
            ${g.items.map(e => `<button data-emoji="${e}" style="font-size:1.5rem; min-height:auto;">${e}</button>`).join('')}
          </div>
        </div>
      `).join('');
    }

    case 'vector':
      return `
        <div class="grid-btns">
          <button data-vec="arrow"><span class="icon">➡️</span>Flecha</button>
          <button data-vec="speech"><span class="icon">💬</span>Bocadillo</button>
          <button data-vec="badge"><span class="icon">🏅</span>Insignia</button>
          <button data-vec="ribbon"><span class="icon">🎀</span>Cinta</button>
          <button data-vec="burst"><span class="icon">💥</span>Estallido</button>
          <button data-vec="cloud"><span class="icon">☁️</span>Nube</button>
        </div>
      `;

    case 'texto': {
      const fuentes = ['Arial','Georgia','Times New Roman','Courier New','Verdana','Impact','Comic Sans MS','Trebuchet MS','Tahoma','Palatino'];
      return `
        <div class="form-group">
          <label>Tipo de letra</label>
          <select id="txtFuente">
            ${fuentes.map(f => `<option value="${f}" style="font-family:${f}">${f}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Tamaño</label>
          <input type="number" id="txtTamano" value="32" min="8" max="200">
        </div>
        <div class="form-group">
          <label>Color</label>
          <input type="color" id="txtColor" value="#1e293b">
        </div>
        <div class="form-group">
          <label>Estilo</label>
          <div class="toggle-row">
            <button id="txtBold"><b>B</b></button>
            <button id="txtItalic"><i>I</i></button>
            <button id="txtUnderline"><u>U</u></button>
            <button id="txtStrike"><s>S</s></button>
          </div>
        </div>
        <button class="btn" id="btnAddTexto">➕ Añadir texto nuevo</button>
      `;
    }

    case 'efectos':
      return `
        <div class="form-group">
          <label>Color de relleno / principal</label>
          <input type="color" id="fillColor" value="#4f46e5">
          <div class="check-row">
            <input type="checkbox" id="fillTransparente">
            <label for="fillTransparente">Transparente</label>
          </div>
          <button class="btn" id="btnAplicarFill" style="margin-top:0.5rem;">Aplicar relleno</button>
        </div>
        <hr style="margin:1rem 0; border:none; border-top:1px solid var(--border);">
        <div class="form-group">
          <label>Borde</label>
          <div class="check-row">
            <input type="checkbox" id="bordeSin">
            <label for="bordeSin">Sin borde</label>
          </div>
          <div class="row" style="margin-top:0.5rem;">
            <input type="number" id="bordeGrosor" value="4" min="0" max="50">
            <input type="color" id="bordeColor" value="#4f46e5">
          </div>
          <select id="bordeEstilo" style="margin-top:0.4rem;">
            <option value="solid">Sólido</option>
            <option value="dashed">Guiones</option>
            <option value="dotted">Puntos</option>
          </select>
          <button class="btn" id="btnAplicarBorde" style="margin-top:0.5rem;">Aplicar borde</button>
        </div>
        <div class="form-group">
          <label>Sombra</label>
          <select id="sombraTipo">
            <option value="none">Sin sombra</option>
            <option value="soft">Suave</option>
            <option value="hard">Dura</option>
            <option value="glow">Brillo</option>
          </select>
          <button class="btn" id="btnAplicarSombra" style="margin-top:0.5rem;">Aplicar sombra</button>
        </div>
        <div class="form-group">
          <label>Opacidad: <span id="opacidadVal">100</span>%</label>
          <input type="range" id="opacidad" min="0" max="100" value="100">
        </div>
      `;

    case 'filtros':
      return `
        <div class="form-group">
          <label>Filtros rápidos</label>
          <div class="grid-btns">
            <button data-filter="none"><span class="icon">🚫</span>Sin Filtro</button>
            <button data-filter="grayscale"><span class="icon">⬛</span>B&amp;N</button>
            <button data-filter="sepia"><span class="icon">🟤</span>Sepia</button>
            <button data-filter="invert"><span class="icon">🔄</span>Invertir</button>
            <button data-filter="vintage"><span class="icon">📻</span>Vintage</button>
            <button data-filter="brownie"><span class="icon">🍫</span>Brownie</button>
            <button data-filter="kodachrome"><span class="icon">🎞️</span>Kodachrome</button>
          </div>
        </div>
        <div class="form-group">
          <label>Brillo: <span id="brilloVal">100</span>%</label>
          <input type="range" id="filtroBrillo" min="0" max="200" step="1" value="100">
        </div>
        <div class="form-group">
          <label>Contraste: <span id="contrasteVal">100</span>%</label>
          <input type="range" id="filtroContraste" min="0" max="200" step="1" value="100">
        </div>
        <div class="form-group">
          <label>Saturación: <span id="saturacionVal">100</span>%</label>
          <input type="range" id="filtroSaturacion" min="0" max="200" step="1" value="100">
        </div>
        <div class="form-group">
          <label>Desenfoque: <span id="blurVal">0.0</span></label>
          <input type="range" id="filtroBlur" min="0" max="20" step="0.1" value="0">
        </div>
        <button class="btn danger" id="btnResetFiltros">🔄 Quitar todos los filtros</button>
      `;

    case 'papel':
      return `
        <div class="grid-btns">
          <button data-paper="tape-h"><span class="icon">➖</span>Cinta H</button>
          <button data-paper="tape-v"><span class="icon">|</span>Cinta V</button>
          <button data-paper="tape-diag"><span class="icon">╱</span>Cinta Diag</button>
          <button data-paper="torn-paper"><span class="icon">📜</span>Papel rasgado</button>
          <button data-paper="postit"><span class="icon">📝</span>Post-it</button>
          <button data-paper="clip"><span class="icon">📎</span>Clip</button>
          <button data-paper="pin"><span class="icon">📍</span>Chincheta</button>
        </div>
      `;

    case 'mascaras':
      return `
        <p style="font-size:0.8rem; color:var(--gray); margin-bottom:0.8rem;">
          Selecciona una imagen y elige una máscara.
        </p>
        <div class="grid-btns">
          <button data-mask="circle"><span class="icon">⭕</span>Círculo</button>
          <button data-mask="heart"><span class="icon">❤️</span>Corazón</button>
          <button data-mask="star"><span class="icon">⭐</span>Estrella</button>
          <button data-mask="hexagon"><span class="icon">⬡</span>Hexágono</button>
          <button data-mask="rounded"><span class="icon">▢</span>Redondeado</button>
          <button data-mask="none"><span class="icon">🚫</span>Sin máscara</button>
        </div>
      `;

    case 'proyecto':
      return `
        <button class="btn success" id="btnGuardarProyecto">💾 Guardar en navegador</button>
        <button class="btn" id="btnCargarProyecto">📂 Cargar desde navegador</button>
        <button class="btn danger" id="btnEliminarProyecto">🗑️ Eliminar guardado</button>
        <hr style="margin:1rem 0; border:none; border-top:1px solid var(--border);">
        <button class="btn" id="btnExportarJSON">📤 Exportar archivo .json</button>
        <label class="btn secondary">📥 Importar archivo .json
          <input type="file" id="inputProyecto" accept=".json" style="display:none">
        </label>
      `;

    case 'exportar':
      return `
        <button class="btn success" id="btnExportPNG">💾 Descargar PNG</button>
        <button class="btn" id="btnExportJPG">📷 Descargar JPG</button>
        <button class="btn" id="btnExportPDF">📄 Descargar PDF</button>
        <button class="btn secondary" id="btnCompartir">📤 Compartir</button>
      `;

    case 'ayuda':
      return `<div id="ayudaContenido" style="font-size:0.85rem; line-height:1.6;"><p>Cargando ayuda...</p></div>`;

    default:
      return '';
  }
}

function bindPanelEvents(name) {
  const content = document.getElementById('panelContent');

  if (name === 'formato') {
    content.querySelectorAll('[data-size]').forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.size === 'Personalizado') {
          document.getElementById('customForm').style.display = 'block';
          content.querySelectorAll('[data-size]').forEach(b => b.classList.remove('success'));
          btn.classList.add('success');
        } else {
          CV.setSheetSize(btn.dataset.size);
          openPanel('formato');
        }
      };
    });
    const btnCustom = document.getElementById('btnAplicarCustom');
    if (btnCustom) {
      btnCustom.onclick = () => {
        const w = parseFloat(document.getElementById('customW').value) || 21;
        const h = parseFloat(document.getElementById('customH').value) || 29.7;
        const unit = document.getElementById('customUnit').value;
        CV.setCustomSize(w, h, unit);
        closePanel();
      };
    }
  }

  if (name === 'fondo') {
    const tipo = document.getElementById('fondoTipo');
    const opciones = document.getElementById('fondoOpciones');
    const render = () => {
      const t = tipo.value;
      if (t === 'transparente') {
        opciones.innerHTML = '';
        CV.setTransparentBackground();
      } else if (t === 'solido') {
        opciones.innerHTML = `<div class="form-group"><label>Color</label><input type="color" id="fondoColor" value="#ffffff"></div>`;
        document.getElementById('fondoColor').oninput = (e) => CV.setSolidBackground(e.target.value);
      } else if (t === 'gradiente') {
        opciones.innerHTML = `
          <div class="form-group">
            <label>Tipo de gradiente</label>
            <select id="gradTipo">
              <option value="linear-vertical">Lineal vertical ↓</option>
              <option value="linear-horizontal">Lineal horizontal →</option>
              <option value="linear-diagonal">Lineal diagonal ↘</option>
              <option value="linear-diagonal-inv">Lineal diagonal ↙</option>
              <option value="radial-center">Radial desde el centro</option>
              <option value="radial-top-left">Radial desde arriba-izq</option>
              <option value="radial-top-right">Radial desde arriba-der</option>
              <option value="radial-bottom-left">Radial desde abajo-izq</option>
              <option value="radial-bottom-right">Radial desde abajo-der</option>
            </select>
          </div>
          <div class="form-group"><label>Color 1</label><input type="color" id="gradC1" value="#4f46e5"></div>
          <div class="form-group"><label>Color 2</label><input type="color" id="gradC2" value="#ec4899"></div>`;
        const update = () => {
          CV.setGradientBackground(
            document.getElementById('gradC1').value,
            document.getElementById('gradC2').value,
            document.getElementById('gradTipo').value
          );
        };
        document.getElementById('gradTipo').onchange = update;
        document.getElementById('gradC1').oninput = update;
        document.getElementById('gradC2').oninput = update;
        update();
      } else if (t === 'imagen') {
        opciones.innerHTML = `<label class="btn">📤 Elegir imagen<input type="file" id="fondoFile" accept="image/*" style="display:none"></label>`;
        document.getElementById('fondoFile').onchange = (e) => {
          const f = e.target.files[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = (ev) => CV.setImageBackground(ev.target.result);
          r.readAsDataURL(f);
        };
      }
    };
    tipo.onchange = render;
    render();
  }

  if (name === 'imagenes') {
    document.getElementById('inputImagenes').onchange = (e) => {
      const files = Array.from(e.target.files);
      files.forEach((file, i) => {
        const r = new FileReader();
        r.onload = (ev) => CV.addImageFromDataURL(ev.target.result, {
          left: 100 + i * 40,
          top: 100 + i * 40
        });
        r.readAsDataURL(file);
      });
      e.target.value = '';
      closePanel();
    };
  }

  if (name === 'figuras') {
    content.querySelectorAll('[data-fig]').forEach(btn => {
      btn.onclick = () => CV.addShape(btn.dataset.fig, { fill: document.getElementById('figColor').value });
    });
  }

  if (name === 'stickers') {
    content.querySelectorAll('[data-emoji]').forEach(btn => {
      btn.onclick = () => CV.addEmoji(btn.dataset.emoji);
    });
  }

  if (name === 'vector') {
    content.querySelectorAll('[data-vec]').forEach(btn => {
      btn.onclick = () => TOOLS.addVectorSticker(btn.dataset.vec);
    });
  }

  if (name === 'texto') {
    const fuente = document.getElementById('txtFuente');
    const tamano = document.getElementById('txtTamano');
    const color = document.getElementById('txtColor');
    fuente.onchange = () => CV.setFontFamily(fuente.value);
    tamano.onchange = () => CV.setFontSize(parseInt(tamano.value));
    color.oninput = () => CV.setFillColor(color.value);
    document.getElementById('txtBold').onclick = CV.toggleBold;
    document.getElementById('txtItalic').onclick = CV.toggleItalic;
    document.getElementById('txtUnderline').onclick = CV.toggleUnderline;
    document.getElementById('txtStrike').onclick = CV.toggleStrike;
    document.getElementById('btnAddTexto').onclick = () => CV.addText('Doble clic para editar', {
      fontFamily: fuente.value,
      fontSize: parseInt(tamano.value),
      fill: color.value
    });
  }

  if (name === 'efectos') {
    document.getElementById('fillTransparente').onchange = (e) => {
      document.getElementById('fillColor').disabled = e.target.checked;
    };
    document.getElementById('bordeSin').onchange = (e) => {
      document.getElementById('bordeGrosor').disabled = e.target.checked;
      document.getElementById('bordeColor').disabled = e.target.checked;
      document.getElementById('bordeEstilo').disabled = e.target.checked;
    };
    document.getElementById('btnAplicarFill').onclick = () => {
      if (document.getElementById('fillTransparente').checked) CV.setFillColor('transparent');
      else CV.setFillColor(document.getElementById('fillColor').value);
    };
    document.getElementById('btnAplicarBorde').onclick = () => {
      if (document.getElementById('bordeSin').checked) CV.applyBorder(0);
      else CV.applyBorder(
        parseInt(document.getElementById('bordeGrosor').value),
        document.getElementById('bordeColor').value,
        document.getElementById('bordeEstilo').value
      );
    };
    document.getElementById('btnAplicarSombra').onclick = () => CV.applyShadow(document.getElementById('sombraTipo').value);
    document.getElementById('opacidad').oninput = (e) => {
      document.getElementById('opacidadVal').textContent = e.target.value;
      CV.setOpacity(e.target.value / 100);
    };
  }

  if (name === 'filtros') {
    content.querySelectorAll('[data-filter]').forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.filter === 'none') FILTERS.resetFilters();
        else FILTERS.applyFilter(btn.dataset.filter);
      };
    });
    document.getElementById('filtroBrillo').oninput = (e) => {
      document.getElementById('brilloVal').textContent = e.target.value;
      FILTERS.applyFilter('brightness', e.target.value / 100);
    };
    document.getElementById('filtroContraste').oninput = (e) => {
      document.getElementById('contrasteVal').textContent = e.target.value;
      FILTERS.applyFilter('contrast', e.target.value / 100);
    };
    document.getElementById('filtroSaturacion').oninput = (e) => {
      document.getElementById('saturacionVal').textContent = e.target.value;
      FILTERS.applyFilter('saturation', e.target.value / 100);
    };
    document.getElementById('filtroBlur').oninput = (e) => {
      document.getElementById('blurVal').textContent = parseFloat(e.target.value).toFixed(1);
      FILTERS.applyFilter('blur', e.target.value);
    };
    document.getElementById('btnResetFiltros').onclick = FILTERS.resetFilters;
  }

  if (name === 'papel') {
    content.querySelectorAll('[data-paper]').forEach(btn => {
      btn.onclick = () => TOOLS.addPaperEffect(btn.dataset.paper);
    });
  }

  if (name === 'mascaras') {
    content.querySelectorAll('[data-mask]').forEach(btn => {
      btn.onclick = () => TOOLS.applyMask(btn.dataset.mask);
    });
  }

  if (name === 'proyecto') {
    document.getElementById('btnGuardarProyecto').onclick = PROJ.saveProject;
    document.getElementById('btnCargarProyecto').onclick = PROJ.loadProject;
    document.getElementById('btnEliminarProyecto').onclick = PROJ.deleteProject;
    document.getElementById('btnExportarJSON').onclick = PROJ.exportProjectFile;
    document.getElementById('inputProyecto').onchange = (e) => {
      const f = e.target.files[0];
      if (f) PROJ.importProjectFile(f);
    };
  }

  if (name === 'exportar') {
    document.getElementById('btnExportPNG').onclick = () => download(CV.exportPNG(), 'collage.png');
    document.getElementById('btnExportJPG').onclick = () => download(CV.exportJPG(), 'collage.jpg');
    document.getElementById('btnExportPDF').onclick = async () => {
      const blob = await CV.exportPDF();
      download(URL.createObjectURL(blob), 'collage.pdf');
    };
    document.getElementById('btnCompartir').onclick = async () => {
      const dataURL = CV.exportPNG();
      const res = await fetch(dataURL);
      const blob = await res.blob();
      const file = new File([blob], 'collage.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mi collage' });
      } else {
        alert('Tu navegador no soporta compartir archivos');
      }
    };
  }

  if (name === 'ayuda') {
    fetch('./README.md')
      .then(r => r.text())
      .then(md => {
        document.getElementById('ayudaContenido').innerHTML = renderMarkdown(md);
      })
      .catch(() => {
        document.getElementById('ayudaContenido').innerHTML = '<p>No se pudo cargar la ayuda.</p>';
      });
  }
}

function renderMarkdown(md) {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/```([\s\S]*?)```/g, (m, code) =>
    `<pre style="background:#f1f5f9; padding:0.6rem; border-radius:6px; overflow:auto; font-size:0.75rem;"><code>${code.trim()}</code></pre>`
  );
  html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2 style="margin:1rem 0 0.5rem;">$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1 style="margin:1rem 0 0.5rem; font-size:1.1rem;">$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code style="background:#f1f5f9; padding:0.1rem 0.3rem; border-radius:4px;">$1</code>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:var(--primary);">$1</a>');
  html = html.replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul style="margin:0.5rem 0 0.5rem 1rem;">${m}</ul>`);
  html = html.replace(/\[ \] (.+)/g, '☐ $1');
  html = html.replace(/\[x\] (.+)/gi, '☑ $1');
  html = html.replace(/\n\n/g, '</p><p style="margin:0.5rem 0;">');
  html = html.replace(/\n/g, '<br>');
  return `<p style="margin:0.5rem 0;">${html}</p>`;
}

function download(dataURL, filename) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  a.click();
}

// ===== BARRA FLOTANTE INFERIOR =====
export function bindActionBar() {
  document.querySelectorAll('.floating-bar-actions button').forEach(btn => {
    btn.onclick = () => {
      const a = btn.dataset.action;
      if (a === 'duplicar') CV.duplicateActive();
      if (a === 'borrar') CV.deleteActive();
      if (a === 'frente') CV.bringForward();
      if (a === 'atras') CV.sendBackward();
      if (a === 'rotar-izq') CV.rotateActive(-90);
      if (a === 'rotar-der') CV.rotateActive(90);
      if (a === 'voltear-h') CV.flipActive('h');
      if (a === 'voltear-v') CV.flipActive('v');
      if (a === 'recortar') TOOLS.openCropModal();
    };
  });
}

// ===== NAV BAR (superior derecha) =====
export function bindNavBar() {
  document.querySelectorAll('.nav-bar button').forEach(btn => {
    btn.onclick = () => {
      const a = btn.dataset.nav;
      if (a === 'zoom-in') CV.zoomIn();
      if (a === 'zoom-out') CV.zoomOut();
      if (a === 'zoom-fit') CV.zoomFitToScreen();
      if (a === 'pan-up') CV.panUp();
      if (a === 'pan-down') CV.panDown();
      if (a === 'pan-left') CV.panLeft();
      if (a === 'pan-right') CV.panRight();
    };
  });
}