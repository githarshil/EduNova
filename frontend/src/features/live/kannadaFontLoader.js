/**
 * Lazy-loads the self-hosted Noto Sans Kannada WOFF2 stylesheet only when
 * the Kannada audio channel or captions are turned on.
 */
export function ensureKannadaFontLoaded() {
  if (typeof document === 'undefined') return;
  const id = 'edunova-kannada-fonts';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = '/fonts/kannada.css';
  document.head.appendChild(link);
}
