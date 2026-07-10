import { AnchorProvider, setProvider } from "@coral-xyz/anchor";

async function main() {
  const provider = AnchorProvider.env();
  setProvider(provider);

  const guestRes = await fetch("https://txline-dev.txodds.com/auth/guest/start", { method: "POST" });
  const jwt = (await guestRes.json() as { token: string }).token;

  const res = await fetch("https://txline-dev.txodds.com/api/token", {
    headers: { "Authorization": `Bearer ${jwt}`, "X-Wallet": provider.wallet.publicKey.toBase58() }
  });

  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}

main().catch(console.error);
