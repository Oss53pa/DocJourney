export function generateDocumentScript(): string {
  return `
// ===== DOCUMENT RENDERING =====
function base64ToBlob(b64, mime) {
  var byteChars = atob(b64);
  var byteNumbers = new Array(byteChars.length);
  for (var i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}

function base64ToUint8Array(b64) {
  var byteChars = atob(b64);
  var byteArray = new Uint8Array(byteChars.length);
  for (var i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  return byteArray;
}

function openBlobInNewTab(b64, mime) {
  var blob = base64ToBlob(b64, mime);
  var url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

function downloadBlob(b64, mime, filename) {
  var blob = base64ToBlob(b64, mime);
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
}

// ===== PDF.JS RENDERER (mobile) =====
var _pdfjsLoaded = false;
var _pdfjsCallbacks = [];

function loadPdfJs(callback) {
  if (_pdfjsLoaded && window.pdfjsLib) { callback(); return; }
  _pdfjsCallbacks.push(callback);
  if (_pdfjsCallbacks.length > 1) return;

  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  script.onload = function() {
    // Disable worker to avoid CORS/CSP issues on mobile hosted pages
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    _pdfjsLoaded = true;
    _pdfjsCallbacks.forEach(function(cb) { cb(); });
    _pdfjsCallbacks = [];
  };
  script.onerror = function() {
    _pdfjsCallbacks.forEach(function(cb) { cb(new Error('Failed to load pdf.js')); });
    _pdfjsCallbacks = [];
  };
  document.head.appendChild(script);
}

function renderPdfToCanvas(pdfData, container) {
  var pdfBytes = base64ToUint8Array(pdfData);

  loadPdfJs(function(err) {
    if (err) {
      container.innerHTML = '<div class="viewer-fallback"><p style="font-size:48px;margin-bottom:16px">&#128196;</p>' +
        '<p>Impossible de charger le visualiseur PDF.</p>' +
        '<button onclick="openBlobInNewTab(DATA.document.previewContent||DATA.document.content,\\'application/pdf\\')" class="btn btn-primary" style="margin-top:16px">Ouvrir le PDF</button></div>';
      return;
    }

    var loadingTask = window.pdfjsLib.getDocument({ data: pdfBytes });
    loadingTask.promise.then(function(pdf) {
      state.totalPages = pdf.numPages;
      updatePageDisplay();
      container.innerHTML = '';

      // Use viewport element width (reliable on mobile), fall back to window width
      var vp = document.getElementById('viewerViewport');
      var containerWidth = (vp ? vp.clientWidth : window.innerWidth) - 32;
      if (containerWidth <= 0) containerWidth = window.innerWidth - 32;

      function renderPage(num) {
        pdf.getPage(num).then(function(page) {
          // Scale to fit container width — use CSS pixels only (no devicePixelRatio)
          // to keep canvas small enough for mobile GPU/memory limits
          var unscaledViewport = page.getViewport({ scale: 1 });
          var scale = containerWidth / unscaledViewport.width;
          var scaledViewport = page.getViewport({ scale: scale });

          var canvas = document.createElement('canvas');
          canvas.className = 'pdf-page-canvas';
          canvas.width = Math.floor(scaledViewport.width);
          canvas.height = Math.floor(scaledViewport.height);
          canvas.style.width = containerWidth + 'px';
          canvas.style.height = Math.floor(containerWidth * (unscaledViewport.height / unscaledViewport.width)) + 'px';
          canvas.dataset.page = String(num);

          // Insert into DOM before rendering (some mobile browsers need this)
          var pages = container.querySelectorAll('.pdf-page-canvas');
          var inserted = false;
          for (var j = 0; j < pages.length; j++) {
            if (parseInt(pages[j].dataset.page) > num) {
              container.insertBefore(canvas, pages[j]);
              inserted = true;
              break;
            }
          }
          if (!inserted) container.appendChild(canvas);

          var ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Failed to get canvas 2d context for page ' + num);
            return;
          }

          var renderTask = page.render({ canvasContext: ctx, viewport: scaledViewport });
          renderTask.promise.then(function() {
            // Page rendered successfully
          }).catch(function(renderErr) {
            console.error('PDF page ' + num + ' render failed:', renderErr);
          });
        }).catch(function(pageErr) {
          console.error('Failed to get page ' + num + ':', pageErr);
        });
      }

      for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        renderPage(pageNum);
      }
    }).catch(function(error) {
      console.error('pdf.js render error:', error);
      container.innerHTML = '<div class="viewer-fallback"><p style="font-size:48px;margin-bottom:16px">&#128196;</p>' +
        '<p>Erreur lors du chargement du PDF.</p>' +
        '<button onclick="openBlobInNewTab(DATA.document.previewContent||DATA.document.content,\\'application/pdf\\')" class="btn btn-primary" style="margin-top:16px">Ouvrir le PDF</button></div>';
    });
  });
}

function renderDocument() {
  var docRender = document.getElementById('docRender');
  var type = DATA.document.type;
  var b64 = DATA.document.content;
  var isMobile = window.innerWidth <= 768;

  if (type === 'pdf' || DATA.document.previewContent) {
    var pdfData = DATA.document.previewContent || b64;

    if (isMobile) {
      // Mobile: render PDF pages as canvas via pdf.js (iframes/embeds don\\'t work on mobile)
      docRender.innerHTML = '<div class="mobile-pdf-container"><div class="mobile-pdf-loading"><div class="pdf-loading-spinner"></div><p>Chargement du document...</p></div></div>';
      var container = docRender.querySelector('.mobile-pdf-container');
      renderPdfToCanvas(pdfData, container);
    } else {
      // Desktop: iframe with Blob URL
      var pdfBlob = base64ToBlob(pdfData, 'application/pdf');
      var pdfBlobUrl = URL.createObjectURL(pdfBlob);
      docRender.innerHTML = '<iframe src="' + pdfBlobUrl + '" style="width:800px;height:1100px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.1)" id="pdfFrame"></iframe>';
    }
  } else if (type === 'image') {
    var ext = DATA.document.name.split('.').pop().toLowerCase();
    var mimeMap = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp'};
    var mime = mimeMap[ext] || 'image/png';
    docRender.innerHTML = '<img src="data:' + mime + ';base64,' + b64 + '" alt="' + escapeHtml(DATA.document.name) + '" id="docImage" onload="onImageLoad()" />';
  } else if (type === 'text') {
    try {
      var text = atob(b64);
      docRender.innerHTML = '<pre>' + escapeHtml(text) + '</pre>';
      countTextPages(text);
    } catch(e) {
      docRender.innerHTML = '<div class="viewer-fallback"><p style="font-size:48px;margin-bottom:16px">&#128196;</p><p>Impossible d\\'afficher le contenu.</p></div>';
    }
  } else {
    docRender.innerHTML = '<div class="viewer-fallback"><p style="font-size:48px;margin-bottom:16px">&#128196;</p><p style="font-size:16px;font-weight:400">' + escapeHtml(DATA.document.name) + '</p><p style="color:#737373;margin-top:8px">Aper\\u00e7u non disponible pour ce format.</p><p style="margin-top:16px;display:flex;flex-direction:column;gap:8px;align-items:center"><button onclick="downloadBlob(DATA.document.content,\\'application/octet-stream\\',\\'' + escapeHtml(DATA.document.name).replace(/'/g, "\\\\'") + '\\')" class="btn btn-primary">T\\u00e9l\\u00e9charger</button><button onclick="openBlobInNewTab(DATA.document.content,\\'application/octet-stream\\')" class="btn btn-secondary">Ouvrir</button></p></div>';
  }
}

function onImageLoad() {
  state.totalPages = 1;
  updatePageDisplay();
}

function countTextPages(text) {
  var lines = text.split('\\n').length;
  state.totalPages = Math.max(1, Math.ceil(lines / 50));
  updatePageDisplay();
}

// ===== ZOOM =====
function zoomIn() {
  if (state.zoom >= 400) return;
  state.zoom = Math.min(400, state.zoom + 25);
  applyZoom();
}

function zoomOut() {
  if (state.zoom <= 25) return;
  state.zoom = Math.max(25, state.zoom - 25);
  applyZoom();
}

function fitToWidth() {
  var viewport = document.getElementById('viewerViewport');
  var content = document.getElementById('viewerContent');
  content.style.transform = 'none';
  var vw = viewport.clientWidth - 40;
  var cw = content.scrollWidth;
  if (cw > 0) {
    state.zoom = Math.round((vw / cw) * 100);
  }
  applyZoom();
}

function fitToPage() {
  state.zoom = 100;
  applyZoom();
}

function applyZoom() {
  var content = document.getElementById('viewerContent');
  content.style.transform = 'scale(' + (state.zoom / 100) + ')';
  document.getElementById('zoomDisplay').textContent = state.zoom + '%';
}

// ===== PAGE NAVIGATION =====
function prevPage() {
  if (state.currentPage > 1) {
    state.currentPage--;
    updatePageDisplay();
    scrollToPage();
  }
}

function nextPage() {
  if (state.currentPage < state.totalPages) {
    state.currentPage++;
    updatePageDisplay();
    scrollToPage();
  }
}

function goToPage(val) {
  var p = parseInt(val, 10);
  if (isNaN(p) || p < 1) p = 1;
  if (p > state.totalPages) p = state.totalPages;
  state.currentPage = p;
  updatePageDisplay();
  scrollToPage();
}

function updatePageDisplay() {
  document.getElementById('pageInput').value = state.currentPage;
  document.getElementById('pageTotal').textContent = '/ ' + state.totalPages;
}

function scrollToPage() {
  // For text docs, scroll to approximate position
  var viewport = document.getElementById('viewerViewport');
  var content = document.getElementById('viewerContent');
  var ratio = (state.currentPage - 1) / Math.max(1, state.totalPages - 1);
  viewport.scrollTop = ratio * (content.scrollHeight - viewport.clientHeight);
}
`;
}
