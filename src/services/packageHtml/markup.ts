import type { PackageData } from '../../types';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getRoleLabel(role: string): string {
  return ({ reviewer: 'Annotateur', validator: 'Validateur', approver: 'Approbateur', signer: 'Signataire' } as Record<string, string>)[role] || role;
}

function getRoleAction(role: string): string {
  return ({ reviewer: 'Annotation', validator: 'Validation', approver: 'Approbation', signer: 'Signature' } as Record<string, string>)[role] || role;
}

function getDecisionLabel(d: string): string {
  return ({ approved: 'Approuv\u00e9', rejected: 'Rejet\u00e9', validated: 'Valid\u00e9', reviewed: 'Annot\u00e9', modification_requested: 'Modification demand\u00e9e' } as Record<string, string>)[d] || d;
}

function getParticipantColor(index: number): string {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'];
  return colors[index % colors.length];
}

function formatDateStr(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} \u00e0 ${hh}:${min}`;
}

export function generateMarkup(data: PackageData): string {
  return `
${headerHTML(data)}
${instructionsHTML(data)}
<div class="main-layout${data.currentStep.instructions ? ' has-instructions' : ''}" id="mainLayout">
  ${viewerAreaHTML()}
  ${sidePanelHTML(data)}
</div>
${modalsHTML(data)}
${downloadScreenHTML(data)}
${mobileDrawerHTML()}
`;
}

function headerHTML(data: PackageData): string {
  const docRef = `DJ-${data.document.id.substring(0, 8).toUpperCase()}`;
  return `
<div class="header">
  <div class="header-left">
    <h1 class="brand-font">DocJourney</h1>
    <div>
      <div class="header-doc" title="${escapeHtml(data.document.name)}">${escapeHtml(data.document.name)}</div>
      <div class="header-ref">${docRef}</div>
    </div>
  </div>
  <div class="header-right">
    <div class="participant-badge">
      <span class="name">${escapeHtml(data.currentStep.participant.name)}</span>
      <span class="role">${getRoleLabel(data.currentStep.role)}</span>
    </div>
    <div class="header-actions">
      <button class="icon-btn toggle-panel-btn" id="togglePanelBtn" onclick="toggleSidePanel()" title="Afficher/masquer le panneau"><span id="togglePanelIcon">&#x25e8;</span><span class="toggle-indicator" id="panelIndicator"></span></button>
      <button class="icon-btn" onclick="toggleFullscreen()" title="Plein \u00e9cran">&#x26F6;</button>
      <button class="icon-btn" onclick="showHelp()" title="Aide">?</button>
    </div>
  </div>
</div>`;
}

function instructionsHTML(data: PackageData): string {
  if (!data.currentStep.instructions) return '';
  return `
<div class="instructions-bar" onclick="toggleInstructions()">
  <span class="toggle" id="instrToggle">&#9654;</span>
  <strong>Instructions :</strong> <span style="opacity:0.8">${escapeHtml(data.currentStep.instructions).substring(0, 80)}${data.currentStep.instructions.length > 80 ? '...' : ''}</span>
</div>
<div class="instructions-content" id="instrContent">
  ${escapeHtml(data.currentStep.instructions)}
</div>`;
}

function viewerAreaHTML(): string {
  return `
