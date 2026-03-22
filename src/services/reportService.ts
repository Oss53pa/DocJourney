import QRCode from 'qrcode';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { db } from '../db';
import { generateId, generateCRVReference, getRoleLabel, getDecisionLabel, computeHash } from '../utils';
import { logActivity } from './activityService';
import type { Workflow, DocJourneyDocument, ValidationReport, ParticipantRole } from '../types';

// ---- Helpers ----

const AVATAR_COLORS = [
  { c: '#1a1a2e', bg: '#e8e8f8' },
  { c: '#1b5e20', bg: '#e8f5e9' },
  { c: '#4a148c', bg: '#f3e5f5' },
  { c: '#bf360c', bg: '#fbe9e7' },
];

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function getRoleCls(role: ParticipantRole): string {
  const map: Record<ParticipantRole, string> = {
    approver: 'role-approbateur',
    validator: 'role-validateur',
    reviewer: 'role-consulte',
    signer: 'role-signataire',
  };
  return map[role];
}

function fmtTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "dd/MM/yyyy — HH'h'mm", { locale: fr });
}

function fmtDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: fr });
}

type StepDisplayStatus = 'approved' | 'rejected' | 'pending' | 'waiting' | 'skipped';

function getStepDisplayStatus(step: Workflow['steps'][number], currentStepIndex: number, stepIndex: number): StepDisplayStatus {
  if (step.status === 'completed') return 'approved';
  if (step.status === 'rejected') return 'rejected';
  if (step.status === 'skipped') return 'skipped';
  if (step.status === 'pending' || step.status === 'sent' || step.status === 'correction_requested') {
    return stepIndex <= currentStepIndex ? 'pending' : 'waiting';
  }
  return 'waiting';
}

// ---- CSS ----

