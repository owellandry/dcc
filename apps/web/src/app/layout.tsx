import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { Toaster } from 'react-hot-toast'
import { AppearanceThemeProvider } from '@/components/theme/AppearanceThemeProvider'
import { TooltipLayer } from '@/components/ui/TooltipLayer/TooltipLayer.main'

export const metadata: Metadata = {
  title: { default: 'DCC', template: '%s · DCC' },
  description: 'Talk to your people.',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  themeColor: '#111113',
  colorScheme: 'light dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-full overflow-x-hidden antialiased">
        <AppearanceThemeProvider>
          {children}
          <TooltipLayer />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--s4)',
                color: 'var(--t1)',
                border: '1px solid var(--b1)',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'var(--font-body)',
              },
              success: { iconTheme: { primary: 'var(--online)', secondary: 'var(--s0)' } },
              error: { iconTheme: { primary: 'var(--dnd)', secondary: 'var(--s0)' } },
            }}
          />
        </AppearanceThemeProvider>
      </body>
    </html>
  )
}
