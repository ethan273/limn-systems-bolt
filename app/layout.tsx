import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Limn Systems - Furniture Manufacturing Management",
    template: "%s | Limn Systems"
  },
  description: "Enterprise furniture manufacturing management system. Streamline orders, production, customer portal, and business operations with Limn Systems.",
  keywords: ["furniture manufacturing", "ERP", "production management", "customer portal", "business management", "Limn Systems"],
  authors: [{ name: "Limn Systems", url: "https://limn.us.com" }],
  creator: "Limn Systems",
  publisher: "Limn Systems",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://limn.us.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://limn.us.com',
    siteName: 'Limn Systems',
    title: 'Limn Systems - Furniture Manufacturing Management',
    description: 'Enterprise furniture manufacturing management system. Streamline your operations with our comprehensive ERP solution.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Limn Systems - Furniture Manufacturing Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Limn Systems - Furniture Manufacturing Management',
    description: 'Enterprise furniture manufacturing management system. Streamline your operations with our comprehensive ERP solution.',
    images: ['/og-image.png'],
    creator: '@limnsystems',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  category: 'business',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster 
          position="top-right"
          expand
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