<div class="viewer-area">
  <div class="viewer-toolbar">
    <div class="toolbar-group">
      <button class="toolbar-btn" onclick="toggleThumbnails()" title="Miniatures">&#9776;</button>
      <div class="toolbar-sep"></div>
      <button class="toolbar-btn" onclick="prevPage()" title="Page pr\u00e9c\u00e9dente">&#9664;</button>
      <input type="text" class="page-input" id="pageInput" value="1" onchange="goToPage(this.value)" />
      <span class="page-total" id="pageTotal">/ 1</span>
      <button class="toolbar-btn" onclick="nextPage()" title="Page suivante">&#9654;</button>
    </div>
    <div class="toolbar-group">
      <button class="toolbar-btn" onclick="zoomOut()" title="Zoom -">&#8722;</button>
      <span class="zoom-display" id="zoomDisplay">100%</span>
      <button class="toolbar-btn" onclick="zoomIn()" title="Zoom +">+</button>
      <button class="toolbar-btn" onclick="fitToWidth()" title="Ajuster largeur">&#x21D4;</button>
      <button class="toolbar-btn" onclick="fitToPage()" title="Ajuster page">&#x25A3;</button>
      <div class="toolbar-sep"></div>
      <button class="toolbar-btn" id="btnAnnotateMode" onclick="toggleAnnotateMode()" title="Mode annotation">&#9998;</button>
    </div>
  </div>
  <div class="viewer-viewport" id="viewerViewport">
    <div class="viewer-content" id="viewerContent">
      <div class="doc-render" id="docRender">
        <p style="color:#737373;text-align:center;padding:60px">Chargement du document...</p>
      </div>
      <div class="annotation-overlay" id="annotationOverlay"></div>
    </div>
  </div>
  <div class="sig-placement-overlay" id="sigPlacementOverlay" style="display:none">
    <div class="sig-draggable" id="sigDraggable">
      <img id="sigDraggableImg" draggable="false" oncontextmenu="return false" />
      <div class="sig-drag-handle">D\u00e9placez pour positionner \u2022 Coin = redimensionner</div>
      <div class="sig-resize-handle" id="sigResizeHandle"></div>
    </div>
  </div>
</div>`;
}

function sidePanelHTML(data: PackageData): string {
  return `
<div class="side-panel">
  <div class="tab-bar">
    <button class="tab-btn active" data-tab="position" onclick="switchTab('position')">Position</button>
    <button class="tab-btn" data-tab="comments" onclick="switchTab('comments')">Commentaires</button>
    <button class="tab-btn" data-tab="notes" onclick="switchTab('notes')">Mes notes</button>
    <button class="tab-btn" data-tab="decision" onclick="switchTab('decision')">D\u00e9cision</button>
  </div>
  <div class="tab-content">
    ${positionTabHTML(data)}
    ${commentsTabHTML(data)}
    ${notesTabHTML()}
    ${decisionTabHTML(data)}
  </div>
