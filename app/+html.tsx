import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * Expo Router's actual mechanism for customizing the root HTML document
 * on static web export. Setting these values under `expo.web.meta` in
 * app.json does NOT get injected into the exported HTML — that was
 * silently doing nothing this whole time. This file is what actually
 * lands in <head>, verified by inspecting the real build output.
 *
 * This is why "Add to Home Screen" on iOS was opening like a regular
 * Safari tab: without `apple-mobile-web-app-capable`, iOS always shows
 * browser chrome regardless of the manifest, and without a real
 * `apple-touch-icon`, the Home Screen icon is just a page screenshot.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>ADHD Life Coach</title>

        {/* PWA manifest + theme color, for Android/Chrome's install prompt */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#fafaf9" />

        {/* iOS-specific standalone launch behavior — this is the part
            that actually controls whether the app opens fullscreen
            without Safari's URL bar when launched from the Home
            Screen icon. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Aviva" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Standard favicon — public/favicon.ico was never actually
            generated for this project; icon-192.png/icon-512.png
            already exist and every modern browser supports PNG
            favicons directly via the type attribute, so this points
            at real, existing assets instead of a 404. */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />

        {/* Prevents the bounce/scroll-chrome look that reads as "a
            webpage" rather than a native-feeling app. */}
        <ScrollViewStyleReset />

        {/* TEMPORARY DEBUG OVERLAY — remove once the blank-spinner-on-
            launch bug is diagnosed. Installed before any bundle JS runs,
            so it catches: (1) thrown errors and unhandled promise
            rejections even if they happen before React mounts or
            outside any try/catch, and (2) a genuinely silent hang with
            no error at all (nothing ever throws, a promise just never
            settles) via a watchdog timer — since case (2) is invisible
            to window.onerror and is exactly what a stuck loading
            spinner with a clean console would look like. Renders
            straight into the DOM, not through React, so it still works
            even if React itself never mounts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var shown = false;
                function showOverlay(title, detail) {
                  if (shown) {
                    var existingDetail = document.getElementById('__debug_detail');
                    if (existingDetail) {
                      existingDetail.textContent += '\\n\\n---\\n\\n' + detail;
                    }
                    return;
                  }
                  shown = true;
                  var overlay = document.createElement('div');
                  overlay.id = '__debug_overlay';
                  overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#0f172a;color:#f1f5f9;padding:20px;padding-top:calc(env(safe-area-inset-top,0px) + 20px);font-family:-apple-system,system-ui,sans-serif;overflow-y:auto;box-sizing:border-box;';
                  var heading = document.createElement('div');
                  heading.textContent = title;
                  heading.style.cssText = 'font-size:18px;font-weight:600;margin-bottom:12px;color:#f87171;';
                  var sub = document.createElement('div');
                  sub.textContent = 'Screenshot this whole screen and send it back.';
                  sub.style.cssText = 'font-size:13px;color:#94a3b8;margin-bottom:16px;';
                  var pre = document.createElement('pre');
                  pre.id = '__debug_detail';
                  pre.textContent = detail;
                  pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.5;background:#1e293b;padding:12px;border-radius:8px;color:#e2e8f0;';
                  overlay.appendChild(heading);
                  overlay.appendChild(sub);
                  overlay.appendChild(pre);
                  document.body.appendChild(overlay);
                }

                window.addEventListener('error', function (event) {
                  var err = event.error;
                  var detail = (err && err.stack) ? err.stack : (event.message || 'Unknown error') + ' at ' + (event.filename || '?') + ':' + (event.lineno || '?');
                  showOverlay('A script error stopped the app from loading', detail);
                });

                window.addEventListener('unhandledrejection', function (event) {
                  var reason = event.reason;
                  var detail = (reason && reason.stack) ? reason.stack : String(reason);
                  showOverlay('An unhandled promise rejection stopped the app from loading', detail);
                });

                // Watchdog: if nothing above has fired but the page is
                // still just the empty root div after 8 seconds, the app
                // is hung with NO thrown error at all (a promise that
                // never resolves or rejects). This is the case a normal
                // console can't see either — only a stuck spinner.
                setTimeout(function () {
                  if (shown) return;
                  var root = document.getElementById('root');
                  var hasRealContent = root && root.children && root.children.length > 0 && root.textContent && root.textContent.trim().length > 0;
                  if (!hasRealContent) {
                    showOverlay(
                      'App is stuck loading (no error was thrown)',
                      'Nothing crashed — something is waiting on a promise that never resolves or rejects (likely hydration or a cloud check). Root element content length: ' + (root ? root.textContent.length : 'root element not found')
                    );
                  }
                }, 8000);
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
