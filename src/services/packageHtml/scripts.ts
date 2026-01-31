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
  initialsImportedImage: null
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
  try {
    renderDocument();
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
    // Attach viewport click (avoids inline onclick timing issues in srcdoc iframes)
    var vp = document.getElementById('viewerViewport');
    if (vp) vp.addEventListener('click', function(e) { handleViewportClick(e); });
  } catch(e) { console.error('Init error:', e); }
});

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
function renderDocument() {
  var docRender = document.getElementById('docRender');
  var type = DATA.document.type;
  var b64 = DATA.document.content;

  if (type === 'pdf' || DATA.document.previewContent) {
    var pdfData = DATA.document.previewContent || b64;
    docRender.innerHTML = '<iframe src="data:application/pdf;base64,' + pdfData + '" style="width:800px;height:1100px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.1)" id="pdfFrame"></iframe>';
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
    docRender.innerHTML = '<div class="viewer-fallback"><p style="font-size:48px;margin-bottom:16px">&#128196;</p><p style="font-size:16px;font-weight:400">' + escapeHtml(DATA.document.name) + '</p><p style="color:#737373;margin-top:8px">Aper\\u00e7u non disponible pour ce format.</p><p style="margin-top:16px"><a href="data:application/octet-stream;base64,' + b64 + '" download="' + escapeHtml(DATA.document.name) + '" class="btn btn-primary">T\\u00e9l\\u00e9charger</a></p></div>';
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
    replyTo: state.replyToId || undefined
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

// ===== SIGNATURE =====
function setupSignature() {
  var canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;

  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.max(200, rect.width - 12);
  canvas.height = 180;
  state.signatureCtx = canvas.getContext('2d');
  state.signatureCtx.strokeStyle = '#171717';
  state.signatureCtx.lineWidth = 2;
  state.signatureCtx.lineCap = 'round';
  state.signatureCtx.lineJoin = 'round';

  canvas.addEventListener('mousedown', function(e) { startDraw(e.offsetX, e.offsetY); });
  canvas.addEventListener('mousemove', function(e) { if (state.signatureDrawing) draw(e.offsetX, e.offsetY); });
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.touches[0];
    var r = canvas.getBoundingClientRect();
    startDraw(t.clientX - r.left, t.clientY - r.top);
  });
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (state.signatureDrawing) {
      var t = e.touches[0];
      var r = canvas.getBoundingClientRect();
      draw(t.clientX - r.left, t.clientY - r.top);
    }
  });
  canvas.addEventListener('touchend', stopDraw);
}

function startDraw(x, y) {
  state.signatureDrawing = true;
  state.signatureHasContent = true;
  state.signatureCtx.beginPath();
  state.signatureCtx.moveTo(x, y);
  updateSigStatus();
}
function draw(x, y) {
  state.signatureCtx.lineTo(x, y);
  state.signatureCtx.stroke();
}
function stopDraw() {
  state.signatureDrawing = false;
}

function clearSignature() {
  var canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  state.signatureCtx.clearRect(0, 0, canvas.width, canvas.height);
  state.signatureHasContent = false;
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

  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.max(150, rect.width - 12);
  canvas.height = 80;
  state.initialsCtx = canvas.getContext('2d');
  state.initialsCtx.strokeStyle = '#171717';
  state.initialsCtx.lineWidth = 2;
  state.initialsCtx.lineCap = 'round';
  state.initialsCtx.lineJoin = 'round';

  canvas.addEventListener('mousedown', function(e) { startInitialsDraw(e.offsetX, e.offsetY); });
  canvas.addEventListener('mousemove', function(e) { if (state.initialsDrawing) drawInitials(e.offsetX, e.offsetY); });
  canvas.addEventListener('mouseup', stopInitialsDraw);
  canvas.addEventListener('mouseleave', stopInitialsDraw);
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.touches[0];
    var r = canvas.getBoundingClientRect();
    startInitialsDraw(t.clientX - r.left, t.clientY - r.top);
  });
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (state.initialsDrawing) {
      var t = e.touches[0];
      var r = canvas.getBoundingClientRect();
      drawInitials(t.clientX - r.left, t.clientY - r.top);
    }
  });
  canvas.addEventListener('touchend', stopInitialsDraw);
}

function startInitialsDraw(x, y) {
  state.initialsDrawing = true;
  state.initialsHasContent = true;
  state.initialsCtx.beginPath();
  state.initialsCtx.moveTo(x, y);
  updateInitialsStatus();
}

function drawInitials(x, y) {
  state.initialsCtx.lineTo(x, y);
  state.initialsCtx.stroke();
}

function stopInitialsDraw() {
  state.initialsDrawing = false;
}

function clearInitials() {
  var canvas = document.getElementById('initialsCanvas');
  if (!canvas) return;
  state.initialsCtx.clearRect(0, 0, canvas.width, canvas.height);
  state.initialsHasContent = false;
  updateInitialsStatus();
}

function updateInitialsStatus() {
  var el = document.getElementById('initialsStatus');
  if (el) {
    el.textContent = state.initialsHasContent ? 'Paraphe pr\\u00eat' : 'Aucun paraphe';
    el.style.color = state.initialsHasContent ? '#22c55e' : '#a3a3a3';
  }
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
      initialsData = {
        image: initialsImage,
        timestamp: new Date(),
        hash: DATA.security.documentHash,
        metadata: {
          participantName: DATA.currentStep.participant.name,
          participantEmail: DATA.currentStep.participant.email,
          userAgent: navigator.userAgent
        },
        applyToAllPages: true,
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
    rejectionDetails: rejectionDetails || undefined,
    generalComment: generalComment || undefined,
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
  if (!container) return;

  var syncStatus = document.getElementById('syncStatus');
  var syncMessage = document.getElementById('syncMessage');

  container.style.display = 'block';

  if (status === 'syncing') {
    container.className = 'sync-status syncing';
    syncStatus.innerHTML = '<span class="sync-spinner"></span> Synchronisation...';
    syncMessage.textContent = 'Envoi en cours vers DocJourney';
  } else if (status === 'success') {
    container.className = 'sync-status success';
    syncStatus.innerHTML = '\\u2713 Synchronis\\u00e9';
    syncMessage.textContent = 'Votre r\\u00e9ponse a \\u00e9t\\u00e9 transmise automatiquement';
  } else if (status === 'error') {
    container.className = 'sync-status error';
    syncStatus.innerHTML = '\\u2717 Sync \\u00e9chou\\u00e9e';
    syncMessage.textContent = message || 'Veuillez envoyer le fichier manuellement par email';
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
`;
}
