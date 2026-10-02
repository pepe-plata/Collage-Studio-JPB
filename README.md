# 🎨 Collage Studio JPB

Una **PWA** (Progressive Web App) para crear collages, posters y álbumes de fotos directamente desde el navegador, sin backend y sin subir archivos a ningún servidor. Todo el procesamiento ocurre **localmente** en tu dispositivo.

Funciona en **Android**, **Windows**, **Mac** y **Linux** con Chrome, Edge o cualquier navegador moderno.

---

## ✨ Características

### 📐 Lienzo configurable
- **11 formatos predefinidos**:
  - Media Carta, Carta (Letter), Oficio/Legal, A4
  - Doble Carta, Tabloide
  - Foto Infantil (2.5×3 cm), Foto Postal, 5×7, 6×8, 8×10
- **Zoom** con Ctrl + scroll (Windows) o pinza (Android)
- Centrado automático
- Tamaños reales en centímetros

### 🖼️ Fondos
- Transparente
- Color sólido
- **Gradientes**: lineal (vertical, horizontal, diagonal) y radial (centro, 4 esquinas)
- Imagen personalizada

### 📷 Imágenes
- Insertar múltiples imágenes a la vez
- Manipulación individual: mover, escalar, rotar
- **Overlay de dimensiones** en cm al seleccionar
- **Recortar** con modal interactivo
- **Máscaras**: círculo, corazón, estrella, hexágono, redondeado

### 🔷 Figuras geométricas
- Rectángulo, círculo, triángulo, línea
- Corazón, estrella, hexágono, blob

### ⭐ Stickers y emojis
Más de **150 emojis** organizados en 8 categorías:
- Caritas, corazones, estrellas, naturaleza
- Fiesta, decorativos, bocadillos, animales

### 🎨 Stickers vectoriales
- Flechas, bocadillos, insignias
- Cintas, estallidos, nubes

### 📝 Texto
- 10 tipos de letra
- Tamaño configurable
- Color personalizable
- Estilos: **negrita**, *cursiva*, subrayado, ~~tachado~~

### ✨ Efectos
- **Relleno**: color personalizado o transparente
- **Bordes**: grosor, color, estilo (sólido/guiones/puntos) o **sin borde**
- **Sombras**: suave, dura, brillo
- **Opacidad** ajustable

### 🎞️ Filtros
- **Filtros rápidos**: B&N, Sepia, Invertir, Vintage, Brownie, Kodachrome
- **Ajustes**: brillo, contraste, saturación, desenfoque (con decimales)
- **Sin filtro** para resetear

### 📜 Efectos de papel
- Cintas adhesivas (H, V, diagonal)
- Papel rasgado
- Post-it editable
- Clip de papel
- Chincheta

### 🛠️ Herramientas
- **Deshacer / Rehacer** (Ctrl+Z / Ctrl+Y)
- **Duplicar** (Ctrl+D)
- **Eliminar** (Supr)
- Capas: traer al frente / enviar al fondo
- Voltear horizontal / vertical
- Bloquear objetos
- Centrar

### 💾 Proyecto
- **Guardar** en el navegador (localStorage)
- **Cargar** desde el navegador
- **Exportar** a archivo `.json`
- **Importar** desde `.json`

### 📤 Exportar
- **PNG** (alta resolución, 2x)
- **JPG** (calidad 95%)
- **PDF** (tamaño exacto en cm)
- **Compartir** con la Web Share API (WhatsApp, Gmail, etc.)

---

## 📱 Instalación como PWA

### Android (Chrome)
1. Abre la URL de la app en Chrome
2. Menú (⋮) → **"Añadir a pantalla de inicio"**
3. Se instala como app nativa
4. Funciona **offline** después de la primera carga

### Windows / Mac (Chrome/Edge)
1. Abre la URL en Chrome o Edge
2. En la barra de direcciones aparece un ícono de **instalar** (⊕)
3. Clic → **"Instalar"**
4. Se abre como ventana independiente

---

## 🚀 Cómo ejecutarlo

### ⚠️ IMPORTANTE: NO uses `file://`

Los módulos ES y Fabric.js **no funcionan** con `file://`. Necesitas servir por HTTP.

### Opción 1: Servidor local con Python
```bash
cd ruta/al/proyecto
python -m http.server 8000
