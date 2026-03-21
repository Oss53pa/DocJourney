export function generateSignatureScript(): string {
  return `
// ===== PEN SIMULATION ENGINE =====
// Variable-width filled-outline rendering for realistic ink strokes.
// Each stroke is rendered as a filled polygon whose width varies with
// velocity (fast = thin, slow = thick) and tapers at start/end.

var PEN = {
  minWidth: 0.8,
  maxWidth: 4.5,
  thinning: 0.65,       // how much velocity thins the stroke
  smoothing: 0.4,       // point-smoothing factor (0=none, 1=max)
  taperStart: 12,       // px of taper at stroke start
  taperEnd: 40,         // px of taper at stroke end
  velocitySmooth: 0.55, // exponential smoothing on velocity
  minPointDist: 1.5     // minimum px between recorded points
};

function createPoint(x, y, pressure) {
  return { x: x, y: y, pressure: pressure || 0.5, time: Date.now() };
}

// --- Point smoothing (Laplacian, multiple passes) ---
function smoothPoints(points, factor, passes) {
  if (points.length < 3) return points.slice();
  var pts = points.slice();
  for (var pass = 0; pass < (passes || 2); pass++) {
    var out = [pts[0]];
    for (var i = 1; i < pts.length - 1; i++) {
      var p = pts[i], prev = pts[i - 1], next = pts[i + 1];
      out.push({
        x: p.x + ((prev.x + next.x) / 2 - p.x) * factor,
        y: p.y + ((prev.y + next.y) / 2 - p.y) * factor,
        pressure: p.pressure,
        time: p.time
      });
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

// --- Compute per-point width ---
function computeWidths(points) {
  var widths = [];
  var prevVel = 0;
  var totalLen = 0;
  // Precompute total arc length for taper calculations
  var segLens = [0];
  for (var i = 1; i < points.length; i++) {
    var dx = points[i].x - points[i - 1].x;
    var dy = points[i].y - points[i - 1].y;
    totalLen += Math.sqrt(dx * dx + dy * dy);
    segLens.push(totalLen);
  }
  if (totalLen < 1) totalLen = 1;

  for (var i = 0; i < points.length; i++) {
    // Velocity
    var vel = 0;
    if (i > 0) {
      var dx = points[i].x - points[i - 1].x;
      var dy = points[i].y - points[i - 1].y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var dt = Math.max(1, points[i].time - points[i - 1].time);
      vel = dist / dt;
    }
    vel = prevVel * PEN.velocitySmooth + vel * (1 - PEN.velocitySmooth);
    prevVel = vel;

    // Base width from velocity (inverse: faster = thinner)
    var t = Math.min(1, vel * 0.12);
    var w = PEN.maxWidth - (PEN.maxWidth - PEN.minWidth) * t * PEN.thinning;

    // Pressure influence
    w *= (0.4 + points[i].pressure * 0.6);

    // Start taper
    if (PEN.taperStart > 0 && segLens[i] < PEN.taperStart) {
      w *= Math.max(0.05, segLens[i] / PEN.taperStart);
    }
    // End taper
    var distFromEnd = totalLen - segLens[i];
    if (PEN.taperEnd > 0 && distFromEnd < PEN.taperEnd) {
      w *= Math.max(0.01, distFromEnd / PEN.taperEnd);
    }

    widths.push(Math.max(0.2, w));
  }
  return widths;
}

// --- Build outline polygon from points + widths ---
function buildOutline(points, widths) {
  if (points.length < 2) return [];
  var left = [];
  var right = [];

  for (var i = 0; i < points.length; i++) {
    var p = points[i];
    var hw = widths[i] / 2; // half-width

    // Perpendicular direction (normal to path tangent)
    var nx, ny;
    if (i === 0) {
      nx = -(points[1].y - p.y);
      ny = (points[1].x - p.x);
    } else if (i === points.length - 1) {
      nx = -(p.y - points[i - 1].y);
      ny = (p.x - points[i - 1].x);
    } else {
      // Average tangent of neighbors for smoother normals
      nx = -(points[i + 1].y - points[i - 1].y);
      ny = (points[i + 1].x - points[i - 1].x);
    }
    var len = Math.sqrt(nx * nx + ny * ny) || 1;
    nx /= len;
    ny /= len;

    left.push({ x: p.x + nx * hw, y: p.y + ny * hw });
    right.push({ x: p.x - nx * hw, y: p.y - ny * hw });
  }

  // Build closed outline: left forward, then right backward
  var outline = [];
  for (var i = 0; i < left.length; i++) outline.push(left[i]);
  for (var i = right.length - 1; i >= 0; i--) outline.push(right[i]);
  return outline;
}

// --- Render outline as filled path with smooth quadratic curves ---
function renderOutline(ctx, outline) {
  if (outline.length < 4) return;
  ctx.beginPath();
  ctx.moveTo(outline[0].x, outline[0].y);
  for (var i = 1; i < outline.length - 1; i++) {
    var curr = outline[i];
    var next = outline[i + 1];
    var mx = (curr.x + next.x) / 2;
    var my = (curr.y + next.y) / 2;
    ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
  }
  var last = outline[outline.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.closePath();
  ctx.fill();
}

// --- High-level: render a single stroke (array of points) ---
function renderStroke(ctx, points, color) {
  if (points.length < 2) {
    // Single dot
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, PEN.maxWidth * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    return;
  }
  var smoothed = smoothPoints(points, PEN.smoothing, 3);
  var widths = computeWidths(smoothed);
  var outline = buildOutline(smoothed, widths);
  ctx.fillStyle = color;
  renderOutline(ctx, outline);
}

// --- Render all completed strokes ---
function renderAllStrokes(ctx, strokes, color, canvasW, canvasH) {
  ctx.clearRect(0, 0, canvasW, canvasH);
  for (var i = 0; i < strokes.length; i++) {
    renderStroke(ctx, strokes[i], color);
  }
}

// ===== SIGNATURE =====
function resizeSignatureCanvas() {
  var canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;

  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.parentElement.getBoundingClientRect();
  var width = Math.floor(rect.width);
  if (width < 10) return;
  var height = 220;

  var currentW = Math.round(parseFloat(canvas.style.width) || 0);
  if (currentW === width) return;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  state.signatureCtx = canvas.getContext('2d');
  state.signatureCtx.scale(dpr, dpr);

  // Redraw existing strokes after resize
  if (state.sigStrokes && state.sigStrokes.length > 0) {
    redrawAllStrokes();
  }
}

function setupSignature() {
  var canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;

  state.sigStrokes = [];
  state.sigColor = '#171717';

  resizeSignatureCanvas();

  // Use Pointer Events for unified mouse/touch/stylus handling
  canvas.addEventListener('pointerdown', function(e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    var r = canvas.getBoundingClientRect();
    var pressure = (e.pointerType === 'pen' && e.pressure > 0 && e.pressure < 1) ? e.pressure : 0.5;
    if (e.pointerType === 'pen' && e.pressure > 0 && e.pressure < 1) {
      state.sigRealPressure = true;
    }
    startDraw(e.clientX - r.left, e.clientY - r.top, pressure);
  });
  canvas.addEventListener('pointermove', function(e) {
    if (!state.signatureDrawing) return;
    e.preventDefault();
    var r = canvas.getBoundingClientRect();
    var pressure = state.sigRealPressure ? e.pressure : 0.5;
    draw(e.clientX - r.left, e.clientY - r.top, pressure);
  });
  canvas.addEventListener('pointerup', stopDraw);
  canvas.addEventListener('pointerleave', function(e) {
    if (state.signatureDrawing && !canvas.hasPointerCapture(e.pointerId)) {
      stopDraw();
    }
  });
  canvas.addEventListener('pointercancel', stopDraw);

  // Prevent touch scrolling on canvas
  canvas.style.touchAction = 'none';
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

  var last = state.sigLastPoint;
  if (last) {
    var dx = x - last.x;
    var dy = y - last.y;
    if (Math.sqrt(dx * dx + dy * dy) < PEN.minPointDist) return;
  }

  var pt = createPoint(x, y, pressure);
  state.sigPoints.push(pt);
  state.sigLastPoint = pt;
}

function renderSigFrame() {
  if (!state.signatureDrawing) return;

  // Redraw completed strokes + live stroke
  var canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  var ctx = state.signatureCtx;
  var dpr = window.devicePixelRatio || 1;
  var w = canvas.width / dpr;
  var h = canvas.height / dpr;
  var color = state.sigColor || '#171717';

  renderAllStrokes(ctx, state.sigStrokes, color, w, h);
  // Draw current live stroke on top
  if (state.sigPoints && state.sigPoints.length >= 2) {
    renderStroke(ctx, state.sigPoints, color);
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

  // Save completed stroke
  if (state.sigPoints && state.sigPoints.length >= 2) {
    state.sigStrokes.push(state.sigPoints.slice());
  }

  state.sigPoints = [];
  state.sigLastPoint = null;

  // Final clean render
  redrawAllStrokes();
}

function redrawAllStrokes() {
  var canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  var ctx = state.signatureCtx;
  var dpr = window.devicePixelRatio || 1;
  var color = state.sigColor || '#171717';
  renderAllStrokes(ctx, state.sigStrokes, color, canvas.width / dpr, canvas.height / dpr);
}

function clearSignature() {
  var canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  var dpr = window.devicePixelRatio || 1;
  state.signatureCtx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  state.signatureHasContent = false;
  state.sigPoints = [];
  state.sigStrokes = [];
  state.sigLastPoint = null;
  updateSigStatus();
}

function setSigColor(color) {
  state.sigColor = color;
  var btns = document.querySelectorAll('.sig-color-btn');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-color') === color);
  });
  if (state.sigStrokes && state.sigStrokes.length > 0) {
    redrawAllStrokes();
  }
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
  var tabs = document.querySelectorAll('.sig-tab');
  tabs.forEach(function(tab) {
    var label = tab.textContent.trim().toLowerCase();
    var tabSource = label === 'dessiner' ? 'draw' : label === 'importer' ? 'import' : 'saved';
    tab.classList.toggle('active', tabSource === source);
  });
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

  draggable.style.cursor = 'grab';
  if (resizeHandle) resizeHandle.style.cursor = 'nwse-resize';

  function onMouseDown(e) {
    if (resizeHandle && resizeHandle.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    state.sigDragging = true;
    draggable.style.cursor = 'grabbing';
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
      var newW, newH;
      if (e.shiftKey) {
        newW = Math.max(40, Math.min(600, state.sigResizeOrigin.w + dx));
        newH = Math.max(20, Math.min(400, state.sigResizeOrigin.h + dy));
      } else {
        var delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
        newW = Math.max(40, Math.min(600, state.sigResizeOrigin.w + delta));
        var ratio = newW / state.sigResizeOrigin.w;
        newH = Math.max(20, state.sigResizeOrigin.h * ratio);
      }
      var img = document.getElementById('sigDraggableImg');
      if (img) {
        img.style.maxWidth = newW + 'px';
        img.style.maxHeight = newH + 'px';
      }
      state.sigScale = newW / 200;
    }
  }

  function onMouseUp() {
    if (state.sigDragging) {
      state.sigDragging = false;
      draggable.style.cursor = 'grab';
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

  draggable.addEventListener('mousedown', onMouseDown);
  if (resizeHandle) resizeHandle.addEventListener('mousedown', onResizeDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  draggable.addEventListener('click', function(e) { e.stopPropagation(); });

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
      var delta = (dx + dy) / 2;
      var newW = Math.max(40, Math.min(600, state.sigResizeOrigin.w + delta));
      var ratio = newW / state.sigResizeOrigin.w;
      var newH = Math.max(20, state.sigResizeOrigin.h * ratio);
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

  if (window.innerWidth <= 768) {
    collapseMobileDrawer();
  }

  img.src = sigImage;
  img.style.maxWidth = (200 * state.sigScale) + 'px';
  img.style.maxHeight = (80 * state.sigScale) + 'px';

  overlay.style.display = 'block';

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
  document.addEventListener('contextmenu', function(e) {
    if (e.target.closest('.signature-zone, .sig-draggable, .sig-placement-overlay')) {
      e.preventDefault();
    }
  });
  document.addEventListener('dragstart', function(e) {
    if (e.target.closest('.signature-zone, .sig-draggable, .sig-placement-overlay')) {
      e.preventDefault();
    }
  });
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 's')) {
      if (document.activeElement && document.activeElement.closest('.signature-zone, .sig-placement-overlay')) {
        e.preventDefault();
      }
    }
  });
}

function applyWatermark(srcCanvas) {
  var wCanvas = document.createElement('canvas');
  wCanvas.width = srcCanvas.width;
  wCanvas.height = srcCanvas.height;
  var ctx = wCanvas.getContext('2d');
  ctx.drawImage(srcCanvas, 0, 0);
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
