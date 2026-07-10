import type { Metadata, Viewport } from "next";
import AppProviders from "@/components/providers/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mirror Tarot ✦ 镜面情绪日记",
  description: "用塔罗与 AI 整理当下问题，记录情绪、梦境和每次解读。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 允许用户缩放，满足低视力可访问性（审计高优先级）
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
