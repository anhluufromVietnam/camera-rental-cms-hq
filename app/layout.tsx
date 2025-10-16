import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Inter, Manrope } from "next/font/google"

export const metadata: Metadata = {
  title: "Booking Camera",
  description: "Created by Tâm Việt Quang",
  generator: "tvq.app",
}

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
})

const manrope = Manrope({
  subsets: ["latin", "vietnamese"],
  display: "swap",
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body
        className={`${inter.className} ${GeistSans.variable} ${GeistMono.variable} bg-background text-foreground`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  )
}
