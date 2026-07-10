import { AnchorProvider, setProvider } from "@coral-xyz/anchor";
import nacl from "tweetnacl";

async function main() {
  const provider = AnchorProvider.env();
  setProvider(provider);
  const wallet = provider.wallet;

  const txSig =
    "MNwguFbwqHJTxETTDCMyyCfZoDcWSUxsWEmhEWJTe7daxWxXM5a1Bw5JtRJvD2pjKv5jwntyrnL7Wg9DA7uRAfn";
  const apiOrigin = "https://txline-dev.txodds.com";

  console.log("1. Solicitando JWT Guest fresco na URL de Devnet...");
  const guestRes = await fetch(`${apiOrigin}/auth/guest/start`, { method: "POST" });
  if (!guestRes.ok) {
    const errText = await guestRes.text();
    throw new Error(`Falha HTTP Guest: ${guestRes.status} - Body: ${errText}`);
  }

  const guestData = (await guestRes.json()) as { token: string };
  const jwt = guestData.token;

  console.log("2. Montando a mensagem EXATA para assinatura...");
  const SELECTED_LEAGUES: string[] = [];
  const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  const messageBytes = new TextEncoder().encode(messageString);

  const secretKey = (wallet as any).payer.secretKey;
  const signatureBytes = nacl.sign.detached(messageBytes, secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  console.log("3. Ativando token de API no endpoint correto...");
  const activateRes = await fetch(`${apiOrigin}/api/token/activate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      txSig,
      walletSignature,
      leagues: SELECTED_LEAGUES,
    }),
  });

  const rawActivate = await activateRes.text();

  if (!activateRes.ok) {
    throw new Error(`Falha HTTP Activate: ${activateRes.status} - Body: ${rawActivate}`);
  }

  let apiToken: string | undefined;

  try {
    const parsed = JSON.parse(rawActivate) as
      | string
      | { token?: string; apiToken?: string };

    apiToken =
      typeof parsed === "string"
        ? parsed
        : parsed.token ?? parsed.apiToken;
  } catch {
    apiToken = rawActivate.trim();
  }

  if (!apiToken) {
    throw new Error(`Resposta sem token: ${rawActivate}`);
  }

  console.log("\n=======================================================");
  console.log("✅ AUTENTICAÇÃO CONCLUÍDA! ATUALIZE O SEU .env:");
  console.log("=======================================================");
  console.log(`TXLINE_JWT=${jwt}`);
  console.log(`TXLINE_API_KEY=${apiToken}`);
  console.log(`TXLINE_API_BASE=${apiOrigin}/api`);
  console.log("=======================================================\n");
}

main().catch(console.error);