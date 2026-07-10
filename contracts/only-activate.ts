import nacl from "tweetnacl";
import { AnchorProvider, setProvider, web3 } from "@coral-xyz/anchor";

const txSig = "MNwguFbwqHJTxETTDCMyyCfZoDcWSUxsWEmhEWJTe7daxWxXM5a1Bw5JtRJvD2pjKv5jwntyrnL7Wg9DA7uRAfn";

async function main() {
  const provider = AnchorProvider.env();
  setProvider(provider);

  const guestRes = await fetch("https://txline-dev.txodds.com/auth/guest/start", { method: "POST" });
  const jwt = (await guestRes.json() as { token: string }).token;
  console.log("JWT ok");

  const messageBytes = new TextEncoder().encode(`${txSig}::${jwt}`);
  const secretKey = (provider.wallet as any).payer.secretKey;
  const walletSignature = Buffer.from(nacl.sign.detached(messageBytes, secretKey)).toString("base64");

  const activateRes = await fetch("https://txline-dev.txodds.com/api/token/activate", {
    method: "POST",
    headers: { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ txSig, walletSignature, leagues: [] })
  });

  const body = await activateRes.text();
  if (!activateRes.ok) throw new Error(`Erro ${activateRes.status}: ${body}`);

  const data = JSON.parse(body);
  console.log("\n=======================================================");
  console.log(`TXLINE_JWT=${jwt}`);
  console.log(`TXLINE_API_KEY=${data.apiToken || data.token || body}`);
  console.log("=======================================================");
}

main().catch(console.error);
