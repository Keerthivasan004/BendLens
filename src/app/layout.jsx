import './globals.css';

export const metadata = {
  title: 'BendLens - Universal Backend Architecture & Impact Platform',
  description: 'Automated database schema extraction, ERD, HLD, LLD diagrams and modification blast-radius analysis for Developers, Managers, and Business Owners.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Official BendLens Favicon & Icons */}
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />

        {/* Google Fonts: Plus Jakarta Sans & JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
      </head>
      <body className="min-h-screen transition-colors antialiased">
        {children}
      </body>
    </html>
  );
}
