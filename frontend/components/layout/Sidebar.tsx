"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/reconciliation", label: "Reconciliation", icon: "🔄" },
  { href: "/exceptions", label: "Exceptions", icon: "⚠" },
  { href: "/transactions", label: "Transactions", icon: "💳" },
  { href: "/investigation", label: "AI Investigation", icon: "✨" },
  { href: "/audit", label: "Audit Trail", icon: "📋" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-60 flex-col border-r border-gray-200 bg-white px-3 py-4"
    >
      <div className="px-2 pb-6 text-sm font-semibold text-gray-900">
        RAZORPAY
        <div className="text-xs font-normal text-gray-500">Finance Controller</div>
      </div>

      <ul className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-gray-200 pt-3">
        <Link
          href="/settings"
          aria-current={pathname?.startsWith("/settings") ? "page" : undefined}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
            pathname?.startsWith("/settings")
              ? "bg-gray-900 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <span aria-hidden>⚙</span>
          Merchant Settings
        </Link>
      </div>
    </nav>
  );
}