import type { Metadata } from 'next'
import { Space_Mono, Inter } from 'next/font/google'
import './globals.css'

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Bank Data Model Visualizer',
  description: 'Visualize and explore L1/L2/L3 banking and financial services data model schema, relationships, and sample data.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${inter.variable}`}>
      <body className="font-inter bg-matte-black text-aerospace-silver antialiased overflow-x-hidden">
        {children}
        <div className="noise-overlay" />
      </body>
    </html>
  )
}
