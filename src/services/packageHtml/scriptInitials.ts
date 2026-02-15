export function generateInitialsScript(): string {
  return `
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

  // Collapse mobile drawer so the user can see the document
  if (window.innerWidth <= 768) {
    collapseMobileDrawer();
  }

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
`;
}
