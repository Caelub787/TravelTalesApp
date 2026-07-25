import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

import { Colors } from '@/constants/theme';

// Overrides expo-router's ScrollViewStyleReset (height:100%), which leaves a
// gap at the bottom on mobile Safari whenever the dynamic address bar
// resizes the visual viewport — that gap shows through as a "white bar"
// because the default document background is white. Using 100dvh keeps the
// root sized to the *current* visible viewport, and matching the document
// background to the app's theme means any residual overscroll/bounce gap
// blends in instead of flashing white.
const viewportFixStyle = `
html, body, #root { height: 100dvh; }
html, body { background-color: ${Colors.light.background}; }
@media (prefers-color-scheme: dark) {
  html, body { background-color: ${Colors.dark.background}; }
}
`;

// Inline, dependency-free crash reporter. Runs before the RN bundle evaluates,
// so it can catch failures that happen too early for a React error boundary
// (module-eval throws, chunk load failures, etc.) and paint them on screen
// instead of leaving a blank page with no way to see what went wrong.
const crashOverlayScript = `
(function () {
  var overlay = null;
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'crash-overlay';
    overlay.style.cssText = [
      'display:none',
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'background:#1a0000',
      'color:#ffb3b3',
      'font-family:ui-monospace,Menlo,Consolas,monospace',
      'font-size:13px',
      'line-height:1.5',
      'padding:16px',
      'overflow:auto',
      'white-space:pre-wrap',
      'word-break:break-word'
    ].join(';');
    document.body.appendChild(overlay);
    return overlay;
  }
  function show(label, detail) {
    var el = ensureOverlay();
    var line = document.createElement('div');
    line.style.marginBottom = '12px';
    line.textContent = '[' + new Date().toISOString() + '] ' + label + '\\n' + detail;
    el.appendChild(line);
    el.style.display = 'block';
  }
  // React's numbered hydration-mismatch errors (server-rendered markup not matching the
  // client's first render) are self-recovering: React discards the mismatched DOM and
  // re-renders from scratch client-side. They still fire as window 'error' events even
  // though the app ends up in a correct, working state — surfacing the overlay for these
  // would cry wolf on every load instead of only on genuine crashes.
  var HYDRATION_ERROR_CODES = ['#418', '#419', '#421', '#422', '#423', '#425'];
  function isRecoverableHydrationError(message) {
    return HYDRATION_ERROR_CODES.some(function (code) {
      return message.indexOf('Minified React error ' + code) !== -1;
    });
  }
  window.addEventListener('error', function (event) {
    var detail = event.message || 'Unknown error';
    if (isRecoverableHydrationError(detail)) return;
    if (event.filename) detail += '\\n  at ' + event.filename + ':' + event.lineno + ':' + event.colno;
    if (event.error && event.error.stack) detail += '\\n' + event.error.stack;
    show('window.onerror', detail);
  });
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    var detail = (reason && (reason.stack || reason.message)) || String(reason);
    show('unhandledrejection', detail);
  });
})();
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: viewportFixStyle }} />
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: crashOverlayScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