</div>`;
}

function positionTabHTML(data: PackageData): string {
  const steps = data.workflow.totalSteps;
  const current = data.workflow.currentStepIndex;

  let journeyHTML = '<div class="journey-tracker">';
  for (let i = 0; i < steps; i++) {
    let stepClass = 'pending';
    let dotContent = String(i + 1);
    let nameStr = '...';
    let roleStr = '';
    let dateStr = '';
    let decisionHTML = '';

    if (i < current && data.previousSteps[i]) {
      const ps = data.previousSteps[i];
      const isRejected = ps.decision === 'rejected';
      const isMod = ps.decision === 'modification_requested';
      stepClass = isRejected ? 'rejected' : isMod ? 'modification' : 'done';
      dotContent = isRejected ? '&#10007;' : isMod ? '!' : '&#10003;';
      nameStr = escapeHtml(ps.participant.name);
      roleStr = getRoleAction(ps.role);
      dateStr = formatDateStr(ps.completedAt);
      const tagClass = isRejected ? 'negative' : isMod ? 'warning' : 'positive';
      decisionHTML = `<div class="decision-tag ${tagClass}">${getDecisionLabel(ps.decision)}</div>`;
    } else if (i === current) {
      stepClass = 'current';
      dotContent = '&#9679;';
      nameStr = 'VOUS (' + escapeHtml(data.currentStep.participant.name) + ')';
      roleStr = getRoleAction(data.currentStep.role);
    }

    journeyHTML += `
    <div class="journey-step ${stepClass}">
      <div class="journey-dot">${dotContent}</div>
      <div class="journey-info">
        <div class="name">\u00c9tape ${i + 1} — ${nameStr}</div>
        ${roleStr ? `<span class="role-badge">${roleStr}</span>` : ''}
        ${dateStr ? `<div class="date">${dateStr}</div>` : ''}
        ${decisionHTML}
      </div>
    </div>`;
  }
  journeyHTML += '</div>';

  // Current step info card
  const currentStepCard = `
  <div class="current-step-card">
    <h4>\u00c9tape actuelle (${data.currentStep.order}/${steps})</h4>
    <p>R\u00f4le : <strong>${getRoleLabel(data.currentStep.role)}</strong></p>
    <p>Participant : <strong>${escapeHtml(data.currentStep.participant.name)}</strong></p>
    ${data.currentStep.instructions ? `<p style="margin-top:6px;font-size:12px;opacity:0.8">${escapeHtml(data.currentStep.instructions)}</p>` : ''}
  </div>`;

  // History cards (expandable)
  let historyHTML = '';
  if (data.previousSteps.length > 0) {
    historyHTML = '<div style="margin-top:16px"><div style="font-size:11px;font-weight:400;text-transform:uppercase;letter-spacing:0.05em;color:#a3a3a3;margin-bottom:8px">Historique</div>';
    data.previousSteps.forEach((ps, i) => {
      const isRejected = ps.decision === 'rejected';
      const isMod = ps.decision === 'modification_requested';
      const color = ps.color || getParticipantColor(i);
      const decisionClass = isRejected ? 'negative' : isMod ? 'warning' : 'positive';
      historyHTML += `
      <div class="history-card" style="border-left:3px solid ${color}">
        <div class="history-card-header" onclick="toggleHistory(this)">
          <div class="left">
            <span class="step-dot" style="background:${color}"></span>
            <span class="step-name">${escapeHtml(ps.participant.name)}</span>
            <span class="decision-tag ${decisionClass}" style="font-size:10px;padding:1px 6px">${getDecisionLabel(ps.decision)}</span>
          </div>
          <span class="chevron">&#9660;</span>
        </div>
        <div class="history-card-body">
          <div class="history-card-body-inner">
            <div class="meta">${getRoleLabel(ps.role)} \u2014 ${formatDateStr(ps.completedAt)}</div>
            ${ps.generalComment ? `<div class="comment">"${escapeHtml(ps.generalComment)}"</div>` : ''}
            ${ps.annotationCount > 0 ? `<div class="ann-count">${ps.annotationCount} annotation(s)</div>` : ''}
          </div>
        </div>
      </div>`;
    });
    historyHTML += '</div>';
  }

  return `
  <div class="tab-pane active" id="tabPosition">
    ${journeyHTML}
    ${currentStepCard}
    ${historyHTML}
  </div>`;
}

function commentsTabHTML(data: PackageData): string {
  if (data.allAnnotations.length === 0) {
    return `
    <div class="tab-pane" id="tabComments">
      <div style="text-align:center;padding:40px 20px;color:#a3a3a3;font-size:13px">
        Aucun commentaire sur ce document pour le moment.
      </div>
    </div>`;
  }

  // Group by page
  const byPage: Record<number, typeof data.allAnnotations> = {};
  data.allAnnotations.forEach(a => {
    const page = a.position.page;
    if (!byPage[page]) byPage[page] = [];
    byPage[page].push(a);
  });

  let html = '';
  const pages = Object.keys(byPage).map(Number).sort((a, b) => a - b);
  pages.forEach(page => {
    html += `<div class="page-group"><div class="page-group-title">Page ${page}</div>`;
    byPage[page].forEach(ann => {
      const typeIcon: Record<string, string> = { comment: '\u{1F4AC}', highlight: '\u{1F7E8}', pin: '\u{1F4CC}' };
      const typeLabel: Record<string, string> = { comment: 'Commentaire', highlight: 'Surlignage', pin: '\u00c9pingle' };
      const icon = typeIcon[ann.type] || '';
      const label = typeLabel[ann.type] || ann.type;
      html += `
      <div class="comment-card" data-ann-id="${ann.id}" data-ann-page="${page}"
           style="border-left-color:${ann.color};background:${ann.color}10"
           onmouseenter="highlightOverlayItem('${ann.id}', true)"
           onmouseleave="highlightOverlayItem('${ann.id}', false)">
        <div class="text">${icon} ${escapeHtml(ann.content)}</div>
        <div class="meta">
          <span class="dot" style="background:${ann.color}"></span>
          ${escapeHtml(ann.participantName)} \u2014 ${label}
        </div>
        <div class="card-actions">
          <a class="goto-link" onclick="goToAnnotation(${page}, '${ann.id}')">Voir dans le document &#x2192;</a>
          <button class="reply-btn" onclick="replyToAnnotation('${ann.id}', '${escapeHtml(ann.participantName)}')">R\u00e9pondre</button>
        </div>
      </div>`;
    });
    html += '</div>';
  });

  return `
  <div class="tab-pane" id="tabComments">
    ${html}
  </div>`;
}

function notesTabHTML(): string {
  return `
  <div class="tab-pane" id="tabNotes">
    <div class="note-form">
      <label>Ajouter une annotation</label>
      <div class="note-type-row">
        <button class="note-type-btn active" data-type="comment" onclick="setAnnotationType('comment', this)">&#9998; Commentaire</button>
        <button class="note-type-btn" data-type="highlight" onclick="setAnnotationType('highlight', this)">&#128396; Surligner</button>
        <button class="note-type-btn" data-type="pin" onclick="setAnnotationType('pin', this)">&#128204; \u00c9pingler</button>
      </div>
      <textarea id="annotationText" placeholder="Saisissez votre annotation..." maxlength="500"></textarea>
      <div class="char-count"><span id="annotationCharCount">0</span>/500</div>
      <div class="note-actions">
        <button class="btn btn-primary btn-sm" onclick="saveAnnotation()">Ajouter</button>
      </div>
    </div>
    <div id="myAnnotationsList"></div>
    <div class="general-comment-section">
      <label style="display:block;font-size:12px;font-weight:400;color:#525252;margin-bottom:6px">Commentaire g\u00e9n\u00e9ral</label>
      <textarea id="generalComment" placeholder="Votre commentaire g\u00e9n\u00e9ral sur le document..." maxlength="500"></textarea>
      <div class="char-count"><span id="generalCharCount">0</span>/500</div>
    </div>
  </div>`;
}

function decisionTabHTML(data: PackageData): string {
  const role = data.currentStep.role;
  const approveLabels: Record<string, string> = {
    reviewer: '&#10003; MARQUER COMME ANNOT\u00c9',
    validator: '&#10003; VALIDER',
    approver: '&#10003; APPROUVER',
    signer: '&#10003; SIGNER',
  };
  const approveLabel = approveLabels[role] || '&#10003; APPROUVER';

  const showModify = role !== 'reviewer';
  const showSignature = role === 'signer';
  const isLocked = data.security.isLockedForSignature;

  return `
  <div class="tab-pane" id="tabDecision">
    ${isLocked ? `
    <div class="document-lock-banner" id="documentLockBanner">
      <div class="lock-icon">&#128274;</div>
      <div class="lock-content">
        <strong>Document verrouill\u00e9</strong>
        <p>Ce document a \u00e9t\u00e9 valid\u00e9 et verrouill\u00e9 avant signature. Toute modification sera d\u00e9tect\u00e9e.</p>
      </div>
      <div class="lock-status" id="lockVerifyStatus">
        <span class="verifying">V\u00e9rification...</span>
      </div>
    </div>
    ` : ''}

    <div style="font-size:13px;color:#525252;margin-bottom:16px;line-height:1.5">
      Prenez votre d\u00e9cision concernant ce document. Votre choix sera enregistr\u00e9 et transmis au demandeur.
    </div>

    ${showSignature ? `
    <!-- Section Paraphe -->
    <div class="initials-zone" id="initialsSection">
      <h4>Votre paraphe</h4>
      <p class="initials-hint">Le paraphe sera appliqu\u00e9 sur toutes les pages du document.</p>

      <!-- Tabs sources paraphe -->
      <div class="sig-source-tabs initials-tabs">
        <button class="sig-tab active" onclick="switchInitialsSource('draw')">Dessiner</button>
        <button class="sig-tab" onclick="switchInitialsSource('import')">Importer</button>
        <button class="sig-tab" onclick="switchInitialsSource('saved')">Sauvegard\u00e9</button>
      </div>

      <!-- Source: Dessiner paraphe -->
      <div class="sig-source initials-source active" id="initialsSourceDraw">
        <div class="initials-canvas-wrap">
          <canvas id="initialsCanvas"></canvas>
        </div>
        <div class="signature-actions">
          <button class="btn btn-secondary btn-sm" onclick="clearInitials()">Effacer</button>
          <span id="initialsStatus">Aucun paraphe</span>
        </div>
      </div>

      <!-- Source: Importer paraphe -->
      <div class="sig-source initials-source" id="initialsSourceImport">
        <div class="sig-import-zone" id="initialsImportZone" onclick="document.getElementById('initialsFileInput').click()">
          <div class="sig-import-icon">\ud83d\udcc1</div>
          <p>Cliquez ou glissez une image</p>
          <p class="sig-import-hint">PNG, JPG \u2014 max 2 Mo</p>
        </div>
        <input type="file" id="initialsFileInput" accept="image/png,image/jpeg" hidden onchange="handleInitialsFileImport(event)" />
        <div class="sig-import-preview" id="initialsImportPreview" style="display:none">
          <img id="initialsImportImg" />
          <button class="btn btn-secondary btn-sm" onclick="clearImportedInitials()" style="margin-top:8px">Supprimer</button>
        </div>
      </div>

      <!-- Source: Sauvegardé paraphe -->
      <div class="sig-source initials-source" id="initialsSourceSaved">
        <div id="savedInitialsContent"></div>
      </div>

      <!-- Sauvegarder paraphe -->
      <label class="sig-save-check">
        <input type="checkbox" id="initialsSaveCheck" />
        Sauvegarder ce paraphe pour un usage ult\u00e9rieur
      </label>
    </div>

    <!-- Section Signature -->
    <div class="signature-zone" id="signatureSection">
      <h4>Votre signature</h4>

      <!-- Tabs sources -->
      <div class="sig-source-tabs">
        <button class="sig-tab active" onclick="switchSigSource('draw')">Dessiner</button>
        <button class="sig-tab" onclick="switchSigSource('import')">Importer</button>
        <button class="sig-tab" onclick="switchSigSource('saved')">Sauvegard\u00e9e</button>
      </div>

      <!-- Source: Dessiner -->
      <div class="sig-source active" id="sigSourceDraw">
        <div class="signature-canvas-wrap">
          <canvas id="signatureCanvas"></canvas>
        </div>
        <div class="signature-actions">
          <button class="btn btn-secondary btn-sm" onclick="clearSignature()">Effacer</button>
          <span id="sigStatus">Aucune signature</span>
        </div>
      </div>

      <!-- Source: Importer -->
      <div class="sig-source" id="sigSourceImport">
        <div class="sig-import-zone" id="sigImportZone" onclick="document.getElementById('sigFileInput').click()">
          <div class="sig-import-icon">\ud83d\udcc1</div>
          <p>Cliquez ou glissez une image</p>
          <p class="sig-import-hint">PNG, JPG \u2014 max 2 Mo</p>
        </div>
        <input type="file" id="sigFileInput" accept="image/png,image/jpeg" hidden onchange="handleSigFileImport(event)" />
        <div class="sig-import-preview" id="sigImportPreview" style="display:none">
          <img id="sigImportImg" />
          <button class="btn btn-secondary btn-sm" onclick="clearImportedSig()" style="margin-top:8px">Supprimer</button>
        </div>
      </div>

      <!-- Source: Sauvegardee -->
      <div class="sig-source" id="sigSourceSaved">
        <div id="savedSigContent"></div>
      </div>

      <!-- Bouton placement -->
      <button class="btn btn-primary btn-sm sig-place-btn" id="sigPlaceBtn" style="display:none" onclick="startSigPlacement()">
        \ud83d\udccc Placer sur le document
      </button>
      <div class="sig-position-info" id="sigPositionInfo" style="display:none">
        \u2713 Signature positionn\u00e9e
        <button class="btn btn-secondary btn-sm" onclick="removeSigPlacement()">Repositionner</button>
      </div>

      <!-- Sauvegarder pour plus tard -->
      <label class="sig-save-check">
        <input type="checkbox" id="sigSaveCheck" />
        Sauvegarder cette signature pour un usage ult\u00e9rieur
      </label>

      <!-- Certification -->
      <label class="certification-check">
        <input type="checkbox" id="certifyCheck" />
        Je certifie que cette signature et ce paraphe m'engagent et valent approbation du document.
      </label>
    </div>` : ''}

    <div class="decision-actions" id="decisionButtons">
      <button class="btn btn-approve" onclick="showApprovalConfirmation()">${approveLabel}</button>
      ${showModify ? '<button class="btn btn-modify" onclick="showModificationConfirmation()">&#9998; DEMANDER UNE MODIFICATION</button>' : ''}
      <button class="btn btn-reject" onclick="showRejectionConfirmation()">&#10007; REJETER</button>
    </div>
  </div>`;
}

function modalsHTML(data: PackageData): string {
  const nextStepHTML = data.nextStep
    ? `<div class="next-step-info">
        <h4>Prochaine \u00e9tape</h4>
        <p>${escapeHtml(data.nextStep.participant.name)} \u2014 ${getRoleLabel(data.nextStep.role)}</p>
       </div>`
    : `<div class="next-step-info">
        <h4>Derni\u00e8re \u00e9tape</h4>
        <p>Le circuit de validation sera termin\u00e9 apr\u00e8s votre d\u00e9cision.</p>
       </div>`;

  return `
