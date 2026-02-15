export function generateDecisionScript(): string {
  return `
// ===== DECISION FLOW =====
function showApprovalConfirmation() {
  var commentCount = state.myAnnotations.length;
  var generalComment = (document.getElementById('generalComment') || {}).value || '';
  if (!generalComment.trim()) {
    alert('Veuillez saisir une note avant de valider.');
    return;
  }
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
  var generalComment = (document.getElementById('generalComment') || {}).value || '';
  if (!generalComment.trim()) {
    alert('Veuillez saisir une note avant de valider.');
    return;
  }
  showModal('modificationModal');
}

function showRejectionConfirmation() {
  var generalComment = (document.getElementById('generalComment') || {}).value || '';
  if (!generalComment.trim()) {
    alert('Veuillez saisir une note avant de valider.');
    return;
  }
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
