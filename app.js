// ==========================================
// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes = null; 
let imgBytes = null; 
let imgTipo = '';
let currentPdf = null; 
let pageNum = 1;       
let edicionesPorPagina = {};
let proporcionBloqueada = true;

const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const imgWrapper = document.getElementById('img-wrapper'); 
const imgElement = document.getElementById('imagen-arrastrable');
const textoElement = document.getElementById('texto-arrastrable');
const parcheElement = document.getElementById('parche-blanco');
const btnGuardar = document.getElementById('btn-guardar');
const btnLockRatio = document.getElementById('btn-lock-ratio');

// ==========================================
// 2. INTEGRACIÓN CON ELECTRON (DOBLE CLIC)
// ==========================================
try {
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('abrir-archivo-externo', async (event, filePath) => {
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
            pdfBytes = fs.readFileSync(filePath).buffer;
            await cargarDocumentoPDF(pdfBytes);
        }
    });
} catch (e) {
    // Entorno web normal
}

// ==========================================
// 3. SISTEMA DE MEMORIA MULTIPÁGINA
// ==========================================
function guardarEdiciones(pagina) {
    edicionesPorPagina[pagina] = {
        parche: {
            visible: parcheElement.style.display === 'block',
            x: parcheElement.offsetLeft, y: parcheElement.offsetTop,
            w: parcheElement.clientWidth, h: parcheElement.clientHeight
        },
        imagen: {
            visible: imgWrapper.style.display === 'block',
            x: imgWrapper.offsetLeft, y: imgWrapper.offsetTop,
            w: imgWrapper.clientWidth, h: imgWrapper.clientHeight,
            bytes: imgBytes, tipo: imgTipo, src: imgElement.src
        },
        texto: {
            visible: textoElement.style.display === 'block',
            x: textoElement.offsetLeft, y: textoElement.offsetTop,
            h: textoElement.clientHeight, contenido: textoElement.innerText,
            fontSize: document.getElementById('input-fontsize').value
        }
    };
}

function cargarEdiciones(pagina) {
    const estado = edicionesPorPagina[pagina];
    if (estado) {
        parcheElement.style.display = estado.parche.visible ? 'block' : 'none';
        parcheElement.style.left = estado.parche.x + 'px'; parcheElement.style.top = estado.parche.y + 'px';
        parcheElement.style.width = estado.parche.w + 'px'; parcheElement.style.height = estado.parche.h + 'px';

        imgWrapper.style.display = estado.imagen.visible ? 'block' : 'none';
        imgWrapper.style.left = estado.imagen.x + 'px'; imgWrapper.style.top = estado.imagen.y + 'px';
        imgWrapper.style.width = estado.imagen.w + 'px'; imgWrapper.style.height = estado.imagen.h + 'px';
        if (estado.imagen.visible) { imgBytes = estado.imagen.bytes; imgTipo = estado.imagen.tipo; imgElement.src = estado.imagen.src; }

        textoElement.style.display = estado.texto.visible ? 'block' : 'none';
        textoElement.style.left = estado.texto.x + 'px'; textoElement.style.top = estado.texto.y + 'px';
        textoElement.innerText = estado.texto.contenido;
        document.getElementById('input-fontsize').value = estado.texto.fontSize;
        textoElement.style.fontSize = estado.texto.fontSize + 'px';
    } else {
        parcheElement.style.display = 'none'; imgWrapper.style.display = 'none'; textoElement.style.display = 'none';
        parcheElement.style.left = '50px'; parcheElement.style.top = '200px';
        imgWrapper.style.left = '50px'; imgWrapper.style.top = '50px';
        textoElement.style.left = '50px'; textoElement.style.top = '150px';
        textoElement.innerText = 'Haz clic para editar';
    }
}

// ==========================================
// 4. CARGA Y NAVEGACIÓN DEL PDF
// ==========================================
async function cargarDocumentoPDF(buffer) {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    currentPdf = await loadingTask.promise;
    document.getElementById('page-count').textContent = currentPdf.numPages;
    pageNum = 1;
    edicionesPorPagina = {}; 
    await renderPage(pageNum);
    cargarEdiciones(pageNum);
    btnGuardar.style.display = 'block';
}

document.getElementById('subir-pdf').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pdfBytes = await file.arrayBuffer();
    await cargarDocumentoPDF(pdfBytes);
});

