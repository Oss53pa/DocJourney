export function generateCSS(): string {
  return `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Exo 2',system-ui,-apple-system,sans-serif;background:#fafafa;color:#171717;line-height:1.6;overflow-x:hidden}
.brand-font{font-family:'Grand Hotel',cursive}
button{font-family:inherit}

/* ===== HEADER ===== */
.header{background:#fff;border-bottom:1px solid #e5e5e5;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.header-left{display:flex;align-items:center;gap:16px}
.header h1{font-family:'Grand Hotel',cursive;font-size:26px;color:#171717}
.header-doc{font-size:13px;color:#525252;font-weight:400;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.header-ref{font-size:11px;color:#a3a3a3;font-weight:400}
.header-right{display:flex;align-items:center;gap:12px}
.participant-badge{display:flex;align-items:center;gap:8px;background:#f5f5f5;padding:6px 14px;border-radius:8px}
.participant-badge .name{font-size:13px;font-weight:400;color:#171717}
.participant-badge .role{font-size:11px;color:#525252;background:#e5e5e5;padding:2px 8px;border-radius:4px;font-weight:400}
.header-actions{display:flex;gap:6px}
.toggle-panel-btn{position:relative}
.toggle-panel-btn .toggle-indicator{width:6px;height:6px;border-radius:50%;background:#22c55e;position:absolute;top:4px;right:4px}
.icon-btn{width:36px;height:36px;border-radius:8px;border:1px solid #e5e5e5;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;color:#525252;transition:all .15s}
.icon-btn:hover{background:#f5f5f5;border-color:#d4d4d4}

/* ===== INSTRUCTIONS ===== */
.instructions-bar{background:#eff6ff;border-bottom:1px solid #bfdbfe;padding:10px 20px;font-size:13px;color:#1e40af;display:flex;align-items:center;gap:8px;cursor:pointer;transition:all .2s}
.instructions-bar:hover{background:#dbeafe}
.instructions-bar .toggle{font-size:10px;transition:transform .2s}
.instructions-bar .toggle.open{transform:rotate(90deg)}
.instructions-content{background:#eff6ff;border-bottom:1px solid #bfdbfe;padding:0 20px;max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s ease;font-size:13px;color:#1e40af;line-height:1.6}
.instructions-content.open{max-height:200px;padding:10px 20px 14px}

/* ===== MAIN LAYOUT ===== */
.main-layout{display:grid;grid-template-columns:1fr 380px;height:calc(100vh - 52px);overflow:hidden}
.main-layout.has-instructions{height:calc(100vh - 94px)}

/* ===== VIEWER ===== */
.viewer-area{display:flex;flex-direction:column;overflow:hidden;background:#e5e5e5;position:relative}
.viewer-toolbar{background:#fff;border-bottom:1px solid #e5e5e5;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0;position:relative;z-index:60}
.toolbar-group{display:flex;align-items:center;gap:4px}
.toolbar-btn{height:32px;padding:0 10px;border-radius:6px;border:1px solid #e5e5e5;background:#fff;cursor:pointer;font-size:12px;font-weight:400;color:#525252;display:flex;align-items:center;gap:4px;transition:all .15s;white-space:nowrap}
.toolbar-btn:hover{background:#f5f5f5;border-color:#d4d4d4}
.toolbar-btn.active{background:#171717;color:#fff;border-color:#171717}
.toolbar-sep{width:1px;height:20px;background:#e5e5e5;margin:0 4px}
.zoom-display{font-size:12px;font-weight:400;color:#171717;min-width:42px;text-align:center}
.page-input{width:40px;height:28px;border:1px solid #d4d4d4;border-radius:4px;text-align:center;font-size:12px;font-family:inherit}
.page-total{font-size:12px;color:#737373}

.viewer-viewport{flex:1;overflow:auto;position:relative;display:flex;align-items:flex-start;justify-content:center;padding:20px}
.viewer-content{position:relative;transform-origin:top center;transition:transform .15s ease}
.doc-render{position:relative}
.doc-render img{display:block;max-width:100%}
.doc-render iframe{display:block;border:none;background:#fff}
.doc-render pre{white-space:pre-wrap;font-family:'JetBrains Mono',monospace;font-size:13px;padding:24px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);min-width:600px}
.viewer-fallback{text-align:center;padding:80px 40px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}

/* Annotation overlay — sits on top of doc-render, matches its size */
.annotation-overlay{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10}

/* Pin — numbered circle */
.annotation-pin{position:absolute;width:28px;height:28px;border-radius:50%;cursor:pointer;pointer-events:all;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);transition:transform .15s,box-shadow .15s;transform:translate(-50%,-50%);z-index:5}
.annotation-pin:hover{transform:translate(-50%,-50%) scale(1.25);box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:20}
.annotation-pin .pin-number{font-size:12px;font-weight:700;line-height:1}
.annotation-pin.ann-active{transform:translate(-50%,-50%) scale(1.25);box-shadow:0 0 0 4px rgba(255,255,255,0.8),0 4px 12px rgba(0,0,0,0.3);z-index:20}
.annotation-pin.ann-flash{animation:annFlash 1.5s ease}

/* Highlight — colored band */
.annotation-highlight{position:absolute;min-width:120px;height:24px;cursor:pointer;pointer-events:all;border-radius:3px;transition:all .15s;transform:translateY(-50%);z-index:3}
.annotation-highlight:hover{filter:brightness(0.9);z-index:20}
.annotation-highlight .highlight-label{position:absolute;top:-18px;left:0;font-size:9px;font-weight:700;color:#fff;padding:1px 6px;border-radius:3px;white-space:nowrap;opacity:0;transition:opacity .15s}
.annotation-highlight:hover .highlight-label{opacity:1}
.annotation-highlight.ann-active{filter:brightness(0.85);box-shadow:0 0 0 3px var(--ann-color,#3b82f6);z-index:20}
.annotation-highlight.ann-active .highlight-label{opacity:1}
.annotation-highlight.ann-flash{animation:annFlash 1.5s ease}

/* Comment marker — bubble */
.annotation-comment-marker{position:absolute;cursor:pointer;pointer-events:all;display:flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;border:2px solid;border-radius:20px;font-size:11px;white-space:nowrap;max-width:220px;transition:all .15s;transform:translate(-12px,-50%);z-index:4}
.annotation-comment-marker:hover{z-index:20;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.annotation-comment-marker .marker-icon{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0}
.annotation-comment-marker .marker-text{color:#404040;overflow:hidden;text-overflow:ellipsis;font-size:11px;line-height:1.3}
.annotation-comment-marker.ann-active{box-shadow:0 0 0 3px var(--ann-color,#3b82f6);z-index:20}
.annotation-comment-marker.ann-flash{animation:annFlash 1.5s ease}

/* Flash & highlight animations */
@keyframes annFlash{0%{box-shadow:0 0 0 0 rgba(59,130,246,0.6)}25%{box-shadow:0 0 0 8px rgba(59,130,246,0.3)}50%{box-shadow:0 0 0 0 rgba(59,130,246,0.6)}75%{box-shadow:0 0 0 8px rgba(59,130,246,0.3)}100%{box-shadow:none}}

/* Panel item bidirectional states */
.panel-highlight{background-color:rgba(59,130,246,0.08)!important;box-shadow:inset 3px 0 0 #3b82f6}
.panel-flash{animation:panelFlash 1.5s ease}
@keyframes panelFlash{0%{background:rgba(59,130,246,0.15)}25%{background:transparent}50%{background:rgba(59,130,246,0.15)}75%{background:transparent}100%{}}

/* ===== SIDE PANEL ===== */
.side-panel{background:#fff;border-left:1px solid #e5e5e5;display:flex;flex-direction:column;overflow:hidden;transition:width .3s ease,opacity .3s ease}
.main-layout.panel-collapsed{grid-template-columns:1fr}
.main-layout.panel-collapsed .side-panel{display:none}
.tab-bar{display:flex;border-bottom:1px solid #e5e5e5;flex-shrink:0;background:#fafafa}
.tab-btn{flex:1;padding:10px 4px;font-size:11px;font-weight:400;color:#a3a3a3;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;text-transform:uppercase;letter-spacing:0.03em}
.tab-btn:hover{color:#525252;background:#f5f5f5}
.tab-btn.active{color:#171717;border-bottom-color:#171717;background:#fff}
.tab-content{flex:1;overflow-y:auto;padding:16px}
.tab-pane{display:none}
.tab-pane.active{display:block}

/* ===== POSITION TAB ===== */
.journey-tracker{padding:16px 0}
.journey-step{display:flex;align-items:flex-start;gap:12px;position:relative;padding-bottom:24px}
.journey-step:last-child{padding-bottom:0}
.journey-step:not(:last-child)::after{content:'';position:absolute;left:15px;top:32px;bottom:0;width:2px}
.journey-step.done::after{background:#22c55e}
.journey-step.current::after{background:#e5e5e5}
.journey-step.pending::after{background:#e5e5e5}
.journey-dot{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:400;flex-shrink:0;position:relative;z-index:1}
.journey-step.done .journey-dot{background:#22c55e;color:#fff}
.journey-step.current .journey-dot{background:#3b82f6;color:#fff;animation:pulse 2s infinite}
.journey-step.pending .journey-dot{background:#e5e5e5;color:#737373}
.journey-step.rejected .journey-dot{background:#ef4444;color:#fff}
.journey-step.modification .journey-dot{background:#f59e0b;color:#fff}
.journey-info{flex:1;min-width:0}
.journey-info .name{font-size:13px;font-weight:400;color:#171717}
.journey-info .role-badge{display:inline-block;font-size:10px;font-weight:400;color:#525252;background:#f5f5f5;padding:2px 8px;border-radius:4px;margin-top:2px}
.journey-info .date{font-size:11px;color:#a3a3a3;margin-top:2px}
.journey-info .decision-tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:400;padding:2px 8px;border-radius:4px;margin-top:4px}
.decision-tag.positive{background:#dcfce7;color:#16a34a}
.decision-tag.negative{background:#fef2f2;color:#dc2626}
.decision-tag.warning{background:#fffbeb;color:#d97706}

@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(59,130,246,0.4)}50%{opacity:.85;box-shadow:0 0 0 8px rgba(59,130,246,0)}}

.current-step-card{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px;margin-top:16px}
.current-step-card h4{font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;color:#0369a1;margin-bottom:8px}
.current-step-card p{font-size:13px;color:#0c4a6e;line-height:1.5}

.history-card{border:1px solid #e5e5e5;border-radius:10px;margin-top:12px;overflow:hidden}
.history-card-header{padding:10px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:background .15s}
.history-card-header:hover{background:#f5f5f5}
.history-card-header .left{display:flex;align-items:center;gap:8px}
.history-card-header .step-dot{width:8px;height:8px;border-radius:50%}
.history-card-header .step-name{font-size:13px;font-weight:400;color:#171717}
.history-card-header .chevron{font-size:12px;color:#a3a3a3;transition:transform .2s}
.history-card-header .chevron.open{transform:rotate(180deg)}
.history-card-body{max-height:0;overflow:hidden;transition:max-height .3s ease}
.history-card-body.open{max-height:500px}
.history-card-body-inner{padding:12px 14px;border-top:1px solid #e5e5e5;font-size:13px}
.history-card-body-inner .meta{color:#737373;font-size:12px;margin-bottom:6px}
.history-card-body-inner .comment{background:#f5f5f5;padding:8px 12px;border-radius:6px;font-style:italic;color:#525252;margin-top:8px;font-size:12px}
.history-card-body-inner .ann-count{font-size:11px;color:#a3a3a3;margin-top:6px}

/* ===== COMMENTS TAB ===== */
.page-group{margin-bottom:16px}
.page-group-title{font-size:11px;font-weight:400;text-transform:uppercase;letter-spacing:0.05em;color:#a3a3a3;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #f5f5f5}
.comment-card{padding:10px;border-radius:8px;margin-bottom:8px;border-left:3px solid;font-size:13px;cursor:pointer;transition:all .15s}
.comment-card:hover{box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.comment-card .text{color:#404040;line-height:1.5}
.comment-card .meta{font-size:11px;color:#a3a3a3;margin-top:4px;display:flex;align-items:center;gap:6px}
.comment-card .meta .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.comment-card .card-actions{display:flex;align-items:center;gap:8px;margin-top:6px}
.comment-card .goto-link,.my-note-item .goto-link{font-size:11px;color:#3b82f6;cursor:pointer;text-decoration:none;display:inline-block;font-weight:500}
.comment-card .goto-link:hover,.my-note-item .goto-link:hover{text-decoration:underline}
.comment-card .reply-btn{font-size:11px;color:#737373;cursor:pointer;background:none;border:none;padding:0;font-family:inherit}
.comment-card .reply-btn:hover{color:#3b82f6}
.reply-card{margin-left:16px;border-left-style:dashed}

/* ===== MY NOTES TAB ===== */
.note-form{margin-bottom:16px}
.note-form label{display:block;font-size:12px;font-weight:400;color:#525252;margin-bottom:6px}
.note-type-row{display:flex;gap:6px;margin-bottom:10px}
.note-type-btn{padding:6px 12px;border-radius:6px;border:1px solid #e5e5e5;background:#fff;cursor:pointer;font-size:12px;font-weight:400;color:#525252;transition:all .15s}
.note-type-btn:hover{background:#f5f5f5}
.note-type-btn.active{background:#171717;color:#fff;border-color:#171717}
textarea{width:100%;padding:10px 12px;border:1px solid #d4d4d4;border-radius:8px;font-family:'Exo 2',sans-serif;font-size:13px;resize:vertical;min-height:80px;transition:border-color .15s}
textarea:focus{outline:none;border-color:#171717;box-shadow:0 0 0 2px rgba(23,23,23,0.08)}
.char-count{font-size:11px;color:#a3a3a3;text-align:right;margin-top:4px}
.note-actions{display:flex;gap:8px;margin-top:8px}
.my-notes-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.my-notes-title{font-size:11px;font-weight:400;text-transform:uppercase;letter-spacing:0.05em;color:#a3a3a3}
.my-notes-actions{display:flex;gap:6px}
.btn-undo,.btn-clear-all{font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid #e5e5e5;background:#fff;cursor:pointer;color:#525252;font-family:inherit;transition:all .15s;white-space:nowrap}
.btn-undo:hover{background:#f0f9ff;border-color:#93c5fd;color:#2563eb}
.btn-clear-all:hover{background:#fef2f2;border-color:#fca5a5;color:#dc2626}
.my-note-item{padding:10px;border-radius:8px;margin-bottom:8px;border-left:3px solid;font-size:13px;display:flex;align-items:flex-start;gap:8px}
.my-note-item .my-note-content{flex:1;min-width:0}
.my-note-item .text{color:#404040;line-height:1.4}
.my-note-item .note-meta{font-size:11px;color:#a3a3a3;margin-top:4px}
.delete-note-btn{flex-shrink:0;width:30px;height:30px;border-radius:6px;border:1px solid #e5e5e5;background:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;color:#a3a3a3;transition:all .15s}
.delete-note-btn:hover{background:#fef2f2;border-color:#fca5a5;color:#ef4444}
.general-comment-section{margin-top:16px;padding-top:16px;border-top:1px solid #e5e5e5}

/* ===== DECISION TAB ===== */
.decision-actions{display:flex;flex-direction:column;gap:10px;margin-top:16px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 20px;border-radius:8px;font-weight:400;font-size:14px;cursor:pointer;border:none;transition:all .2s;font-family:inherit}
.btn:hover{transform:translateY(-1px)}
.btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
.btn-approve{background:#22c55e;color:#fff;width:100%}
.btn-approve:hover:not(:disabled){background:#16a34a}
.btn-modify{background:#f59e0b;color:#fff;width:100%}
.btn-modify:hover:not(:disabled){background:#d97706}
.btn-reject{background:#ef4444;color:#fff;width:100%}
.btn-reject:hover:not(:disabled){background:#dc2626}
.btn-primary{background:#171717;color:#fff}
.btn-primary:hover:not(:disabled){background:#262626}
.btn-secondary{background:#f5f5f5;color:#404040;border:1px solid #d4d4d4}
.btn-secondary:hover:not(:disabled){background:#e5e5e5}
.btn-sm{padding:6px 14px;font-size:12px}
.btn-lg{padding:14px 28px;font-size:16px}

/* ===== DOCUMENT LOCK BANNER ===== */
.document-lock-banner{display:flex;align-items:flex-start;gap:12px;padding:14px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;margin-bottom:16px}
.document-lock-banner.warning{background:#fffbeb;border-color:#fde68a}
.document-lock-banner.error{background:#fef2f2;border-color:#fecaca}
.document-lock-banner .lock-icon{font-size:20px;flex-shrink:0}
.document-lock-banner .lock-content{flex:1;min-width:0}
.document-lock-banner .lock-content strong{font-size:12px;font-weight:500;color:#166534;display:block}
.document-lock-banner.warning .lock-content strong{color:#92400e}
.document-lock-banner.error .lock-content strong{color:#991b1b}
.document-lock-banner .lock-content p{font-size:11px;color:#15803d;margin:2px 0 0;line-height:1.4}
.document-lock-banner.warning .lock-content p{color:#a16207}
.document-lock-banner.error .lock-content p{color:#b91c1c}
.document-lock-banner .lock-status{flex-shrink:0;font-size:11px}
.document-lock-banner .lock-status .verifying{color:#737373}
.document-lock-banner .lock-status .verified{color:#16a34a;font-weight:500}
.document-lock-banner .lock-status .failed{color:#dc2626;font-weight:500}

/* ===== INITIALS ZONE (Paraphe) ===== */
.initials-zone{margin-top:20px;padding:16px;background:#fafafa;border:1px solid #e5e5e5;border-radius:10px}
.initials-zone h4{font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;color:#525252;margin-bottom:6px}
.initials-hint{font-size:11px;color:#737373;margin-bottom:10px}
.initials-canvas-wrap{border:2px dashed #d4d4d4;border-radius:8px;padding:4px;background:#fff;margin-bottom:10px;touch-action:none}
.initials-canvas-wrap canvas{width:100%;height:100px;cursor:crosshair;display:block;-webkit-user-select:none;user-select:none;touch-action:none}
.initials-tabs{margin-bottom:10px}
.initials-source{display:none}
.initials-source.active{display:block}

/* Initials page selector */
.initials-page-selector{margin-top:12px}
.initials-pages-config{background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:12px}
.initials-pages-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.initials-pages-title{font-size:12px;font-weight:500;color:#171717}
.initials-pages-count{font-size:11px;color:#16a34a;font-weight:500;background:#dcfce7;padding:2px 8px;border-radius:10px}
.initials-pages-options{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.initials-page-option{display:flex;align-items:center;gap:8px;font-size:12px;color:#525252;cursor:pointer}
.initials-page-option input{margin:0}
.initials-pages-excludes{display:flex;flex-direction:column;gap:6px;padding:10px;background:#f5f5f5;border-radius:6px}
.initials-exclude-option{display:flex;align-items:center;gap:8px;font-size:11px;color:#737373;cursor:pointer}
.initials-exclude-option input{margin:0}
.initials-pages-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:6px;margin-top:8px}
.initials-page-checkbox{display:flex;align-items:center;justify-content:center;padding:6px;background:#fff;border:1px solid #e5e5e5;border-radius:6px;font-size:12px;color:#737373;cursor:pointer;transition:all .15s}
.initials-page-checkbox:hover{border-color:#a3a3a3}
.initials-page-checkbox.selected{background:#171717;color:#fff;border-color:#171717}
.initials-page-checkbox input{display:none}

/* Initials place button & position info */
.initials-place-btn{width:100%;margin-top:10px;justify-content:center}
.initials-position-info{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding:8px 12px;background:#dcfce7;border-radius:8px;font-size:12px;color:#16a34a;font-weight:500}

/* Initials placement overlay */
.initials-placement-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:100;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center}
.initials-placement-toolbar{position:absolute;top:0;left:0;right:0;background:#171717;color:#fff;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;font-size:13px;z-index:101}
.initials-placement-actions{display:flex;gap:8px}
.initials-draggable{position:absolute;cursor:grab;border:2px dashed #22c55e;border-radius:8px;padding:6px;background:rgba(255,255,255,0.95);box-shadow:0 4px 20px rgba(0,0,0,0.3);-webkit-user-select:none;user-select:none;transition:box-shadow .15s;z-index:102}
.initials-draggable:active{cursor:grabbing;box-shadow:0 8px 32px rgba(0,0,0,0.4)}
.initials-draggable img{display:block;max-width:120px;max-height:60px;pointer-events:none;-webkit-user-drag:none}
.initials-drag-handle{font-size:10px;text-align:center;color:#22c55e;margin-top:2px;font-weight:500}
.initials-resize-handle{position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;background:#22c55e;border-radius:0 0 6px 0;cursor:nwse-resize;pointer-events:all;z-index:2}
.initials-resize-handle::after{content:'';position:absolute;bottom:3px;right:3px;width:6px;height:6px;border-right:2px solid #fff;border-bottom:2px solid #fff}

/* ===== SIGNATURE ZONE ===== */
.signature-zone{margin-top:16px;padding:16px;background:#fafafa;border:1px solid #e5e5e5;border-radius:10px}
.signature-zone h4{font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;color:#525252;margin-bottom:10px}

/* Source tabs */
.sig-source-tabs{display:flex;gap:4px;margin-bottom:12px}
.sig-tab{flex:1;padding:6px;font-size:11px;font-weight:500;border:1px solid #e5e5e5;background:#fff;border-radius:6px;cursor:pointer;text-align:center;transition:all .15s;color:#737373;font-family:inherit}
.sig-tab:hover{background:#f5f5f5}
.sig-tab.active{background:#171717;color:#fff;border-color:#171717}

/* Source panes */
.sig-source{display:none}
.sig-source.active{display:block}

/* Canvas (draw) */
.signature-canvas-wrap{border:2px dashed #d4d4d4;border-radius:8px;padding:4px;background:#fff;margin-bottom:10px;touch-action:none}
.signature-canvas-wrap canvas{width:100%;height:180px;cursor:crosshair;display:block;-webkit-user-select:none;user-select:none;touch-action:none}
.signature-actions{display:flex;justify-content:space-between;align-items:center}

/* Import */
.sig-import-zone{border:2px dashed #d4d4d4;border-radius:8px;padding:24px;text-align:center;cursor:pointer;transition:all .15s;background:#fff}
.sig-import-zone:hover{border-color:#a3a3a3;background:#f5f5f5}
.sig-import-icon{font-size:24px;margin-bottom:6px}
.sig-import-zone p{font-size:12px;color:#737373;margin:0}
.sig-import-hint{font-size:11px;color:#a3a3a3;margin-top:2px}
.sig-import-preview{text-align:center;margin-top:10px}
.sig-import-preview img{max-width:100%;max-height:120px;border-radius:6px;border:1px solid #e5e5e5}

/* Saved */
.sig-saved-preview{text-align:center;padding:12px}
.sig-saved-preview img{max-width:100%;max-height:100px;border-radius:6px;border:1px solid #e5e5e5;margin-bottom:8px}
.sig-saved-empty{text-align:center;padding:20px;color:#a3a3a3;font-size:12px}

/* Place button & position info */
.sig-place-btn{width:100%;margin-top:10px;justify-content:center}
.sig-position-info{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding:8px 12px;background:#dcfce7;border-radius:8px;font-size:12px;color:#16a34a;font-weight:500}

/* Save & certification */
.sig-save-check{display:flex;align-items:flex-start;gap:8px;margin-top:10px;font-size:11px;color:#737373;line-height:1.4}
.sig-save-check input{margin-top:2px;flex-shrink:0}
.certification-check{display:flex;align-items:flex-start;gap:8px;margin-top:10px;font-size:12px;color:#525252;line-height:1.4}
.certification-check input{margin-top:2px;flex-shrink:0}

/* Drag overlay on viewer */
.sig-placement-overlay{position:absolute;top:0;left:0;right:0;bottom:0;z-index:50;pointer-events:none}
.sig-draggable{position:absolute;pointer-events:all;cursor:grab;border:2px dashed #3b82f6;border-radius:8px;padding:4px;background:rgba(255,255,255,0.9);box-shadow:0 4px 12px rgba(0,0,0,0.15);-webkit-user-select:none;user-select:none;transition:box-shadow .15s}
.sig-draggable:active{cursor:grabbing;box-shadow:0 8px 24px rgba(0,0,0,0.2)}
.sig-draggable img{display:block;max-width:200px;max-height:80px;pointer-events:none;-webkit-user-drag:none}
.sig-drag-handle{font-size:10px;text-align:center;color:#3b82f6;margin-top:2px;font-weight:500}
.sig-resize-handle{position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;background:#3b82f6;border-radius:0 0 6px 0;cursor:nwse-resize;pointer-events:all;z-index:2}
.sig-resize-handle::after{content:'';position:absolute;bottom:4px;right:4px;width:7px;height:7px;border-right:2px solid #fff;border-bottom:2px solid #fff}

/* ===== MODALS ===== */
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;opacity:0;pointer-events:none;transition:opacity .2s}
.modal-overlay.visible{opacity:1;pointer-events:all}
.modal{background:#fff;border-radius:16px;padding:24px;max-width:480px;width:90%;max-height:85vh;overflow:auto;transform:translateY(20px);transition:transform .2s}
.modal-overlay.visible .modal{transform:translateY(0)}
.modal h3{font-size:18px;font-weight:500;margin-bottom:4px}
.modal .subtitle{font-size:13px;color:#737373;margin-bottom:20px}
.modal-actions{display:flex;gap:10px;margin-top:20px}
.modal-actions .btn{flex:1}

.approval-summary{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin:12px 0}
.approval-summary p{font-size:13px;color:#166534;line-height:1.5}
.next-step-info{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px;margin:12px 0}
.next-step-info h4{font-size:12px;font-weight:500;color:#0369a1;margin-bottom:6px}
.next-step-info p{font-size:13px;color:#0c4a6e}

.rejection-form label{display:block;font-size:12px;font-weight:400;color:#525252;margin-bottom:6px;margin-top:14px}
.rejection-form label:first-child{margin-top:0}
.rejection-form select{width:100%;padding:10px 12px;border:1px solid #d4d4d4;border-radius:8px;font-family:inherit;font-size:13px;background:#fff;cursor:pointer}
.rejection-form select:focus{outline:none;border-color:#171717}
.rejection-form textarea{min-height:100px}
.consequences-box{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;margin-top:14px}
.consequences-box h4{font-size:12px;font-weight:500;color:#dc2626;margin-bottom:6px}
.consequences-box p{font-size:12px;color:#991b1b;line-height:1.5}

/* ===== HELP MODAL ===== */
.help-section{margin-bottom:16px}
.help-section h4{font-size:13px;font-weight:500;color:#171717;margin-bottom:6px}
.help-section p{font-size:12px;color:#525252;line-height:1.5}
.help-section kbd{background:#f5f5f5;border:1px solid #d4d4d4;border-radius:4px;padding:1px 6px;font-size:11px;font-family:monospace}

/* ===== DOWNLOAD SCREEN ===== */
.download-screen{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:#fff;z-index:900;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px 20px}
.download-screen.visible{display:flex}
.download-screen-inner{max-width:420px;width:100%;display:flex;flex-direction:column;align-items:center}

/* Icon */
.dl-icon-wrap{width:52px;height:52px;border-radius:50%;background:#f5f5f5;display:flex;align-items:center;justify-content:center;margin-bottom:16px;opacity:0;animation:dlFade .4s ease .05s forwards}
.dl-icon-wrap svg{width:22px;height:22px;stroke-width:1.8;color:#171717}

/* Header */
.download-screen h2{font-size:18px;font-weight:500;color:#171717;margin-bottom:2px;opacity:0;animation:dlFade .35s ease .1s forwards}
.dl-decision-label{font-size:13px;color:#525252;margin-bottom:20px;opacity:0;animation:dlFade .35s ease .15s forwards}

/* Summary */
.dl-summary{width:100%;text-align:left;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;padding:4px 0;margin-bottom:20px;opacity:0;animation:dlFade .35s ease .22s forwards}
.dl-summary .row{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;font-size:13px}
.dl-summary .row+.row{border-top:1px solid #f5f5f5}
.dl-summary .label{color:#a3a3a3}
.dl-summary .value{color:#171717;text-align:right;max-width:62%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Download */
.dl-download{width:100%;opacity:0;animation:dlFade .35s ease .3s forwards}
.dl-download .btn{width:100%;justify-content:center}
.dl-email-row{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:10px;font-size:12px;color:#a3a3a3}
.dl-email-row strong{color:#525252;font-weight:400}
.copy-email-btn{font-size:12px;color:#525252;background:none;border:none;cursor:pointer;padding:0;font-family:inherit;transition:color .15s}
.copy-email-btn:hover{color:#171717}
.dl-receipt-btn{margin-top:10px;width:100%;background:#f5f5f5;color:#404040;border:1px solid #d4d4d4}
.dl-receipt-btn:hover{background:#e5e5e5}

/* Footer */
.dl-footer{font-size:11px;color:#d4d4d4;margin-top:20px;opacity:0;animation:dlFade .3s ease .38s forwards}

@keyframes dlFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* ===== SYNC STATUS ===== */
.sync-status{width:100%;padding:12px 16px;border-radius:12px;margin-bottom:16px;text-align:center;opacity:0;animation:dlFade .3s ease .2s forwards}
.sync-status.syncing{background:#eff6ff;border:1px solid #bfdbfe}
.sync-status.success{background:#f0fdf4;border:1px solid #bbf7d0}
.sync-status.error{background:#fef2f2;border:1px solid #fecaca}
.sync-status-inner{display:flex;flex-direction:column;align-items:center;gap:4px}
.sync-status #syncStatus{font-size:14px;font-weight:500}
.sync-status.syncing #syncStatus{color:#2563eb}
.sync-status.success #syncStatus{color:#16a34a}
.sync-status.error #syncStatus{color:#dc2626}
.sync-status #syncMessage{font-size:12px;color:#737373}

/* Sync spinner */
.sync-spinner{display:inline-block;width:14px;height:14px;border:2px solid #bfdbfe;border-top-color:#2563eb;border-radius:50%;animation:syncSpin 1s linear infinite;margin-right:6px;vertical-align:middle}
@keyframes syncSpin{to{transform:rotate(360deg)}}

/* Sync success message */
.sync-success-message{display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:16px}
.sync-success-icon{width:48px;height:48px;border-radius:50%;background:#22c55e;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700}
.sync-success-message p{font-size:14px;color:#166534;margin:0}
.sync-success-hint{font-size:12px!important;color:#737373!important}

/* Sync fallback (manual download) */
.sync-fallback{width:100%}
.sync-fallback-hint{font-size:13px;color:#dc2626;margin:0 0 12px 0;text-align:center}

/* ===== MOBILE DRAWER ===== */
.mobile-drawer{display:none;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top-left-radius:16px;border-top-right-radius:16px;box-shadow:0 -4px 20px rgba(0,0,0,0.1);z-index:200;max-height:80vh;transition:transform .3s ease}
.mobile-drawer.collapsed{transform:translateY(calc(100% - 60px))}
.drag-handle{width:40px;height:4px;background:#d4d4d4;border-radius:2px;margin:10px auto 6px}
.mobile-tab-bar{display:flex;border-bottom:1px solid #e5e5e5;padding:0 12px}
.mobile-tab-bar .tab-btn{padding:8px 0;font-size:11px}
.mobile-drawer-content{overflow-y:auto;max-height:calc(80vh - 80px);padding:12px 16px}

/* ===== ANIMATIONS ===== */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.animate-fade-in{animation:fadeIn .3s ease}
.animate-slide-up{animation:slideUp .3s ease}

/* ===== RESPONSIVE ===== */
@media(max-width:1024px){
  .main-layout{grid-template-columns:1fr 320px}
  .header-doc{max-width:200px}
}
@media(max-width:768px){
  .main-layout{grid-template-columns:1fr;height:calc(100vh - 52px)}
  .side-panel{display:none}
  .mobile-drawer{display:block}
  .header-doc{display:none}
  .header-right .participant-badge .name{display:none}
  .viewer-toolbar{flex-wrap:wrap;gap:4px}
  .instructions-bar{font-size:12px}
}

/* ===== OTP VERIFICATION SCREEN ===== */
.otp-screen{position:fixed;inset:0;background:linear-gradient(135deg,#eff6ff 0%,#e0e7ff 100%);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.otp-container{background:#fff;border-radius:20px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.15);padding:32px;max-width:420px;width:100%;animation:slideUp .4s ease}
.otp-header{text-align:center;margin-bottom:24px}
.otp-icon{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#3b82f6 0%,#6366f1 100%);color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.otp-header h1{font-size:22px;font-weight:600;color:#171717;margin:0 0 6px}
.otp-subtitle{font-size:14px;color:#737373;margin:0}
.otp-doc-info{display:flex;align-items:center;gap:12px;background:#f5f5f5;border-radius:12px;padding:12px 16px;margin-bottom:16px}
.otp-doc-icon{width:40px;height:40px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#525252;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.otp-doc-details{flex:1;min-width:0}
.otp-doc-name{font-size:13px;font-weight:500;color:#171717;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.otp-doc-workflow{font-size:11px;color:#a3a3a3}
.otp-recipient{display:flex;align-items:center;gap:8px;justify-content:center;font-size:12px;color:#737373;margin-bottom:24px}
.otp-input-container{margin-bottom:20px}
.otp-inputs{display:flex;gap:8px;justify-content:center}
.otp-digit{width:48px;height:56px;border:2px solid #e5e5e5;border-radius:12px;font-size:24px;font-weight:600;text-align:center;color:#171717;background:#fafafa;transition:all .2s}
.otp-digit:focus{outline:none;border-color:#3b82f6;background:#fff;box-shadow:0 0 0 4px rgba(59,130,246,0.15)}
.otp-digit.error{border-color:#ef4444;background:#fef2f2;animation:shake .4s ease}
.otp-digit.success{border-color:#22c55e;background:#f0fdf4}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.otp-error{display:flex;align-items:center;gap:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 14px;margin-bottom:16px;color:#dc2626;font-size:13px}
.otp-attempts{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:16px}
.otp-attempts-dots{display:flex;gap:6px}
.otp-attempts-dots .dot{width:8px;height:8px;border-radius:50%;background:#e5e5e5;transition:background .2s}
.otp-attempts-dots .dot.used{background:#fbbf24}
.otp-attempts-dots .dot.remaining{background:#22c55e}
#otpAttemptsText{font-size:12px;color:#737373}
.otp-verify-btn{width:100%;padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:600;color:#fff;background:linear-gradient(135deg,#3b82f6 0%,#6366f1 100%);cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
.otp-verify-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,0.3)}
.otp-verify-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
.otp-spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.otp-divider{display:flex;align-items:center;margin:20px 0;color:#a3a3a3;font-size:12px}
.otp-divider::before,.otp-divider::after{content:'';flex:1;height:1px;background:#e5e5e5}
.otp-divider span{padding:0 12px}
.otp-resend-btn{width:100%;padding:12px;border:1px solid #e5e5e5;border-radius:10px;font-size:13px;font-weight:500;color:#525252;background:#fff;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
.otp-resend-btn:hover:not(:disabled){background:#f5f5f5;border-color:#d4d4d4}
.otp-resend-btn:disabled{color:#a3a3a3;cursor:not-allowed}
.otp-resend-btn.success{color:#22c55e;border-color:#bbf7d0;background:#f0fdf4}
.otp-footer{text-align:center;margin-top:20px;font-size:11px;color:#a3a3a3;display:flex;align-items:center;justify-content:center;gap:6px}

/* OTP Blocked Screen */
.otp-blocked-screen{position:fixed;inset:0;background:linear-gradient(135deg,#fef2f2 0%,#fee2e2 100%);display:flex;align-items:center;justify-content:center;z-index:1001;padding:20px}
.otp-blocked-container{background:#fff;border-radius:20px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.15);padding:40px;max-width:420px;width:100%;text-align:center}
.otp-blocked-icon{width:80px;height:80px;border-radius:50%;background:#fee2e2;color:#dc2626;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
.otp-blocked-container h2{font-size:22px;color:#171717;margin:0 0 12px}
.otp-blocked-container>p{font-size:14px;color:#737373;margin:0 0 24px}
.otp-blocked-info{background:#fafafa;border-radius:12px;padding:16px;text-align:left}
.otp-blocked-info strong{font-size:13px;color:#171717;display:block;margin-bottom:6px}
.otp-blocked-info p{font-size:12px;color:#737373;margin:0}

/* ===== PACKET EXPIRATION SCREEN ===== */
.expired-screen{position:fixed;inset:0;background:linear-gradient(135deg,#fefce8 0%,#fef3c7 100%);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.expired-container{background:#fff;border-radius:20px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.15);padding:40px;max-width:420px;width:100%;text-align:center}
.expired-icon{width:80px;height:80px;border-radius:50%;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
.expired-container h2{font-size:22px;color:#171717;margin:0 0 12px}
.expired-container>p{font-size:14px;color:#737373;margin:0 0 24px}
.expired-request-btn{width:100%;padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:600;color:#fff;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);cursor:pointer;transition:all .2s;margin-bottom:16px}
.expired-request-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(245,158,11,0.3)}
.expired-request-sent{display:flex;align-items:center;gap:8px;justify-content:center;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;color:#166534;font-size:13px;margin-bottom:16px}
.expired-no-extension{font-size:13px;color:#737373;margin-bottom:16px}
.expired-contact{display:flex;align-items:center;gap:8px;justify-content:center;font-size:13px;color:#525252;flex-wrap:wrap}
.expired-contact strong{color:#171717}
`;
}
