import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Survey-Holic | SNS収益化AI基盤",
  description:
    "市場選定 → AIコンテンツ生成 → 自立型エージェント24時間稼働のSNS収益化プラットフォーム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 min-h-screen flex">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
