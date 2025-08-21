import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/header'
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
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
