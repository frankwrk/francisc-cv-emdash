export function ResendAdminStyles() {
  return (
    <style>{`
      .re-shell {
        --re-bg: #f5f6f8;
        --re-surface: #ffffff;
        --re-text: #0f172a;
        --re-muted: #6b7280;
        --re-border: #e2e8f0;
        --re-border-strong: #d4dce8;
        --re-primary: #0f172a;
        --re-primary-soft: #e2e8f0;
        --re-success: #15803d;
        --re-warning: #9a3412;
        --re-danger: #b91c1c;
        color: var(--re-text);
        background: var(--re-bg);
        min-height: calc(100vh - 56px);
        padding: 18px;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px;
      }

      .re-topbar {
        position: sticky;
        top: 0;
        z-index: 3;
        border: 1px solid var(--re-border);
        background: var(--re-surface);
        padding: 10px 14px;
        margin-bottom: 14px;
      }

      .re-tabs {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }

      .re-page {
        border: 1px solid var(--re-border);
        background: var(--re-surface);
        padding: 16px;
      }

      .re-page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .re-title {
        font-size: 20px;
        line-height: 1.2;
        font-weight: 650;
        margin: 0 0 4px;
      }

      .re-subtitle {
        color: var(--re-muted);
        font-size: 13px;
        margin: 0;
      }

      .re-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
      }

      .re-stack {
        display: grid;
        gap: 14px;
      }

      .re-grid {
        display: grid;
        gap: 12px;
      }

      .re-grid--2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .re-grid--3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .re-grid--4 {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .re-field-note {
        margin-top: 4px;
        color: var(--re-muted);
        font-size: 12px;
      }

      .re-label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        font-weight: 560;
        color: #111827;
      }

      .re-input,
      .re-select,
      .re-textarea {
        width: 100%;
        border: 1px solid var(--re-border-strong);
        border-radius: 8px;
        background: #fff;
        color: var(--re-text);
        font-size: 14px;
        line-height: 1.25;
        padding: 8px 10px;
        transition: border-color 120ms ease, box-shadow 120ms ease;
      }

      .re-input:focus,
      .re-select:focus,
      .re-textarea:focus {
        outline: none;
        border-color: #94a3b8;
        box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.18);
      }

      .re-textarea {
        min-height: 220px;
        resize: vertical;
        font-family: "JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace;
        font-size: 12.5px;
      }

      .re-btn {
        border-radius: 8px;
        border: 1px solid transparent;
        padding: 8px 12px;
        font-size: 13px;
        line-height: 1;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease, opacity 120ms ease;
      }

      .re-btn:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .re-btn--sm {
        font-size: 12px;
        padding: 7px 10px;
      }

      .re-btn--md {
        font-size: 13px;
      }

      .re-btn--lg {
        font-size: 14px;
        padding: 10px 14px;
      }

      .re-btn--default {
        background: var(--re-primary);
        color: #fff;
      }

      .re-btn--default:hover:not(:disabled) {
        background: #1e293b;
      }

      .re-btn--secondary {
        background: var(--re-primary-soft);
        color: #111827;
      }

      .re-btn--secondary:hover:not(:disabled) {
        background: #d5dde9;
      }

      .re-btn--outline {
        background: #fff;
        border-color: var(--re-border-strong);
        color: #111827;
      }

      .re-btn--outline:hover:not(:disabled) {
        background: #f8fafc;
      }

      .re-btn--ghost {
        background: transparent;
        color: #111827;
      }

      .re-btn--ghost:hover:not(:disabled) {
        background: #f3f4f6;
      }

      .re-btn--destructive {
        background: #fee2e2;
        color: #991b1b;
      }

      .re-btn--destructive:hover:not(:disabled) {
        background: #fecaca;
      }

      .re-btn--link {
        background: transparent;
        color: #2563eb;
        border-color: transparent;
        text-decoration: underline;
        text-underline-offset: 2px;
        padding-left: 0;
        padding-right: 0;
      }

      .re-tabs .re-btn--default {
        border-color: #111827;
      }

      .re-card {
        border: 1px solid var(--re-border);
        border-radius: 10px;
        background: #fff;
      }

      .re-card-header {
        padding: 14px 14px 8px;
      }

      .re-card-title {
        margin: 0;
        font-size: 16px;
        line-height: 1.2;
        font-weight: 640;
      }

      .re-card-content {
        padding: 0 14px 14px;
      }

      .re-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid transparent;
        font-size: 12px;
        font-weight: 620;
        line-height: 1;
        padding: 5px 8px;
      }

      .re-badge--default {
        color: #111827;
        background: #e2e8f0;
      }

      .re-badge--success {
        color: #166534;
        background: #dcfce7;
      }

      .re-badge--warning {
        color: #9a3412;
        background: #ffedd5;
      }

      .re-badge--destructive {
        color: #991b1b;
        background: #fee2e2;
      }

      .re-badge--muted {
        color: #475569;
        background: #e2e8f0;
      }

      .re-notice {
        border-radius: 8px;
        border: 1px solid var(--re-border);
        background: #f8fafc;
        color: #1e293b;
        padding: 10px 12px;
      }

      .re-notice--success {
        border-color: #bbf7d0;
        background: #f0fdf4;
        color: #166534;
      }

      .re-notice--danger {
        border-color: #fecaca;
        background: #fef2f2;
        color: #991b1b;
      }

      .re-table {
        width: 100%;
        border-collapse: collapse;
      }

      .re-table th {
        text-align: left;
        padding: 11px 8px;
        border-bottom: 1px solid var(--re-border);
        font-size: 12.5px;
        font-weight: 640;
        color: #1f2937;
      }

      .re-table td {
        padding: 10px 8px;
        border-bottom: 1px solid #edf2f7;
        vertical-align: middle;
      }

      .re-table tr:last-child td {
        border-bottom: none;
      }

      .re-table-row-button {
        width: 100%;
        text-align: left;
        border: none;
        background: transparent;
        cursor: pointer;
        font: inherit;
        color: inherit;
      }

      .re-kbd {
        font-family: "JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace;
        font-size: 12px;
      }

      .re-mut {
        color: var(--re-muted);
      }

      .re-inline-actions {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      @media (max-width: 980px) {
        .re-grid--2,
        .re-grid--3,
        .re-grid--4 {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `}</style>
  );
}
