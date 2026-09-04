const { ipcRenderer } = require('electron');

let historialCambios = []; 
let elementoSeleccionado = null; 
const contenedorEditor = document.getElementById('contenedor-editor');
const pdfWrapper = document.getElementById('pdf-wrapper'); 

// Tema
const btnTheme = document.getElementById('btn-theme-toggle');
btnTheme.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    btnTheme.innerText = document.body.classList.contains('light-theme') ? 'Modo Oscuro 🌙' : 'Modo Claro ☀️';
});

// GitHub
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const btnActualizar = document.getElementById('btn-actualizar');

ipcRenderer.on('estado-github', (event, data) => {
    statusDot.style.background = data.color;
    statusText.innerText = data.texto;
});
btnActualizar.addEventListener('click', () => {
    statusDot.style.background = '#eab308';
    statusText.innerText = 'Buscando actualizaciones...';
    ipcRenderer.send('check-for-update'); 
});

// Selección y Atajos
contenedorEditor.addEventListener('mousedown', (e) => {
    if (e.target.id === 'contenedor-editor' || e.target.id === 'pdf-wrapper' || e.target.id === 'pdf-canvas') {
        if (elementoSeleccionado) {
            elementoSeleccionado.style.outline = 'none';
            elementoSeleccionado.style.boxShadow = 'none';
            elementoSeleccionado = null;
        }
    }
});

function seleccionarElemento(elemento) {
    if (elementoSeleccionado) {
        elementoSeleccionado.style.outline = 'none';
        elementoSeleccionado.style.boxShadow = 'none';
    }
    elementoSeleccionado = elemento;
    elementoSeleccionado.style.boxShadow = '0 0 0 2px #3b82f6';
    elemento.focus();

    if (elemento.contentEditable === "true") {
        document.getElementById('select-font').value = elemento.style.fontFamily.replace(/"/g, '') || 'Arial, sans-serif';
    }
}

document.getElementById('btn-eliminar').addEventListener('click', () => {
    if (elementoSeleccionado && elementoSeleccionado.parentNode) {
        elementoSeleccionado.parentNode.removeChild(elementoSeleccionado);
        elementoSeleccionado = null;
    }
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        if (historialCambios.length > 0) {
            const ultimoElemento = historialCambios.pop(); 
            if (ultimoElemento && ultimoElemento.parentNode) ultimoElemento.parentNode.removeChild(ultimoElemento);
            if (elementoSeleccionado === ultimoElemento) elementoSeleccionado = null;
        }
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && elementoSeleccionado) {
        if (elementoSeleccionado.contentEditable === "true" && document.activeElement === elementoSeleccionado) return;
        if (elementoSeleccionado.parentNode) elementoSeleccionado.parentNode.removeChild(elementoSeleccionado);
        elementoSeleccionado = null;
    }
});

// Arrastre
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
        if (elemento.contentEditable !== "true") e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        elemento.style.left = `${initialLeft + dx}px`;
        elemento.style.top = `${initialTop + dy}px`;
    });
    document.addEventListener('mouseup', () => { isDragging = false; });
}

function registrarNuevoElemento(elemento) {
    elemento.tabIndex = 0;
    hacerDraggable(elemento);
    elemento.dataset.page = pageNum;
    historialCambios.push(elemento); 
    seleccionarElemento(elemento);   
    pdfWrapper.appendChild(elemento); 
}

// Edición de Tamaño en Píxeles
document.getElementById('btn-aumentar').addEventListener('click', () => {
    if (!elementoSeleccionado) return;
    if (elementoSeleccionado.tagName === 'IMG') {
        let anchoActual = elementoSeleccionado.clientWidth || elementoSeleccionado.width || 150;
        elementoSeleccionado.style.width = (anchoActual + 20) + 'px';
    } else if (elementoSeleccionado.contentEditable === "true") {
        let size = parseInt(window.getComputedStyle(elementoSeleccionado).fontSize);
        elementoSeleccionado.style.fontSize = (size + 2) + 'px';
    } else {
        let anchoActual = elementoSeleccionado.clientWidth || 100;
        let altoActual = elementoSeleccionado.clientHeight || 20;
        elementoSeleccionado.style.width = (anchoActual + 20) + 'px';
        elementoSeleccionado.style.height = (altoActual + 10) + 'px';
    }
});

document.getElementById('btn-reducir').addEventListener('click', () => {
    if (!elementoSeleccionado) return;
    if (elementoSeleccionado.tagName === 'IMG') {
        let anchoActual = elementoSeleccionado.clientWidth || elementoSeleccionado.width || 150;
        let newWidth = Math.max(30, anchoActual - 20);
        elementoSeleccionado.style.width = newWidth + 'px';
    } else if (elementoSeleccionado.contentEditable === "true") {
        let size = Math.max(8, parseInt(window.getComputedStyle(elementoSeleccionado).fontSize) - 2);
        elementoSeleccionado.style.fontSize = size + 'px';
    } else {
        let anchoActual = elementoSeleccionado.clientWidth || 100;
        let altoActual = elementoSeleccionado.clientHeight || 20;
        let newW = Math.max(20, anchoActual - 20);
        let newH = Math.max(10, altoActual - 10);
        elementoSeleccionado.style.width = newW + 'px';
        elementoSeleccionado.style.height = newH + 'px';
    }
});