<!-- Approval Modal -->
<div class="modal-overlay" id="approvalModal">
  <div class="modal">
    <h3>Confirmer votre d\u00e9cision</h3>
    <div class="subtitle">Vous \u00eates sur le point de valider ce document.</div>
    <div class="approval-summary" id="approvalSummary">
      <p id="approvalSummaryText"></p>
    </div>
    ${nextStepHTML}
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal('approvalModal')">Annuler</button>
      <button class="btn btn-approve" onclick="confirmDecision('approve')">Confirmer</button>
    </div>
  </div>
</div>

<!-- Modification Modal -->
<div class="modal-overlay" id="modificationModal">
  <div class="modal">
    <h3>Demander une modification</h3>
    <div class="subtitle">Le document sera renvoy\u00e9 au demandeur pour correction.</div>
    <div class="rejection-form">
      <label>Cat\u00e9gorie</label>
      <select id="modCategory">
        <option value="">S\u00e9lectionnez une cat\u00e9gorie...</option>
        <option value="incomplete">Document incomplet</option>
        <option value="incorrect">Informations incorrectes</option>
        <option value="non_compliant">Non conforme</option>
        <option value="missing_documents">Documents manquants</option>
        <option value="other">Autre</option>
      </select>
      <label>Raison de la demande de modification *</label>
      <textarea id="modReason" placeholder="D\u00e9crivez les modifications n\u00e9cessaires..." maxlength="500"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal('modificationModal')">Annuler</button>
      <button class="btn btn-modify" onclick="confirmDecision('modification_requested')">Confirmer</button>
    </div>
  </div>
