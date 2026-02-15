export function generateUIScript(): string {
  return `
// ===== TAB SYSTEM =====
var _movedMobilePane = null;
var _tabContentContainer = null;

function restoreMobilePane() {
  if (_movedMobilePane && _tabContentContainer) {
    _tabContentContainer.appendChild(_movedMobilePane);
    _movedMobilePane = null;
  }
}

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

  // Move actual DOM node to mobile drawer (preserves event listeners, canvas state, etc.)
  if (isMobile) {
    restoreMobilePane();

    var activePane = document.querySelector('.tab-pane.active');
    var drawer = document.getElementById('mobileDrawerContent');
    if (activePane && drawer) {
      if (!_tabContentContainer) {
        _tabContentContainer = activePane.parentElement;
      }
      drawer.appendChild(activePane);
      _movedMobilePane = activePane;
    }
    expandMobileDrawer();
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
      // Moving from mobile to desktop: restore pane to side panel
      if (!nowMobile) {
        restoreMobilePane();
      }
      // Re-setup signature canvas on resize
      setupSignature();
    }
  });
}
`;
}
