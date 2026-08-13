import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Context Layer | Useful context, without total access",
  description:
    "A public working protocol proposal for useful, purpose-bound context without unrestricted access to private memory.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
