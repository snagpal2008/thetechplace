import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Dílis — faithful to every family", template: "%s · Dílis" },
  description: "The B2B portal connecting Irish funeral directors with trusted vendors — ordering, communication and invoicing in one place.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f5f0" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE">
      <body>{children}</body>
    </html>
  );
}
