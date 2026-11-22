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
      </head>
      <body>{children}</body>
    </html>
  );
}