const CSS = `*{box-sizing:border-box;margin:0;padding:0}
:root{
  --ink:#111;--ink2:#3a3a3a;--muted:#888;--faint:#bbb;
  --line:#e4e4e4;--surface:#f7f7f6;--white:#fff;
  --dj:#16163a;--accent:#4f46e5;
}
body{font-family:'Segoe UI',Arial,sans-serif;background:#eceae6;color:var(--ink);font-size:12px;padding:24px}
.page{background:var(--white);max-width:860px;margin:0 auto;border:0.5px solid #d0d0d0;border-radius:6px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)}

.doc-header{display:grid;grid-template-columns:148px 1fr 196px;border-bottom:2px solid var(--dj)}
.brand-block{padding:16px 14px;border-right:0.5px solid var(--line);display:flex;flex-direction:column;justify-content:center}
.dj-logo{font-family:'Grand Hotel',cursive;font-size:22px;font-weight:400;color:var(--ink);letter-spacing:.3px}
.dj-sub{font-size:7.5px;text-transform:uppercase;letter-spacing:1.8px;color:var(--muted);margin-top:1px}
.title-block{padding:14px 18px;border-right:0.5px solid var(--line)}
.recu-eyebrow{font-size:8px;text-transform:uppercase;letter-spacing:2px;color:var(--muted);margin-bottom:5px}
.doc-title{font-size:15px;font-weight:700;color:var(--dj);line-height:1.3}
.doc-type-badge{display:inline-block;margin-top:6px;background:var(--surface);border:0.5px solid var(--line);border-radius:3px;padding:2px 8px;font-size:9px;color:var(--muted);letter-spacing:.5px}
.meta-block{padding:14px 14px;font-size:11px}
.mrow{display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;border-bottom:0.5px solid #f2f2f2}
.mrow:last-of-type{border-bottom:none}
.ml{color:var(--muted);font-size:10px}
.mv{font-weight:500;color:var(--ink);font-size:11px}
.status-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:.5px;margin-top:8px}
.pill-approved{background:#e6f4ea;border:0.5px solid #81c784;color:#1b5e20}
.pill-pending{background:#fff8e1;border:0.5px solid #ffd54f;color:#6d4c00}
.pill-rejected{background:#ffebee;border:0.5px solid #ef9a9a;color:#b71c1c}
.pill-dot{width:6px;height:6px;border-radius:50%}
.pill-approved .pill-dot{background:#2e7d32}
.pill-pending .pill-dot{background:#f9a825}
.pill-rejected .pill-dot{background:#c62828}

.sec{padding:13px 18px;border-bottom:0.5px solid var(--line)}
.sec-label{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.8px;color:var(--muted);margin-bottom:8px;display:flex;align-items:center;gap:8px}
.sec-label::after{content:'';flex:1;height:0.5px;background:var(--line)}
.objet-box{background:var(--surface);border-left:3px solid var(--dj);padding:9px 13px;font-size:11.5px;color:var(--ink2);line-height:1.75;border-radius:0 3px 3px 0}

.progress-wrap{display:flex;align-items:center}
.prog-step{flex:1;display:flex;flex-direction:column;align-items:center;position:relative}
.prog-step:not(:last-child)::after{content:'';position:absolute;top:10px;left:50%;width:100%;height:1.5px;background:var(--line);z-index:0}
.prog-step.done::after{background:#4caf50}
.prog-step.rejected-line::after{background:#ef5350}
.prog-circle{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--line);background:var(--white);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:var(--muted);z-index:1;position:relative}
.prog-circle.done{border-color:#4caf50;background:#e8f5e9;color:#1b5e20}
.prog-circle.pending{border-color:#ffd54f;background:#fff8e1;color:#6d4c00}
.prog-circle.rejected{border-color:#ef5350;background:#ffebee;color:#b71c1c}
.prog-circle.skipped{border-color:#bdbdbd;background:#f5f5f5;color:#9e9e9e}
.prog-name{font-size:8px;color:var(--muted);margin-top:4px;text-align:center;max-width:70px;line-height:1.3}

.wf-table{width:100%;border-collapse:collapse}
.wf-table thead tr{background:var(--dj)}
.wf-table thead th{color:#fff;padding:7px 10px;font-size:8.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-align:left;white-space:nowrap}
.wf-table thead th.c{text-align:center}
.wf-table tbody tr{border-bottom:0.5px solid var(--line)}
.wf-table tbody tr:last-child{border-bottom:none}
.wf-table tbody tr:nth-child(even) td{background:#fdfdfb}

td.td-num{width:30px;padding:12px 8px;text-align:center;border-right:0.5px solid var(--line);vertical-align:top}
.step-circle{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;margin:0 auto;border:1.5px solid var(--line);background:var(--white);color:var(--muted)}
.step-circle.done{border-color:#4caf50;background:#e8f5e9;color:#1b5e20}
.step-circle.pending{border-color:#ffd54f;background:#fff8e1;color:#6d4c00}
.step-circle.rejected{border-color:#ef5350;background:#ffebee;color:#b71c1c}
.step-circle.skipped{border-color:#bdbdbd;background:#f5f5f5;color:#9e9e9e}

td.td-person{width:185px;padding:11px 10px;border-right:0.5px solid var(--line);vertical-align:top}
.avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
.p-name{font-size:11.5px;font-weight:600;color:var(--ink);line-height:1.3}
.p-post{font-size:9.5px;color:var(--muted);margin-top:1px}
.wf-role-badge{display:inline-block;margin-top:5px;padding:2px 7px;border-radius:2px;font-size:8.5px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
.role-approbateur{background:#e8eaf6;color:#283593;border:0.5px solid #9fa8da}
.role-validateur{background:#e0f2f1;color:#004d40;border:0.5px solid #80cbc4}
.role-consulte{background:#fff3e0;color:#bf360c;border:0.5px solid #ffcc80}
.role-signataire{background:#fce4ec;color:#880e4f;border:0.5px solid #f48fb1}

td.td-comment{padding:11px 10px;border-right:0.5px solid var(--line);vertical-align:top;min-width:160px}
.comment-text{font-size:11px;color:var(--ink2);line-height:1.65;background:var(--surface);padding:6px 9px;border-radius:3px;border-left:2px solid var(--line)}
.comment-text.ok{border-left-color:#4caf50}
.comment-text.rej{border-left-color:#ef5350}
.no-comment{font-size:10px;color:var(--faint);font-style:italic}
.sig-date{font-size:9px;color:var(--muted);margin-top:5px;display:flex;align-items:center;gap:4px}
.rejection-info{font-size:10px;color:#c62828;margin-top:4px;font-style:italic}
.annotations-list{margin-top:4px;font-size:10px;color:var(--muted)}
.annotations-list span{display:block;margin-top:2px}

td.td-qr{width:80px;padding:6px 4px;text-align:center;border-right:0.5px solid var(--line);vertical-align:middle}
.qr-pending-box{display:flex;align-items:center;justify-content:center;width:42px;height:42px;background:var(--surface);border:0.5px dashed var(--line);border-radius:4px;margin:0 auto}
.qr-pending-txt{font-size:7px;color:var(--faint);text-align:center;line-height:1.5}
.qr-code-short{font-family:'Courier New',monospace;font-size:7.5px;color:var(--ink2);font-weight:600;letter-spacing:.3px;margin-top:3px;word-break:break-all}

td.td-status{width:82px;padding:11px 8px;text-align:center;vertical-align:top}
.stag{display:inline-block;padding:3px 8px;border-radius:3px;font-size:9px;font-weight:700;letter-spacing:.4px}
.stag-a{background:#e6f4ea;border:0.5px solid #81c784;color:#1b5e20}
.stag-p{background:#fff8e1;border:0.5px solid #ffd54f;color:#6d4c00}
.stag-r{background:#ffebee;border:0.5px solid #ef9a9a;color:#b71c1c}
.stag-s{background:#f5f5f5;border:0.5px solid #e0e0e0;color:#9e9e9e}
.stag-w{background:#f5f5f5;border:0.5px solid #e0e0e0;color:#bbb}

.doc-footer{padding:13px 18px;display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center;background:var(--surface);border-top:1.5px solid var(--dj)}
.footer-qr-wrap{display:flex;align-items:center;gap:12px;flex-shrink:0}
.footer-qr-label{font-size:7.5px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin-top:3px;text-align:center}
.footer-divider{width:0.5px;height:52px;background:var(--line)}
.footer-text{font-size:9px;color:var(--muted);line-height:1.9}
.footer-text strong{color:var(--ink2);font-size:9.5px}
.footer-fp{font-family:'Courier New',monospace;font-size:7.5px;color:var(--faint);margin-top:2px;letter-spacing:.3px}

@media print{
  body{background:#fff;padding:0}
  .page{box-shadow:none;border:none}
}`;

