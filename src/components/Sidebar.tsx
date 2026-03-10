"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "ダッシュボード", icon: "📊" },
  { href: "/market", label: "市場スコアリング", icon: "🎯" },
  { href: "/content", label: "コンテンツ生成", icon: "✍️" },
  { href: "/queue", label: "承認キュー", icon: "✅" },
  { href: "/scheduler", label: "スケジューラー", icon: "⏰" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Survey-Holic</h1>
        <p className="text-xs text-gray-500 mt-1">SNS収益化AI基盤</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
        v0.1.0 · 規約準拠設計
      </div>
    </aside>
  );
}