async function renderPage(num) {
    if (!currentPdf) return;
    const pagina = await currentPdf.getPage(num);
    const viewport = pagina.getViewport({ scale: 1.5 });
    canvas.width = viewport.width; canvas.height = viewport.height;
    await pagina.render({ canvasContext: ctx, viewport: viewport }).promise;
    document.getElementById('page-num').textContent = num;
}

document.getElementById('btn-prev').addEventListener('click', () => {
    if (pageNum <= 1) return;
    guardarEdiciones(pageNum);
    pageNum--;
    renderPage(pageNum);
    cargarEdiciones(pageNum);
});

document.getElementById('btn-next').addEventListener('click', () => {
    if (pageNum >= currentPdf.numPages) return;
    guardarEdiciones(pageNum);
    pageNum++;
    renderPage(pageNum);
    cargarEdiciones(pageNum);
});

// ==========================================
// 5. HERRAMIENTAS INTERACTIVAS
// ==========================================
document.getElementById('subir-img').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    imgTipo = file.type === 'image/png' ? 'png' : 'jpeg';
    imgBytes = await file.arrayBuffer();
    
    imgElement.src = URL.createObjectURL(file);
    imgElement.onload = () => {
        const ratio = imgElement.naturalWidth / imgElement.naturalHeight;
        imgWrapper.style.width = '250px';
        imgWrapper.style.height = `${250 / ratio}px`;
    };
    imgWrapper.style.display = 'block';
});

document.getElementById('btn-eliminar-img').addEventListener('click', (e) => {
    e.stopPropagation();
    imgWrapper.style.display = 'none';
    imgBytes = null;
});

document.getElementById('btn-add-text').addEventListener('click', () => {
    textoElement.style.display = 'block'; 
    textoElement.focus(); 
});

document.getElementById('btn-add-parche').addEventListener('click', () => {
    parcheElement.style.display = 'block';
});

document.getElementById('input-fontsize').addEventListener('input', (e) => {
    textoElement.style.fontSize = e.target.value + 'px';
});

