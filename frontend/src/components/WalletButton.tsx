"use client";

import dynamic from "next/dynamic";

// Ignora o SSR para evitar o mismatch de hidratação entre servidor e cliente
const WalletMultiButtonDynamic = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export function WalletButton() {
  return (
    <div className="[&_.wallet-adapter-button]:bg-violet-900 [&_.wallet-adapter-button]:border-2 [&_.wallet-adapter-button]:border-violet-950 [&_.wallet-adapter-button]:shadow-[2px_2px_0px_0px_#2e1065] [&_.wallet-adapter-button]:hover:translate-y-[2px] [&_.wallet-adapter-button]:hover:shadow-none [&_.wallet-adapter-button]:transition-all [&_.wallet-adapter-button]:text-white [&_.wallet-adapter-button]:font-bold [&_.wallet-adapter-button]:rounded-none">
      <WalletMultiButtonDynamic />
    </div>
  );
}