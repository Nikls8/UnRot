import type { Metadata } from "next";
import "./globals.css";
import { MockConvexProvider } from "@/lib/mockConvexStore";

export const metadata: Metadata = {
  title: "UNROT – Das Quiz lebt weiter!",
  description:
    "Vom 5-Minuten-Stundeneinstieg zum nachhaltigen 6x3-Lern-Duell für zuhause.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
        <MockConvexProvider>{children}</MockConvexProvider>
      </body>
    </html>
  );
}
