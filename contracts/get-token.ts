import nacl from "tweetnacl";
import { AnchorProvider, setProvider, web3 } from "@coral-xyz/anchor";

async function main() {
  const provider = AnchorProvider.env();
  setProvider(provider);

  const guestRes = await fetch("https://txline-dev.txodds.com/auth/guest/start", { method: "POST" });
  const jwt = (await guestRes.json() as { token: string }).token;

  const res = await fetch("https://txline-dev.txodds.com/api/token/refresh", {
    method: "POST",
    headers: { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ walletPubkey: provider.wallet.publicKey.toBase58() })
  });

  const body = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", body);
}

main().catch(console.error);
