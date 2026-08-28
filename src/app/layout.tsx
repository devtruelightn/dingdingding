import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "평행톡톡 | 교과평어·행발 작성 도우미",
  description:
    "2022 개정 교육과정 기반 교과평어·학기말 종합의견·행동특성 및 종합의견 작성 도우미",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "평행톡톡",
    description: "평어와 행발을 쉽고 정확하게, 톡톡!",
    type: "website",
    images: ["/og-card.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" data-theme="lavender">
      <body>{children}</body>
    </html>
  );
}
