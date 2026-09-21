import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@/shared/ui/tokens.css'
import { AppShell } from '@/shared/shell/AppShell'

export const metadata: Metadata = {
  title: 'SEAtS Admin',
  // An admin console must never be indexed, even if a crawler reaches the host.
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-page text-foreground antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