document.getElementById('select-font').addEventListener('change', (e) => {
    if (elementoSeleccionado && elementoSeleccionado.contentEditable === "true") {
        elementoSeleccionado.style.fontFamily = e.target.value;
    }
});

// Herramientas
document.getElementById('btn-add-text').addEventListener('click', () => {
    if (!pdfDoc) return;
    const nuevoTexto = document.createElement('div');
    nuevoTexto.className = 'elemento-draggable';
    nuevoTexto.contentEditable = "true";
    nuevoTexto.innerText = "Doble clic para editar";
    nuevoTexto.style.position = 'absolute';
    nuevoTexto.style.left = '50px';
    nuevoTexto.style.top = '50px';
    nuevoTexto.style.fontSize = '16px';
    nuevoTexto.style.color = 'black';
    nuevoTexto.style.fontFamily = document.getElementById('select-font').value;
    nuevoTexto.style.padding = '5px';
    nuevoTexto.style.minWidth = '50px';
    registrarNuevoElemento(nuevoTexto);
});

document.getElementById('upload-image').addEventListener('change', (e) => {
    if (!pdfDoc || !e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const nuevaImagen = document.createElement('img');
        nuevaImagen.className = 'elemento-draggable';
        nuevaImagen.src = event.target.result;
        nuevaImagen.style.position = 'absolute';
        nuevaImagen.style.left = '50px';
        nuevaImagen.style.top = '50px';
        nuevaImagen.style.width = '150px'; 
        nuevaImagen.setAttribute('draggable', false);
        registrarNuevoElemento(nuevaImagen);
    };
    reader.readAsDataURL(e.target.files[0]);
    e.target.value = '';
});

document.getElementById('btn-borrador').addEventListener('click', () => {
    if (!pdfDoc) return;
    const parcheBlanco = document.createElement('div');
    parcheBlanco.className = 'elemento-draggable';
    parcheBlanco.style.position = 'absolute';
    parcheBlanco.style.left = '50px';
    parcheBlanco.style.top = '50px';
    parcheBlanco.style.width = '100px';
    parcheBlanco.style.height = '20px';
    parcheBlanco.style.backgroundColor = 'white';
    registrarNuevoElemento(parcheBlanco);
});

// PDF Lógica Principal y Paginación
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumPending = null;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

function renderPage(num) {
    pageIsRendering = true;
    
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        pdfWrapper.style.width = `${viewport.width}px`;
        pdfWrapper.style.height = `${viewport.height}px`;
        
        const renderContext = { canvasContext: ctx, viewport: viewport };
        const renderTask = page.render(renderContext);
        
        renderTask.promise.then(() => {
            pageIsRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });

    document.getElementById('page-num').textContent = `${num} / ${pdfDoc.numPages}`;
    
    document.querySelectorAll('.elemento-draggable').forEach(el => {
        if (parseInt(el.dataset.page) === num) {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
            if (elementoSeleccionado === el) {
                el.style.outline = 'none';
                el.style.boxShadow = 'none';
                elementoSeleccionado = null;
            }
        }
    });
}

function queueRenderPage(num) {
    if (pageIsRendering) pageNumPending = num;
    else renderPage(num);
}

document.getElementById('btn-prev').addEventListener('click', () => {
    if (pageNum <= 1 || !pdfDoc) return;
    pageNum--;
    queueRenderPage(pageNum);
});

document.getElementById('btn-next').addEventListener('click', () => {
    if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
});

function procesarArchivoPDF(file) {
    if (!file || file.type !== "application/pdf") return;
    
    document.querySelectorAll('.elemento-draggable').forEach(el => el.remove());
    historialCambios = [];
    elementoSeleccionado = null;

    const fileReader = new FileReader();
    fileReader.onload = function(event) {
        const typedarray = new Uint8Array(event.target.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            pdfDoc = pdf;       
            pageNum = 1;        
            renderPage(pageNum); 
        }).catch(err => console.error("Error al cargar PDF: ", err));
    };
    fileReader.readAsArrayBuffer(file);
}

document.getElementById('upload-pdf').addEventListener('change', (e) => procesarArchivoPDF(e.target.files[0]));

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});
document.addEventListener('dragover', () => { contenedorEditor.style.border = "3px dashed #3b82f6"; });
document.addEventListener('dragleave', () => { contenedorEditor.style.border = "none"; });
document.addEventListener('drop', (e) => {
    contenedorEditor.style.border = "none";
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) procesarArchivoPDF(e.dataTransfer.files[0]);
});