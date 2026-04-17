export function ResendAdminStyles() {
  return (
    <style>{`
      .re-shell {
        --re-bg: oklch(0.975 0.004 80);
        --re-surface: oklch(0.995 0.002 85);
        --re-text: oklch(0.24 0.012 257);
        --re-muted: oklch(0.5 0.02 255);
        --re-border: oklch(0.9 0.01 255);
        --re-border-strong: oklch(0.84 0.015 255);
        --re-primary: oklch(0.3 0.03 257);
        --re-primary-soft: oklch(0.93 0.011 250);
        --re-accent: oklch(0.78 0.135 85);
        --re-accent-soft: oklch(0.93 0.03 85);
        --re-success: oklch(0.58 0.15 148);
        --re-warning: oklch(0.62 0.16 55);
        --re-danger: oklch(0.58 0.2 25);
        --re-space-1: 4px;
        --re-space-2: 8px;
        --re-space-3: 12px;
        --re-space-4: 16px;
        --re-space-5: 24px;
        --re-space-6: 32px;
        --re-space-7: 48px;
        color: var(--re-text);
        background: var(--re-bg);
        min-height: calc(100vh - 56px);
        padding: var(--re-space-4);
        font-family: "Geist Sans", "Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        line-height: 1.45;
      }

      .re-app-header {
        display: grid;
        gap: var(--re-space-3);
        margin-bottom: var(--re-space-3);
      }

      .re-app-title {
        margin: 0;
        font-size: 24px;
        line-height: 1.15;
        letter-spacing: -0.015em;
        font-weight: 650;
      }

      .re-app-subtitle {
        margin: 0;
        color: var(--re-muted);
        font-size: 13px;
      }

      .re-app-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        border: 1px solid color-mix(in oklch, var(--re-accent) 35%, var(--re-border));
        background: var(--re-accent-soft);
        color: oklch(0.38 0.09 85);
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 650;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        width: fit-content;
      }

      .re-topbar {
        position: sticky;
        top: 0;
        z-index: 3;
        border: 1px solid var(--re-border);
        border-radius: 12px;
        background: var(--re-surface);
        padding: var(--re-space-2) var(--re-space-3);
        margin-bottom: var(--re-space-3);
        box-shadow: 0 1px 0 color-mix(in oklch, var(--re-text) 2%, transparent);
      }

      .re-tabs {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--re-space-2);
      }

      .re-page {
        border: 1px solid var(--re-border);
        border-radius: 14px;
        background: var(--re-surface);
        padding: var(--re-space-4);
        box-shadow:
          0 1px 0 color-mix(in oklch, var(--re-text) 2%, transparent),
          0 8px 20px color-mix(in oklch, var(--re-text) 4%, transparent);
      }

      .re-page-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--re-space-3);
        margin-bottom: var(--re-space-3);
      }

      .re-title {
        font-size: 21px;
        line-height: 1.2;
        font-weight: 650;
        letter-spacing: -0.012em;
        margin: 0 0 3px;
      }

      .re-subtitle {
        color: var(--re-muted);
        font-size: 13px;
        max-width: 76ch;
        margin: 0;
      }

      .re-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--re-space-3);
      }

      .re-stack {
        display: grid;
        gap: var(--re-space-4);
      }

      .re-grid {
        display: grid;
        gap: var(--re-space-3);
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
        margin-top: var(--re-space-1);
        color: var(--re-muted);
        font-size: 12px;
      }

      .re-label {
        display: grid;
        gap: var(--re-space-2);
        font-size: 12px;
        font-weight: 560;
        letter-spacing: 0.01em;
        color: oklch(0.35 0.01 257);
        text-transform: uppercase;
      }

      .re-input,
      .re-select,
      .re-textarea {
        width: 100%;
        border: 1px solid var(--re-border-strong);
        border-radius: 10px;
        background: oklch(0.995 0.001 95);
        color: var(--re-text);
        font-size: 14px;
        line-height: 1.3;
        padding: 9px 11px;
        transition: border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease;
        font-family: inherit;
      }

      .re-input:focus,
      .re-select:focus,
      .re-textarea:focus {
        outline: none;
        border-color: color-mix(in oklch, var(--re-primary) 45%, white);
        box-shadow: 0 0 0 3px color-mix(in oklch, var(--re-primary) 18%, transparent);
        background: #fff;
      }

      .re-textarea {
        min-height: 260px;
        resize: vertical;
        font-family: "Geist Mono", "JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace;
        font-size: 12px;
        line-height: 1.45;
      }

      .re-btn {
        border-radius: 9px;
        border: 1px solid transparent;
        padding: 8px 12px;
        font-size: 13px;
        line-height: 1;
        font-weight: 600;
        letter-spacing: 0.01em;
        cursor: pointer;
        transition: transform 120ms ease, background-color 120ms ease, color 120ms ease, border-color 120ms ease, opacity 120ms ease, box-shadow 120ms ease;
      }

      .re-btn:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .re-btn:not(:disabled):active {
        transform: translateY(1px);
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
        box-shadow: 0 1px 0 color-mix(in oklch, var(--re-primary) 35%, black);
      }

      .re-btn--default:hover:not(:disabled) {
        background: color-mix(in oklch, var(--re-primary) 90%, black);
      }

      .re-btn--secondary {
        background: var(--re-primary-soft);
        color: oklch(0.33 0.02 250);
      }

      .re-btn--secondary:hover:not(:disabled) {
        background: color-mix(in oklch, var(--re-primary-soft) 88%, var(--re-primary));
      }

      .re-btn--outline {
        background: color-mix(in oklch, white 70%, var(--re-bg));
        border-color: var(--re-border-strong);
        color: oklch(0.3 0.018 257);
      }

      .re-btn--outline:hover:not(:disabled) {
        background: color-mix(in oklch, var(--re-primary-soft) 38%, white);
        border-color: color-mix(in oklch, var(--re-primary) 22%, var(--re-border-strong));
      }

      .re-btn--ghost {
        background: transparent;
        color: oklch(0.32 0.016 257);
      }

      .re-btn--ghost:hover:not(:disabled) {
        background: color-mix(in oklch, var(--re-primary-soft) 45%, transparent);
      }

      .re-btn--destructive {
        background: color-mix(in oklch, var(--re-danger) 16%, white);
        color: color-mix(in oklch, var(--re-danger) 78%, black);
      }

      .re-btn--destructive:hover:not(:disabled) {
        background: color-mix(in oklch, var(--re-danger) 26%, white);
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
        border-color: color-mix(in oklch, var(--re-primary) 55%, black);
      }

      .re-tabs .re-btn {
        border-radius: 8px;
      }

      .re-metrics {
        display: grid;
        gap: var(--re-space-3);
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      }

      .re-metric {
        border: 1px solid var(--re-border);
        border-radius: 12px;
        background: color-mix(in oklch, var(--re-surface) 96%, var(--re-primary-soft));
        padding: var(--re-space-3);
      }

      .re-metric-label {
        margin: 0 0 6px;
        color: var(--re-muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 620;
      }

      .re-metric-value {
        margin: 0;
        font-size: 24px;
        line-height: 1.1;
        letter-spacing: -0.02em;
        font-weight: 670;
      }

      .re-metric-note {
        margin: 5px 0 0;
        color: var(--re-muted);
        font-size: 12px;
      }

      .re-card {
        border: 1px solid var(--re-border);
        border-radius: 12px;
        background: color-mix(in oklch, var(--re-surface) 98%, white);
      }

      .re-card-header {
        padding: var(--re-space-4) var(--re-space-4) var(--re-space-2);
      }

      .re-card-title {
        margin: 0;
        font-size: 15px;
        line-height: 1.2;
        font-weight: 640;
        letter-spacing: -0.005em;
      }

      .re-card-content {
        padding: 0 var(--re-space-4) var(--re-space-4);
      }

      .re-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid transparent;
        font-size: 11px;
        font-weight: 630;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        line-height: 1;
        padding: 5px 9px;
      }

      .re-badge--default {
        color: color-mix(in oklch, var(--re-primary) 70%, black);
        background: color-mix(in oklch, var(--re-primary-soft) 65%, white);
      }

      .re-badge--success {
        color: color-mix(in oklch, var(--re-success) 70%, black);
        background: color-mix(in oklch, var(--re-success) 18%, white);
      }

      .re-badge--warning {
        color: color-mix(in oklch, var(--re-warning) 68%, black);
        background: color-mix(in oklch, var(--re-warning) 19%, white);
      }

      .re-badge--destructive {
        color: color-mix(in oklch, var(--re-danger) 70%, black);
        background: color-mix(in oklch, var(--re-danger) 18%, white);
      }

      .re-badge--muted {
        color: color-mix(in oklch, var(--re-muted) 90%, black);
        background: color-mix(in oklch, var(--re-primary-soft) 45%, white);
      }

      .re-notice {
        border-radius: 10px;
        border: 1px solid var(--re-border);
        background: color-mix(in oklch, var(--re-primary-soft) 20%, white);
        color: color-mix(in oklch, var(--re-primary) 75%, black);
        padding: 11px 12px;
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
        border-spacing: 0;
      }

      .re-table th {
        text-align: left;
        padding: 11px var(--re-space-2);
        border-bottom: 1px solid var(--re-border);
        font-size: 11px;
        font-weight: 650;
        letter-spacing: 0.045em;
        text-transform: uppercase;
        color: color-mix(in oklch, var(--re-muted) 85%, black);
        background: color-mix(in oklch, var(--re-primary-soft) 25%, white);
      }

      .re-table td {
        padding: 11px var(--re-space-2);
        border-bottom: 1px solid color-mix(in oklch, var(--re-border) 70%, white);
        vertical-align: middle;
      }

      .re-table tr:last-child td {
        border-bottom: none;
      }

      .re-table tbody tr:hover td {
        background: color-mix(in oklch, var(--re-primary-soft) 23%, white);
      }

      .re-table-row-button {
        width: 100%;
        text-align: left;
        border: none;
        background: transparent;
        cursor: pointer;
        font: inherit;
        color: inherit;
        padding: 0;
      }

      .re-kbd {
        font-family: "Geist Mono", "JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace;
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }

      .re-mut {
        color: var(--re-muted);
      }

      .re-inline-actions {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--re-space-2);
      }

      .re-divider {
        height: 1px;
        background: var(--re-border);
      }

      .re-subgrid {
        display: grid;
        gap: var(--re-space-4);
        grid-template-columns: 1.2fr 1fr;
      }

      @media (max-width: 980px) {
        .re-shell {
          padding: var(--re-space-3);
        }

        .re-title {
          font-size: 19px;
        }

        .re-app-title {
          font-size: 22px;
        }

        .re-grid--2,
        .re-grid--3,
        .re-grid--4 {
          grid-template-columns: minmax(0, 1fr);
        }

        .re-subgrid {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `}</style>
  );
}
