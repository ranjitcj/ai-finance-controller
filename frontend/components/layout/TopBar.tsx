import type { ReactNode } from "react";

export function TopBar({
  title,
  actions,
  connected = true,
}: {
  title: string;
  actions?: ReactNode;
  connected?: boolean;
}) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        {actions}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Demo Merchant</span>
          <span
            role="status"
            aria-label={connected ? "Connected to Razorpay" : "Disconnected"}
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500" : "bg-gray-300"
            }`}
          />
        </div>
      </div>
    </header>
  );
}