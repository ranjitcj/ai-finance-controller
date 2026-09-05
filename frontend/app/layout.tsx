import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Razorpay Finance Controller",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-gray-50">
        <div className="flex h-full">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
        </div>
      </body>
    </html>
  );
}