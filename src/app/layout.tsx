import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASMR Shorts - مقاطع ASMR قصيرة",
  description:
    "استمتع بأفضل مقاطع ASMR القصيرة. تمرير لا نهائي، محتوى مخصص، وتجربة غامرة.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-black text-white antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
