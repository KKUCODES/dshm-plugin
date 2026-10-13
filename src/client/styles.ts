// 样式随客户端脚本打包，由配置页挂载；不依赖宿主加载额外 CSS 文件。
export const panelStyles = `
.dshm {
  --dm-text: var(--dsw-alias-label-primary, #20242b);
  --dm-muted: var(--dsw-alias-label-secondary, #686d76);
  --dm-border: var(--dsw-alias-border-l3, #e1e3e7);
  --dm-surface: var(--dsw-alias-bg-layer-1, #fff);
  --dm-hover: var(--dsw-alias-interactive-bg-hover, #f3f4f6);
  --dm-warning: var(--dsw-alias-state-warning-primary, #976318);
  --dm-error: var(--dsw-alias-state-error-primary, #bf4545);
  width: 100%; min-width: 0; max-width: 760px; box-sizing: border-box;
  color: var(--dm-text); font-family: var(--dsw-font-family, system-ui, sans-serif);
  font-size: 14px; line-height: 1.6;
}
.dshm *, .dshm *::before, .dshm *::after { box-sizing: border-box; }
.dshm h2, .dshm h3, .dshm p { margin: 0; }
.dshm h2 { font-size: 17px; font-weight: 600; line-height: 1.5; }
.dshm h3 { font-size: 14px; font-weight: 600; }
.dshm .dm-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
.dshm .dm-intro { margin-top: 6px; max-width: 54ch; color: var(--dm-muted); font-size: 13px; }
.dshm .dm-status { display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0; padding: 4px 10px; border: 1px solid var(--dm-border); border-radius: 20px; font-size: 12px; color: var(--dm-muted); }
.dshm .dm-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.dshm .dm-status[data-state="online"] { color: var(--dsw-alias-state-success-primary, #26835b); }
.dshm .dm-status[data-state="connecting"], .dshm .dm-status[data-state="reconnecting"] { color: var(--dm-warning); }
.dshm .dm-status[data-state="credential_rejected"] { color: var(--dm-error); }
.dshm .dm-form { display: grid; gap: 20px; }
.dshm .dm-choices { display: grid; gap: 10px; min-width: 0; margin: 0; padding: 0; border: 0; }
.dshm .dm-choices legend { margin-bottom: 10px; }
.dshm .dm-result { margin-bottom: 18px; }
.dshm .dm-fields { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; }
.dshm .dm-field { display: grid; align-content: start; gap: 7px; min-width: 0; }
.dshm .dm-label { font-size: 13px; font-weight: 500; }
.dshm .dm-input { appearance: none; width: 100%; min-width: 0; height: 40px; padding: 8px 12px; border: 1px solid var(--dm-border); border-radius: 9px; background: var(--dm-surface); color: var(--dm-text); font: inherit; line-height: 22px; }
.dshm .dm-input::placeholder { color: var(--dsw-alias-label-dimmed, #989ca4); }
.dshm .dm-input:disabled { opacity: .6; }
.dshm .dm-input:focus-visible, .dshm .dm-button:focus-visible, .dshm .dm-check input:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4268bb); outline-offset: 3px; }
.dshm .dm-help { color: var(--dm-muted); font-size: 12px; overflow-wrap: anywhere; }
.dshm code { font-family: var(--ds-font-family-code, Consolas, monospace); font-size: 12px; overflow-wrap: anywhere; }
.dshm .dm-note { padding: 12px 14px; border-radius: 9px; background: var(--dm-hover); color: var(--dm-muted); font-size: 12px; }
.dshm .dm-notice { margin-bottom: 18px; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--dm-warning) 30%, transparent); border-radius: 9px; background: color-mix(in srgb, var(--dm-warning) 8%, var(--dm-surface)); font-size: 13px; }
.dshm .dm-notice strong { display: block; margin-bottom: 2px; color: var(--dm-warning); font-weight: 600; }
.dshm .dm-notice-error { border-color: color-mix(in srgb, var(--dm-error) 30%, transparent); background: color-mix(in srgb, var(--dm-error) 8%, var(--dm-surface)); overflow-wrap: anywhere; }
.dshm .dm-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.dshm .dm-button { appearance: none; display: inline-flex; align-items: center; justify-content: center; width: auto; min-height: 36px; padding: 7px 16px; border: 1px solid var(--dm-border); border-radius: 18px; background: transparent; color: var(--dm-text); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer; }
.dshm .dm-button:hover:not(:disabled) { background: var(--dm-hover); }
.dshm .dm-button:active:not(:disabled) { transform: translateY(1px); }
.dshm .dm-button:disabled { cursor: not-allowed; opacity: .45; }
.dshm .dm-primary { background: var(--dsw-alias-button-primary-fill, #252830); color: var(--dsw-alias-label-primary-foreground, #fff); border-color: transparent; }
.dshm .dm-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover, #40444d); }
.dshm .dm-danger { color: var(--dm-error); }
.dshm .dm-connection { display: grid; gap: 16px; }
.dshm .dm-address { color: var(--dm-muted); font-size: 13px; overflow-wrap: anywhere; }
.dshm .dm-pair { display: grid; gap: 10px; margin-top: 18px; padding: 16px; border: 1px solid var(--dm-border); border-radius: 12px; }
.dshm .dm-pair-qr { display: block; width: 256px; max-width: 100%; height: auto; aspect-ratio: 1; background: #fff; }
.dshm .dm-section { margin-top: 28px; padding-top: 22px; border-top: 1px solid var(--dm-border); }
.dshm .dm-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.dshm .dm-count { font-size: 12px; color: var(--dm-muted); }
.dshm .dm-empty { padding: 22px 16px; text-align: center; border: 1px dashed var(--dm-border); border-radius: 12px; }
.dshm .dm-empty p { margin-top: 4px; font-size: 12px; color: var(--dm-muted); }
.dshm .dm-device { padding: 16px 0; border-top: 1px solid var(--dm-border); display: grid; gap: 10px; }
.dshm .dm-device:first-child { border-top: 0; padding-top: 0; }
.dshm .dm-device-head { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; justify-content: space-between; }
.dshm .dm-device-name { overflow-wrap: anywhere; min-width: 0; }
.dshm .dm-tag { font-size: 12px; padding: 2px 8px; border-radius: 6px; background: var(--dm-hover); color: var(--dm-muted); }
.dshm .dm-tag[data-state="pending"] { color: var(--dm-warning); }
.dshm .dm-tag[data-state="active"] { color: var(--dsw-alias-state-success-primary, #26835b); }
.dshm .dm-fingerprint { padding: 10px 12px; background: var(--dm-hover); border-radius: 8px; }
.dshm .dm-fingerprint code { display: block; margin-top: 4px; user-select: all; }
.dshm .dm-check { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
.dshm .dm-check input { width: 16px; height: 16px; margin: 0; accent-color: var(--dsw-alias-brand-primary, #4268bb); flex-shrink: 0; }
.dshm .dm-loading { display: grid; gap: 16px; padding: 12px 0; }
.dshm .dm-skeleton { height: 40px; background: var(--dm-hover); border-radius: 9px; }
.dshm .dm-skeleton:last-child { width: 40%; height: 16px; }
@media (max-width: 600px) {
  .dshm .dm-fields { grid-template-columns: minmax(0, 1fr); }
  .dshm .dm-head { flex-direction: column; gap: 12px; }
  .dshm .dm-pair { padding: 12px; }
}
`
