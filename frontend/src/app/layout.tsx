import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SolanaProvider } from "../components/providers/SolanaProvider";
import { WalletButton } from "../components/WalletButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Octopus Oracle | Prediction Market",
  description: "Prediction market with verifiable on-chain settlement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-violet-950 min-h-screen font-medium`}>
        <SolanaProvider>
          <div className="bg-violet-600 text-white text-xs font-bold uppercase tracking-widest py-1 overflow-hidden whitespace-nowrap">
            <div className="animate-pulse text-center">
              ⚡ SETTLEMENT ON-CHAIN VERIFICÁVEL • MERCADOS RESOLVIDOS VIA TXLINE • USE SOLANA DEVNET ⚡
            </div>
          </div>

          <nav className="border-b-4 border-violet-950 bg-white px-6 py-4 flex justify-between items-center sticky top-0 z-50">
            <div className="flex items-center gap-8">
              <div className="font-extrabold text-2xl tracking-tighter text-violet-900">
                OCTOPUS<span className="text-yellow-500">.ORACLE</span>
              </div>
              <div className="hidden md:flex gap-6 font-bold text-sm uppercase">
                <a href="/" className="hover:text-violet-600 border-b-2 border-transparent hover:border-violet-600 transition-colors">Mercados</a>
                <a href="/portfolio" className="hover:text-violet-600 border-b-2 border-transparent hover:border-violet-600 transition-colors">Portfólio</a>
                <a href="/ranking" className="hover:text-violet-600 border-b-2 border-transparent hover:border-violet-600 transition-colors">Ranking</a>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <WalletButton />
            </div>
          </nav>

          <main className="max-w-7xl mx-auto p-6">{children}</main>
        </SolanaProvider>
      </body>
    </html>
  );
}