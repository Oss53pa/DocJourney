export function generateDecisionScript(): string {
  return `
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
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ===== CRV HTML RECEIPT GENERATION =====
function downloadReceipt() {
  if (!state.returnData) {
    console.warn('downloadReceipt: no returnData');
    return;
  }

  var btns = document.querySelectorAll('.dl-receipt-btn');
  btns.forEach(function(b) { b.disabled = true; b.textContent = 'G\\u00e9n\\u00e9ration...'; });

  function resetBtns() {
    btns.forEach(function(b) { b.disabled = false; b.textContent = 'T\\u00e9l\\u00e9charger le CRV'; });
  }

  loadQRLibrary(function(err) {
    if (err) { console.warn('QR library load failed, generating without QR codes'); }
    generateReceiptHTML().then(function(html) {
    var docRef = 'DJ-' + DATA.document.id.substring(0, 8).toUpperCase();
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'CRV_' + DATA.document.name.replace(/\\.[^.]+$/, '') + '.html';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    resetBtns();
  }).catch(function(err) {
    console.error('Receipt generation error:', err);
    alert('Erreur lors de la g\\u00e9n\\u00e9ration du re\\u00e7u.');
    resetBtns();
  });
  }); // end loadQRLibrary
}

async function computeSHA256(str) {
  var data = new TextEncoder().encode(str);
  var buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

async function generateReceiptHTML() {
  var rd = state.returnData;
  var docRef = 'DJ-' + DATA.document.id.substring(0, 8).toUpperCase();
  var crvRef = 'CRV-' + docRef;
  var company = DATA.workflow.validationCompany || DATA.owner.organization || '';
  var now = new Date();
  var dateStr = formatCRVDate(now);

  // Build all steps data (previous + current)
  var allSteps = DATA.workflow.steps;
  var totalSteps = allSteps.length;
  var currentIdx = DATA.workflow.currentStepIndex;

  // Determine overall status
  var isRejected = rd.decision === 'rejected';
  var isCompleted = (currentIdx === totalSteps - 1) && !isRejected;
  var doneCount = 0;
  allSteps.forEach(function(s, i) {
    if (i < currentIdx) doneCount++;
    if (i === currentIdx) doneCount++;
  });

  var pillClass, pillText;
  if (isCompleted) {
    pillClass = 'pill-approved';
    pillText = 'Valid\\u00e9 \\u2014 ' + doneCount + '/' + totalSteps;
  } else if (isRejected) {
    pillClass = 'pill-rejected';
    pillText = 'Rejet\\u00e9 \\u2014 ' + doneCount + '/' + totalSteps;
  } else {
    pillClass = 'pill-pending';
    pillText = 'En cours \\u2014 ' + doneCount + '/' + totalSteps;
  }

  // Compute fingerprint for document
  var fpFull = await computeSHA256(crvRef + '|' + DATA.document.id + '|' + DATA.workflow.id + '|' + DATA.document.name);
  var fpShort = fpFull.substring(0, 36).toUpperCase();

  // Avatar colors
  var AVATAR_COLORS = [
    { c: '#1a1a2e', bg: '#e8e8f8' },
    { c: '#1b5e20', bg: '#e8f5e9' },
    { c: '#4a148c', bg: '#f3e5f5' },
    { c: '#bf360c', bg: '#fbe9e7' }
  ];

  function getInitials(name) {
    return name.split(' ').map(function(p) { return p[0]; }).slice(0, 2).join('').toUpperCase();
  }

  var roleCls = { approver: 'role-approbateur', validator: 'role-validateur', reviewer: 'role-consulte', signer: 'role-signataire' };

  // Build progress HTML
  var progressHtml = '';
  for (var pi = 0; pi < totalSteps; pi++) {
    var ps = allSteps[pi];
    var pStatus = getStepDisplayForCRV(ps, currentIdx, pi, rd);
    var lineClass = pStatus === 'approved' ? 'done' : pStatus === 'rejected' ? 'rejected-line' : '';
    var circleClass = pStatus === 'approved' ? 'done' : pStatus === 'rejected' ? 'rejected' : pStatus === 'pending' ? 'pending' : pStatus === 'skipped' ? 'skipped' : '';
    var sym = pStatus === 'approved' ? '&#10003;' : pStatus === 'rejected' ? '&#10007;' : pStatus === 'pending' ? '&hellip;' : pStatus === 'skipped' ? '&#8212;' : String(ps.order);
    var nameParts = ps.participant.name.split(' ');
    progressHtml += '<div class="prog-step ' + lineClass + '"><div class="prog-circle ' + circleClass + '">' + sym + '</div><div class="prog-name">' + escapeHtml(nameParts[0]) + '<br><span style="font-size:7px">' + escapeHtml(nameParts.slice(1).join(' ')) + '</span></div></div>';
  }

  // Build table rows
  var tbodyHtml = '';
  for (var ti = 0; ti < totalSteps; ti++) {
    var step = allSteps[ti];
    var displayStatus = getStepDisplayForCRV(step, currentIdx, ti, rd);
    var col = AVATAR_COLORS[ti % AVATAR_COLORS.length];
    var circClass = displayStatus === 'approved' ? 'done' : displayStatus === 'rejected' ? 'rejected' : displayStatus === 'pending' ? 'pending' : displayStatus === 'skipped' ? 'skipped' : '';
    var stepSym = displayStatus === 'approved' ? '&#10003;' : displayStatus === 'rejected' ? '&#10007;' : displayStatus === 'pending' ? '&hellip;' : displayStatus === 'skipped' ? '&#8212;' : String(step.order);

    var org = step.participant.organization || '';
    var personHtml = '<div style="display:flex;align-items:center;gap:7px"><div class="avatar" style="background:' + col.bg + ';color:' + col.c + '">' + getInitials(step.participant.name) + '</div><div><div class="p-name">' + escapeHtml(step.participant.name) + '</div><div class="p-post">' + escapeHtml(org) + '</div></div></div><span class="wf-role-badge ' + (roleCls[step.role] || '') + '">' + getRoleLabel(step.role) + '</span>';

    // Comment cell
    var commentHtml = '';
    var stepResponse = null;
    var stepCompletedAt = null;

    if (ti === currentIdx) {
      stepResponse = { decision: rd.decision, generalComment: rd.generalComment || '', annotations: rd.annotations || [], rejectionDetails: rd.rejectionDetails };
      stepCompletedAt = rd.completedAt;
    } else if (step.response) {
      stepResponse = step.response;
      stepCompletedAt = step.completedAt;
    }

    if (displayStatus === 'approved' && stepResponse) {
      var comment = stepResponse.generalComment || 'Aucun commentaire';
      commentHtml = '<div class="comment-text ok">"' + escapeHtml(comment) + '"</div>';
      if (stepResponse.rejectionDetails) {
        commentHtml += '<div class="rejection-info">' + escapeHtml(stepResponse.rejectionDetails.reason) + '</div>';
      }
      if (stepResponse.annotations && stepResponse.annotations.length > 0) {
        commentHtml += '<div class="annotations-list">';
        stepResponse.annotations.forEach(function(a) {
          commentHtml += '<span>p.' + a.position.page + ': ' + escapeHtml(a.content) + '</span>';
        });
        commentHtml += '</div>';
      }
      var timeStr = stepCompletedAt ? formatCRVTimestamp(stepCompletedAt) : '';
      var decLabel = getDecisionLabel(stepResponse.decision);
      commentHtml += '<div class="sig-date"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--muted)"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + escapeHtml(timeStr) + (decLabel ? ' \\u00b7 ' + escapeHtml(decLabel) : '') + '</div>';
    } else if (displayStatus === 'rejected' && stepResponse) {
      var rejComment = stepResponse.generalComment || '';
      var rejReason = (stepResponse.rejectionDetails || {}).reason || '';
      commentHtml = rejComment ? '<div class="comment-text rej">"' + escapeHtml(rejComment) + '"</div>' : '<div class="comment-text rej">"' + escapeHtml(rejReason || 'Document rejet\\u00e9') + '"</div>';
      if (rejReason && rejComment) commentHtml += '<div class="rejection-info">' + escapeHtml(rejReason) + '</div>';
      var rejTime = stepCompletedAt ? formatCRVTimestamp(stepCompletedAt) : '';
      commentHtml += '<div class="sig-date"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--muted)"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + escapeHtml(rejTime) + '</div>';
    } else if (displayStatus === 'pending') {
      commentHtml = '<div class="no-comment">En attente de signature</div>';
    } else if (displayStatus === 'skipped') {
      commentHtml = '<div class="no-comment">\\u00c9tape pass\\u00e9e</div>';
    } else {
      commentHtml = '<div class="no-comment">En attente de l\\u2019\\u00e9tape pr\\u00e9c\\u00e9dente</div>';
    }

    // QR cell
    var qrHtml = '';
    if (displayStatus === 'approved' || displayStatus === 'rejected') {
      var stepHash = await computeSHA256(step.id + '|' + step.participant.email + '|' + (stepCompletedAt || ''));
      var shortCode = getInitials(step.participant.name) + (ti + 1) + '-' + formatCRVDateCompact(stepCompletedAt || now) + '-' + stepHash.substring(0, 4).toUpperCase();
      // Build verification payload
      var stepPayload = btoa(unescape(encodeURIComponent(JSON.stringify({
        dn: DATA.document.name, wn: DATA.workflow.name, co: company,
        pn: step.participant.name, ro: step.role, de: stepResponse ? stepResponse.decision : '',
        ca: stepCompletedAt || '', si: step.id, pe: step.participant.email
      }))));
      var verifyUrl = location.origin + '/verify?ref=' + encodeURIComponent(crvRef) + '&h=' + encodeURIComponent(stepHash.substring(0, 12)) + '&s=' + (ti + 1) + '&d=' + encodeURIComponent(stepPayload);
      try {
        var qrDataUrl = await generateQRCode(verifyUrl);
        qrHtml = '<img src="' + qrDataUrl + '" width="42" height="42" style="display:block;margin:0 auto" alt="QR"><div class="qr-code-short" style="font-size:7px">' + escapeHtml(shortCode) + '</div>';
      } catch(e) {
        qrHtml = '<div class="qr-code-short" style="font-size:7px">' + escapeHtml(shortCode) + '</div>';
      }
    } else {
      qrHtml = '<div class="qr-pending-box"><div class="qr-pending-txt">En<br>attente</div></div>';
    }

    // Status tag
    var stagHtml = '';
    if (displayStatus === 'approved') {
      var sLabel = stepResponse ? getDecisionLabel(stepResponse.decision) : 'Approuv\\u00e9';
      stagHtml = '<span class="stag stag-a">' + escapeHtml(sLabel) + '</span>';
    } else if (displayStatus === 'rejected') {
      stagHtml = '<span class="stag stag-r">Rejet\\u00e9</span>';
    } else if (displayStatus === 'pending') {
      stagHtml = '<span class="stag stag-p">En attente</span>';
    } else if (displayStatus === 'skipped') {
      stagHtml = '<span class="stag stag-s">Pass\\u00e9e</span>';
    } else {
      stagHtml = '<span class="stag stag-w">&mdash;</span>';
    }

    tbodyHtml += '<tr><td class="td-num"><div class="step-circle ' + circClass + '">' + stepSym + '</div></td><td class="td-person">' + personHtml + '</td><td class="td-comment">' + commentHtml + '</td><td class="td-qr">' + qrHtml + '</td><td class="td-status">' + stagHtml + '</td></tr>';
  }

  // Footer QR
  var docPayload = btoa(unescape(encodeURIComponent(JSON.stringify({
    dn: DATA.document.name, wn: DATA.workflow.name, co: company,
    ca: isCompleted ? (rd.completedAt || '') : '', di: DATA.document.id, wi: DATA.workflow.id
  }))));
  var footerVerifyUrl = location.origin + '/verify?ref=' + encodeURIComponent(crvRef) + '&h=' + encodeURIComponent(fpShort) + '&d=' + encodeURIComponent(docPayload);
  var footerQrHtml = '';
  try {
    var fqr = await generateQRCode(footerVerifyUrl);
    footerQrHtml = '<img src="' + fqr + '" width="56" height="56" alt="QR" style="display:block">';
  } catch(e) {
    footerQrHtml = '<div style="width:56px;height:56px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999">QR</div>';
  }

  var description = 'Validation du document \\u00ab ' + escapeHtml(DATA.document.name) + ' \\u00bb via le circuit \\u00ab ' + escapeHtml(DATA.workflow.name) + ' \\u00bb.';

  var createdDate = DATA.generatedAt ? formatCRVDate(DATA.generatedAt) : dateStr;

  // Full CRV HTML (same format as reportService.ts)
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>CRV \\u2014 ' + escapeHtml(DATA.document.name) + '</title><link href="https://fonts.googleapis.com/css2?family=Grand+Hotel&display=swap" rel="stylesheet"><style>' + getCRVCSS() + '</style></head><body><div class="page" id="doc">'
    + '<div class="doc-header"><div class="brand-block"><div class="dj-logo">DocJourney</div><div class="dj-sub">Workflow Validation</div></div><div class="title-block"><div class="recu-eyebrow">Re\\u00e7u de validation de workflow</div><div class="doc-title">' + escapeHtml(DATA.document.name) + '</div></div><div class="meta-block"><div class="mrow"><span class="ml">R\\u00e9f.</span><span class="mv">' + escapeHtml(crvRef) + '</span></div><div class="mrow"><span class="ml">Soumis le</span><span class="mv">' + escapeHtml(createdDate) + '</span></div><div class="mrow"><span class="ml">\\u00c9tapes</span><span class="mv">' + totalSteps + ' intervenants</span></div><span class="status-pill ' + pillClass + '"><span class="pill-dot"></span>' + pillText + '</span></div></div>'
    + '<div class="sec"><div class="sec-label">Objet du document</div><div class="objet-box">' + escapeHtml(description) + '</div></div>'
    + '<div class="sec"><div class="sec-label">Progression du workflow</div><div class="progress-wrap">' + progressHtml + '</div></div>'
    + '<div class="sec" style="padding:0"><div class="sec-label" style="padding:12px 18px 8px;margin-bottom:0">D\\u00e9tail des intervenants</div><table class="wf-table"><thead><tr><th style="width:30px">#</th><th>Intervenant &amp; r\\u00f4le</th><th>Commentaire &amp; horodatage</th><th class="c" style="width:110px">Empreinte QR</th><th class="c" style="width:82px">Statut</th></tr></thead><tbody>' + tbodyHtml + '</tbody></table></div>'
    + '<div class="doc-footer"><div class="footer-qr-wrap"><div>' + footerQrHtml + '<div class="footer-qr-label">Authenticit\\u00e9 doc.</div></div><div class="footer-divider"></div></div><div><div class="footer-text"><strong>' + escapeHtml(crvRef) + '</strong> &nbsp;\\u00b7&nbsp; ' + escapeHtml(company) + ' &nbsp;\\u00b7&nbsp; DocJourney Workflow Validation</div><div class="footer-text">\\u00c9mis le ' + escapeHtml(dateStr) + ' &nbsp;\\u00b7&nbsp; Empreintes SHA-256 horodat\\u00e9es &nbsp;\\u00b7&nbsp; Authentification par QR pied de page</div><div class="footer-fp">FP: ' + escapeHtml(fpShort) + '</div></div></div>'
    + '</div></body></html>';
}

function getStepDisplayForCRV(step, currentIdx, stepIdx, rd) {
  if (stepIdx === currentIdx) {
    if (rd.decision === 'rejected' || rd.decision === 'modification_requested') return 'rejected';
    return 'approved';
  }
  if (step.status === 'completed') return 'approved';
  if (step.status === 'rejected') return 'rejected';
  if (step.status === 'skipped') return 'skipped';
  if (step.status === 'pending' || step.status === 'sent' || step.status === 'correction_requested') {
    return stepIdx <= currentIdx ? 'pending' : 'waiting';
  }
  return 'waiting';
}

function formatCRVDate(date) {
  var d = new Date(date);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

function formatCRVDateCompact(date) {
  var d = new Date(date);
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}

function formatCRVTimestamp(date) {
  var d = new Date(date);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() + ' \\u2014 ' + String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0');
}

function generateQRCode(text) {
  return new Promise(function(resolve, reject) {
    try {
      var container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
      document.body.appendChild(container);

      var qr = new QRCode(container, {
        text: text,
        width: 128,
        height: 128,
        colorDark: '#171717',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });

      setTimeout(function() {
        var canvas = container.querySelector('canvas');
        if (canvas) {
          var dataUrl = canvas.toDataURL('image/png');
          document.body.removeChild(container);
          resolve(dataUrl);
        } else {
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

function getCRVCSS() {
  return '*{box-sizing:border-box;margin:0;padding:0}:root{--ink:#111;--ink2:#3a3a3a;--muted:#888;--faint:#bbb;--line:#e4e4e4;--surface:#f7f7f6;--white:#fff;--dj:#16163a;--accent:#4f46e5}body{font-family:"Segoe UI",Arial,sans-serif;background:#eceae6;color:var(--ink);font-size:12px;padding:24px}.page{background:var(--white);max-width:860px;margin:0 auto;border:0.5px solid #d0d0d0;border-radius:6px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)}.doc-header{display:grid;grid-template-columns:148px 1fr 196px;border-bottom:2px solid var(--dj)}.brand-block{padding:16px 14px;border-right:0.5px solid var(--line);display:flex;flex-direction:column;justify-content:center}.dj-logo{font-family:"Grand Hotel",cursive;font-size:22px;font-weight:400;color:var(--ink);letter-spacing:.3px}.dj-sub{font-size:7.5px;text-transform:uppercase;letter-spacing:1.8px;color:var(--muted);margin-top:1px}.title-block{padding:14px 18px;border-right:0.5px solid var(--line)}.recu-eyebrow{font-size:8px;text-transform:uppercase;letter-spacing:2px;color:var(--muted);margin-bottom:5px}.doc-title{font-size:15px;font-weight:700;color:var(--dj);line-height:1.3}.meta-block{padding:14px 14px;font-size:11px}.mrow{display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;border-bottom:0.5px solid #f2f2f2}.mrow:last-of-type{border-bottom:none}.ml{color:var(--muted);font-size:10px}.mv{font-weight:500;color:var(--ink);font-size:11px}.status-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:.5px;margin-top:8px}.pill-approved{background:#e6f4ea;border:0.5px solid #81c784;color:#1b5e20}.pill-pending{background:#fff8e1;border:0.5px solid #ffd54f;color:#6d4c00}.pill-rejected{background:#ffebee;border:0.5px solid #ef9a9a;color:#b71c1c}.pill-dot{width:6px;height:6px;border-radius:50%}.pill-approved .pill-dot{background:#2e7d32}.pill-pending .pill-dot{background:#f9a825}.pill-rejected .pill-dot{background:#c62828}.sec{padding:13px 18px;border-bottom:0.5px solid var(--line)}.sec-label{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.8px;color:var(--muted);margin-bottom:8px;display:flex;align-items:center;gap:8px}.sec-label::after{content:"";flex:1;height:0.5px;background:var(--line)}.objet-box{background:var(--surface);border-left:3px solid var(--dj);padding:9px 13px;font-size:11.5px;color:var(--ink2);line-height:1.75;border-radius:0 3px 3px 0}.progress-wrap{display:flex;align-items:center}.prog-step{flex:1;display:flex;flex-direction:column;align-items:center;position:relative}.prog-step:not(:last-child)::after{content:"";position:absolute;top:10px;left:50%;width:100%;height:1.5px;background:var(--line);z-index:0}.prog-step.done::after{background:#4caf50}.prog-step.rejected-line::after{background:#ef5350}.prog-circle{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--line);background:var(--white);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:var(--muted);z-index:1;position:relative}.prog-circle.done{border-color:#4caf50;background:#e8f5e9;color:#1b5e20}.prog-circle.pending{border-color:#ffd54f;background:#fff8e1;color:#6d4c00}.prog-circle.rejected{border-color:#ef5350;background:#ffebee;color:#b71c1c}.prog-circle.skipped{border-color:#bdbdbd;background:#f5f5f5;color:#9e9e9e}.prog-name{font-size:8px;color:var(--muted);margin-top:4px;text-align:center;max-width:70px;line-height:1.3}.wf-table{width:100%;border-collapse:collapse}.wf-table thead tr{background:var(--dj)}.wf-table thead th{color:#fff;padding:7px 10px;font-size:8.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-align:left;white-space:nowrap}.wf-table thead th.c{text-align:center}.wf-table tbody tr{border-bottom:0.5px solid var(--line)}.wf-table tbody tr:last-child{border-bottom:none}.wf-table tbody tr:nth-child(even) td{background:#fdfdfb}td.td-num{width:30px;padding:12px 8px;text-align:center;border-right:0.5px solid var(--line);vertical-align:top}.step-circle{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;margin:0 auto;border:1.5px solid var(--line);background:var(--white);color:var(--muted)}.step-circle.done{border-color:#4caf50;background:#e8f5e9;color:#1b5e20}.step-circle.pending{border-color:#ffd54f;background:#fff8e1;color:#6d4c00}.step-circle.rejected{border-color:#ef5350;background:#ffebee;color:#b71c1c}.step-circle.skipped{border-color:#bdbdbd;background:#f5f5f5;color:#9e9e9e}td.td-person{width:185px;padding:11px 10px;border-right:0.5px solid var(--line);vertical-align:top}.avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}.p-name{font-size:11.5px;font-weight:600;color:var(--ink);line-height:1.3}.p-post{font-size:9.5px;color:var(--muted);margin-top:1px}.wf-role-badge{display:inline-block;margin-top:5px;padding:2px 7px;border-radius:2px;font-size:8.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}.role-approbateur{background:#e8eaf6;color:#283593;border:0.5px solid #9fa8da}.role-validateur{background:#e0f2f1;color:#004d40;border:0.5px solid #80cbc4}.role-consulte{background:#fff3e0;color:#bf360c;border:0.5px solid #ffcc80}.role-signataire{background:#fce4ec;color:#880e4f;border:0.5px solid #f48fb1}td.td-comment{padding:11px 10px;border-right:0.5px solid var(--line);vertical-align:top;min-width:160px}.comment-text{font-size:11px;color:var(--ink2);line-height:1.65;background:var(--surface);padding:6px 9px;border-radius:3px;border-left:2px solid var(--line)}.comment-text.ok{border-left-color:#4caf50}.comment-text.rej{border-left-color:#ef5350}.no-comment{font-size:10px;color:var(--faint);font-style:italic}.sig-date{font-size:9px;color:var(--muted);margin-top:5px;display:flex;align-items:center;gap:4px}.rejection-info{font-size:10px;color:#c62828;margin-top:4px;font-style:italic}.annotations-list{margin-top:4px;font-size:10px;color:var(--muted)}.annotations-list span{display:block;margin-top:2px}td.td-qr{width:80px;padding:6px 4px;text-align:center;border-right:0.5px solid var(--line);vertical-align:middle}.qr-pending-box{display:flex;align-items:center;justify-content:center;width:42px;height:42px;background:var(--surface);border:0.5px dashed var(--line);border-radius:4px;margin:0 auto}.qr-pending-txt{font-size:7px;color:var(--faint);text-align:center;line-height:1.5}.qr-code-short{font-family:"Courier New",monospace;font-size:7.5px;color:var(--ink2);font-weight:600;letter-spacing:.3px;margin-top:3px;word-break:break-all}td.td-status{width:82px;padding:11px 8px;text-align:center;vertical-align:top}.stag{display:inline-block;padding:3px 8px;border-radius:3px;font-size:9px;font-weight:700;letter-spacing:.4px}.stag-a{background:#e6f4ea;border:0.5px solid #81c784;color:#1b5e20}.stag-p{background:#fff8e1;border:0.5px solid #ffd54f;color:#6d4c00}.stag-r{background:#ffebee;border:0.5px solid #ef9a9a;color:#b71c1c}.stag-s{background:#f5f5f5;border:0.5px solid #e0e0e0;color:#9e9e9e}.stag-w{background:#f5f5f5;border:0.5px solid #e0e0e0;color:#bbb}.doc-footer{padding:13px 18px;display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center;background:var(--surface);border-top:1.5px solid var(--dj)}.footer-qr-wrap{display:flex;align-items:center;gap:12px;flex-shrink:0}.footer-qr-label{font-size:7.5px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-top:3px;text-align:center}.footer-divider{width:0.5px;height:52px;background:var(--line)}.footer-text{font-size:9px;color:var(--muted);line-height:1.9}.footer-text strong{color:var(--ink2);font-size:9.5px}.footer-fp{font-family:"Courier New",monospace;font-size:7.5px;color:var(--faint);margin-top:2px;letter-spacing:.3px}@media print{body{background:#fff;padding:0}.page{box-shadow:none;border:none}}';
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

function closeWindow() {
  // Try multiple close strategies
  window.close();
  try { window.open('', '_self').close(); } catch(e) {}
  // Fallback after a short delay if still open
  setTimeout(function() {
    if (!window.closed) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#525252;text-align:center;background:#f9fafb"><div><h2 style="margin-bottom:8px">Vous pouvez fermer cet onglet</h2><p style="color:#6b7280">Le navigateur ne permet pas la fermeture automatique.<br>Utilisez <strong>Ctrl+W</strong> ou fermez l\\u2019onglet manuellement.</p></div></div>';
    }
  }, 300);
}
`;
}
