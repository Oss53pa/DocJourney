export function generateVerificationScript(): string {
  return `
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
