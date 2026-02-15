export function generateCoreScript(stepsJSON: string): string {
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
`;
}
