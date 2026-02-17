import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { db } from '../db';
import { generateId, generateCRVReference, formatDate, formatDuration, getRoleLabel, getDecisionLabel, getRejectionCategoryLabel } from '../utils';
import { logActivity } from './activityService';
import type { Workflow, DocJourneyDocument, ValidationReport } from '../types';
import { GrandHotelFont } from './grandHotelFont';

// Register Grand Hotel font
// addFileToVFS is global (shared across jsPDF instances), only needs to run once.
// addFont is per-instance and must be called on every new jsPDF instance.
let vfsRegistered = false;
function registerGrandHotel(pdf: jsPDF) {
  if (!vfsRegistered) {
    pdf.addFileToVFS('GrandHotel-Regular.ttf', GrandHotelFont);
    vfsRegistered = true;
  }
  pdf.addFont('GrandHotel-Regular.ttf', 'GrandHotel', 'normal');
}

// ---- Helpers ----

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

function setFill(pdf: jsPDF, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  pdf.setFillColor(r, g, b);
}

function setStroke(pdf: jsPDF, hex: string) {
  const { r, g, b } = hexToRgb(hex);
  pdf.setDrawColor(r, g, b);
}

function addText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  opts: { size?: number; bold?: boolean; color?: string; align?: string; maxWidth?: number } = {}
) {
  pdf.setFontSize(opts.size || 10);
  pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  const { r, g, b } = hexToRgb(opts.color || '#171717');
  pdf.setTextColor(r, g, b);
  const align = opts.align as 'left' | 'center' | 'right' | undefined;
  if (opts.maxWidth) {
    pdf.text(text, x, y, { maxWidth: opts.maxWidth, align });
  } else {
    pdf.text(text, x, y, { align });
  }
}

function drawQRCode(pdf: jsPDF, content: string, x: number, y: number, size: number) {
  const qr = QRCode.create(content, { errorCorrectionLevel: 'M' });
  const moduleCount = qr.modules.size;
  const moduleSize = size / moduleCount;

  // White background
  setFill(pdf, '#ffffff');
  pdf.rect(x - 1, y - 1, size + 2, size + 2, 'F');

  // Border
  setStroke(pdf, '#e5e5e5');
  pdf.setLineWidth(0.2);
  pdf.rect(x - 1, y - 1, size + 2, size + 2, 'S');

  // Modules
  setFill(pdf, '#171717');
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.modules.data[row * moduleCount + col]) {
        pdf.rect(x + col * moduleSize, y + row * moduleSize, moduleSize, moduleSize, 'F');
      }
    }
  }
}

// ---- Main render function ----

