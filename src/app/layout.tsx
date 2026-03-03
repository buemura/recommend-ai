import type { Metadata } from "next";
import { AuthProvider } from "@/components/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://recommendai.vercel.app"),
  title: {
    default: "RecommendAI",
    template: "%s | RecommendAI",
  },
  description:
    "Descubra o que assistir, ouvir ou fazer hoje com ajuda da IA! Receba recomendações personalizadas de filmes, séries, músicas e muito mais.",
  keywords: [
    "recomendação",
    "IA",
    "filmes",
    "séries",
    "músicas",
    "entretenimento",
    "inteligência artificial",
  ],
  authors: [{ name: "RecommendAI" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://recommendai.vercel.app",
    siteName: "RecommendAI",
    title: "RecommendAI",
    description:
      "Descubra o que assistir, ouvir ou fazer hoje com ajuda da IA!",
  },
  twitter: {
    card: "summary_large_image",
    title: "RecommendAI",
    description:
      "Descubra o que assistir, ouvir ou fazer hoje com ajuda da IA!",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
