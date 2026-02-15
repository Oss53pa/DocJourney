export function generateAnnotationScript(): string {
  return `
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
`;
}
