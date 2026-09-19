import './globals.css';

export const metadata = {
  title: 'BendLens — Backend Architecture & Blast-Radius Studio',
  description: 'Local-first backend architecture studio: schema ERD, HLD, LLD, execution sequences and what-if blast-radius analysis for Developers, Managers, and Business Owners.',
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

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8fc' },
    { media: '(prefers-color-scheme: dark)', color: '#070b14' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before React hydrates so the toggle state is
            honored on every load (no dark-flash, no stuck theme) in both the
            browser and the downloaded Electron app (per-origin localStorage). */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('bendlens-theme')||'dark';if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}` }} />
        {/* Official BendLens Favicon & Icons */}
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="512x512" />
        <link rel="shortcut icon" href="/icon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />

        {/* Google Fonts: Inter (UI) + Plus Jakarta Sans (display) + JetBrains Mono (data) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script src="/mermaid.min.js"></script>
        <script dangerouslySetInnerHTML={{ __html: `if(!window.mermaid){document.write('<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"><\\/script>');} else { try { window.mermaid.initialize({ startOnLoad: false, maxTextSize: 10000000 }); } catch(e){} }` }} />
      </head>
      <body className="min-h-screen transition-colors antialiased">
        {children}
      </body>
    </html>
  );
}