// ---- Main render function ----

export async function renderReportHTML(
  workflow: Workflow,
  doc: DocJourneyDocument
): Promise<string> {
  const docRef = `DJ-${doc.id.substring(0, 8).toUpperCase()}`;
  const crvRef = generateCRVReference(docRef);
  const now = new Date();
  const dateStr = fmtDateShort(now);
  const company = workflow.validationCompany || workflow.owner.organization || '';

  // Compute fingerprint
  const fpFull = await computeHash(`${crvRef}|${doc.id}|${workflow.id}|${doc.name}`);
  const fpShort = fpFull.substring(0, 36).toUpperCase();

  // Status computation
  const steps = workflow.steps;
  const totalSteps = steps.length;
  const rejectedStep = steps.find(s => s.status === 'rejected');
  const isRejected = !!rejectedStep;
  const isCompleted = !!workflow.completedAt && !isRejected;
  const doneCount = steps.filter(s => s.status === 'completed' || s.status === 'rejected' || s.status === 'skipped').length;

  let pillClass: string;
  let pillText: string;
  if (isCompleted) {
    pillClass = 'pill-approved';
    pillText = `Validé — ${doneCount}/${totalSteps}`;
  } else if (isRejected) {
    pillClass = 'pill-rejected';
    pillText = `Rejeté — ${doneCount}/${totalSteps}`;
  } else {
    pillClass = 'pill-pending';
    pillText = `En cours — ${doneCount}/${totalSteps}`;
  }

  // Process each step
  const stepDataList = await Promise.all(steps.map(async (step, i) => {
    const displayStatus = getStepDisplayStatus(step, workflow.currentStepIndex, i);
    let code: string | null = null;
    let qrDataUrl: string | null = null;

    if (displayStatus === 'approved' || displayStatus === 'rejected') {
      const initials = getInitials(step.participant.name);
      const stepHash = await computeHash(`${step.id}|${step.participant.email}|${step.completedAt || ''}`);
      const shortHash = stepHash.substring(0, 4).toUpperCase();
      const completedDate = step.completedAt
        ? format(new Date(step.completedAt), 'yyyyMMdd')
        : format(now, 'yyyyMMdd');
      code = `${initials}${i + 1}-${completedDate}-${shortHash}`;

      // Encode verification payload so the verify page works without DB access
      const stepPayload = btoa(unescape(encodeURIComponent(JSON.stringify({
        dn: doc.name,
        wn: workflow.name,
        co: company,
        pn: step.participant.name,
        ro: step.role,
        de: step.response?.decision || '',
        ca: step.completedAt || '',
        // Fields needed to recompute the hash
        si: step.id,
        pe: step.participant.email,
      }))));

      const verifyUrl = `${window.location.origin}/verify?ref=${encodeURIComponent(crvRef)}&h=${encodeURIComponent(stepHash.substring(0, 12))}&s=${i + 1}&d=${encodeURIComponent(stepPayload)}`;

      qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 84, margin: 0, errorCorrectionLevel: 'M' });
    }

    return { step, index: i, displayStatus, code, qrDataUrl };
  }));

  // Footer QR — URL de vérification globale du document
  // Encode verification payload so the verify page works without DB access
  const docPayload = btoa(unescape(encodeURIComponent(JSON.stringify({
    dn: doc.name,
    wn: workflow.name,
    co: company,
    ca: workflow.completedAt || '',
    // Fields needed to recompute the hash
    di: doc.id,
    wi: workflow.id,
  }))));
  const footerVerifyUrl = `${window.location.origin}/verify?ref=${encodeURIComponent(crvRef)}&h=${encodeURIComponent(fpShort)}&d=${encodeURIComponent(docPayload)}`;
  const footerQrDataUrl = await QRCode.toDataURL(footerVerifyUrl, { width: 112, margin: 0, errorCorrectionLevel: 'M' });

  // Description (no esc() here — the template applies esc() when inserting)
  const description = doc.metadata.description
    || `Validation du document « ${doc.name} » via le circuit « ${workflow.name} ».`;

  // ---- Build HTML ----

  // Progress steps
  const progressHtml = stepDataList.map(({ step, displayStatus }) => {
    const lineClass = displayStatus === 'approved' ? 'done' : displayStatus === 'rejected' ? 'rejected-line' : '';
    const circleClass = displayStatus === 'approved' ? 'done'
      : displayStatus === 'rejected' ? 'rejected'
      : displayStatus === 'pending' ? 'pending'
      : displayStatus === 'skipped' ? 'skipped' : '';
    const sym = displayStatus === 'approved' ? '&#10003;'
      : displayStatus === 'rejected' ? '&#10007;'
      : displayStatus === 'pending' ? '&hellip;'
      : displayStatus === 'skipped' ? '&#8212;'
      : String(step.order);
    const nameParts = step.participant.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    return `<div class="prog-step ${lineClass}">
      <div class="prog-circle ${circleClass}">${sym}</div>
      <div class="prog-name">${esc(firstName)}<br><span style="font-size:7px">${esc(lastName)}</span></div>
    </div>`;
  }).join('');

  // Table rows
  const tbodyHtml = stepDataList.map(({ step, index, displayStatus, code, qrDataUrl }) => {
    const col = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const circleClass = displayStatus === 'approved' ? 'done'
      : displayStatus === 'rejected' ? 'rejected'
      : displayStatus === 'pending' ? 'pending'
      : displayStatus === 'skipped' ? 'skipped' : '';
    const sym = displayStatus === 'approved' ? '&#10003;'
      : displayStatus === 'rejected' ? '&#10007;'
      : displayStatus === 'pending' ? '&hellip;'
      : displayStatus === 'skipped' ? '&#8212;'
      : String(step.order);

    // Person cell
    const org = step.participant.organization || '';
    const personHtml = `<div style="display:flex;align-items:center;gap:7px">
      <div class="avatar" style="background:${col.bg};color:${col.c}">${getInitials(step.participant.name)}</div>
      <div><div class="p-name">${esc(step.participant.name)}</div><div class="p-post">${esc(org)}</div></div>
    </div>
    <span class="wf-role-badge ${getRoleCls(step.role)}">${esc(getRoleLabel(step.role))}</span>`;

    // Comment cell
    let commentHtml: string;
    if (displayStatus === 'approved') {
      const comment = step.response?.generalComment || 'Aucun commentaire';
      const borderClass = 'ok';
      const timeStr = step.completedAt ? fmtTimestamp(step.completedAt) : '';
      const decisionLabel = step.response ? getDecisionLabel(step.response.decision) : '';
      commentHtml = `<div class="comment-text ${borderClass}">"${esc(comment)}"</div>`;
      if (step.response?.rejectionDetails) {
        commentHtml += `<div class="rejection-info">${esc(step.response.rejectionDetails.reason)}</div>`;
      }
      if (step.response && step.response.annotations.length > 0) {
        commentHtml += `<div class="annotations-list">${step.response.annotations.map(a =>
          `<span>p.${a.position.page}: ${esc(a.content)}</span>`
        ).join('')}</div>`;
      }
      commentHtml += `<div class="sig-date"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--muted)"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${esc(timeStr)}${decisionLabel ? ` · ${esc(decisionLabel)}` : ''}</div>`;
    } else if (displayStatus === 'rejected') {
      const comment = step.response?.generalComment || '';
      const reason = step.response?.rejectionDetails?.reason || '';
      const timeStr = step.completedAt ? fmtTimestamp(step.completedAt) : '';
      commentHtml = comment
        ? `<div class="comment-text rej">"${esc(comment)}"</div>`
        : `<div class="comment-text rej">"${esc(reason || 'Document rejeté')}"</div>`;
      if (reason && comment) {
        commentHtml += `<div class="rejection-info">${esc(reason)}</div>`;
      }
      commentHtml += `<div class="sig-date"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--muted)"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${esc(timeStr)}</div>`;
    } else if (displayStatus === 'pending') {
      commentHtml = `<div class="no-comment">En attente de signature</div>`;
    } else if (displayStatus === 'skipped') {
      const reason = step.skippedReason ? ` — ${esc(step.skippedReason)}` : '';
      commentHtml = `<div class="no-comment">Étape passée${reason}</div>`;
    } else {
      commentHtml = `<div class="no-comment">En attente de l'étape précédente</div>`;
    }

    // QR cell
    let qrHtml: string;
    if (qrDataUrl && code) {
      qrHtml = `<img src="${qrDataUrl}" width="42" height="42" style="display:block;margin:0 auto" alt="QR">
        <div class="qr-code-short" style="font-size:7px">${esc(code)}</div>`;
    } else {
      qrHtml = `<div class="qr-pending-box"><div class="qr-pending-txt">En<br>attente</div></div>`;
    }

    // Status tag
    let stagHtml: string;
    if (displayStatus === 'approved') {
      const label = step.response ? getDecisionLabel(step.response.decision) : 'Approuvé';
      stagHtml = `<span class="stag stag-a">${esc(label)}</span>`;
    } else if (displayStatus === 'rejected') {
      stagHtml = `<span class="stag stag-r">Rejeté</span>`;
    } else if (displayStatus === 'pending') {
      stagHtml = `<span class="stag stag-p">En attente</span>`;
    } else if (displayStatus === 'skipped') {
      stagHtml = `<span class="stag stag-s">Passée</span>`;
    } else {
      stagHtml = `<span class="stag stag-w">&mdash;</span>`;
    }

    return `<tr>
      <td class="td-num"><div class="step-circle ${circleClass}">${sym}</div></td>
      <td class="td-person">${personHtml}</td>
      <td class="td-comment">${commentHtml}</td>
      <td class="td-qr">${qrHtml}</td>
      <td class="td-status">${stagHtml}</td>
    </tr>`;
  }).join('');

  // Full HTML
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>CRV — ${esc(doc.name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Grand+Hotel&display=swap" rel="stylesheet">
<style>
${CSS}
</style>
</head>
<body>
<div class="page" id="doc">

<div class="doc-header">
  <div class="brand-block">
    <div class="dj-logo">DocJourney</div>
    <div class="dj-sub">Workflow Validation</div>
  </div>
  <div class="title-block">
    <div class="recu-eyebrow">Reçu de validation de workflow</div>
    <div class="doc-title">${esc(doc.name)}</div>
    ${doc.metadata.category ? `<span class="doc-type-badge">${esc(doc.metadata.category)}</span>` : ''}
  </div>
  <div class="meta-block">
    <div class="mrow"><span class="ml">Réf.</span><span class="mv">${esc(crvRef)}</span></div>
    <div class="mrow"><span class="ml">Soumis le</span><span class="mv">${esc(fmtDateShort(workflow.createdAt))}</span></div>
    <div class="mrow"><span class="ml">Étapes</span><span class="mv">${totalSteps} intervenants</span></div>
    <span class="status-pill ${pillClass}"><span class="pill-dot"></span>${esc(pillText)}</span>
  </div>
</div>

<div class="sec">
  <div class="sec-label">Objet du document</div>
  <div class="objet-box">${esc(description)}</div>
</div>

<div class="sec">
  <div class="sec-label">Progression du workflow</div>
  <div class="progress-wrap">${progressHtml}</div>
</div>

<div class="sec" style="padding:0">
  <div class="sec-label" style="padding:12px 18px 8px;margin-bottom:0">Détail des intervenants</div>
  <table class="wf-table">
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Intervenant &amp; rôle</th>
        <th>Commentaire &amp; horodatage</th>
        <th class="c" style="width:110px">Empreinte QR</th>
        <th class="c" style="width:82px">Statut</th>
      </tr>
    </thead>
    <tbody>${tbodyHtml}</tbody>
  </table>
</div>

<div class="doc-footer">
  <div class="footer-qr-wrap">
    <div>
      <img src="${footerQrDataUrl}" width="56" height="56" alt="QR" style="display:block">
      <div class="footer-qr-label">Authenticité doc.</div>
    </div>
    <div class="footer-divider"></div>
  </div>
  <div>
    <div class="footer-text"><strong>${esc(crvRef)}</strong> &nbsp;·&nbsp; ${esc(company)} &nbsp;·&nbsp; DocJourney Workflow Validation</div>
    <div class="footer-text">Émis le ${esc(dateStr)} &nbsp;·&nbsp; Empreintes SHA-256 horodatées &nbsp;·&nbsp; Authentification par QR pied de page</div>
    <div class="footer-fp">FP: ${esc(fpShort)}</div>
  </div>
</div>

</div>
</body>
</html>`;
}

// ---- Public API ----

export async function generateValidationReport(
  workflow: Workflow,
  doc: DocJourneyDocument
): Promise<ValidationReport> {
  const html = await renderReportHTML(workflow, doc);
  const htmlBase64 = btoa(unescape(encodeURIComponent(html)));

  const docRef = `DJ-${doc.id.substring(0, 8).toUpperCase()}`;
  const crvRef = generateCRVReference(docRef);

  const report: ValidationReport = {
    id: generateId(),
    workflowId: workflow.id,
    documentId: doc.id,
    reference: crvRef,
    generatedAt: new Date(),
    content: htmlBase64,
  };

  await db.validationReports.add(report);
  await logActivity('report_generated', `CRV généré : ${crvRef}`, doc.id, workflow.id);

  return report;
}

export async function getReport(workflowId: string): Promise<ValidationReport | undefined> {
  return db.validationReports.where('workflowId').equals(workflowId).first();
}

export function downloadReport(report: ValidationReport, docName: string) {
  const html = decodeURIComponent(escape(atob(report.content)));
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CRV_${docName.replace(/\.[^.]+$/, '')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
