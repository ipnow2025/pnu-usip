import type React from "react"

import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {/* <MockDataInitializer /> */}
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

export const metadata = {
  title: "부산대학교 특허관리시스템",
  description: "부산대학교 특허관리시스템",
  generator: 'IPNOW',
  icons: {
    icon: '/favicon.ico',
  },
};