export function renderReportPDF(
  workflow: Workflow,
  doc: DocJourneyDocument
): string {
  const pdf = new jsPDF('p', 'mm', 'a4');
  registerGrandHotel(pdf);
  const W = 210;
  const margin = 24;
  const cw = W - margin * 2;
  let y = 0;

  // Elegant color palette - minimal
  const colors = {
    black: '#1a1a1a',
    darkGray: '#404040',
    mediumGray: '#737373',
    lightGray: '#a3a3a3',
    border: '#e5e5e5',
    bgLight: '#fafafa',
    white: '#ffffff',
    success: '#059669', // Elegant emerald
    error: '#dc2626',
  };

  const pageBottom = 275;
  let pageNum = 1;

  const addPageFooter = () => {
    // Thin line
    setStroke(pdf, colors.border);
    pdf.setLineWidth(0.3);
    pdf.line(margin, 285, W - margin, 285);
    // Page number
    addText(pdf, `${pageNum}`, W / 2, 290, { size: 8, color: colors.lightGray, align: 'center' });
    pageNum++;
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageBottom) {
      addPageFooter();
      pdf.addPage();
      y = 25;
    }
  };

  const docRef = `DJ-${doc.id.substring(0, 8).toUpperCase()}`;
  const crvRef = generateCRVReference(docRef);
  const isRejected = workflow.steps.some(s => s.status === 'rejected');
  const finalStatus = isRejected ? 'Rejeté' : 'Validé';
  const statusColor = isRejected ? colors.error : colors.success;

  // ============================================================
  // HEADER - Clean & Minimal
  // ============================================================
  y = 28;

  // Brand name - Grand Hotel font
  pdf.setFont('GrandHotel', 'normal');
  pdf.setFontSize(16);
  const { r, g, b } = hexToRgb(colors.mediumGray);
  pdf.setTextColor(r, g, b);
  pdf.text('DocJourney', margin, y);
  pdf.setFont('helvetica', 'normal'); // Reset to default

  // Reference on the right
  addText(pdf, crvRef, W - margin, y, { size: 9, color: colors.lightGray, align: 'right' });

  y += 12;

  // Main title
  addText(pdf, 'Compte rendu de validation', margin, y, { size: 20, bold: true, color: colors.black });

  y += 10;

  // Status indicator - subtle
  const statusDotX = margin;
  setFill(pdf, statusColor);
  pdf.circle(statusDotX + 1.5, y - 1, 1.5, 'F');
  addText(pdf, finalStatus, statusDotX + 6, y, { size: 10, color: statusColor });

  // Date on the right
  addText(pdf, formatDate(new Date()), W - margin, y, { size: 9, color: colors.mediumGray, align: 'right' });

  y += 8;

  // Elegant separator line
  setStroke(pdf, colors.border);
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, W - margin, y);

  y += 16;

  // ============================================================
  // DOCUMENT INFO - Two column layout
  // ============================================================

  // Document name - prominent
  addText(pdf, doc.name, margin, y, { size: 12, bold: true, color: colors.black });
  y += 8;

  // Info grid - clean two-column layout
  const col1X = margin;
  const col2X = margin + 90;
  const infoLineHeight = 6;

  const leftInfo: [string, string][] = [
    ['Référence', docRef],
    ['Catégorie', doc.metadata.category || '—'],
    ['Initiateur', workflow.owner.name],
  ];

  const rightInfo: [string, string][] = [
    ['Créé le', formatDate(workflow.createdAt)],
    ['Clôturé le', workflow.completedAt ? formatDate(workflow.completedAt) : 'En cours'],
    ['Durée', workflow.completedAt ? formatDuration(workflow.createdAt, workflow.completedAt) : '—'],
  ];

  leftInfo.forEach(([label, value], i) => {
    const lineY = y + i * infoLineHeight;
    addText(pdf, label, col1X, lineY, { size: 8, color: colors.mediumGray });
    addText(pdf, value, col1X + 28, lineY, { size: 8, color: colors.darkGray });
  });

  rightInfo.forEach(([label, value], i) => {
    const lineY = y + i * infoLineHeight;
    addText(pdf, label, col2X, lineY, { size: 8, color: colors.mediumGray });
    addText(pdf, value, col2X + 28, lineY, { size: 8, color: colors.darkGray });
  });

  y += leftInfo.length * infoLineHeight + 14;

  // ============================================================
  // WORKFLOW TIMELINE - Elegant horizontal
  // ============================================================
  checkPageBreak(35);

  addText(pdf, 'Parcours', margin, y, { size: 10, bold: true, color: colors.black });
  y += 10;

  const steps = workflow.steps;
  const timelineWidth = cw;
  const stepWidth = timelineWidth / steps.length;

  steps.forEach((step, i) => {
    const stepX = margin + i * stepWidth;
    const stepCenterX = stepX + stepWidth / 2;
    const isDone = step.status === 'completed';
    const isRej = step.status === 'rejected';
    const isPending = step.status === 'pending' || step.status === 'in_progress';

    // Connecting line (before this step)
    if (i > 0) {
      const prevDone = steps[i - 1].status === 'completed' || steps[i - 1].status === 'rejected';
      setStroke(pdf, prevDone ? colors.darkGray : colors.border);
      pdf.setLineWidth(0.5);
      const lineY = y + 3;
      pdf.line(stepX - stepWidth / 2 + 8, lineY, stepX + stepWidth / 2 - 8, lineY);
    }

    // Step indicator - minimal dot or number
    const dotY = y + 3;
    if (isDone) {
      setFill(pdf, colors.black);
      pdf.circle(stepCenterX, dotY, 3, 'F');
      addText(pdf, String(step.order), stepCenterX, dotY + 1, { size: 6, bold: true, color: colors.white, align: 'center' });
    } else if (isRej) {
      setFill(pdf, colors.error);
      pdf.circle(stepCenterX, dotY, 3, 'F');
      addText(pdf, '×', stepCenterX, dotY + 1.2, { size: 7, bold: true, color: colors.white, align: 'center' });
    } else {
      setStroke(pdf, colors.border);
      pdf.setLineWidth(0.5);
      pdf.circle(stepCenterX, dotY, 3, 'S');
      addText(pdf, String(step.order), stepCenterX, dotY + 1, { size: 6, color: colors.lightGray, align: 'center' });
    }

    // Name and role below
    const name = step.participant.name.split(' ')[0];
    const textColor = isPending ? colors.lightGray : colors.darkGray;
    addText(pdf, name, stepCenterX, y + 12, { size: 7, color: textColor, align: 'center' });
    addText(pdf, getRoleLabel(step.role), stepCenterX, y + 16, { size: 6, color: colors.lightGray, align: 'center' });
  });

  y += 26;

  // ============================================================
  // STEP DETAILS - Clean cards
  // ============================================================
  checkPageBreak(20);

  addText(pdf, 'Détails', margin, y, { size: 10, bold: true, color: colors.black });
  y += 8;

  steps.forEach((step) => {
    // Calculate card height
    let cardH = 22;
    if (step.response?.generalComment) {
      const commentLines = pdf.splitTextToSize(step.response.generalComment, cw - 16);
      cardH += commentLines.length * 3.5 + 4;
    }
    if (step.response?.rejectionDetails) cardH += 10;
    if (step.response && step.response.annotations.length > 0) {
      cardH += 4 + step.response.annotations.length * 7;
    }

    checkPageBreak(cardH + 6);

    // Card with subtle border only
    setStroke(pdf, colors.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, y, cw, cardH, 1, 1, 'S');

    // Step number - minimal
    addText(pdf, String(step.order), margin + 5, y + 6, { size: 9, bold: true, color: colors.black });

    // Role and participant
    addText(pdf, getRoleLabel(step.role), margin + 12, y + 6, { size: 9, color: colors.black });
    addText(pdf, `${step.participant.name}`, margin + 12, y + 11, { size: 8, color: colors.mediumGray });

    // Status on the right
    if (step.response) {
      const isModReq = step.response.decision === 'modification_requested';
      const decColor = step.response.decision === 'rejected' ? colors.error : isModReq ? '#b45309' : colors.success;
      const decText = getDecisionLabel(step.response.decision);
      addText(pdf, decText, W - margin - 4, y + 6, { size: 8, color: decColor, align: 'right' });
    } else {
      addText(pdf, 'En attente', W - margin - 4, y + 6, { size: 8, color: colors.lightGray, align: 'right' });
    }

    // Dates
    if (step.completedAt) {
      const dateStr = formatDate(step.completedAt);
      addText(pdf, dateStr, W - margin - 4, y + 11, { size: 7, color: colors.lightGray, align: 'right' });
    }

    let innerY = y + 17;

    if (step.response) {
      // Rejection details
      if (step.response.rejectionDetails) {
        const catLabel = getRejectionCategoryLabel(step.response.rejectionDetails.category);
        addText(pdf, `${catLabel} — ${step.response.rejectionDetails.reason}`, margin + 12, innerY, { size: 7, color: colors.darkGray, maxWidth: cw - 20 });
        innerY += 8;
      }

      // Comment
      if (step.response.generalComment) {
        addText(pdf, step.response.generalComment, margin + 12, innerY, { size: 7, color: colors.darkGray, maxWidth: cw - 20 });
        const commentLines = pdf.splitTextToSize(step.response.generalComment, cw - 20);
        innerY += commentLines.length * 3.5 + 2;
      }

      // Annotations
      if (step.response.annotations.length > 0) {
        step.response.annotations.forEach(ann => {
          const annText = `Page ${ann.position.page}: ${ann.content}`;
          addText(pdf, annText, margin + 12, innerY, { size: 6.5, color: colors.mediumGray, maxWidth: cw - 20 });
          const annLines = pdf.splitTextToSize(annText, cw - 20);
          innerY += annLines.length * 3 + 2;
        });
      }
    }

    y += cardH + 5;
  });

  // ============================================================
  // SIGNATURES - If any
  // ============================================================
  const signers = workflow.steps.filter(s => s.response?.signature);
  if (signers.length > 0) {
    checkPageBreak(45);
    y += 4;

    addText(pdf, 'Signatures', margin, y, { size: 10, bold: true, color: colors.black });
    y += 8;

    signers.forEach(step => {
      if (step.response?.signature) {
        checkPageBreak(32);

        // Signature box
        setStroke(pdf, colors.border);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(margin, y, cw, 28, 1, 1, 'S');

        try {
          pdf.addImage(step.response.signature.image, 'PNG', margin + 4, y + 3, 40, 20);
        } catch { /* ignore */ }

        addText(pdf, step.participant.name, margin + 50, y + 10, { size: 8, bold: true, color: colors.black });
        addText(pdf, getRoleLabel(step.role), margin + 50, y + 15, { size: 7, color: colors.mediumGray });
        addText(pdf, formatDate(step.response.signature.timestamp), margin + 50, y + 20, { size: 7, color: colors.lightGray });

        y += 32;
      }
    });
  }

  // ============================================================
  // INTEGRITY SECTION - Minimal
  // ============================================================
  checkPageBreak(45);
  y += 6;

  addText(pdf, 'Vérification', margin, y, { size: 10, bold: true, color: colors.black });
  y += 8;

  // QR Code section with border
  setStroke(pdf, colors.border);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(margin, y, cw, 32, 1, 1, 'S');

  // QR Code on the left
  const qrSize = 24;
  const qrX = margin + 4;
  const qrY = y + 4;
  const qrContent = [
    `DocJourney`,
    `${crvRef}`,
    `${doc.name}`,
    `${finalStatus}`,
    `${doc.id.substring(0, 16)}`,
  ].join('\n');
  drawQRCode(pdf, qrContent, qrX, qrY, qrSize);

  // Info on the right
  const infoX = margin + 36;
  addText(pdf, 'Empreinte', infoX, y + 8, { size: 7, color: colors.mediumGray });
  addText(pdf, doc.id.substring(0, 40), infoX, y + 13, { size: 6.5, color: colors.lightGray });

  addText(pdf, 'Chaîne de validation', infoX, y + 21, { size: 7, color: colors.mediumGray });
  addText(pdf, 'Intégrité vérifiée', infoX, y + 26, { size: 7, color: colors.success });

  y += 38;

  // ============================================================
  // FOOTER - Minimal
  // ============================================================

  addText(pdf, `Généré par DocJourney · ${formatDate(new Date())}`, W / 2, 280, { size: 7, color: colors.lightGray, align: 'center' });

  // Page footer
  addPageFooter();

  return pdf.output('datauristring').split(',')[1];
}

// ---- Public API ----

export async function generateValidationReport(
  workflow: Workflow,
  doc: DocJourneyDocument
): Promise<ValidationReport> {
  const pdfBase64 = renderReportPDF(workflow, doc);

  const docRef = `DJ-${doc.id.substring(0, 8).toUpperCase()}`;
  const crvRef = generateCRVReference(docRef);

  const report: ValidationReport = {
    id: generateId(),
    workflowId: workflow.id,
    documentId: doc.id,
    reference: crvRef,
    generatedAt: new Date(),
    content: pdfBase64,
  };

  await db.validationReports.add(report);
  await logActivity('report_generated', `CRV généré : ${crvRef}`, doc.id, workflow.id);

  return report;
}

export async function getReport(workflowId: string): Promise<ValidationReport | undefined> {
  return db.validationReports.where('workflowId').equals(workflowId).first();
}

export function downloadReport(report: ValidationReport, docName: string) {
  const binary = atob(report.content);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CRV_${docName.replace(/\.[^.]+$/, '')}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
