import emailjs from '@emailjs/browser';
import { db } from '../db';
import type { DocJourneyDocument, Workflow, AppSettings } from '../types';
import { getRoleLabel, getRoleAction, formatDate, generateId } from '../utils';
import { uploadPackageToStorage, isSyncConfigured, getFirebaseConfig } from './firebaseSyncService';

export function generateEmailSubject(
  doc: DocJourneyDocument,
  workflow: Workflow,
  stepIndex: number
): string {
  const step = workflow.steps[stepIndex];
  const action = getRoleAction(step.role);
  return `Demande de ${action.toLowerCase()} — ${doc.name}`;
}

export function generateEmailTemplate(
  doc: DocJourneyDocument,
  workflow: Workflow,
  stepIndex: number,
  syncEnabled: boolean = false,
  hostedUrl?: string
): string {
  const step = workflow.steps[stepIndex];
  const participant = step.participant;
  const owner = workflow.owner;
  const role = getRoleLabel(step.role);
  const action = getRoleAction(step.role);
  const date = formatDate(new Date());

  const stepsHtml = workflow.steps.map((s, i) => {
    const isDone = i < stepIndex;
    const isCurrent = i === stepIndex;
    const dotColor = isDone ? '#22c55e' : isCurrent ? '#3b82f6' : '#d4d4d4';
    const textColor = isDone ? '#22c55e' : isCurrent ? '#3b82f6' : '#a3a3a3';
    const label = isDone ? '&#10003;' : isCurrent ? '&#9679;' : `${i + 1}`;
    return `
      <td style="text-align:center;padding:0 4px">
        <div style="width:32px;height:32px;border-radius:50%;background:${dotColor};color:#fff;font-size:12px;font-weight:400;line-height:32px;margin:0 auto">${label}</div>
        <div style="font-size:10px;color:${textColor};margin-top:4px;font-weight:400">${s.participant.name.split(' ')[0]}</div>
      </td>
    `;
  }).join('');

  return `
<div style="font-family:'Exo 2',Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
  <!-- Header -->
  <div style="background:#171717;padding:32px 40px;border-radius:16px 16px 0 0">
    <h1 style="font-family:'Grand Hotel',Georgia,cursive;font-size:32px;color:#ffffff;margin:0;font-weight:400">DocJourney</h1>
    <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;font-weight:400">Demande de ${action.toLowerCase()}</p>
  </div>

  <!-- Body -->
  <div style="padding:32px 40px;background:#ffffff;border-left:1px solid #e5e5e5;border-right:1px solid #e5e5e5">
    <!-- Greeting -->
    <p style="font-size:15px;color:#171717;margin:0 0 24px;line-height:1.6">
      Bonjour <strong>${participant.name}</strong>,
    </p>
    <p style="font-size:14px;color:#525252;margin:0 0 24px;line-height:1.7">
      <strong>${owner.name}</strong>${owner.organization ? ` (${owner.organization})` : ''} vous invite à participer à la validation du document suivant :
    </p>

    <!-- Document card -->
    <div style="background:#f5f5f5;border-radius:12px;padding:20px;margin:0 0 24px">
      <table cellpadding="0" cellspacing="0" style="width:100%"><tr>
        <td style="width:44px;vertical-align:top">
          <div style="width:44px;height:44px;background:#171717;border-radius:10px;text-align:center;line-height:44px">
            <span style="color:#fff;font-size:18px">&#128196;</span>
          </div>
        </td>
        <td style="padding-left:14px;vertical-align:top">
          <p style="font-size:15px;font-weight:500;color:#171717;margin:0">${doc.name}</p>
          <p style="font-size:12px;color:#737373;margin:4px 0 0">
            ${doc.metadata.category ? doc.metadata.category + ' &bull; ' : ''}Votre rôle : <strong style="color:#171717">${role}</strong>
          </p>
        </td>
      </tr></table>
    </div>

    ${step.instructions ? `
    <!-- Instructions -->
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin:0 0 24px">
      <p style="font-size:12px;font-weight:500;color:#92400e;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px">Instructions</p>
      <p style="font-size:13px;color:#78350f;margin:0;line-height:1.6">${step.instructions}</p>
    </div>
    ` : ''}

    <!-- Journey progress -->
    <div style="margin:0 0 28px">
      <p style="font-size:11px;font-weight:500;color:#a3a3a3;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px">Votre position dans le circuit</p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto">
        <tr>${stepsHtml}</tr>
      </table>
    </div>

    ${hostedUrl ? `
    <!-- CTA Button - Hosted Version -->
    <div style="text-align:center;margin:0 0 28px">
      <a href="${hostedUrl}" target="_blank" style="display:inline-block;background:#171717;color:#ffffff;font-size:16px;font-weight:500;padding:16px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.5px">
        &#128196; Ouvrir la page de validation
      </a>
      <p style="font-size:12px;color:#737373;margin:12px 0 0;line-height:1.6">
        Cliquez sur le bouton ci-dessus pour accéder à la page de validation
      </p>
    </div>

    <!-- Steps - Hosted Version -->
    <div style="border-top:1px solid #e5e5e5;padding-top:24px;margin-top:8px">
      <p style="font-size:11px;font-weight:500;color:#a3a3a3;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px">Comment procéder</p>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        <tr>
          <td style="width:28px;vertical-align:top;padding-bottom:12px">
            <div style="width:24px;height:24px;background:#171717;border-radius:50%;color:#fff;font-size:11px;font-weight:400;text-align:center;line-height:24px">1</div>
          </td>
          <td style="padding:2px 0 12px 10px">
            <p style="font-size:13px;color:#404040;margin:0;font-weight:400">Cliquez sur le bouton ci-dessus</p>
            <p style="font-size:12px;color:#a3a3a3;margin:2px 0 0">La page de validation s'ouvrira dans votre navigateur</p>
          </td>
        </tr>
        <tr>
          <td style="width:28px;vertical-align:top;padding-bottom:12px">
            <div style="width:24px;height:24px;background:#171717;border-radius:50%;color:#fff;font-size:11px;font-weight:400;text-align:center;line-height:24px">2</div>
          </td>
          <td style="padding:2px 0 12px 10px">
            <p style="font-size:13px;color:#404040;margin:0;font-weight:400">Consultez le document et ajoutez vos annotations</p>
            <p style="font-size:12px;color:#a3a3a3;margin:2px 0 0">Vous pouvez voir les validations précédentes</p>
          </td>
        </tr>
        <tr>
          <td style="width:28px;vertical-align:top">
            <div style="width:24px;height:24px;background:#171717;border-radius:50%;color:#fff;font-size:11px;font-weight:400;text-align:center;line-height:24px">3</div>
          </td>
          <td style="padding:2px 0 0 10px">
            <p style="font-size:13px;color:#404040;margin:0;font-weight:400">Prenez votre décision</p>
            <p style="font-size:12px;color:#a3a3a3;margin:2px 0 0">Cliquez sur Approuver ou Rejeter</p>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding:12px 0 0">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px">
              <p style="font-size:13px;color:#166534;margin:0;font-weight:500">&#10003; Votre réponse sera envoyée automatiquement</p>
              <p style="font-size:12px;color:#15803d;margin:4px 0 0">Pas besoin de renvoyer de fichier par email !</p>
            </div>
          </td>
        </tr>
      </table>
    </div>
    ` : `
    <!-- Attachment Info - Fallback Version -->
    <div style="text-align:center;margin:0 0 28px">
      <div style="background:#eff6ff;border:2px dashed #93c5fd;border-radius:12px;padding:24px 20px">
        <div style="font-size:32px;margin-bottom:8px">&#128230;</div>
        <p style="font-size:14px;color:#1e40af;margin:0 0 8px;font-weight:500">Pièce jointe à ouvrir</p>
        <p style="font-size:13px;color:#1e40af;margin:0 0 12px;background:#dbeafe;display:inline-block;padding:6px 12px;border-radius:6px;font-family:monospace">${doc.name.replace(/\.[^.]+$/, '')}_${participant.name.replace(/\s+/g, '_')}.html</p>
        <p style="font-size:12px;color:#3b82f6;margin:0;line-height:1.6">
          <strong>&#8595; Téléchargez</strong> la pièce jointe ci-dessus<br>
          puis <strong>double-cliquez</strong> dessus pour l'ouvrir
        </p>
      </div>
    </div>

    <!-- Steps - Attachment Version -->
    <div style="border-top:1px solid #e5e5e5;padding-top:24px;margin-top:8px">
      <p style="font-size:11px;font-weight:500;color:#a3a3a3;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px">Comment procéder</p>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        <tr>
          <td style="width:28px;vertical-align:top;padding-bottom:12px">
            <div style="width:24px;height:24px;background:#171717;border-radius:50%;color:#fff;font-size:11px;font-weight:400;text-align:center;line-height:24px">1</div>
          </td>
          <td style="padding:2px 0 12px 10px">
            <p style="font-size:13px;color:#404040;margin:0;font-weight:400">Ouvrez le fichier HTML joint</p>
            <p style="font-size:12px;color:#a3a3a3;margin:2px 0 0">Double-cliquez sur le fichier pour l'ouvrir dans votre navigateur</p>
          </td>
        </tr>
        <tr>
          <td style="width:28px;vertical-align:top;padding-bottom:12px">
            <div style="width:24px;height:24px;background:#171717;border-radius:50%;color:#fff;font-size:11px;font-weight:400;text-align:center;line-height:24px">2</div>
          </td>
          <td style="padding:2px 0 12px 10px">
            <p style="font-size:13px;color:#404040;margin:0;font-weight:400">Consultez le document et ajoutez vos annotations</p>
            <p style="font-size:12px;color:#a3a3a3;margin:2px 0 0">Vous pouvez voir les validations précédentes</p>
          </td>
        </tr>
        <tr>
          <td style="width:28px;vertical-align:top${syncEnabled ? '' : ';padding-bottom:12px'}">
            <div style="width:24px;height:24px;background:#171717;border-radius:50%;color:#fff;font-size:11px;font-weight:400;text-align:center;line-height:24px">3</div>
          </td>
          <td style="padding:2px 0 ${syncEnabled ? '0' : '12px'} 10px">
            <p style="font-size:13px;color:#404040;margin:0;font-weight:400">Prenez votre décision</p>
            <p style="font-size:12px;color:#a3a3a3;margin:2px 0 0">Cliquez sur Approuver ou Rejeter</p>
          </td>
        </tr>
        ${syncEnabled ? `
        <tr>
          <td colspan="2" style="padding:12px 0 0">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px">
              <p style="font-size:13px;color:#166534;margin:0;font-weight:500">&#10003; Votre réponse sera envoyée automatiquement</p>
              <p style="font-size:12px;color:#15803d;margin:4px 0 0">Pas besoin de renvoyer de fichier par email !</p>
            </div>
          </td>
        </tr>
        ` : `
        <tr>
          <td style="width:28px;vertical-align:top">
            <div style="width:24px;height:24px;background:#171717;border-radius:50%;color:#fff;font-size:11px;font-weight:400;text-align:center;line-height:24px">4</div>
          </td>
          <td style="padding:2px 0 0 10px">
            <p style="font-size:13px;color:#404040;margin:0;font-weight:400">Renvoyez le fichier .docjourney par email</p>
            <p style="font-size:12px;color:#a3a3a3;margin:2px 0 0">Envoyez-le à <strong style="color:#404040">${owner.email}</strong></p>
          </td>
        </tr>
        `}
      </table>
    </div>
    `}
  </div>

  <!-- Footer -->
  <div style="background:#f5f5f5;padding:24px 40px;border-radius:0 0 16px 16px;border:1px solid #e5e5e5;border-top:none">
    <p style="font-size:11px;color:#a3a3a3;margin:0;text-align:center">
      Envoyé via <strong>DocJourney</strong> le ${date}
      <br>Le voyage du document à travers son circuit de validation
    </p>
  </div>
</div>
  `.trim();
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  });
}

