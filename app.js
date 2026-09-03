const { ipcRenderer } = require('electron');

// ==========================================
// 1. VARIABLES GLOBALES Y ESTADOS
// ==========================================
let historialCambios = []; 
let elementoSeleccionado = null; 
const contenedorEditor = document.getElementById('contenedor-editor');

// ==========================================
// 2. COMUNICACIÓN CON GITHUB (STATUS Y ACTUALIZACIONES)
// ==========================================
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const btnActualizar = document.getElementById('btn-actualizar');

// Recibir el estado desde main.js
ipcRenderer.on('estado-github', (event, data) => {
    statusDot.style.background = data.color;
    statusText.innerText = data.texto;
    statusText.style.color = data.color;
});

// Botón para forzar la búsqueda de actualizaciones
btnActualizar.addEventListener('click', () => {
    statusDot.style.background = '#eab308'; // Amarillo
    statusText.innerText = 'Buscando actualizaciones...';
    statusText.style.color = '#eab308';
    ipcRenderer.send('check-for-update'); 
});

// ==========================================
// 3. LÓGICA DE SELECCIÓN Y CONTROL Z (DESHACER)
// ==========================================

// Quitar selección al hacer clic en el fondo vacío del editor
contenedorEditor.addEventListener('mousedown', (e) => {
    if (e.target.id === 'contenedor-editor' || e.target.id === 'pdf-canvas') {
        if (elementoSeleccionado) {
            elementoSeleccionado.style.outline = 'none';
            elementoSeleccionado = null;
        }
    }
});

function seleccionarElemento(elemento) {
    // Quitar borde al anterior
    if (elementoSeleccionado) elementoSeleccionado.style.outline = 'none';
    
    // Asignar el nuevo y ponerle un borde visual
    elementoSeleccionado = elemento;
    elementoSeleccionado.style.outline = '2px dashed #3b82f6';

    // Si es un texto, actualizar el selector de fuente para que coincida
    if (elemento.contentEditable === "true") {
        const selectFont = document.getElementById('select-font');
        selectFont.value = elemento.style.fontFamily.replace(/"/g, '') || 'Arial, sans-serif';
    }
}

// Atajo Control + Z para deshacer el último elemento agregado
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        if (historialCambios.length > 0) {
            const ultimoElemento = historialCambios.pop(); // Saca el último del array
            if (ultimoElemento && ultimoElemento.parentNode) {
                ultimoElemento.parentNode.removeChild(ultimoElemento);
            }
            if (elementoSeleccionado === ultimoElemento) {
                elementoSeleccionado = null;
            }
        }
    }
});

// ==========================================
// 4. LÓGICA DE MOVIMIENTO (DRAG & DROP)
// ==========================================
function hacerDraggable(elemento) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    elemento.addEventListener('mousedown', (e) => {
        isDragging = true;
        seleccionarElemento(elemento);
        
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = elemento.offsetLeft;
        initialTop = elemento.offsetTop;
        
        // Evitar que el clic interfiera con la edición de texto si ya está seleccionado
        if (elemento.contentEditable !== "true") {
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        elemento.style.left = `${initialLeft + dx}px`;
        elemento.style.top = `${initialTop + dy}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

function registrarNuevoElemento(elemento) {
    hacerDraggable(elemento);
    historialCambios.push(elemento); // Guardar para el Control Z
    seleccionarElemento(elemento);   // Seleccionarlo automáticamente al crearlo
    contenedorEditor.appendChild(elemento);
}

// ==========================================
// 5. EDICIÓN INDIVIDUAL (ESCALADO Y FUENTES)
// ==========================================
const btnAumentar = document.getElementById('btn-aumentar');
const btnReducir = document.getElementById('btn-reducir');
const selectFont = document.getElementById('select-font');

btnAumentar.addEventListener('click', () => {
    if (elementoSeleccionado) {
        let currentScale = parseFloat(elementoSeleccionado.dataset.scale || 1);
        currentScale += 0.1; 
        elementoSeleccionado.style.transform = `scale(${currentScale})`;
        elementoSeleccionado.dataset.scale = currentScale;
    }
});

btnReducir.addEventListener('click', () => {
    if (elementoSeleccionado) {
        let currentScale = parseFloat(elementoSeleccionado.dataset.scale || 1);
        currentScale = Math.max(0.1, currentScale - 0.1); // No permitir que desaparezca (mínimo 0.1)
        elementoSeleccionado.style.transform = `scale(${currentScale})`;
        elementoSeleccionado.dataset.scale = currentScale;
    }
});

selectFont.addEventListener('change', (e) => {
    if (elementoSeleccionado && elementoSeleccionado.contentEditable === "true") {
        elementoSeleccionado.style.fontFamily = e.target.value;
    }
});

// ==========================================
// 6. CREACIÓN DE ELEMENTOS (TEXTO E IMAGEN)
// ==========================================
const btnAddText = document.getElementById('btn-add-text');
const uploadImage = document.getElementById('upload-image');

// Añadir Texto
btnAddText.addEventListener('click', () => {
    const nuevoTexto = document.createElement('div');
    nuevoTexto.className = 'elemento-draggable';
    nuevoTexto.contentEditable = "true";
    nuevoTexto.innerText = "Doble clic para editar";
    nuevoTexto.dataset.scale = 1;
    
    // Estilos iniciales
    nuevoTexto.style.position = 'absolute';
    nuevoTexto.style.left = '50px';
    nuevoTexto.style.top = '50px';
    nuevoTexto.style.fontSize = '16px';
    nuevoTexto.style.color = 'black';
    nuevoTexto.style.fontFamily = selectFont.value;
    nuevoTexto.style.padding = '5px';
    nuevoTexto.style.minWidth = '50px';
    nuevoTexto.style.transformOrigin = 'top left'; // Para que escale desde la esquina

    registrarNuevoElemento(nuevoTexto);
});

// Añadir Imagen (Firma o parche)
uploadImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const nuevaImagen = document.createElement('img');
        nuevaImagen.className = 'elemento-draggable';
        nuevaImagen.src = event.target.result;
        nuevaImagen.dataset.scale = 1;
        
        // Estilos iniciales
        nuevaImagen.style.position = 'absolute';
        nuevaImagen.style.left = '50px';
        nuevaImagen.style.top = '50px';
        nuevaImagen.style.maxWidth = '200px'; // Tamaño base controlable
        nuevaImagen.style.transformOrigin = 'top left';
        
        // Evitar el comportamiento fantasma del navegador al arrastrar imágenes
        nuevaImagen.setAttribute('draggable', false);

        registrarNuevoElemento(nuevaImagen);
    };
    reader.readAsDataURL(file);
    
    // Resetear el input para poder subir la misma imagen dos veces si se desea
    e.target.value = '';
});

// ==========================================
// 7. CARGA BÁSICA DE PDF (Si usas PDF.js u otro visor)
// ==========================================
const uploadPdf = document.getElementById('upload-pdf');
uploadPdf.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Aquí mantienes tu lógica actual para renderizar el PDF en el canvas.
    // Ejemplo si estás usando un <embed>, <iframe> o pdf.js.
    console.log("PDF cargado, listo para renderizar:", file.name);
});