import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Student Daily Tracking System",
  description: "Track your daily student activities and review classes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192-transparent.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512-transparent.png" />
        <link rel="apple-touch-icon" href="/icon-192x192-transparent.png" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Daily Tracker" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              const registerSW = () => {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('ServiceWorker registered with scope: ', registration.scope);
                  },
                  function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  }
                );
              };
              if (document.readyState === 'complete') {
                registerSW();
              } else {
                window.addEventListener('load', registerSW);
              }
            }
          `}
        </Script>
      </body>
    </html>
  );
}
