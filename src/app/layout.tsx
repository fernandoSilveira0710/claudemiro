import type { Metadata } from "next"
import { DM_Sans, Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { AppTabs } from "@/components/app-tabs"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-dm-sans",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Claudemiro — Descubra quem você é de verdade",
  description:
    "Conecte suas redes sociais e receba um veredito divertido sobre sua personalidade. O oráculo digital mais irreverente do Brasil.",
  keywords: ["personalidade", "quiz", "redes sociais", "oráculo", "divertido", "Brasil"],
  authors: [{ name: "Claudemiro" }],
  openGraph: {
    title: "Claudemiro — Descubra quem você é de verdade",
    description:
      "Conecte suas redes e receba um card personalizado com análise da sua personalidade. Compartilhe com os amigos!",
    type: "website",
    locale: "pt_BR",
    siteName: "Claudemiro",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claudemiro — Descubra quem você é de verdade",
    description:
      "Conecte suas redes e receba um card personalizado com análise da sua personalidade.",
  },
  robots: "index, follow",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${dmSans.variable} ${inter.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0D0221]">
        {children}
        <AppTabs />
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  )
}
