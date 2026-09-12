import './globals.css';

export const metadata = {
  title: 'BendLens - Universal Backend Architecture & Impact Platform',
  description: 'Automated database schema extraction, ERD, HLD, LLD diagrams and modification blast-radius analysis for Developers, Managers, and Business Owners.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/icon.ico', sizes: 'any' }
    ],
    shortcut: '/icon.ico',
    apple: '/icon.png'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Official BendLens Favicon & Icons */}
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="512x512" />
        <link rel="shortcut icon" href="/icon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />

        {/* Google Fonts: Plus Jakarta Sans & JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script src="/mermaid.min.js"></script>
        <script dangerouslySetInnerHTML={{ __html: `if(!window.mermaid){document.write('<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"><\\/script>')}` }} />
      </head>
      <body className="min-h-screen transition-colors antialiased">
        {children}
      </body>
    </html>
  );
}