</div>

<!-- Rejection Modal -->
<div class="modal-overlay" id="rejectionModal">
  <div class="modal">
    <h3>Confirmer le rejet</h3>
    <div class="subtitle">Cette action a des cons\u00e9quences importantes.</div>
    <div class="rejection-form">
      <label>Cat\u00e9gorie du rejet *</label>
      <select id="rejCategory">
        <option value="">S\u00e9lectionnez une cat\u00e9gorie...</option>
        <option value="incomplete">Document incomplet</option>
        <option value="incorrect">Informations incorrectes</option>
        <option value="non_compliant">Non conforme</option>
        <option value="missing_documents">Documents manquants</option>
        <option value="unauthorized">Non autoris\u00e9</option>
        <option value="other">Autre</option>
      </select>
      <label>Raison du rejet *</label>
      <textarea id="rejReason" placeholder="Expliquez les raisons du rejet..." maxlength="500"></textarea>
    </div>
    <div class="consequences-box">
      <h4>&#9888; Cons\u00e9quences du rejet</h4>
      <p>Le circuit de validation sera d\u00e9finitivement arr\u00eat\u00e9. Le document sera marqu\u00e9 comme rejet\u00e9. Les \u00e9tapes suivantes ne seront pas ex\u00e9cut\u00e9es.</p>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal('rejectionModal')">Annuler</button>
      <button class="btn btn-reject" onclick="confirmDecision('reject')">Confirmer le rejet</button>
    </div>
  </div>
