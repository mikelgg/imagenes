import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

import { Footer } from '@/components/footer'

const interTight = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-tight',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Image Batch Processor',
  description: 'Modern web-based image batch processor with rotation, cropping, and resizing capabilities',
  keywords: ['image processing', 'batch processing', 'image rotation', 'image cropping', 'web app'],
  authors: [{ name: 'Image Processor Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${interTight.variable} font-inter min-h-screen bg-bg text-text-primary antialiased`}>
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-border bg-surface/95 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">IP</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xl tracking-tighter text-text-primary">Image Processor</span>
                    <span className="text-xs text-text-muted font-medium">Geometric Crop Engine</span>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
