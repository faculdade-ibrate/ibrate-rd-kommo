import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Faculdade Ibrate | RD → Kommo",
  description: "Integração privada da Faculdade Ibrate entre RD Station e Kommo",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