</div>

<!-- Help Modal -->
<div class="modal-overlay" id="helpModal">
  <div class="modal">
    <h3>Aide</h3>
    <div class="subtitle">Guide d'utilisation du paquet de validation</div>
    <div class="help-section">
      <h4>Navigation</h4>
      <p>Utilisez les fl\u00e8ches ou le champ de page pour naviguer. Le zoom se contr\u00f4le avec les boutons + / - ou <kbd>Ctrl</kbd>+<kbd>molette</kbd>.</p>
    </div>
    <div class="help-section">
      <h4>Annotations</h4>
      <p>Allez dans l'onglet "Mes notes" pour ajouter des commentaires. Activez le mode annotation (&#9998;) dans la barre d'outils pour placer des marqueurs sur le document.</p>
    </div>
    <div class="help-section">
      <h4>D\u00e9cision</h4>
      <p>L'onglet "D\u00e9cision" vous permet d'approuver, demander une modification ou rejeter le document. Votre d\u00e9cision sera enregistr\u00e9e dans un fichier .docjourney \u00e0 renvoyer.</p>
    </div>
    <div class="help-section">
      <h4>Recherche</h4>
      <p>Pour les PDF, utilisez <kbd>Ctrl</kbd>+<kbd>F</kbd> pour rechercher du texte via le lecteur int\u00e9gr\u00e9.</p>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="hideModal('helpModal')" style="flex:1">Compris</button>
    </div>
  </div>