// ==========================================
// 6. ARRASTRE Y REDIMENSIÓN FLUIDA
// ==========================================
function hacerArrastrableYRedimensionable(elemento) {
    let isResizing = false;
    let isDragging = false;
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    elemento.addEventListener('mousedown', (e) => {
        const rect = elemento.getBoundingClientRect();
        const isRightEdge = e.clientX > rect.right - 25;
        const isBottomEdge = e.clientY > rect.bottom - 25;

        if (isRightEdge && isBottomEdge) {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = elemento.clientWidth;
            startHeight = elemento.clientHeight;
        } else {
            if (e.target.id === 'btn-eliminar-img') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = elemento.offsetLeft;
            startTop = elemento.offsetTop;
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    });

    function onMouseMove(e) {
        if (isResizing) {
            const dx = e.clientX - startX;
            let newWidth = startWidth + dx;
            if (newWidth < 50) newWidth = 50;

            if (proporcionBloqueada && elemento === imgWrapper) {
                const naturalRatio = imgElement.naturalWidth / imgElement.naturalHeight;
                if (naturalRatio) {
                    elemento.style.width = `${newWidth}px`;
                    elemento.style.height = `${newWidth / naturalRatio}px`;
                }
            } else {
                const dy = e.clientY - startY;
                let newHeight = startHeight + dy;
                if (newHeight < 20) newHeight = 20;
                
                elemento.style.width = `${newWidth}px`;
                elemento.style.height = `${newHeight}px`;
            }
        } else if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            elemento.style.left = `${startLeft + dx}px`;
            elemento.style.top = `${startTop + dy}px`;
        }
    }

    function onMouseUp() {
        isResizing = false;
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

hacerArrastrableYRedimensionable(imgWrapper);
hacerArrastrableYRedimensionable(textoElement);
hacerArrastrableYRedimensionable(parcheElement);

// ==========================================
// 7. ESCALADO Y CANDADO DE PROPORCIÓN
// ==========================================
function escalarElementos(factor) {
    if (imgWrapper.style.display === 'block') {
        const nuevoAncho = imgWrapper.clientWidth * factor;
        imgWrapper.style.width = nuevoAncho + 'px';
        if (proporcionBloqueada && imgElement.naturalWidth) {
            const ratio = imgElement.naturalWidth / imgElement.naturalHeight;
            imgWrapper.style.height = (nuevoAncho / ratio) + 'px';
        } else {
            imgWrapper.style.height = (imgWrapper.clientHeight * factor) + 'px';
        }
    }
    if (parcheElement.style.display === 'block') {
        parcheElement.style.width = (parcheElement.clientWidth * factor) + 'px';
        parcheElement.style.height = (parcheElement.clientHeight * factor) + 'px';
    }
    if (textoElement.style.display === 'block') {
        let sizeInput = document.getElementById('input-fontsize');
        let newSize = Math.round(parseInt(sizeInput.value) * factor);
        sizeInput.value = newSize; 
        textoElement.style.fontSize = newSize + 'px';
    }
}

document.getElementById('btn-aumentar').addEventListener('click', () => escalarElementos(1.1));
document.getElementById('btn-reducir').addEventListener('click', () => escalarElementos(0.9));

btnLockRatio.addEventListener('click', () => {
    proporcionBloqueada = !proporcionBloqueada;
    if (proporcionBloqueada) {
        btnLockRatio.innerText = "🔒 Proporción Bloqueada";
        btnLockRatio.style.background = "#eef2f5";
    } else {
        btnLockRatio.innerText = "🔓 Proporción Libre";
        btnLockRatio.style.background = "transparent";
    }
});

// ==========================================
// 8. GUARDAR Y EXPORTAR (MULTIPÁGINA)
// ==========================================
btnGuardar.addEventListener('click', async () => {
    if (!pdfBytes) return alert("Sube un PDF primero.");
    guardarEdiciones(pageNum);

    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const fuenteHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const [numPaginaStr, estado] of Object.entries(edicionesPorPagina)) {
        const numPag = parseInt(numPaginaStr);
        const paginaPDF = pdfDoc.getPages()[numPag - 1]; 
        const proporcionX = paginaPDF.getWidth() / canvas.width;
        const proporcionY = paginaPDF.getHeight() / canvas.height;

        if (estado.parche.visible) {
            const yParche = paginaPDF.getHeight() - ((estado.parche.y + estado.parche.h) * proporcionY);
            paginaPDF.drawRectangle({ 
                x: estado.parche.x * proporcionX, 
                y: yParche, 
                width: estado.parche.w * proporcionX, 
                height: estado.parche.h * proporcionY, 
                color: rgb(1, 1, 1) 
            });
        }
        
        if (estado.imagen.visible && estado.imagen.bytes) {
            let imagenIncrustada = estado.imagen.tipo === 'png' ? await pdfDoc.embedPng(estado.imagen.bytes) : await pdfDoc.embedJpg(estado.imagen.bytes);
            const yImg = paginaPDF.getHeight() - ((estado.imagen.y + estado.imagen.h) * proporcionY);
            paginaPDF.drawImage(imagenIncrustada, { 
                x: estado.imagen.x * proporcionX, 
                y: yImg, 
                width: estado.imagen.w * proporcionX, 
                height: estado.imagen.h * proporcionY 
            });
        }
        
        if (estado.texto.visible) {
            const yTxt = paginaPDF.getHeight() - ((estado.texto.y + estado.texto.h) * proporcionY);
            paginaPDF.drawText(estado.texto.contenido, { 
                x: estado.texto.x * proporcionX, 
                y: yTxt + 5, 
                size: parseInt(estado.texto.fontSize) * proporcionY, 
                font: fuenteHelvetica, 
                color: rgb(0, 0, 0) 
            });
        }
    }

    const textoEliminar = document.getElementById('input-eliminar').value;
    if (textoEliminar) {
        let paginasABorrar = textoEliminar.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));
        paginasABorrar.sort((a, b) => b - a);
        paginasABorrar.forEach(numeroPagina => {
            const index = numeroPagina - 1; 
            if (index >= 0 && index < pdfDoc.getPageCount()) { 
                pdfDoc.removePage(index); 
            }
        });
    }
    
    const pdfModificadoBytes = await pdfDoc.save();
    const blob = new Blob([pdfModificadoBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'PDF_Editado.pdf';
    link.click();
});
// ==========================================
// 9. SISTEMA DE ACTUALIZACIÓN MANUAL
// ==========================================
try {
    const { ipcRenderer } = require('electron');
    const btnActualizar = document.getElementById('btn-actualizar');
    
    if (btnActualizar) {
        btnActualizar.addEventListener('click', () => {
            ipcRenderer.send('buscar-actualizacion');
            alert("Buscando nuevas actualizaciones...");
        });
    }
} catch (e) {
    // Entorno web
}