export function isEmailJSConfigured(settings: AppSettings): boolean {
  return !!(settings.emailjsServiceId && settings.emailjsTemplateId && settings.emailjsPublicKey);
}

export function validateEmailJSConfig(settings: AppSettings): { valid: boolean; error?: string } {
  if (!settings.emailjsServiceId) {
    return { valid: false, error: 'Service ID manquant' };
  }
  if (!settings.emailjsTemplateId) {
    return { valid: false, error: 'Template ID manquant. Allez sur emailjs.com > Email Templates pour copier votre Template ID (commence par template_)' };
  }
  if (!settings.emailjsPublicKey) {
    return { valid: false, error: 'Clé publique manquante' };
  }
  // Validate Template ID format
  if (settings.emailjsTemplateId === settings.emailjsServiceId) {
    return { valid: false, error: 'Le Template ID ne doit pas être identique au Service ID. Le Template ID commence généralement par "template_"' };
  }
  return { valid: true };
}

export async function sendEmailViaEmailJS(
  doc: DocJourneyDocument,
  workflow: Workflow,
  stepIndex: number,
  settings: AppSettings,
  htmlPackage?: string,
  existingHostedUrl?: string
): Promise<void> {
  const validation = validateEmailJSConfig(settings);
  if (!validation.valid) {
    throw new Error(validation.error || 'EmailJS non configuré');
  }

  // Check if Firebase sync is enabled
  const syncEnabled = isSyncConfigured(settings);
  const firebaseConfig = getFirebaseConfig(settings);

  console.log('sendEmailViaEmailJS - syncEnabled:', syncEnabled, 'hasFirebaseConfig:', !!firebaseConfig, 'hasHtmlPackage:', !!htmlPackage, 'existingHostedUrl:', existingHostedUrl || 'none');

  const step = workflow.steps[stepIndex];
  const subject = generateEmailSubject(doc, workflow, stepIndex);

  // Use existing hosted URL or try to upload
  let hostedUrl: string | undefined = existingHostedUrl;

  // Only upload if we don't have a hosted URL yet and sync is enabled
  if (!hostedUrl && syncEnabled && firebaseConfig && htmlPackage) {
    console.log('Attempting to upload HTML package to Firebase Storage...');
    try {
      const packageId = generateId();

      // Upload to Firebase Storage
      const uploadResult = await uploadPackageToStorage(
        htmlPackage,
        packageId,
        step.participant.name,
        doc.name,
        firebaseConfig
      );

      if (uploadResult.success && uploadResult.url) {
        hostedUrl = uploadResult.url;
        // Save packageId in workflow for retention cleanup
        const existing = workflow.storagePackageIds ?? [];
        await db.workflows.update(workflow.id, { storagePackageIds: [...existing, packageId] });
        console.log('Package uploaded successfully:', hostedUrl);
      } else {
        console.warn('Failed to upload package to storage:', uploadResult.error);
        // Continue without hosted URL - will fall back to attachment instructions
      }
    } catch (error) {
      console.warn('Error uploading package to storage:', error);
      // Continue without hosted URL - will fall back to attachment instructions
    }
  }

  const htmlContent = generateEmailTemplate(doc, workflow, stepIndex, syncEnabled, hostedUrl);

  const templateParams: Record<string, string> = {
    to_email: step.participant.email,
    to_name: step.participant.name,
    from_name: workflow.owner.name,
    from_email: settings.ownerEmail || workflow.owner.email,
    subject: subject,
    message_html: htmlContent,
    document_name: doc.name,
    role: getRoleLabel(step.role),
    reply_to: settings.ownerEmail || workflow.owner.email,
  };

  // Debug: log what we're sending
  console.log('EmailJS Config:', {
    serviceId: settings.emailjsServiceId,
    templateId: settings.emailjsTemplateId,
    publicKey: settings.emailjsPublicKey?.substring(0, 10) + '...',
  });
  console.log('EmailJS Params:', {
    to_email: templateParams.to_email,
    to_name: templateParams.to_name,
    from_name: templateParams.from_name,
    from_email: templateParams.from_email,
    subject: templateParams.subject,
    reply_to: templateParams.reply_to,
    message_html_length: templateParams.message_html?.length || 0,
    hostedUrl: hostedUrl || 'none (attachment mode)',
  });

  try {
    const startTime = Date.now();
    const response = await emailjs.send(
      settings.emailjsServiceId!,
      settings.emailjsTemplateId!,
      templateParams,
      settings.emailjsPublicKey!
    );
    const duration = Date.now() - startTime;
    console.log('EmailJS Response:', { status: response.status, text: response.text, duration: `${duration}ms` });
  } catch (error: unknown) {
    // EmailJS returns error with text property containing details
    const emailJsError = error as { text?: string; message?: string; status?: number };
    const errorMessage = emailJsError.text || emailJsError.message || 'Erreur inconnue';
    console.error('EmailJS Error:', { status: emailJsError.status, text: errorMessage, error });
    throw new Error(`Erreur EmailJS: ${errorMessage}`);
  }
}
