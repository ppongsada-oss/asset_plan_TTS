import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { ToastProvider } from "@/hooks/useToast";
import Toast from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asset Plan",
  description: "Asset Planning System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Toast />
        </ToastProvider>
      </body>
    </html>
  );
}
