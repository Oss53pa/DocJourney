import type { PackageData } from '../../types';

export function generateScripts(data: PackageData): string {
  const stepsJSON = JSON.stringify(data);

  return `
// ===== LIBRARY LOADER =====
var _libsLoaded = false;
var _libsCallbacks = [];

function loadPdfLibraries(callback) {
  if (_libsLoaded) { callback(); return; }
  _libsCallbacks.push(callback);
  if (_libsCallbacks.length > 1) return; // Already loading

  var jspdfScript = document.createElement('script');
  jspdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  jspdfScript.onload = function() {
    var qrcodeScript = document.createElement('script');
    qrcodeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    qrcodeScript.onload = function() {
      _libsLoaded = true;
      _libsCallbacks.forEach(function(cb) { cb(); });
      _libsCallbacks = [];
    };
    qrcodeScript.onerror = function() {
      console.error('Failed to load QRCode library');
      _libsCallbacks.forEach(function(cb) { cb(new Error('QRCode load failed')); });
    };
    document.head.appendChild(qrcodeScript);
  };
  jspdfScript.onerror = function() {
    console.error('Failed to load jsPDF library');
    _libsCallbacks.forEach(function(cb) { cb(new Error('jsPDF load failed')); });
  };
  document.head.appendChild(jspdfScript);
}

// ===== EMBEDDED DATA =====
const DATA = ${stepsJSON};

// Parse dates safely
try {
  DATA.generatedAt = new Date(DATA.generatedAt);
  DATA.previousSteps.forEach(function(s) {
    s.completedAt = new Date(s.completedAt);
    if (s.annotations) {
      s.annotations.forEach(function(a) { a.createdAt = new Date(a.createdAt); });
    }
  });
  DATA.allAnnotations.forEach(function(a) { a.createdAt = new Date(a.createdAt); });
} catch(e) { console.warn('Date parsing error:', e); }

// ===== STATE =====
var state = {
  activeTab: 'position',
  myAnnotations: [],
  currentAnnotationType: 'comment',
  annotateMode: false,
  zoom: 100,
  currentPage: 1,
  totalPages: 1,
  returnData: null,
  decisionMade: false,
  signatureDrawing: false,
  signatureCtx: null,
  signatureHasContent: false,
  replyToId: null,
  mobileDrawerExpanded: false,
  sigSource: 'draw',
  sigImportedImage: null,
  sigPlaced: false,
  sigPosition: { x: 50, y: 80 },
  sigDragging: false,
  sigDragOffset: { x: 0, y: 0 },
  sigResizing: false,
  sigResizeOrigin: { x: 0, y: 0, w: 0, h: 0 },
  sigScale: 1.0,
  // Initials (Paraphe) state
  initialsDrawing: false,
  initialsCtx: null,
  initialsHasContent: false,
  initialsSource: 'draw',
  initialsImportedImage: null,
  // Initials positioning state
  initialsPlaced: false,
  initialsPosition: { x: 85, y: 95 },
  initialsDragging: false,
  initialsDragOffset: { x: 0, y: 0 },
  initialsResizing: false,
  initialsResizeOrigin: { x: 0, y: 0, w: 0, h: 0 },
  initialsScale: 0.6,
  initialsPageMode: 'all',
  initialsExcludeFirst: false,
  initialsExcludeLast: true,
  initialsCustomPages: [],
  // Smooth drawing state
  sigPoints: [],
  sigLastPoint: null,
  sigAnimFrame: null,
  initialsPoints: [],
  initialsLastPoint: null,
  initialsAnimFrame: null,
  // OTP Verification state
  otpVerified: false,
  otpAttempts: 0,
  otpMaxAttempts: 3,
  otpCooldown: 0,
  otpCooldownInterval: null
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
  try {
    // Check if OTP verification is required
    if (DATA.verification && DATA.verification.required) {
      initOTPVerification();
      return; // Don't initialize main content until verified
    }

    // Check if packet is expired
    if (DATA.expiration) {
      var expiresAt = new Date(DATA.expiration.expiresAt);
      if (new Date() > expiresAt) {
        showExpiredScreen();
        return;
      }
    }

    initMainContent();
  } catch(e) { console.error('Init error:', e); }
});

function initMainContent() {
  try {
    var mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.style.display = '';

    renderDocument();
    // Auto fit-to-width on mobile for better initial display
    if (window.innerWidth <= 768) {
      setTimeout(function() { try { fitToWidth(); } catch(e) {} }, 100);
    }
    renderAnnotationOverlay();
    setupSignature();
    setupInitials();
    loadSavedSignature();
    loadSavedInitials();
    setupSigSecurity();
    setupSigDragResize();
    setupCharCounters();
    setupMobileDrawer();
    setupKeyboard();
    setupResizeHandler();
    verifyDocumentLock();
    recordPacketOpening();
    // Attach viewport click (avoids inline onclick timing issues in srcdoc iframes)
    var vp = document.getElementById('viewerViewport');
    if (vp) vp.addEventListener('click', function(e) { handleViewportClick(e); });
  } catch(e) { console.error('Init main content error:', e); }
}

// ===== TAB SYSTEM =====
function switchTab(tab, isMobile) {
  state.activeTab = tab;

  // Update desktop tabs
  var desktopTabs = document.querySelectorAll('.side-panel .tab-btn');
  desktopTabs.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  var panes = document.querySelectorAll('.tab-pane');
  panes.forEach(function(pane) {
    pane.classList.toggle('active', pane.id === 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  });

  // Update mobile tabs
  var mobileTabs = document.querySelectorAll('.mobile-tab-bar .tab-btn');
  mobileTabs.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });

  // Clone content to mobile drawer
  if (isMobile) {
    var activePane = document.querySelector('.tab-pane.active');
    if (activePane) {
      var drawer = document.getElementById('mobileDrawerContent');
      drawer.innerHTML = activePane.innerHTML;
    }
    expandMobileDrawer();
  }
}

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
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
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

      var devicePixelRatio = window.devicePixelRatio || 1;
      var containerWidth = container.parentElement ? container.parentElement.clientWidth - 16 : window.innerWidth - 32;

      for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        (function(num) {
          pdf.getPage(num).then(function(page) {
            // Scale to fit container width with good resolution
            var unscaledViewport = page.getViewport({ scale: 1 });
            var cssScale = containerWidth / unscaledViewport.width;
            var renderScale = cssScale * devicePixelRatio;
            var viewport = page.getViewport({ scale: renderScale });

            var canvas = document.createElement('canvas');
            canvas.className = 'pdf-page-canvas';
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = containerWidth + 'px';
            canvas.style.height = Math.round(containerWidth * (viewport.height / viewport.width)) + 'px';
            canvas.dataset.page = String(num);

            var ctx = canvas.getContext('2d');
            page.render({ canvasContext: ctx, viewport: viewport });

            // Insert pages in order
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
          });
        })(pageNum);
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

// ===== ANNOTATION SYSTEM =====
function toggleAnnotateMode() {
  state.annotateMode = !state.annotateMode;
  var btn = document.getElementById('btnAnnotateMode');
  btn.classList.toggle('active', state.annotateMode);
  var viewport = document.getElementById('viewerViewport');
  viewport.style.cursor = state.annotateMode ? 'crosshair' : 'default';
}

function handleViewportClick(e) {
  // Ignore clicks from signature placement overlay
  if (e.target.closest && e.target.closest('.sig-placement-overlay, .sig-draggable')) return;
  if (state.sigDragging) return;
  if (!state.annotateMode) return;
  var content = document.getElementById('viewerContent');
  var rect = content.getBoundingClientRect();
  var x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
  var y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);

  // For pin and highlight, create annotation immediately on click
  if (state.currentAnnotationType === 'pin' || state.currentAnnotationType === 'highlight') {
    var textArea = document.getElementById('annotationText');
    var text = (textArea && textArea.value.trim()) || (state.currentAnnotationType === 'pin' ? 'Point d\\u0027attention' : 'Zone surlign\\u00e9e');
    var color = getParticipantColor(DATA.workflow.currentStepIndex);
    var ann = {
      id: generateUUID(),
      stepId: DATA.currentStep.id,
      participantName: DATA.currentStep.participant.name,
      participantRole: DATA.currentStep.role,
      type: state.currentAnnotationType,
      content: text,
      position: { page: state.currentPage, x: parseFloat(x), y: parseFloat(y) },
      color: color,
      createdAt: new Date(),
      replyTo: undefined
    };
    state.myAnnotations.push(ann);
    if (textArea) { textArea.value = ''; document.getElementById('annotationCharCount').textContent = '0'; }
    renderMyAnnotations();
    renderAnnotationOverlay();
    switchTab('notes', false);
    return;
  }

  // For comment, switch to notes tab and let user type
  switchTab('notes', false);
  var textArea = document.getElementById('annotationText');
  if (textArea) {
    textArea.dataset.posX = x;
    textArea.dataset.posY = y;
    textArea.focus();
    textArea.placeholder = 'Annotation \\u00e0 la position (' + x + '%, ' + y + '%)...';
  }
}

function setAnnotationType(type, btn) {
  state.currentAnnotationType = type;
  var btns = document.querySelectorAll('.note-type-btn');
  btns.forEach(function(b) { b.classList.toggle('active', b === btn); });
  // Auto-enable annotate mode so user can click on document
  if (!state.annotateMode) {
    toggleAnnotateMode();
  }
}

function saveAnnotation() {
  var textArea = document.getElementById('annotationText');
  var text = textArea.value.trim();
  if (!text) return;

  var color = getParticipantColor(DATA.workflow.currentStepIndex);
  var posX = parseFloat(textArea.dataset.posX) || 0;
  var posY = parseFloat(textArea.dataset.posY) || 0;

  var ann = {
    id: generateUUID(),
    stepId: DATA.currentStep.id,
    participantName: DATA.currentStep.participant.name,
    participantRole: DATA.currentStep.role,
    type: state.currentAnnotationType,
    content: text,
    position: { page: state.currentPage, x: posX, y: posY },
    color: color,
    createdAt: new Date(),
    replyTo: state.replyToId || null
  };

  state.myAnnotations.push(ann);
  textArea.value = '';
  textArea.dataset.posX = '';
  textArea.dataset.posY = '';
  textArea.placeholder = 'Saisissez votre annotation...';
  state.replyToId = null;
  document.getElementById('annotationCharCount').textContent = '0';
  renderMyAnnotations();
  renderAnnotationOverlay();
}

function removeAnnotation(idx) {
  state.myAnnotations.splice(idx, 1);
  renderMyAnnotations();
  renderAnnotationOverlay();
}

function removeAllAnnotations() {
  if (state.myAnnotations.length === 0) return;
  if (!confirm('Supprimer toutes vos annotations ?')) return;
  state.myAnnotations = [];
  renderMyAnnotations();
  renderAnnotationOverlay();
}

function undoLastAnnotation() {
  if (state.myAnnotations.length === 0) return;
  state.myAnnotations.pop();
  renderMyAnnotations();
  renderAnnotationOverlay();
}

function renderMyAnnotations() {
  var container = document.getElementById('myAnnotationsList');
  if (!container) return;
  if (state.myAnnotations.length === 0) { container.innerHTML = ''; return; }

  var color = getParticipantColor(DATA.workflow.currentStepIndex);
  var html = '<div class="my-notes-header">';
  html += '<span class="my-notes-title">Vos annotations (' + state.myAnnotations.length + ')</span>';
  html += '<div class="my-notes-actions">';
  html += '<button class="btn-undo" onclick="undoLastAnnotation()" title="Annuler la derni\\u00e8re">&#x21B6; Annuler</button>';
  html += '<button class="btn-clear-all" onclick="removeAllAnnotations()" title="Tout effacer">&#x1F5D1; Tout effacer</button>';
  html += '</div></div>';

  state.myAnnotations.forEach(function(ann, idx) {
    var typeLabel = {comment:'Commentaire',highlight:'Surlignage',pin:'\\u00c9pingle'}[ann.type] || ann.type;
    var typeIcon = {comment:'\\u{1F4AC}',highlight:'\\u{1F7E8}',pin:'\\u{1F4CC}'}[ann.type] || '';
    html += '<div class="my-note-item" data-ann-id="' + ann.id + '" style="border-left-color:' + color + ';background:' + color + '10">';
    html += '<div class="my-note-content">';
    html += '<div class="text">' + typeIcon + ' ' + escapeHtml(ann.content) + '</div>';
    html += '<div class="note-meta">p.' + ann.position.page + ' \\u2014 ' + typeLabel;
    if (ann.replyTo) html += ' (r\\u00e9ponse)';
    html += ' <a class="goto-link" onclick="scrollDocumentToAnnotation(\\'' + ann.id + '\\',' + ann.position.page + ')">Voir \\u2192</a>';
    html += '</div>';
    html += '</div>';
    html += '<button class="delete-note-btn" onclick="event.stopPropagation();removeAnnotation(' + idx + ')" title="Supprimer">&#x1F5D1;</button>';
    html += '</div>';
  });

  container.innerHTML = html;

  // Attach hover handlers for bidirectional highlighting
  var items = container.querySelectorAll('.my-note-item[data-ann-id]');
  items.forEach(function(item) {
    var annId = item.getAttribute('data-ann-id');
    item.addEventListener('mouseenter', function() { highlightOverlayItem(annId, true); });
    item.addEventListener('mouseleave', function() { highlightOverlayItem(annId, false); });
  });
}

function renderAnnotationOverlay() {
  var overlay = document.getElementById('annotationOverlay');
  if (!overlay) return;
  overlay.innerHTML = '';

  var allAnns = DATA.allAnnotations.concat(state.myAnnotations);
  var pageAnns = allAnns.filter(function(a) { return a.position.page === state.currentPage; });

  // Assign global index for numbering pins
  var pinCounter = 0;
  var allByPage = DATA.allAnnotations.concat(state.myAnnotations);
  var pinMap = {};
  allByPage.forEach(function(a) {
    if (a.type === 'pin') {
      pinCounter++;
      pinMap[a.id] = pinCounter;
    }
  });

  pageAnns.forEach(function(ann) {
    var el = document.createElement('div');
    el.setAttribute('data-ann-id', ann.id);

    if (ann.type === 'pin') {
      el.className = 'annotation-pin';
      el.style.left = ann.position.x + '%';
      el.style.top = ann.position.y + '%';
      el.style.background = ann.color;
      var num = pinMap[ann.id] || '';
      el.innerHTML = '<span class="pin-number">' + num + '</span>';
      el.title = ann.participantName + ': ' + ann.content;
    } else if (ann.type === 'highlight') {
      el.className = 'annotation-highlight';
      el.style.left = ann.position.x + '%';
      el.style.top = ann.position.y + '%';
      el.style.background = ann.color + '30';
      el.style.borderBottom = '3px solid ' + ann.color;
      el.style.setProperty('--ann-color', ann.color);
      el.title = ann.participantName + ': ' + ann.content;
      el.innerHTML = '<span class="highlight-label" style="background:' + ann.color + '">' + escapeHtml(ann.participantName.split(' ')[0]) + '</span>';
    } else {
      el.className = 'annotation-comment-marker';
      el.style.left = ann.position.x + '%';
      el.style.top = ann.position.y + '%';
      el.style.setProperty('--ann-color', ann.color);
      el.style.borderColor = ann.color;
      el.style.background = ann.color + '15';
      el.innerHTML = '<span class="marker-icon" style="background:' + ann.color + '">' + ann.participantName.charAt(0).toUpperCase() + '</span><span class="marker-text">' + escapeHtml(ann.content.length > 30 ? ann.content.substring(0, 30) + '...' : ann.content) + '</span>';
      el.title = ann.content;
    }

    // Click on overlay → scroll panel to annotation
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      scrollPanelToAnnotation(ann.id);
    });

    // Hover on overlay → highlight panel item
    el.addEventListener('mouseenter', function() {
      highlightPanelItem(ann.id, true);
      el.classList.add('ann-active');
    });
    el.addEventListener('mouseleave', function() {
      highlightPanelItem(ann.id, false);
      el.classList.remove('ann-active');
    });

    overlay.appendChild(el);
  });

  // Also draw connector lines (CSS-based, using pseudo-elements on active items)
}

// ===== BIDIRECTIONAL LINKING =====
function goToAnnotation(page, annId) {
  state.currentPage = page;
  updatePageDisplay();
  scrollToPage();
  // Flash the annotation on the overlay
  setTimeout(function() {
    flashOverlayAnnotation(annId);
  }, 100);
}

function scrollPanelToAnnotation(annId) {
  // Try my notes first, then comments tab
  var myItem = document.querySelector('.my-note-item[data-ann-id="' + annId + '"]');
  if (myItem) {
    switchTab('notes', false);
    setTimeout(function() {
      myItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flashElement(myItem);
    }, 50);
    return;
  }
  var commentItem = document.querySelector('.comment-card[data-ann-id="' + annId + '"]');
  if (commentItem) {
    switchTab('comments', false);
    setTimeout(function() {
      commentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flashElement(commentItem);
    }, 50);
  }
}

function scrollDocumentToAnnotation(annId, page) {
  if (page && page !== state.currentPage) {
    state.currentPage = page;
    updatePageDisplay();
    scrollToPage();
  }
  setTimeout(function() {
    flashOverlayAnnotation(annId);
  }, 100);
}

function flashOverlayAnnotation(annId) {
  var el = document.querySelector('.annotation-overlay [data-ann-id="' + annId + '"]');
  if (!el) return;
  el.classList.add('ann-flash');
  setTimeout(function() { el.classList.remove('ann-flash'); }, 1500);
}

function flashElement(el) {
  el.classList.add('panel-flash');
  setTimeout(function() { el.classList.remove('panel-flash'); }, 1500);
}

function highlightPanelItem(annId, active) {
  var items = document.querySelectorAll('[data-ann-id="' + annId + '"]');
  items.forEach(function(item) {
    if (item.closest('.side-panel') || item.closest('#myAnnotationsList')) {
      item.classList.toggle('panel-highlight', active);
    }
  });
}

function highlightOverlayItem(annId, active) {
  var el = document.querySelector('.annotation-overlay [data-ann-id="' + annId + '"]');
  if (el) {
    el.classList.toggle('ann-active', active);
  }
}

function replyToAnnotation(annId, name) {
  state.replyToId = annId;
  switchTab('notes', false);
  var textArea = document.getElementById('annotationText');
  if (textArea) {
    textArea.placeholder = 'R\\u00e9pondre \\u00e0 ' + name + '...';
    textArea.focus();
  }
}

// ===== SMOOTH DRAWING UTILITIES =====
var SMOOTH_CONFIG = {
  minStrokeWidth: 1.5,
  maxStrokeWidth: 4.5,
  smoothing: 0.4,
  velocityFilterWeight: 0.7,
  minDistance: 2
};

function createPoint(x, y, pressure) {
  return { x: x, y: y, pressure: pressure || 0.5, time: Date.now() };
}

function calculateVelocity(p1, p2) {
  var dx = p2.x - p1.x;
  var dy = p2.y - p1.y;
  var distance = Math.sqrt(dx * dx + dy * dy);
  var timeDiff = Math.max(1, p2.time - p1.time);
  return distance / timeDiff;
}

function calculateStrokeWidth(velocity, pressure) {
  var velocityFactor = Math.max(0, 1 - velocity * 0.08);
  var pressureFactor = pressure;
  var factor = (velocityFactor * 0.6 + pressureFactor * 0.4);
  return SMOOTH_CONFIG.minStrokeWidth + (SMOOTH_CONFIG.maxStrokeWidth - SMOOTH_CONFIG.minStrokeWidth) * factor;
}

function drawSmoothCurve(ctx, points) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    return;
  }

  for (var i = 1; i < points.length - 1; i++) {
    var p0 = points[i - 1];
    var p1 = points[i];
    var p2 = points[i + 1];

    // Calculate control point for quadratic bezier
    var cpX = p1.x;
    var cpY = p1.y;
    var endX = (p1.x + p2.x) / 2;
    var endY = (p1.y + p2.y) / 2;

    // Calculate stroke width based on velocity
    var velocity = calculateVelocity(p0, p1);
    ctx.lineWidth = calculateStrokeWidth(velocity, p1.pressure);

    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
  }

  // Draw to the last point
  var lastPoint = points[points.length - 1];
  ctx.lineTo(lastPoint.x, lastPoint.y);
  ctx.stroke();
}

function smoothPoints(points, smoothing) {
  if (points.length < 3) return points;

  var smoothed = [points[0]];
  for (var i = 1; i < points.length - 1; i++) {
    var prev = points[i - 1];
    var curr = points[i];
    var next = points[i + 1];

    smoothed.push({
      x: curr.x * (1 - smoothing) + ((prev.x + next.x) / 2) * smoothing,
      y: curr.y * (1 - smoothing) + ((prev.y + next.y) / 2) * smoothing,
      pressure: curr.pressure,
      time: curr.time
    });
  }
  smoothed.push(points[points.length - 1]);
  return smoothed;
}

// ===== SIGNATURE =====
function setupSignature() {
  var canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;

  // High DPI support
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.parentElement.getBoundingClientRect();
  var width = Math.max(200, rect.width - 12);
  var height = 180;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  state.signatureCtx = canvas.getContext('2d', { desynchronized: true });
  state.signatureCtx.scale(dpr, dpr);
  state.signatureCtx.strokeStyle = '#171717';
  state.signatureCtx.lineWidth = 2.5;
  state.signatureCtx.lineCap = 'round';
  state.signatureCtx.lineJoin = 'round';

  canvas.addEventListener('mousedown', function(e) {
    e.preventDefault();
    startDraw(e.offsetX, e.offsetY, 0.5);
  });
  canvas.addEventListener('mousemove', function(e) {
    if (state.signatureDrawing) draw(e.offsetX, e.offsetY, 0.5);
  });
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);

  // Touch support with pressure
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.touches[0];
    var r = canvas.getBoundingClientRect();
    var pressure = t.force || 0.5;
    startDraw(t.clientX - r.left, t.clientY - r.top, pressure);
  }, { passive: false });

  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (state.signatureDrawing) {
      var t = e.touches[0];
      var r = canvas.getBoundingClientRect();
      var pressure = t.force || 0.5;
      draw(t.clientX - r.left, t.clientY - r.top, pressure);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', stopDraw);
  canvas.addEventListener('touchcancel', stopDraw);
}

function startDraw(x, y, pressure) {
  state.signatureDrawing = true;
  state.signatureHasContent = true;
  state.sigPoints = [createPoint(x, y, pressure)];
  state.sigLastPoint = state.sigPoints[0];
  updateSigStatus();
  renderSigFrame();
}

function draw(x, y, pressure) {
  if (!state.signatureDrawing) return;

  var lastPoint = state.sigLastPoint;
  if (lastPoint) {
    var dx = x - lastPoint.x;
    var dy = y - lastPoint.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < SMOOTH_CONFIG.minDistance) return;
  }

  var newPoint = createPoint(x, y, pressure);
  state.sigPoints.push(newPoint);
  state.sigLastPoint = newPoint;
}

function renderSigFrame() {
  if (!state.signatureDrawing) return;

  var ctx = state.signatureCtx;
  var points = state.sigPoints;

  if (points.length >= 2) {
    var smoothed = smoothPoints(points.slice(-6), SMOOTH_CONFIG.smoothing);
    drawSmoothCurve(ctx, smoothed);
  }

  state.sigAnimFrame = requestAnimationFrame(renderSigFrame);
}

function stopDraw() {
  if (!state.signatureDrawing) return;
  state.signatureDrawing = false;

  if (state.sigAnimFrame) {
    cancelAnimationFrame(state.sigAnimFrame);
    state.sigAnimFrame = null;
  }

  // Final render with all points smoothed
  var ctx = state.signatureCtx;
  if (state.sigPoints.length >= 2) {
    var smoothed = smoothPoints(state.sigPoints, SMOOTH_CONFIG.smoothing);
    drawSmoothCurve(ctx, smoothed);
  }

  state.sigPoints = [];
  state.sigLastPoint = null;
}

function clearSignature() {
  var canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  var dpr = window.devicePixelRatio || 1;
  state.signatureCtx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  state.signatureHasContent = false;
  state.sigPoints = [];
  state.sigLastPoint = null;
  updateSigStatus();
}

function updateSigStatus() {
  var el = document.getElementById('sigStatus');
  if (el) {
    el.textContent = state.signatureHasContent ? 'Signature pr\\u00eate' : 'Aucune signature';
    el.style.color = state.signatureHasContent ? '#22c55e' : '#a3a3a3';
  }
  updateSigPlaceBtn();
}

// ===== SIGNATURE SOURCE SWITCHING =====
function switchSigSource(source) {
  state.sigSource = source;
  // Toggle tabs
  var tabs = document.querySelectorAll('.sig-tab');
  tabs.forEach(function(tab) {
    var label = tab.textContent.trim().toLowerCase();
    var tabSource = label === 'dessiner' ? 'draw' : label === 'importer' ? 'import' : 'saved';
    tab.classList.toggle('active', tabSource === source);
  });
  // Toggle panes
  var panes = document.querySelectorAll('.sig-source');
  panes.forEach(function(pane) { pane.classList.remove('active'); });
  var paneId = { draw: 'sigSourceDraw', import: 'sigSourceImport', saved: 'sigSourceSaved' }[source];
  var activePane = document.getElementById(paneId);
  if (activePane) activePane.classList.add('active');
  updateSigPlaceBtn();
}

// ===== SIGNATURE IMPORT =====
function handleSigFileImport(event) {
  var file = event.target.files[0];
  if (!file) return;
  // Validate type
  if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
    alert('Format non support\\u00e9. Utilisez PNG ou JPG.');
    return;
  }
  // Validate size (2 Mo)
  if (file.size > 2 * 1024 * 1024) {
    alert('Fichier trop volumineux. Maximum 2 Mo.');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    state.sigImportedImage = e.target.result;
    var preview = document.getElementById('sigImportPreview');
    var importZone = document.getElementById('sigImportZone');
    var img = document.getElementById('sigImportImg');
    if (img) img.src = state.sigImportedImage;
    if (preview) preview.style.display = 'block';
    if (importZone) importZone.style.display = 'none';
    updateSigPlaceBtn();
  };
  reader.readAsDataURL(file);
}

function clearImportedSig() {
  state.sigImportedImage = null;
  var preview = document.getElementById('sigImportPreview');
  var importZone = document.getElementById('sigImportZone');
  var img = document.getElementById('sigImportImg');
  if (img) img.src = '';
  if (preview) preview.style.display = 'none';
  if (importZone) importZone.style.display = 'block';
  // Reset file input
  var fileInput = document.getElementById('sigFileInput');
  if (fileInput) fileInput.value = '';
  updateSigPlaceBtn();
}

// ===== SAVED SIGNATURE (localStorage) =====
function loadSavedSignature() {
  var container = document.getElementById('savedSigContent');
  if (!container) return;
  var saved = null;
  try { saved = localStorage.getItem('docjourney_saved_signature'); } catch(e) {}
  if (saved) {
    container.innerHTML = '<div class="sig-saved-preview"><img src="' + saved + '" /><div style="display:flex;gap:8px;justify-content:center"><button class="btn btn-primary btn-sm" onclick="useSavedSignature()">Utiliser</button><button class="btn btn-secondary btn-sm" onclick="deleteSavedSignature()">Supprimer</button></div></div>';
  } else {
    container.innerHTML = '<div class="sig-saved-empty">Aucune signature sauvegard\\u00e9e</div>';
  }
}

function useSavedSignature() {
  var saved = null;
  try { saved = localStorage.getItem('docjourney_saved_signature'); } catch(e) {}
  if (!saved) return;
  state.sigImportedImage = saved;
  updateSigPlaceBtn();
  // Visual feedback
  var container = document.getElementById('savedSigContent');
  if (container) {
    var info = container.querySelector('.sig-saved-preview');
    if (info) {
      var msg = document.createElement('div');
      msg.style.cssText = 'color:#16a34a;font-size:11px;font-weight:500;margin-top:6px;text-align:center';
      msg.textContent = '\\u2713 Signature charg\\u00e9e';
      info.appendChild(msg);
    }
  }
}

function saveSigToLocalStorage(imageDataURL) {
  try { localStorage.setItem('docjourney_saved_signature', imageDataURL); } catch(e) {}
}

function deleteSavedSignature() {
  try { localStorage.removeItem('docjourney_saved_signature'); } catch(e) {}
  loadSavedSignature();
}

// ===== INITIALS (PARAPHE) =====
function setupInitials() {
  var canvas = document.getElementById('initialsCanvas');
  if (!canvas) return;

  // High DPI support
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.parentElement.getBoundingClientRect();
  var width = Math.max(150, rect.width - 12);
  var height = 100;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  state.initialsCtx = canvas.getContext('2d', { desynchronized: true });
  state.initialsCtx.scale(dpr, dpr);
  state.initialsCtx.strokeStyle = '#171717';
  state.initialsCtx.lineWidth = 2;
  state.initialsCtx.lineCap = 'round';
  state.initialsCtx.lineJoin = 'round';

  canvas.addEventListener('mousedown', function(e) {
    e.preventDefault();
    startInitialsDraw(e.offsetX, e.offsetY, 0.5);
  });
  canvas.addEventListener('mousemove', function(e) {
    if (state.initialsDrawing) drawInitials(e.offsetX, e.offsetY, 0.5);
  });
  canvas.addEventListener('mouseup', stopInitialsDraw);
  canvas.addEventListener('mouseleave', stopInitialsDraw);

  // Touch support with pressure
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.touches[0];
    var r = canvas.getBoundingClientRect();
    var pressure = t.force || 0.5;
    startInitialsDraw(t.clientX - r.left, t.clientY - r.top, pressure);
  }, { passive: false });

  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (state.initialsDrawing) {
      var t = e.touches[0];
      var r = canvas.getBoundingClientRect();
      var pressure = t.force || 0.5;
      drawInitials(t.clientX - r.left, t.clientY - r.top, pressure);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', stopInitialsDraw);
  canvas.addEventListener('touchcancel', stopInitialsDraw);

  // Setup page selector
  setupInitialsPageSelector();
}

function startInitialsDraw(x, y, pressure) {
  state.initialsDrawing = true;
  state.initialsHasContent = true;
  state.initialsPoints = [createPoint(x, y, pressure)];
  state.initialsLastPoint = state.initialsPoints[0];
  updateInitialsStatus();
  renderInitialsFrame();
}

function drawInitials(x, y, pressure) {
  if (!state.initialsDrawing) return;

  var lastPoint = state.initialsLastPoint;
  if (lastPoint) {
    var dx = x - lastPoint.x;
    var dy = y - lastPoint.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < SMOOTH_CONFIG.minDistance) return;
  }

  var newPoint = createPoint(x, y, pressure);
  state.initialsPoints.push(newPoint);
  state.initialsLastPoint = newPoint;
}

function renderInitialsFrame() {
  if (!state.initialsDrawing) return;

  var ctx = state.initialsCtx;
  var points = state.initialsPoints;

  if (points.length >= 2) {
    var smoothed = smoothPoints(points.slice(-6), SMOOTH_CONFIG.smoothing);
    drawSmoothCurve(ctx, smoothed);
  }

  state.initialsAnimFrame = requestAnimationFrame(renderInitialsFrame);
}

function stopInitialsDraw() {
  if (!state.initialsDrawing) return;
  state.initialsDrawing = false;

  if (state.initialsAnimFrame) {
    cancelAnimationFrame(state.initialsAnimFrame);
    state.initialsAnimFrame = null;
  }

  // Final render with all points smoothed
  var ctx = state.initialsCtx;
  if (state.initialsPoints.length >= 2) {
    var smoothed = smoothPoints(state.initialsPoints, SMOOTH_CONFIG.smoothing);
    drawSmoothCurve(ctx, smoothed);
  }

  state.initialsPoints = [];
  state.initialsLastPoint = null;
}

// ===== INITIALS PAGE SELECTOR =====
function setupInitialsPageSelector() {
  var container = document.getElementById('initialsPageSelector');
  if (!container) return;

  // Use pageCount from document data if available, otherwise fall back to state.totalPages
  var totalPages = DATA.document.pageCount || state.totalPages || 1;
  state.totalPages = totalPages;

  if (totalPages <= 1) {
    container.style.display = 'none';
    return;
  }

  // Initialize custom pages array
  state.initialsCustomPages = [];
  for (var i = 1; i <= totalPages; i++) {
    if (!(state.initialsExcludeLast && i === totalPages)) {
      state.initialsCustomPages.push(i);
    }
  }

  updateInitialsPageUI();
}

function updateInitialsPageUI() {
  var container = document.getElementById('initialsPageSelector');
  if (!container) return;

  var totalPages = state.totalPages || 1;
  if (totalPages <= 1) return;

  var selectedCount = getInitialsPageCount();

  var html = '<div class="initials-pages-config">' +
    '<div class="initials-pages-header">' +
    '<span class="initials-pages-title">Pages \\u00e0 parapher</span>' +
    '<span class="initials-pages-count">' + selectedCount + '/' + totalPages + ' pages</span>' +
    '</div>' +
    '<div class="initials-pages-options">' +
    '<label class="initials-page-option">' +
    '<input type="radio" name="initialsPageMode" value="all" ' + (state.initialsPageMode === 'all' ? 'checked' : '') + ' onchange="setInitialsPageMode(\\'all\\')" />' +
    '<span>Toutes les pages</span>' +
    '</label>' +
    '<label class="initials-page-option">' +
    '<input type="radio" name="initialsPageMode" value="custom" ' + (state.initialsPageMode === 'custom' ? 'checked' : '') + ' onchange="setInitialsPageMode(\\'custom\\')" />' +
    '<span>S\\u00e9lection personnalis\\u00e9e</span>' +
    '</label>' +
    '</div>';

  if (state.initialsPageMode === 'all') {
    html += '<div class="initials-pages-excludes">' +
      '<label class="initials-exclude-option"><input type="checkbox" ' + (state.initialsExcludeFirst ? 'checked' : '') + ' onchange="toggleInitialsExcludeFirst()" /> Exclure la premi\\u00e8re page</label>' +
      '<label class="initials-exclude-option"><input type="checkbox" ' + (state.initialsExcludeLast ? 'checked' : '') + ' onchange="toggleInitialsExcludeLast()" /> Exclure la derni\\u00e8re page (signature)</label>' +
      '</div>';
  } else {
    html += '<div class="initials-pages-grid">';
    for (var i = 1; i <= totalPages; i++) {
      var isSelected = state.initialsCustomPages.indexOf(i) !== -1;
      html += '<label class="initials-page-checkbox ' + (isSelected ? 'selected' : '') + '">' +
        '<input type="checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="toggleInitialsPage(' + i + ')" />' +
        '<span>' + i + '</span>' +
        '</label>';
    }
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

function setInitialsPageMode(mode) {
  state.initialsPageMode = mode;
  updateInitialsPageUI();
}

function toggleInitialsExcludeFirst() {
  state.initialsExcludeFirst = !state.initialsExcludeFirst;
  updateInitialsPageUI();
}

function toggleInitialsExcludeLast() {
  state.initialsExcludeLast = !state.initialsExcludeLast;
  updateInitialsPageUI();
}

function toggleInitialsPage(pageNum) {
  var idx = state.initialsCustomPages.indexOf(pageNum);
  if (idx === -1) {
    state.initialsCustomPages.push(pageNum);
    state.initialsCustomPages.sort(function(a, b) { return a - b; });
  } else {
    state.initialsCustomPages.splice(idx, 1);
  }
  updateInitialsPageUI();
}

function getInitialsPageCount() {
  var totalPages = state.totalPages || 1;
  if (state.initialsPageMode === 'all') {
    var count = totalPages;
    if (state.initialsExcludeFirst) count--;
    if (state.initialsExcludeLast) count--;
    return Math.max(0, count);
  }
  return state.initialsCustomPages.length;
}

function getInitialsPages() {
  var totalPages = state.totalPages || 1;
  if (state.initialsPageMode === 'all') {
    var pages = [];
    for (var i = 1; i <= totalPages; i++) {
      if (state.initialsExcludeFirst && i === 1) continue;
      if (state.initialsExcludeLast && i === totalPages) continue;
      pages.push(i);
    }
    return pages;
  }
  return state.initialsCustomPages.slice();
}

// ===== INITIALS POSITIONING =====
function startInitialsPlacement() {
  var initialsImage = getInitialsImage();
  if (!initialsImage) {
    alert('Veuillez d\\'abord cr\\u00e9er ou importer votre paraphe.');
    return;
  }

  var overlay = document.getElementById('initialsPlacementOverlay');
  if (!overlay) return;

  // Show overlay
  overlay.style.display = 'block';

  // Set up draggable initials
  var draggable = document.getElementById('initialsDraggable');
  var img = document.getElementById('initialsDragImg');
  if (img && draggable) {
    img.src = initialsImage;
    img.onload = function() {
      var baseW = Math.min(80, img.naturalWidth);
      var baseH = (img.naturalHeight / img.naturalWidth) * baseW;
      draggable.style.width = (baseW * state.initialsScale) + 'px';
      draggable.style.height = (baseH * state.initialsScale) + 'px';

      // Position based on saved position
      var ob = overlay.getBoundingClientRect();
      var x = (state.initialsPosition.x / 100) * ob.width - draggable.offsetWidth / 2;
      var y = (state.initialsPosition.y / 100) * ob.height - draggable.offsetHeight / 2;
      draggable.style.left = Math.max(0, x) + 'px';
      draggable.style.top = Math.max(0, y) + 'px';
    };
  }

  setupInitialsDragResize();
}

function setupInitialsDragResize() {
  var draggable = document.getElementById('initialsDraggable');
  var resizeHandle = document.getElementById('initialsResizeHandle');
  var overlay = document.getElementById('initialsPlacementOverlay');
  if (!draggable || !overlay) return;

  function getOverlayBounds() {
    return overlay.getBoundingClientRect();
  }

  function clampPosition() {
    var ob = getOverlayBounds();
    var x = parseFloat(draggable.style.left) || 0;
    var y = parseFloat(draggable.style.top) || 0;
    x = Math.max(0, Math.min(x, ob.width - draggable.offsetWidth));
    y = Math.max(0, Math.min(y, ob.height - draggable.offsetHeight));
    draggable.style.left = x + 'px';
    draggable.style.top = y + 'px';
  }

  function savePosition() {
    var ob = getOverlayBounds();
    var x = parseFloat(draggable.style.left) || 0;
    var y = parseFloat(draggable.style.top) || 0;
    state.initialsPosition = {
      x: ((x + draggable.offsetWidth / 2) / ob.width) * 100,
      y: ((y + draggable.offsetHeight / 2) / ob.height) * 100
    };
  }

  // Drag
  draggable.addEventListener('mousedown', function(e) {
    if (e.target === resizeHandle) return;
    e.preventDefault();
    state.initialsDragging = true;
    state.initialsDragOffset = { x: e.offsetX, y: e.offsetY };
  });

  draggable.addEventListener('touchstart', function(e) {
    if (e.target === resizeHandle) return;
    e.preventDefault();
    state.initialsDragging = true;
    var t = e.touches[0];
    var r = draggable.getBoundingClientRect();
    state.initialsDragOffset = { x: t.clientX - r.left, y: t.clientY - r.top };
  }, { passive: false });

  overlay.addEventListener('mousemove', function(e) {
    if (!state.initialsDragging) return;
    var ob = getOverlayBounds();
    var x = e.clientX - ob.left - state.initialsDragOffset.x;
    var y = e.clientY - ob.top - state.initialsDragOffset.y;
    draggable.style.left = x + 'px';
    draggable.style.top = y + 'px';
    clampPosition();
    savePosition();
  });

  overlay.addEventListener('touchmove', function(e) {
    if (!state.initialsDragging) return;
    e.preventDefault();
    var t = e.touches[0];
    var ob = getOverlayBounds();
    var x = t.clientX - ob.left - state.initialsDragOffset.x;
    var y = t.clientY - ob.top - state.initialsDragOffset.y;
    draggable.style.left = x + 'px';
    draggable.style.top = y + 'px';
    clampPosition();
    savePosition();
  }, { passive: false });

  function stopInitialsDrag() {
    state.initialsDragging = false;
    state.initialsResizing = false;
  }

  overlay.addEventListener('mouseup', stopInitialsDrag);
  overlay.addEventListener('mouseleave', stopInitialsDrag);
  overlay.addEventListener('touchend', stopInitialsDrag);

  // Resize
  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      state.initialsResizing = true;
      state.initialsResizeOrigin = {
        x: e.clientX,
        y: e.clientY,
        w: draggable.offsetWidth,
        h: draggable.offsetHeight
      };
    });

    resizeHandle.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      state.initialsResizing = true;
      var t = e.touches[0];
      state.initialsResizeOrigin = {
        x: t.clientX,
        y: t.clientY,
        w: draggable.offsetWidth,
        h: draggable.offsetHeight
      };
    }, { passive: false });

    overlay.addEventListener('mousemove', function(e) {
      if (!state.initialsResizing) return;
      var dx = e.clientX - state.initialsResizeOrigin.x;
      var scale = (state.initialsResizeOrigin.w + dx) / state.initialsResizeOrigin.w;
      scale = Math.max(0.3, Math.min(2, scale));
      var nw = state.initialsResizeOrigin.w * scale;
      var nh = state.initialsResizeOrigin.h * scale;
      draggable.style.width = nw + 'px';
      draggable.style.height = nh + 'px';
      state.initialsScale = scale * (state.initialsScale || 0.6);
      clampPosition();
      savePosition();
    });

    overlay.addEventListener('touchmove', function(e) {
      if (!state.initialsResizing) return;
      e.preventDefault();
      var t = e.touches[0];
      var dx = t.clientX - state.initialsResizeOrigin.x;
      var scale = (state.initialsResizeOrigin.w + dx) / state.initialsResizeOrigin.w;
      scale = Math.max(0.3, Math.min(2, scale));
      var nw = state.initialsResizeOrigin.w * scale;
      var nh = state.initialsResizeOrigin.h * scale;
      draggable.style.width = nw + 'px';
      draggable.style.height = nh + 'px';
      state.initialsScale = scale * (state.initialsScale || 0.6);
      clampPosition();
      savePosition();
    }, { passive: false });
  }
}

function confirmInitialsPlacement() {
  state.initialsPlaced = true;
  hideInitialsPlacement();
  updateInitialsPositionInfo();
}

function hideInitialsPlacement() {
  var overlay = document.getElementById('initialsPlacementOverlay');
  if (overlay) overlay.style.display = 'none';
}

function removeInitialsPlacement() {
  state.initialsPlaced = false;
  updateInitialsPositionInfo();
}

function updateInitialsPositionInfo() {
  var placeBtn = document.getElementById('initialsPlaceBtn');
  var posInfo = document.getElementById('initialsPositionInfo');
  var hasInitials = hasAnyInitials();

  if (placeBtn) {
    placeBtn.style.display = hasInitials && !state.initialsPlaced ? 'inline-flex' : 'none';
  }
  if (posInfo) {
    posInfo.style.display = state.initialsPlaced ? 'flex' : 'none';
    if (state.initialsPlaced) {
      var pageCount = getInitialsPageCount();
      posInfo.innerHTML = '\\u2713 Paraphe positionn\\u00e9 sur ' + pageCount + ' page(s) ' +
        '<button class="btn btn-secondary btn-sm" onclick="removeInitialsPlacement()">Modifier</button>';
    }
  }
}

function clearInitials() {
  var canvas = document.getElementById('initialsCanvas');
  if (!canvas) return;
  var dpr = window.devicePixelRatio || 1;
  state.initialsCtx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  state.initialsHasContent = false;
  state.initialsPoints = [];
  state.initialsLastPoint = null;
  state.initialsPlaced = false;
  updateInitialsStatus();
  updateInitialsPositionInfo();
}

function updateInitialsStatus() {
  var el = document.getElementById('initialsStatus');
  if (el) {
    el.textContent = state.initialsHasContent ? 'Paraphe pr\\u00eat' : 'Aucun paraphe';
    el.style.color = state.initialsHasContent ? '#22c55e' : '#a3a3a3';
  }
  updateInitialsPositionInfo();
}

function switchInitialsSource(source) {
  state.initialsSource = source;
  var tabs = document.querySelectorAll('.initials-tabs .sig-tab');
  tabs.forEach(function(tab) {
    var label = tab.textContent.trim().toLowerCase();
    var tabSource = label === 'dessiner' ? 'draw' : label === 'importer' ? 'import' : 'saved';
    tab.classList.toggle('active', tabSource === source);
  });
  var panes = document.querySelectorAll('.initials-source');
  panes.forEach(function(pane) { pane.classList.remove('active'); });
  var paneId = { draw: 'initialsSourceDraw', import: 'initialsSourceImport', saved: 'initialsSourceSaved' }[source];
  var activePane = document.getElementById(paneId);
  if (activePane) activePane.classList.add('active');
  updateInitialsPositionInfo();
}

function handleInitialsFileImport(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
    alert('Format non support\\u00e9. Utilisez PNG ou JPG.');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('Fichier trop volumineux. Maximum 2 Mo.');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    state.initialsImportedImage = e.target.result;
    var preview = document.getElementById('initialsImportPreview');
    var importZone = document.getElementById('initialsImportZone');
    var img = document.getElementById('initialsImportImg');
    if (img) img.src = state.initialsImportedImage;
    if (preview) preview.style.display = 'block';
    if (importZone) importZone.style.display = 'none';
    updateInitialsPositionInfo();
  };
  reader.readAsDataURL(file);
}

function clearImportedInitials() {
  state.initialsImportedImage = null;
  var preview = document.getElementById('initialsImportPreview');
  var importZone = document.getElementById('initialsImportZone');
  var img = document.getElementById('initialsImportImg');
  if (img) img.src = '';
  if (preview) preview.style.display = 'none';
  if (importZone) importZone.style.display = 'block';
  var fileInput = document.getElementById('initialsFileInput');
  if (fileInput) fileInput.value = '';
}

function loadSavedInitials() {
  var container = document.getElementById('savedInitialsContent');
  if (!container) return;
  var saved = null;
  try { saved = localStorage.getItem('docjourney_saved_initials'); } catch(e) {}
  if (saved) {
    container.innerHTML = '<div class="sig-saved-preview"><img src="' + saved + '" style="max-height:60px" /><div style="display:flex;gap:8px;justify-content:center"><button class="btn btn-primary btn-sm" onclick="useSavedInitials()">Utiliser</button><button class="btn btn-secondary btn-sm" onclick="deleteSavedInitials()">Supprimer</button></div></div>';
  } else {
    container.innerHTML = '<div class="sig-saved-empty">Aucun paraphe sauvegard\\u00e9</div>';
  }
}

function useSavedInitials() {
  var saved = null;
  try { saved = localStorage.getItem('docjourney_saved_initials'); } catch(e) {}
  if (!saved) return;
  state.initialsImportedImage = saved;
  var container = document.getElementById('savedInitialsContent');
  if (container) {
    var info = container.querySelector('.sig-saved-preview');
    if (info) {
      var msg = document.createElement('div');
      msg.style.cssText = 'color:#16a34a;font-size:11px;font-weight:500;margin-top:6px;text-align:center';
      msg.textContent = '\\u2713 Paraphe charg\\u00e9';
      info.appendChild(msg);
    }
  }
  updateInitialsPositionInfo();
}

function saveInitialsToLocalStorage(imageDataURL) {
  try { localStorage.setItem('docjourney_saved_initials', imageDataURL); } catch(e) {}
}

function deleteSavedInitials() {
  try { localStorage.removeItem('docjourney_saved_initials'); } catch(e) {}
  loadSavedInitials();
}

function getInitialsImage() {
  if (state.initialsSource === 'draw') {
    var canvas = document.getElementById('initialsCanvas');
    if (canvas && state.initialsHasContent) {
      return canvas.toDataURL('image/png');
    }
    return null;
  }
  if (state.initialsSource === 'import') {
    return state.initialsImportedImage || null;
  }
  if (state.initialsSource === 'saved') {
    if (state.initialsImportedImage) return state.initialsImportedImage;
    try { return localStorage.getItem('docjourney_saved_initials'); } catch(e) { return null; }
  }
  return null;
}

function hasAnyInitials() {
  if (state.initialsSource === 'draw') return state.initialsHasContent;
  if (state.initialsSource === 'import') return !!state.initialsImportedImage;
  if (state.initialsSource === 'saved') {
    if (state.initialsImportedImage) return true;
    try { return !!localStorage.getItem('docjourney_saved_initials'); } catch(e) { return false; }
  }
  return false;
}

// ===== SIGNATURE PLACEMENT — DRAG & RESIZE =====

function setupSigDragResize() {
  var draggable = document.getElementById('sigDraggable');
  var resizeHandle = document.getElementById('sigResizeHandle');
  if (!draggable) return;

  // --- Helpers ---
  function getOverlayBounds() {
    var overlay = document.getElementById('sigPlacementOverlay');
    if (!overlay) return { left: 0, top: 0, width: 800, height: 600 };
    return overlay.getBoundingClientRect();
  }

  function getMinY() {
    var tb = document.querySelector('.viewer-toolbar');
    return tb ? tb.offsetHeight : 0;
  }

  function clampPosition() {
    var ob = getOverlayBounds();
    var minY = getMinY();
    var x = parseFloat(draggable.style.left) || 0;
    var y = parseFloat(draggable.style.top) || 0;
    x = Math.max(0, Math.min(x, ob.width - draggable.offsetWidth));
    y = Math.max(minY, Math.min(y, ob.height - draggable.offsetHeight));
    draggable.style.left = x + 'px';
    draggable.style.top = y + 'px';
  }

  function savePosition() {
    var overlay = document.getElementById('sigPlacementOverlay');
    if (!overlay) return;
    var x = parseFloat(draggable.style.left) || 0;
    var y = parseFloat(draggable.style.top) || 0;
    state.sigPosition = {
      x: Math.round(x / (overlay.clientWidth || 1) * 10000) / 100,
      y: Math.round(y / (overlay.clientHeight || 1) * 10000) / 100
    };
  }

  // --- DRAG ---
  function onMouseDown(e) {
    // Ignore if clicking the resize handle
    if (resizeHandle && resizeHandle.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    state.sigDragging = true;
    var rect = draggable.getBoundingClientRect();
    state.sigDragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    draggable.style.transition = 'none';
  }

  function onMouseMove(e) {
    if (state.sigDragging) {
      e.preventDefault();
      var ob = getOverlayBounds();
      var minY = getMinY();
      var x = e.clientX - ob.left - state.sigDragOffset.x;
      var y = e.clientY - ob.top - state.sigDragOffset.y;
      x = Math.max(0, Math.min(x, ob.width - draggable.offsetWidth));
      y = Math.max(minY, Math.min(y, ob.height - draggable.offsetHeight));
      draggable.style.left = x + 'px';
      draggable.style.top = y + 'px';
    }
    if (state.sigResizing) {
      e.preventDefault();
      var dx = e.clientX - state.sigResizeOrigin.x;
      var dy = e.clientY - state.sigResizeOrigin.y;
      // Keep aspect ratio: use the larger delta
      var delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      var newW = Math.max(60, Math.min(500, state.sigResizeOrigin.w + delta));
      var ratio = newW / state.sigResizeOrigin.w;
      var newH = Math.max(30, state.sigResizeOrigin.h * ratio);
      var img = document.getElementById('sigDraggableImg');
      if (img) {
        img.style.maxWidth = newW + 'px';
        img.style.maxHeight = newH + 'px';
      }
      state.sigScale = newW / 200; // 200 = default max-width
    }
  }

  function onMouseUp() {
    if (state.sigDragging) {
      state.sigDragging = false;
      draggable.style.transition = 'box-shadow .15s';
      clampPosition();
      savePosition();
      updateSigPositionDisplay();
    }
    if (state.sigResizing) {
      state.sigResizing = false;
      clampPosition();
      savePosition();
    }
  }

  // --- RESIZE ---
  function onResizeDown(e) {
    e.preventDefault();
    e.stopPropagation();
    state.sigResizing = true;
    var img = document.getElementById('sigDraggableImg');
    state.sigResizeOrigin = {
      x: e.clientX,
      y: e.clientY,
      w: img ? img.offsetWidth : 200,
      h: img ? img.offsetHeight : 80
    };
  }

  // --- Register mouse events ---
  draggable.addEventListener('mousedown', onMouseDown);
  if (resizeHandle) resizeHandle.addEventListener('mousedown', onResizeDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Block clicks from propagating to viewport
  draggable.addEventListener('click', function(e) { e.stopPropagation(); });

  // --- Touch events ---
  draggable.addEventListener('touchstart', function(e) {
    if (resizeHandle && resizeHandle.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    var t = e.touches[0];
    state.sigDragging = true;
    var rect = draggable.getBoundingClientRect();
    state.sigDragOffset = { x: t.clientX - rect.left, y: t.clientY - rect.top };
    draggable.style.transition = 'none';
  });

  if (resizeHandle) {
    resizeHandle.addEventListener('touchstart', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var t = e.touches[0];
      state.sigResizing = true;
      var img = document.getElementById('sigDraggableImg');
      state.sigResizeOrigin = {
        x: t.clientX,
        y: t.clientY,
        w: img ? img.offsetWidth : 200,
        h: img ? img.offsetHeight : 80
      };
    });
  }

  document.addEventListener('touchmove', function(e) {
    if (state.sigDragging) {
      var t = e.touches[0];
      var ob = getOverlayBounds();
      var minY = getMinY();
      var x = t.clientX - ob.left - state.sigDragOffset.x;
      var y = t.clientY - ob.top - state.sigDragOffset.y;
      x = Math.max(0, Math.min(x, ob.width - draggable.offsetWidth));
      y = Math.max(minY, Math.min(y, ob.height - draggable.offsetHeight));
      draggable.style.left = x + 'px';
      draggable.style.top = y + 'px';
    }
    if (state.sigResizing) {
      var t = e.touches[0];
      var dx = t.clientX - state.sigResizeOrigin.x;
      var dy = t.clientY - state.sigResizeOrigin.y;
      var delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      var newW = Math.max(60, Math.min(500, state.sigResizeOrigin.w + delta));
      var ratio = newW / state.sigResizeOrigin.w;
      var newH = Math.max(30, state.sigResizeOrigin.h * ratio);
      var img = document.getElementById('sigDraggableImg');
      if (img) {
        img.style.maxWidth = newW + 'px';
        img.style.maxHeight = newH + 'px';
      }
      state.sigScale = newW / 200;
    }
  });

  document.addEventListener('touchend', function() { onMouseUp(); });
}

function startSigPlacement() {
  var sigImage = getSigImage();
  if (!sigImage) return;
  var overlay = document.getElementById('sigPlacementOverlay');
  var draggable = document.getElementById('sigDraggable');
  var img = document.getElementById('sigDraggableImg');
  if (!overlay || !draggable || !img) return;

  img.src = sigImage;
  // Apply stored scale
  img.style.maxWidth = (200 * state.sigScale) + 'px';
  img.style.maxHeight = (80 * state.sigScale) + 'px';

  overlay.style.display = 'block';

  // Place at stored position (below toolbar)
  var ow = overlay.clientWidth || 400;
  var oh = overlay.clientHeight || 400;
  var tb = document.querySelector('.viewer-toolbar');
  var tbH = tb ? tb.offsetHeight : 0;
  draggable.style.left = Math.max(0, (state.sigPosition.x / 100 * ow) - (100 * state.sigScale)) + 'px';
  draggable.style.top = Math.max(tbH, (state.sigPosition.y / 100 * oh) - (40 * state.sigScale)) + 'px';

  state.sigPlaced = true;
  updateSigPositionDisplay();
}

function removeSigPlacement() {
  var overlay = document.getElementById('sigPlacementOverlay');
  if (overlay) overlay.style.display = 'none';
  state.sigPlaced = false;
  updateSigPositionDisplay();
}

function updateSigPositionDisplay() {
  var placeBtn = document.getElementById('sigPlaceBtn');
  var posInfo = document.getElementById('sigPositionInfo');
  if (placeBtn) placeBtn.style.display = state.sigPlaced ? 'none' : (hasAnySignature() ? 'flex' : 'none');
  if (posInfo) posInfo.style.display = state.sigPlaced ? 'flex' : 'none';
}

function getSigImage() {
  if (state.sigSource === 'draw') {
    var canvas = document.getElementById('signatureCanvas');
    if (canvas && state.signatureHasContent) {
      return applyWatermark(canvas);
    }
    return null;
  }
  if (state.sigSource === 'import') {
    return state.sigImportedImage || null;
  }
  if (state.sigSource === 'saved') {
    if (state.sigImportedImage) return state.sigImportedImage;
    try { return localStorage.getItem('docjourney_saved_signature'); } catch(e) { return null; }
  }
  return null;
}

function hasAnySignature() {
  if (state.sigSource === 'draw') return state.signatureHasContent;
  if (state.sigSource === 'import') return !!state.sigImportedImage;
  if (state.sigSource === 'saved') {
    if (state.sigImportedImage) return true;
    try { return !!localStorage.getItem('docjourney_saved_signature'); } catch(e) { return false; }
  }
  return false;
}

function updateSigPlaceBtn() {
  var placeBtn = document.getElementById('sigPlaceBtn');
  if (!placeBtn) return;
  var hasSig = hasAnySignature();
  placeBtn.style.display = (hasSig && !state.sigPlaced) ? 'flex' : 'none';
}

// ===== SIGNATURE SECURITY =====
function setupSigSecurity() {
  // Disable right-click on signature elements
  document.addEventListener('contextmenu', function(e) {
    if (e.target.closest('.signature-zone, .sig-draggable, .sig-placement-overlay')) {
      e.preventDefault();
    }
  });
  // Disable native drag on signature images
  document.addEventListener('dragstart', function(e) {
    if (e.target.closest('.signature-zone, .sig-draggable, .sig-placement-overlay')) {
      e.preventDefault();
    }
  });
  // Block Ctrl+C / Ctrl+S on signature zone
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 's')) {
      if (document.activeElement && document.activeElement.closest('.signature-zone, .sig-placement-overlay')) {
        e.preventDefault();
      }
    }
  });
}

function applyWatermark(srcCanvas) {
  // Create a copy canvas with watermark
  var wCanvas = document.createElement('canvas');
  wCanvas.width = srcCanvas.width;
  wCanvas.height = srcCanvas.height;
  var ctx = wCanvas.getContext('2d');
  // Draw original signature
  ctx.drawImage(srcCanvas, 0, 0);
  // Apply watermark in very low opacity
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#000000';
  var text = DATA.currentStep.participant.name + ' | ' + DATA.currentStep.participant.email + ' | ' + DATA.security.documentHash.substring(0, 16);
  ctx.rotate(-0.3);
  for (var wy = -wCanvas.height; wy < wCanvas.height * 2; wy += 30) {
    for (var wx = -wCanvas.width; wx < wCanvas.width * 2; wx += 250) {
      ctx.fillText(text, wx, wy);
    }
  }
  ctx.restore();
  return wCanvas.toDataURL('image/png');
}

// ===== DECISION FLOW =====
function showApprovalConfirmation() {
  var commentCount = state.myAnnotations.length;
  var generalComment = (document.getElementById('generalComment') || {}).value || '';
  var text = '<strong>D\\u00e9cision :</strong> Approbation';
  if (commentCount > 0) text += '<br>' + commentCount + ' annotation(s) ajout\\u00e9e(s)';
  if (generalComment.trim()) text += '<br><em>"' + escapeHtml(generalComment.trim().substring(0, 100)) + (generalComment.length > 100 ? '...' : '') + '"</em>';

  var summaryEl = document.getElementById('approvalSummaryText');
  if (summaryEl) summaryEl.innerHTML = text;

  // Check signer requirements
  if (DATA.currentStep.role === 'signer') {
    if (!hasAnySignature()) {
      alert('Veuillez apposer votre signature avant de valider.');
      return;
    }
    var certCheck = document.getElementById('certifyCheck');
    if (certCheck && !certCheck.checked) {
      alert('Veuillez cocher la case de certification.');
      return;
    }
  }

  showModal('approvalModal');
}

function showModificationConfirmation() {
  showModal('modificationModal');
}

function showRejectionConfirmation() {
  showModal('rejectionModal');
}

function confirmDecision(type) {
  if (state.decisionMade) return;

  var decision;
  var rejectionDetails = null;

  if (type === 'reject') {
    var cat = document.getElementById('rejCategory').value;
    var reason = document.getElementById('rejReason').value.trim();
    if (!cat) { alert('Veuillez s\\u00e9lectionner une cat\\u00e9gorie.'); return; }
    if (!reason) { alert('Veuillez saisir une raison.'); return; }
    decision = 'rejected';
    rejectionDetails = { category: cat, reason: reason };
    hideModal('rejectionModal');
  } else if (type === 'modification_requested') {
    var modCat = document.getElementById('modCategory').value;
    var modReason = document.getElementById('modReason').value.trim();
    if (!modReason) { alert('Veuillez saisir la raison de la modification.'); return; }
    decision = 'modification_requested';
    rejectionDetails = { category: modCat || 'other', reason: modReason };
    hideModal('modificationModal');
  } else {
    var role = DATA.currentStep.role;
    decision = {reviewer:'reviewed',validator:'validated',approver:'approved',signer:'approved'}[role] || 'approved';
    hideModal('approvalModal');
  }

  state.decisionMade = true;

  var generalComment = (document.getElementById('generalComment') || {}).value || '';
  generalComment = generalComment.trim();

  var sigData = null;
  if (hasAnySignature()) {
    var sigImage = getSigImage();
    if (sigImage) {
      sigData = {
        image: sigImage,
        timestamp: new Date(),
        hash: DATA.security.documentHash,
        metadata: {
          participantName: DATA.currentStep.participant.name,
          participantEmail: DATA.currentStep.participant.email,
          userAgent: navigator.userAgent
        },
        position: state.sigPlaced ? state.sigPosition : undefined,
        source: state.sigSource
      };
    }
    // Save signature to localStorage if checkbox checked
    var sigSaveCheck = document.getElementById('sigSaveCheck');
    if (sigSaveCheck && sigSaveCheck.checked && sigImage) {
      saveSigToLocalStorage(sigImage);
    }
  }

  // Initials (Paraphe) data
  var initialsData = null;
  if (hasAnyInitials()) {
    var initialsImage = getInitialsImage();
    if (initialsImage) {
      var initialsPages = getInitialsPages();
      initialsData = {
        image: initialsImage,
        timestamp: new Date(),
        hash: DATA.security.documentHash,
        metadata: {
          participantName: DATA.currentStep.participant.name,
          participantEmail: DATA.currentStep.participant.email,
          userAgent: navigator.userAgent
        },
        applyToAllPages: state.initialsPageMode === 'all' && !state.initialsExcludeFirst && !state.initialsExcludeLast,
        position: state.initialsPlaced ? state.initialsPosition : { x: 85, y: 95 },
        pages: initialsPages,
        pageConfig: {
          mode: state.initialsPageMode,
          excludeFirst: state.initialsExcludeFirst,
          excludeLast: state.initialsExcludeLast,
          customPages: state.initialsCustomPages
        },
        source: state.initialsSource
      };
    }
    // Save initials to localStorage if checkbox checked
    var initialsSaveCheck = document.getElementById('initialsSaveCheck');
    if (initialsSaveCheck && initialsSaveCheck.checked && initialsImage) {
      saveInitialsToLocalStorage(initialsImage);
    }
  }

  state.returnData = {
    version: '2.0.0',
    packageId: DATA.packageId,
    workflowId: DATA.workflow.id,
    stepId: DATA.currentStep.id,
    documentId: DATA.document.id,
    participant: DATA.currentStep.participant,
    decision: decision,
    rejectionDetails: rejectionDetails || null,
    generalComment: generalComment || null,
    annotations: state.myAnnotations,
    signature: sigData,
    initials: initialsData,
    completedAt: new Date(),
    documentHash: DATA.security.documentHash
  };

  // Disable decision buttons
  var btns = document.getElementById('decisionButtons');
  if (btns) {
    var buttons = btns.querySelectorAll('button');
    buttons.forEach(function(b) { b.disabled = true; });
  }

  showDownloadScreen(decision, generalComment, rejectionDetails);
}

function showDownloadScreen(decision, comment, rejDetails) {
  var screen = document.getElementById('downloadScreen');
  var iconWrap = document.getElementById('downloadIcon');
  var decisionLabel = document.getElementById('downloadDecisionLabel');
  var summaryRows = document.getElementById('downloadSummaryRows');

  var label = getDecisionLabel(decision);

  // Single monochrome checkmark icon for all decisions
  iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  decisionLabel.textContent = label;

  // Build summary
  var now = new Date();
  var dateStr = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear() + ' \\u00e0 ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  var rows = '';
  rows += '<div class="row"><span class="label">Document</span><span class="value">' + escapeHtml(DATA.document.name) + '</span></div>';
  rows += '<div class="row"><span class="label">Participant</span><span class="value">' + escapeHtml(DATA.currentStep.participant.name) + '</span></div>';
  rows += '<div class="row"><span class="label">R\\u00f4le</span><span class="value">' + getRoleLabel(DATA.currentStep.role) + '</span></div>';
  rows += '<div class="row"><span class="label">D\\u00e9cision</span><span class="value">' + label + '</span></div>';
  if (state.myAnnotations.length > 0) {
    rows += '<div class="row"><span class="label">Annotations</span><span class="value">' + state.myAnnotations.length + '</span></div>';
  }
  if (hasAnyInitials()) {
    rows += '<div class="row"><span class="label">Paraphe</span><span class="value">Inclus (toutes pages)</span></div>';
  }
  if (hasAnySignature()) {
    rows += '<div class="row"><span class="label">Signature</span><span class="value">Incluse</span></div>';
  }
  if (comment) {
    rows += '<div class="row"><span class="label">Commentaire</span><span class="value">' + escapeHtml(comment.substring(0, 60)) + (comment.length > 60 ? '...' : '') + '</span></div>';
  }
  if (rejDetails) {
    rows += '<div class="row"><span class="label">Raison</span><span class="value">' + escapeHtml(rejDetails.reason.substring(0, 60)) + (rejDetails.reason.length > 60 ? '...' : '') + '</span></div>';
  }
  rows += '<div class="row"><span class="label">Date</span><span class="value">' + dateStr + '</span></div>';
  summaryRows.innerHTML = rows;

  screen.classList.add('visible');

  // Trigger cloud sync if enabled
  if (DATA.sync && DATA.sync.enabled) {
    syncToCloud().then(function(result) {
      console.log('Sync result:', result);
    }).catch(function(err) {
      console.error('Sync failed:', err);
    });
  }
}

// ===== DOWNLOAD =====
function downloadReturn() {
  if (!state.returnData) return;
  var blob = new Blob([JSON.stringify(state.returnData, null, 2)], {type: 'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = DATA.document.name.replace(/\\.[^.]+$/, '') + '.docjourney';
  a.click();
  URL.revokeObjectURL(url);
}

// ===== PDF RECEIPT GENERATION =====
function downloadReceipt() {
  if (!state.returnData) return;

  // Show loading state
  var btn = document.querySelector('.dl-receipt-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Chargement...';
  }

  loadPdfLibraries(function(err) {
    if (err) {
      alert('Impossible de charger les biblioth\\u00e8ques PDF. V\\u00e9rifiez votre connexion internet.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'T\\u00e9l\\u00e9charger le re\\u00e7u (PDF)';
      }
      return;
    }

    generateReceiptPDF().then(function(pdf) {
      var docRef = 'DJ-' + DATA.document.id.substring(0, 8).toUpperCase();
      pdf.save('Recu_' + docRef + '.pdf');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'T\\u00e9l\\u00e9charger le re\\u00e7u (PDF)';
      }
    }).catch(function(err) {
      console.error('PDF generation error:', err);
      alert('Erreur lors de la g\\u00e9n\\u00e9ration du re\\u00e7u PDF.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'T\\u00e9l\\u00e9charger le re\\u00e7u (PDF)';
      }
    });
  });
}

async function generateReceiptPDF() {
  // Create jsPDF instance (A4 format)
  var pdf = new jspdf.jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  var pageWidth = 210;
  var pageHeight = 297;
  var margin = 20;
  var contentWidth = pageWidth - 2 * margin;
  var y = margin;

  var docRef = 'DJ-' + DATA.document.id.substring(0, 8).toUpperCase();
  var rd = state.returnData;

  // ===== HEADER =====
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(23, 23, 23);
  pdf.text('DocJourney', margin, y + 8);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(115, 115, 115);
  pdf.text('Re\\u00e7u de participation', pageWidth - margin, y + 4, { align: 'right' });
  pdf.text(formatDateForPDF(new Date()), pageWidth - margin, y + 9, { align: 'right' });

  y += 20;

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(23, 23, 23);
  pdf.text('RE\\u00c7U DE VALIDATION', margin, y);
  y += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(82, 82, 82);
  pdf.text('R\\u00e9f\\u00e9rence: ' + docRef, margin, y);
  y += 12;

  // Separator line
  pdf.setDrawColor(229, 229, 229);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ===== PARTICIPANT SECTION =====
  y = drawSection(pdf, 'Participant', [
    { label: 'Nom', value: rd.participant.name },
    { label: 'Email', value: rd.participant.email },
    { label: 'R\\u00f4le', value: getRoleLabel(DATA.currentStep.role) }
  ], margin, y, contentWidth);

  y += 8;

  // ===== DOCUMENT SECTION =====
  y = drawSection(pdf, 'Document', [
    { label: 'Nom', value: DATA.document.name },
    { label: '\\u00c9tape', value: DATA.currentStep.order + ' / ' + DATA.workflow.totalSteps }
  ], margin, y, contentWidth);

  y += 8;

  // ===== DECISION SECTION =====
  var decisionColor = getDecisionColor(rd.decision);
  var decisionLabel = getDecisionLabel(rd.decision);
  var decisionDate = formatDateForPDF(new Date(rd.completedAt));

  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');
  pdf.setDrawColor(229, 229, 229);
  pdf.roundedRect(margin, y, contentWidth, 22, 2, 2, 'S');

  // Decision indicator dot
  pdf.setFillColor(decisionColor.r, decisionColor.g, decisionColor.b);
  pdf.circle(margin + 8, y + 11, 3, 'F');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(82, 82, 82);
  pdf.text('D\\u00e9cision', margin + 16, y + 8);
  pdf.text(decisionDate, pageWidth - margin - 5, y + 8, { align: 'right' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(decisionColor.r, decisionColor.g, decisionColor.b);
  pdf.text(decisionLabel.toUpperCase(), margin + 16, y + 16);

  y += 30;

  // ===== ANNOTATIONS SECTION =====
  if (rd.annotations && rd.annotations.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(23, 23, 23);
    pdf.text('Annotations (' + rd.annotations.length + ')', margin, y);
    y += 6;

    rd.annotations.forEach(function(ann, idx) {
      if (y > pageHeight - 60) {
        pdf.addPage();
        y = margin;
      }

      var typeLabels = { comment: 'Commentaire', highlight: 'Surlignage', pin: '\\u00c9pingle' };
      var typeLabel = typeLabels[ann.type] || ann.type;
      var annText = 'p.' + ann.position.page + ' - ' + typeLabel + ': ' + ann.content;

      pdf.setFillColor(250, 250, 250);
      var textLines = pdf.splitTextToSize(annText, contentWidth - 10);
      var boxHeight = Math.max(12, textLines.length * 5 + 6);
      pdf.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'F');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(64, 64, 64);
      pdf.text(textLines, margin + 5, y + 6);

      y += boxHeight + 3;
    });
    y += 5;
  }

  // ===== GENERAL COMMENT =====
  if (rd.generalComment) {
    if (y > pageHeight - 50) {
      pdf.addPage();
      y = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(23, 23, 23);
    pdf.text('Commentaire g\\u00e9n\\u00e9ral', margin, y);
    y += 6;

    pdf.setFillColor(250, 250, 250);
    var commentLines = pdf.splitTextToSize(rd.generalComment, contentWidth - 10);
    var commentBoxHeight = Math.max(14, commentLines.length * 5 + 8);
    pdf.roundedRect(margin, y, contentWidth, commentBoxHeight, 2, 2, 'F');

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(82, 82, 82);
    pdf.text(commentLines, margin + 5, y + 7);

    y += commentBoxHeight + 8;
  }

  // ===== INITIALS (PARAPHE) =====
  if (rd.initials && rd.initials.image) {
    if (y > pageHeight - 50) {
      pdf.addPage();
      y = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(23, 23, 23);
    pdf.text('Paraphe', margin, y);
    y += 6;

    try {
      pdf.addImage(rd.initials.image, 'PNG', margin, y, 25, 15);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(115, 115, 115);
      pdf.text('Appliqu\\u00e9 sur toutes les pages', margin + 30, y + 8);
      y += 22;
    } catch(e) {
      console.warn('Could not add initials image:', e);
    }
  }

  // ===== SIGNATURE =====
  if (rd.signature && rd.signature.image) {
    if (y > pageHeight - 60) {
      pdf.addPage();
      y = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(23, 23, 23);
    pdf.text('Signature', margin, y);
    y += 6;

    try {
      pdf.addImage(rd.signature.image, 'PNG', margin, y, 50, 25);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(23, 23, 23);
      pdf.text(rd.participant.name, margin + 55, y + 8);

      pdf.setFontSize(9);
      pdf.setTextColor(115, 115, 115);
      var sigDate = formatDateForPDF(new Date(rd.signature.timestamp));
      pdf.text(sigDate, margin + 55, y + 14);

      if (rd.signature.position) {
        pdf.text('Position: ' + rd.signature.position.x.toFixed(0) + '%, ' + rd.signature.position.y.toFixed(0) + '%', margin + 55, y + 20);
      }

      y += 32;
    } catch(e) {
      console.warn('Could not add signature image:', e);
    }
  }

  // ===== VERIFICATION SECTION =====
  if (y > pageHeight - 70) {
    pdf.addPage();
    y = margin;
  }

  y += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(23, 23, 23);
  pdf.text('V\\u00e9rification', margin, y);
  y += 6;

  // Verification box with QR code
  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(margin, y, contentWidth, 40, 2, 2, 'F');
  pdf.setDrawColor(229, 229, 229);
  pdf.roundedRect(margin, y, contentWidth, 40, 2, 2, 'S');

  // Generate QR code
  var qrContent = 'DocJourney Receipt|' + docRef + '|' + rd.participant.email + '|' + rd.decision + '|' + DATA.security.documentHash.substring(0, 16);
  try {
    var qrDataUrl = await generateQRCode(qrContent);
    pdf.addImage(qrDataUrl, 'PNG', margin + 5, y + 5, 30, 30);
  } catch(e) {
    console.warn('QR code generation failed:', e);
    // Draw placeholder
    pdf.setFillColor(229, 229, 229);
    pdf.rect(margin + 5, y + 5, 30, 30, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(115, 115, 115);
    pdf.text('QR', margin + 17, y + 22);
  }

  // Verification info
  var infoX = margin + 42;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(82, 82, 82);
  pdf.text('Empreinte document', infoX, y + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(64, 64, 64);
  pdf.text(DATA.security.documentHash.substring(0, 32) + '...', infoX, y + 16);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(82, 82, 82);
  pdf.text('Cha\\u00eene de validation', infoX, y + 26);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(64, 64, 64);
  var chainHash = DATA.security.chainHash || DATA.security.documentHash;
  pdf.text(chainHash.substring(0, 32) + '...', infoX, y + 32);

  // Verified badge
  pdf.setFillColor(220, 252, 231);
  pdf.roundedRect(pageWidth - margin - 25, y + 12, 20, 16, 2, 2, 'F');
  pdf.setFontSize(16);
  pdf.setTextColor(22, 163, 74);
  pdf.text('\\u2713', pageWidth - margin - 18, y + 24);

  y += 50;

  // ===== FOOTER =====
  var footerY = pageHeight - 20;
  pdf.setDrawColor(229, 229, 229);
  pdf.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(163, 163, 163);
  var footerText = 'G\\u00e9n\\u00e9r\\u00e9 par DocJourney le ' + formatDateForPDF(new Date());
  pdf.text(footerText, pageWidth / 2, footerY - 3, { align: 'center' });

  pdf.setFontSize(8);
  pdf.text('Ce document atteste de la participation au circuit de validation du document r\\u00e9f\\u00e9renc\\u00e9.', pageWidth / 2, footerY + 3, { align: 'center' });

  return pdf;
}

function drawSection(pdf, title, items, x, y, width) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(82, 82, 82);
  pdf.text(title, x, y);
  y += 4;

  pdf.setFillColor(250, 250, 250);
  var boxHeight = items.length * 7 + 6;
  pdf.roundedRect(x, y, width, boxHeight, 2, 2, 'F');
  pdf.setDrawColor(229, 229, 229);
  pdf.roundedRect(x, y, width, boxHeight, 2, 2, 'S');

  y += 6;
  items.forEach(function(item) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(23, 23, 23);
    var displayValue = item.value;
    if (displayValue && displayValue.length > 50) {
      displayValue = displayValue.substring(0, 47) + '...';
    }
    pdf.text(displayValue, x + 5, y);
    y += 7;
  });

  return y + 2;
}

function getDecisionColor(decision) {
  var colors = {
    approved: { r: 34, g: 197, b: 94 },
    validated: { r: 34, g: 197, b: 94 },
    reviewed: { r: 59, g: 130, b: 246 },
    rejected: { r: 239, g: 68, b: 68 },
    modification_requested: { r: 245, g: 158, b: 11 }
  };
  return colors[decision] || { r: 115, g: 115, b: 115 };
}

function formatDateForPDF(date) {
  var d = new Date(date);
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yyyy = d.getFullYear();
  var hh = String(d.getHours()).padStart(2, '0');
  var min = String(d.getMinutes()).padStart(2, '0');
  return dd + '/' + mm + '/' + yyyy + ' \\u00e0 ' + hh + ':' + min;
}

function generateQRCode(text) {
  return new Promise(function(resolve, reject) {
    try {
      // Create a temporary container for QRCode
      var container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
      document.body.appendChild(container);

      // qrcodejs library creates QR code in a div
      var qr = new QRCode(container, {
        text: text,
        width: 128,
        height: 128,
        colorDark: '#171717',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });

      // Wait a bit for QR code to render
      setTimeout(function() {
        var canvas = container.querySelector('canvas');
        if (canvas) {
          var dataUrl = canvas.toDataURL('image/png');
          document.body.removeChild(container);
          resolve(dataUrl);
        } else {
          // Fallback to img if canvas not available
          var img = container.querySelector('img');
          if (img && img.src) {
            document.body.removeChild(container);
            resolve(img.src);
          } else {
            document.body.removeChild(container);
            reject(new Error('QR code generation failed'));
          }
        }
      }, 100);
    } catch(e) {
      reject(e);
    }
  });
}

function copyEmail() {
  var email = DATA.owner.email;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(email).then(function() {
      var btn = document.querySelector('.copy-email-btn');
      if (btn) { btn.textContent = 'Copi\\u00e9 !'; setTimeout(function() { btn.textContent = 'Copier l\\'adresse email'; }, 2000); }
    });
  } else {
    var input = document.createElement('input');
    input.value = email;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}

// ===== MODALS =====
function showModal(id) {
  document.getElementById(id).classList.add('visible');
}

function hideModal(id) {
  document.getElementById(id).classList.remove('visible');
}

function showHelp() {
  showModal('helpModal');
}

// ===== INSTRUCTIONS =====
function toggleInstructions() {
  var content = document.getElementById('instrContent');
  var toggle = document.getElementById('instrToggle');
  if (content && toggle) {
    content.classList.toggle('open');
    toggle.classList.toggle('open');
  }
}

// ===== HISTORY CARDS =====
function toggleHistory(header) {
  var body = header.nextElementSibling;
  var chevron = header.querySelector('.chevron');
  body.classList.toggle('open');
  if (chevron) chevron.classList.toggle('open');
}

// ===== TOGGLE SIDE PANEL =====
function toggleSidePanel() {
  var layout = document.getElementById('mainLayout');
  var icon = document.getElementById('togglePanelIcon');
  var indicator = document.getElementById('panelIndicator');
  layout.classList.toggle('panel-collapsed');
  var collapsed = layout.classList.contains('panel-collapsed');
  icon.innerHTML = collapsed ? '&#x25e8;' : '&#x25e8;';
  icon.style.opacity = collapsed ? '0.4' : '1';
  if (indicator) indicator.style.display = collapsed ? 'none' : 'block';
}

// ===== FULLSCREEN =====
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function() {});
  } else {
    document.exitFullscreen().catch(function() {});
  }
}

// ===== THUMBNAILS (placeholder) =====
function toggleThumbnails() {
  // V2: thumbnail sidebar
}

// ===== CHAR COUNTERS =====
function setupCharCounters() {
  var annotationText = document.getElementById('annotationText');
  if (annotationText) {
    annotationText.addEventListener('input', function() {
      var el = document.getElementById('annotationCharCount');
      if (el) el.textContent = annotationText.value.length;
    });
  }
  var generalComment = document.getElementById('generalComment');
  if (generalComment) {
    generalComment.addEventListener('input', function() {
      var el = document.getElementById('generalCharCount');
      if (el) el.textContent = generalComment.value.length;
    });
  }
}

// ===== MOBILE DRAWER =====
function setupMobileDrawer() {
  var handle = document.getElementById('dragHandle');
  if (!handle) return;

  var drawer = document.getElementById('mobileDrawer');
  var startY = 0;
  var startTranslate = 0;

  handle.addEventListener('touchstart', function(e) {
    startY = e.touches[0].clientY;
    var transform = window.getComputedStyle(drawer).transform;
    drawer.style.transition = 'none';
  });

  handle.addEventListener('touchmove', function(e) {
    var deltaY = e.touches[0].clientY - startY;
    if (state.mobileDrawerExpanded && deltaY > 0) {
      drawer.style.transform = 'translateY(' + deltaY + 'px)';
    } else if (!state.mobileDrawerExpanded && deltaY < 0) {
      drawer.style.transform = 'translateY(calc(100% - 60px + ' + deltaY + 'px))';
    }
  });

  handle.addEventListener('touchend', function(e) {
    drawer.style.transition = 'transform .3s ease';
    var endY = e.changedTouches[0].clientY;
    var deltaY = endY - startY;
    if (Math.abs(deltaY) > 50) {
      if (deltaY < 0) expandMobileDrawer();
      else collapseMobileDrawer();
    } else {
      if (state.mobileDrawerExpanded) expandMobileDrawer();
      else collapseMobileDrawer();
    }
  });

  handle.addEventListener('click', function() {
    if (state.mobileDrawerExpanded) collapseMobileDrawer();
    else expandMobileDrawer();
  });
}

function expandMobileDrawer() {
  var drawer = document.getElementById('mobileDrawer');
  drawer.classList.remove('collapsed');
  drawer.style.transform = 'translateY(0)';
  state.mobileDrawerExpanded = true;
}

function collapseMobileDrawer() {
  var drawer = document.getElementById('mobileDrawer');
  drawer.classList.add('collapsed');
  drawer.style.transform = '';
  state.mobileDrawerExpanded = false;
}

// ===== KEYBOARD =====
function setupKeyboard() {
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowLeft') prevPage();
    if (e.key === 'ArrowRight') nextPage();
    if (e.key === '+' || e.key === '=') zoomIn();
    if (e.key === '-') zoomOut();
    if (e.key === 'Escape') {
      if (state.sigDragging) { state.sigDragging = false; return; }
      if (state.sigPlaced) { removeSigPlacement(); return; }
      if (state.annotateMode) toggleAnnotateMode();
      document.querySelectorAll('.modal-overlay.visible').forEach(function(m) { m.classList.remove('visible'); });
    }
  });

  // Ctrl+wheel zoom
  var vp = document.getElementById('viewerViewport');
  if (vp) {
    vp.addEventListener('wheel', function(e) {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
      }
    }, { passive: false });
  }
}

// ===== RESIZE =====
function setupResizeHandler() {
  var isMobile = window.innerWidth <= 768;
  window.addEventListener('resize', function() {
    var nowMobile = window.innerWidth <= 768;
    if (nowMobile !== isMobile) {
      isMobile = nowMobile;
      // Re-setup signature canvas on resize
      setupSignature();
    }
  });
}

// ===== CLOUD SYNC =====
var _firebaseLoaded = false;
var _firebaseApp = null;
var _firebaseDb = null;

function loadFirebaseSDK(callback) {
  if (_firebaseLoaded) { callback(); return; }

  var scripts = [
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js'
  ];

  var loaded = 0;
  function onLoad() {
    loaded++;
    if (loaded === scripts.length) {
      _firebaseLoaded = true;
      callback();
    }
  }

  scripts.forEach(function(src, idx) {
    var script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = onLoad;
    script.onerror = function() { callback(new Error('Failed to load Firebase')); };
    setTimeout(function() { document.head.appendChild(script); }, idx * 50);
  });
}

async function initFirebaseForSync() {
  if (!DATA.sync || !DATA.sync.enabled) return false;

  return new Promise(function(resolve) {
    loadFirebaseSDK(function(err) {
      if (err) { resolve(false); return; }

      try {
        var config = DATA.sync.firebaseConfig;
        try {
          _firebaseApp = firebase.app('docjourney-html');
        } catch(e) {
          _firebaseApp = firebase.initializeApp({
            apiKey: config.apiKey,
            databaseURL: config.databaseURL,
            projectId: config.projectId
          }, 'docjourney-html');
        }
        _firebaseDb = firebase.database(_firebaseApp);

        // Sign in anonymously
        firebase.auth(_firebaseApp).signInAnonymously()
          .then(function() { resolve(true); })
          .catch(function() { resolve(false); });
      } catch(e) {
        console.error('Firebase init error:', e);
        resolve(false);
      }
    });
  });
}

async function syncToCloud() {
  if (!DATA.sync || !DATA.sync.enabled || !state.returnData) {
    return { success: false, message: 'Sync non disponible' };
  }

  updateSyncStatus('syncing');

  try {
    var initialized = await initFirebaseForSync();
    if (!initialized) {
      throw new Error('Firebase non disponible');
    }

    var channelId = DATA.sync.channelId;
    var returnsRef = _firebaseDb.ref('returns/' + channelId);
    var newReturnRef = returnsRef.push();

    await newReturnRef.set(state.returnData);

    updateSyncStatus('success');
    return { success: true, message: 'Retour synchronis\\u00e9' };
  } catch(e) {
    console.error('Sync error:', e);
    updateSyncStatus('error', e.message || 'Erreur de synchronisation');
    return { success: false, message: e.message || 'Erreur de sync' };
  }
}

function updateSyncStatus(status, message) {
  var container = document.getElementById('syncStatusContainer');
  var successMsg = document.getElementById('syncSuccessMessage');
  var fallback = document.getElementById('syncFallback');

  if (!container) return;

  var syncStatus = document.getElementById('syncStatus');
  var syncMessage = document.getElementById('syncMessage');

  container.style.display = 'block';

  if (status === 'syncing') {
    container.className = 'sync-status syncing';
    syncStatus.innerHTML = '<span class="sync-spinner"></span> Synchronisation...';
    syncMessage.textContent = 'Envoi en cours vers DocJourney';
    // Hide both until we know the result
    if (successMsg) successMsg.style.display = 'none';
    if (fallback) fallback.style.display = 'none';
  } else if (status === 'success') {
    container.className = 'sync-status success';
    syncStatus.innerHTML = '\\u2713 Synchronis\\u00e9';
    syncMessage.textContent = 'Votre r\\u00e9ponse a \\u00e9t\\u00e9 transmise automatiquement';
    // Show success message, hide download fallback
    if (successMsg) successMsg.style.display = 'block';
    if (fallback) fallback.style.display = 'none';
  } else if (status === 'error') {
    container.className = 'sync-status error';
    syncStatus.innerHTML = '\\u2717 Sync \\u00e9chou\\u00e9e';
    syncMessage.textContent = message || 'Veuillez envoyer le fichier manuellement par email';
    // Show download fallback on error
    if (successMsg) successMsg.style.display = 'none';
    if (fallback) fallback.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

// ===== UTILITIES =====
function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(d) {
  if (typeof d === 'string') d = new Date(d);
  return d.toLocaleDateString('fr-FR') + ' \\u00e0 ' + d.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'});
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getParticipantColor(index) {
  var colors = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1'];
  return colors[index % colors.length];
}

function getRoleLabel(role) {
  return {reviewer:'Annotateur',validator:'Validateur',approver:'Approbateur',signer:'Signataire'}[role]||role;
}

function getDecisionLabel(d) {
  return {approved:'Approuv\\u00e9',rejected:'Rejet\\u00e9',validated:'Valid\\u00e9',reviewed:'Annot\\u00e9',modification_requested:'Modification demand\\u00e9e'}[d]||d;
}

function getRejectionCategoryLabel(cat) {
  return {incomplete:'Document incomplet',incorrect:'Informations incorrectes',non_compliant:'Non conforme',missing_documents:'Documents manquants',unauthorized:'Non autoris\\u00e9',other:'Autre'}[cat]||cat;
}

// ===== DOCUMENT LOCK VERIFICATION =====
async function verifyDocumentLock() {
  var banner = document.getElementById('documentLockBanner');
  var status = document.getElementById('lockVerifyStatus');
  if (!banner || !status) return;
  if (!DATA.security.isLockedForSignature || !DATA.security.lastValidationHash) {
    banner.style.display = 'none';
    return;
  }

  try {
    // Compute current hash
    var currentHash = await computeDocumentHash(DATA.document.content + DATA.security.chainHash);
    var expectedHash = DATA.security.lastValidationHash;

    if (currentHash === expectedHash) {
      status.innerHTML = '<span class="verified">\\u2713 Int\\u00e9grit\\u00e9 v\\u00e9rifi\\u00e9e</span>';
      banner.querySelector('.lock-icon').textContent = '\\u2705';
    } else {
      banner.classList.add('error');
      banner.querySelector('.lock-icon').textContent = '\\u26a0\\ufe0f';
      banner.querySelector('.lock-content strong').textContent = 'Attention : Document modifi\\u00e9';
      banner.querySelector('.lock-content p').textContent = 'Ce document semble avoir \\u00e9t\\u00e9 modifi\\u00e9 depuis sa derni\\u00e8re validation. V\\u00e9rifiez son contenu avant de signer.';
      status.innerHTML = '<span class="failed">\\u2717 \\u00c9chec v\\u00e9rification</span>';
    }
  } catch(e) {
    console.error('Hash verification error:', e);
    banner.classList.add('warning');
    status.innerHTML = '<span class="verifying">V\\u00e9rification impossible</span>';
  }
}

async function computeDocumentHash(content) {
  // Use SubtleCrypto if available
  if (window.crypto && window.crypto.subtle) {
    var encoder = new TextEncoder();
    var data = encoder.encode(content);
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  // Fallback: simple hash
  var hash = 0;
  for (var i = 0; i < content.length; i++) {
    var char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'fallback-' + Math.abs(hash).toString(16);
}

// ===== OTP VERIFICATION =====
function initOTPVerification() {
  state.otpMaxAttempts = 3;
  state.otpAttempts = 0;
  state.otpCooldown = 60; // Initial cooldown

  // Setup OTP input handlers
  var inputs = document.querySelectorAll('.otp-digit');
  inputs.forEach(function(input, idx) {
    input.addEventListener('input', function(e) { handleOTPInput(e, idx); });
    input.addEventListener('keydown', function(e) { handleOTPKeydown(e, idx); });
    input.addEventListener('paste', function(e) { handleOTPPaste(e); });
    input.addEventListener('focus', function() { input.select(); });
  });

  // Focus first input
  if (inputs[0]) inputs[0].focus();

  // Start cooldown timer
  startOTPCooldown();
  updateOTPVerifyButton();
}

function handleOTPInput(e, idx) {
  var input = e.target;
  var value = input.value.replace(/\\D/g, '');
  input.value = value.slice(-1);

  // Clear error state
  document.querySelectorAll('.otp-digit').forEach(function(i) { i.classList.remove('error'); });
  var errorEl = document.getElementById('otpError');
  if (errorEl) errorEl.style.display = 'none';

  // Move to next input
  if (value && idx < 5) {
    var nextInput = document.querySelector('.otp-digit[data-index="' + (idx + 1) + '"]');
    if (nextInput) nextInput.focus();
  }

  updateOTPVerifyButton();

  // Auto-verify when complete
  var code = getOTPCode();
  if (code.length === 6) {
    setTimeout(function() { verifyOTP(); }, 100);
  }
}

function handleOTPKeydown(e, idx) {
  if (e.key === 'Backspace' && !e.target.value && idx > 0) {
    var prevInput = document.querySelector('.otp-digit[data-index="' + (idx - 1) + '"]');
    if (prevInput) {
      prevInput.focus();
      prevInput.value = '';
    }
  } else if (e.key === 'ArrowLeft' && idx > 0) {
    e.preventDefault();
    var prev = document.querySelector('.otp-digit[data-index="' + (idx - 1) + '"]');
    if (prev) prev.focus();
  } else if (e.key === 'ArrowRight' && idx < 5) {
    e.preventDefault();
    var next = document.querySelector('.otp-digit[data-index="' + (idx + 1) + '"]');
    if (next) next.focus();
  }
}

function handleOTPPaste(e) {
  e.preventDefault();
  var pastedData = (e.clipboardData || window.clipboardData).getData('text').replace(/\\D/g, '').slice(0, 6);
  var inputs = document.querySelectorAll('.otp-digit');

  for (var i = 0; i < pastedData.length; i++) {
    if (inputs[i]) inputs[i].value = pastedData[i];
  }

  updateOTPVerifyButton();

  if (pastedData.length === 6) {
    setTimeout(function() { verifyOTP(); }, 100);
  }
}

function getOTPCode() {
  var code = '';
  document.querySelectorAll('.otp-digit').forEach(function(input) {
    code += input.value;
  });
  return code;
}

function updateOTPVerifyButton() {
  var btn = document.getElementById('otpVerifyBtn');
  var code = getOTPCode();
  if (btn) btn.disabled = code.length !== 6;
}

async function verifyOTP() {
  var code = getOTPCode();
  if (code.length !== 6) return;

  var btn = document.getElementById('otpVerifyBtn');
  var spinner = document.getElementById('otpSpinner');
  var btnText = document.getElementById('otpVerifyText');

  if (btn) btn.disabled = true;
  if (spinner) spinner.style.display = 'block';
  if (btnText) btnText.textContent = 'V\\u00e9rification...';

  try {
    // Verify via Firebase
    var result = await verifyOTPViaFirebase(code);

    if (result.valid) {
      showOTPSuccess();
    } else {
      handleOTPError(result.reason, result.remainingAttempts);
    }
  } catch(e) {
    console.error('OTP verification error:', e);
    handleOTPError('CONNECTION_ERROR', state.otpMaxAttempts - state.otpAttempts);
  }

  if (spinner) spinner.style.display = 'none';
  if (btnText) btnText.textContent = 'V\\u00e9rifier';
}

async function verifyOTPViaFirebase(code) {
  if (!DATA.sync || !DATA.sync.enabled) {
    // No Firebase - cannot verify OTP properly
    return { valid: false, reason: 'NO_FIREBASE' };
  }

  try {
    // Load Firebase if not loaded
    if (!window._firebaseApp) {
      await loadFirebase();
    }

    var database = firebase.database();
    var stepId = DATA.verification.stepId;

    // Get verification data
    var snapshot = await database.ref('verifications/' + stepId).once('value');
    var verification = snapshot.val();

    if (!verification) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    if (verification.verified) {
      return { valid: true, reason: 'ALREADY_VERIFIED' };
    }

    if (verification.blocked) {
      return { valid: false, reason: 'BLOCKED', remainingAttempts: 0 };
    }

    // Check expiration
    if (new Date() > new Date(verification.expiresAt)) {
      return { valid: false, reason: 'EXPIRED' };
    }

    // Hash the input code and compare
    var hashedInput = await hashOTPCode(code, verification.salt);

    if (hashedInput === verification.code) {
      // Code is correct - mark as verified
      await database.ref('verifications/' + stepId).update({
        verified: true,
        verifiedAt: new Date().toISOString()
      });
      return { valid: true, reason: 'SUCCESS' };
    }

    // Code incorrect - increment attempts
    var newAttempts = (verification.attempts || 0) + 1;
    var remainingAttempts = state.otpMaxAttempts - newAttempts;
    var blocked = newAttempts >= state.otpMaxAttempts;

    await database.ref('verifications/' + stepId).update({
      attempts: newAttempts,
      blocked: blocked,
      blockedAt: blocked ? new Date().toISOString() : null
    });

    state.otpAttempts = newAttempts;

    return {
      valid: false,
      reason: blocked ? 'BLOCKED' : 'INVALID_CODE',
      remainingAttempts: remainingAttempts
    };
  } catch(e) {
    console.error('Firebase OTP error:', e);
    return { valid: false, reason: 'CONNECTION_ERROR' };
  }
}

async function hashOTPCode(code, salt) {
  var encoder = new TextEncoder();
  var data = encoder.encode(code + salt);
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

function handleOTPError(reason, remainingAttempts) {
  var errorEl = document.getElementById('otpError');
  var errorText = document.getElementById('otpErrorText');
  var inputs = document.querySelectorAll('.otp-digit');

  inputs.forEach(function(input) {
    input.classList.add('error');
    input.value = '';
  });
  if (inputs[0]) inputs[0].focus();

  var errorMessages = {
    'INVALID_CODE': 'Code incorrect. ' + remainingAttempts + ' tentative' + (remainingAttempts > 1 ? 's' : '') + ' restante' + (remainingAttempts > 1 ? 's' : '') + '.',
    'EXPIRED': 'Le code a expir\\u00e9. Veuillez demander un nouveau code.',
    'BLOCKED': 'Trop de tentatives. L\\'acc\\u00e8s est bloqu\\u00e9.',
    'NOT_FOUND': 'V\\u00e9rification non trouv\\u00e9e.',
    'NO_FIREBASE': 'Configuration manquante pour la v\\u00e9rification.',
    'CONNECTION_ERROR': 'Erreur de connexion. Veuillez r\\u00e9essayer.'
  };

  if (errorEl) errorEl.style.display = 'flex';
  if (errorText) errorText.textContent = errorMessages[reason] || 'Une erreur est survenue.';

  // Show remaining attempts
  if (reason === 'INVALID_CODE') {
    updateOTPAttempts(remainingAttempts);
  }

  // If blocked, show blocked screen
  if (reason === 'BLOCKED') {
    showOTPBlockedScreen();
  }
}

function updateOTPAttempts(remaining) {
  var attemptsEl = document.getElementById('otpAttempts');
  var dotsEl = document.getElementById('otpAttemptsDots');
  var textEl = document.getElementById('otpAttemptsText');

  if (!attemptsEl) return;

  attemptsEl.style.display = 'flex';

  // Generate dots
  var dotsHTML = '';
  for (var i = 0; i < state.otpMaxAttempts; i++) {
    var dotClass = i < remaining ? 'dot remaining' : 'dot used';
    dotsHTML += '<div class="' + dotClass + '"></div>';
  }
  if (dotsEl) dotsEl.innerHTML = dotsHTML;

  if (textEl) {
    textEl.textContent = remaining + ' tentative' + (remaining > 1 ? 's' : '') + ' restante' + (remaining > 1 ? 's' : '');
  }
}

function showOTPSuccess() {
  var inputs = document.querySelectorAll('.otp-digit');
  inputs.forEach(function(input) {
    input.classList.remove('error');
    input.classList.add('success');
  });

  // Brief delay then show main content
  setTimeout(function() {
    var otpScreen = document.getElementById('otpScreen');
    if (otpScreen) {
      otpScreen.style.opacity = '0';
      otpScreen.style.transition = 'opacity 0.3s ease';
      setTimeout(function() {
        otpScreen.style.display = 'none';
        state.otpVerified = true;
        initMainContent();
      }, 300);
    }
  }, 500);
}

function showOTPBlockedScreen() {
  var otpScreen = document.getElementById('otpScreen');
  var blockedScreen = document.getElementById('otpBlockedScreen');

  if (otpScreen) otpScreen.style.display = 'none';
  if (blockedScreen) blockedScreen.style.display = 'flex';
}

function startOTPCooldown() {
  var resendBtn = document.getElementById('otpResendBtn');
  var resendText = document.getElementById('otpResendText');

  if (resendBtn) resendBtn.disabled = true;

  state.otpCooldownInterval = setInterval(function() {
    state.otpCooldown--;

    if (resendText) {
      resendText.textContent = state.otpCooldown > 0
        ? 'Renvoyer dans ' + state.otpCooldown + 's'
        : 'Renvoyer le code';
    }

    if (state.otpCooldown <= 0) {
      clearInterval(state.otpCooldownInterval);
      if (resendBtn) resendBtn.disabled = false;
    }
  }, 1000);
}

async function resendOTP() {
  var resendBtn = document.getElementById('otpResendBtn');
  if (resendBtn) resendBtn.disabled = true;

  try {
    // Request new OTP via Firebase
    if (DATA.sync && DATA.sync.enabled) {
      var database = firebase.database();
      await database.ref('otpResendRequests/' + DATA.verification.stepId).set({
        requestedAt: new Date().toISOString(),
        recipientEmail: DATA.verification.recipientEmail
      });
    }

    // Reset cooldown
    state.otpCooldown = 60;
    startOTPCooldown();

    // Show success briefly
    if (resendBtn) {
      resendBtn.classList.add('success');
      var resendText = document.getElementById('otpResendText');
      if (resendText) resendText.textContent = 'Code envoy\\u00e9 !';
      setTimeout(function() {
        resendBtn.classList.remove('success');
      }, 2000);
    }
  } catch(e) {
    console.error('Resend OTP error:', e);
    if (resendBtn) resendBtn.disabled = false;
  }
}

// ===== PACKET EXPIRATION =====
function showExpiredScreen() {
  var mainContent = document.getElementById('mainContent');
  var expiredScreen = document.getElementById('expiredScreen');

  if (mainContent) mainContent.style.display = 'none';
  if (expiredScreen) expiredScreen.style.display = 'flex';
}

async function requestExtension() {
  var btn = document.getElementById('expiredRequestBtn');
  var sentMsg = document.getElementById('expiredRequestSent');

  if (btn) btn.disabled = true;

  try {
    if (DATA.sync && DATA.sync.enabled) {
      var database = firebase.database();
      await database.ref('extensionRequests/' + DATA.workflow.id + '/' + DATA.currentStep.id).set({
        requestedAt: new Date().toISOString(),
        status: 'pending'
      });
    }

    if (btn) btn.style.display = 'none';
    if (sentMsg) sentMsg.style.display = 'flex';
  } catch(e) {
    console.error('Extension request error:', e);
    if (btn) btn.disabled = false;
  }
}

function copyOwnerEmail() {
  var email = DATA.owner.email;
  navigator.clipboard.writeText(email).then(function() {
    var btn = event.target;
    var orig = btn.textContent;
    btn.textContent = 'Copi\\u00e9 !';
    setTimeout(function() { btn.textContent = orig; }, 1500);
  }).catch(function() {
    console.error('Failed to copy email');
  });
}

// ===== READ RECEIPT =====
async function recordPacketOpening() {
  if (!DATA.sync || !DATA.sync.enabled) return;

  try {
    if (!window._firebaseApp) {
      await loadFirebase();
    }

    var database = firebase.database();
    await database.ref('readReceipts/' + DATA.currentStep.id).set({
      stepId: DATA.currentStep.id,
      recipientEmail: DATA.currentStep.participant.email,
      openedAt: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  } catch(e) {
    console.error('Read receipt error:', e);
  }
}
`;
}
