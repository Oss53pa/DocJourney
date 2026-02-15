import type { PackageData } from '../../types';
import { generateCoreScript } from './scriptCore';
import { generateUIScript } from './scriptUI';
import { generateDocumentScript } from './scriptDocument';
import { generateAnnotationScript } from './scriptAnnotations';
import { generateSignatureScript } from './scriptSignature';
import { generateInitialsScript } from './scriptInitials';
import { generateDecisionScript } from './scriptDecision';
import { generateVerificationScript } from './scriptVerification';

export function generateScripts(data: PackageData): string {
  const stepsJSON = JSON.stringify(data);

  const initScript = `
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
    // Populate mobile drawer with initial active tab
    if (window.innerWidth <= 768) {
      switchTab(state.activeTab, true);
      collapseMobileDrawer();
    }
  } catch(e) { console.error('Init main content error:', e); }
}
`;

  return [
    generateCoreScript(stepsJSON),
    generateUIScript(),
    generateDocumentScript(),
    generateAnnotationScript(),
    generateSignatureScript(),
    generateInitialsScript(),
    generateDecisionScript(),
    generateVerificationScript(),
    initScript,
  ].join('\n');
}
