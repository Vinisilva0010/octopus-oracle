import nacl from "tweetnacl";
import { AnchorProvider, setProvider } from "@coral-xyz/anchor";

const txSig = "vsGt8xH5yRyBBheaqUxjSSMvb6GHTZMmxNknQYSavRTBaXCXbhWXkRQk69kau5Cv2vG3FRWzV6nid1hpmovf8Gm";

async function main() {
  const provider = AnchorProvider.env();
  setProvider(provider);

  const guestRes = await fetch("https://txline-dev.txodds.com/auth/guest/start", { method: "POST" });
  const jwt = (await guestRes.json() as { token: string }).token;

  const messageBytes = new TextEncoder().encode(`${txSig}::${jwt}`);
  const secretKey = (provider.wallet as any).payer.secretKey;
  const walletSignature = Buffer.from(nacl.sign.detached(messageBytes, secretKey)).toString("base64");

  const activateRes = await fetch("https://txline-dev.txodds.com/api/token/activate", {
    method: "POST",
    headers: { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ txSig, walletSignature, leagues: [] })
  });

  const body = await activateRes.text();
  console.log("Status:", activateRes.status);
  console.log("Body:", body);
  console.log("\n=======================================================");
  console.log(`TXLINE_JWT=${jwt}`);
  console.log(`TXLINE_API_KEY=${body}`);
  console.log("=======================================================");
}

main().catch(console.error);