</div>`;
}

function downloadScreenHTML(data: PackageData): string {
  const hasSyncEnabled = data.sync?.enabled ?? false;

  return `
<div class="download-screen" id="downloadScreen">
  <div class="download-screen-inner">
    <div class="dl-icon-wrap" id="downloadIcon"></div>
    <h2>D\u00e9cision enregistr\u00e9e</h2>
    <div class="dl-decision-label" id="downloadDecisionLabel"></div>
    ${hasSyncEnabled ? `
    <div class="sync-status" id="syncStatusContainer" style="display:none">
      <div class="sync-status-inner">
        <span id="syncStatus"></span>
        <span id="syncMessage"></span>
      </div>
    </div>
    ` : ''}
    <div class="dl-summary" id="downloadSummaryRows"></div>
    <div class="dl-download">
      ${hasSyncEnabled ? `
      <div class="sync-success-message" id="syncSuccessMessage" style="display:none">
        <div class="sync-success-icon">\u2713</div>
        <p>Votre r\u00e9ponse a \u00e9t\u00e9 transmise automatiquement.</p>
        <p class="sync-success-hint">Vous pouvez fermer cette fen\u00eatre.</p>
      </div>
      <div class="sync-fallback" id="syncFallback">
      ` : ''}
      <button class="btn btn-primary btn-lg" onclick="downloadReturn()">T\u00e9l\u00e9charger le fichier retour</button>
      <button class="btn btn-secondary btn-lg dl-receipt-btn" onclick="downloadReceipt()">T\u00e9l\u00e9charger le re\u00e7u (PDF)</button>
      <div class="dl-email-row">
        Envoyer \u00e0 <strong id="returnEmail">${escapeHtml(data.owner.email)}</strong>
        <button class="copy-email-btn" onclick="copyEmail()">Copier</button>
      </div>
      ${hasSyncEnabled ? `
      </div>
      ` : ''}
    </div>
    <div class="dl-footer">Merci pour votre participation</div>
  </div>
</div>`;
}

function mobileDrawerHTML(): string {
  return `
<div class="mobile-drawer collapsed" id="mobileDrawer">
  <div class="drag-handle" id="dragHandle"></div>
  <div class="mobile-tab-bar">
    <button class="tab-btn active" data-tab="position" onclick="switchTab('position', true)">Position</button>
    <button class="tab-btn" data-tab="comments" onclick="switchTab('comments', true)">Commentaires</button>
    <button class="tab-btn" data-tab="notes" onclick="switchTab('notes', true)">Notes</button>
    <button class="tab-btn" data-tab="decision" onclick="switchTab('decision', true)">D\u00e9cision</button>
  </div>
  <div class="mobile-drawer-content" id="mobileDrawerContent"></div>
</div>`;
}
