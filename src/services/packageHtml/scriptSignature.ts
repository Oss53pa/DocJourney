export function generateSignatureScript(): string {
  return `
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

  // Collapse mobile drawer so the user can see the document
  if (window.innerWidth <= 768) {
    collapseMobileDrawer();
  }

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
`;
}
