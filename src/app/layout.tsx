import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";
import { SubmissionProvider } from "./context/SubmissionContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Revived Smiles — Your Smile Journey Starts Here",
  description: "Enter the email you used when you placed your order to begin your smile journey with Revived Smiles.",
  openGraph: {
    title: "Revived Smiles — Your Smile Journey Starts Here",
    description: "Enter the email you used when you placed your order to begin your smile journey with Revived Smiles.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body><SubmissionProvider>{children}</SubmissionProvider></body>
    </html>
  );
}
