import { AnchorProvider, setProvider } from "@coral-xyz/anchor";
import nacl from "tweetnacl";

async function main() {
  const provider = AnchorProvider.env();
  setProvider(provider);
  const wallet = provider.wallet as any;

  // COLE AQUI A NOVA txSig GERADA AGORA
  const txSig = "COLE_A_NOVA_TXSIG_AQUI";

  const apiOrigin = "https://txline-dev.txodds.com";
  const SELECTED_LEAGUES: string[] = [];

  console.log("1. Pegando JWT guest novo...");
  const guestRes = await fetch(`${apiOrigin}/auth/guest/start`, {
    method: "POST",
  });

  if (!guestRes.ok) {
    const err = await guestRes.text();
    throw new Error(`Guest falhou: ${guestRes.status} - ${err}`);
  }

  const guestData = (await guestRes.json()) as { token: string };
  const jwt = guestData.token;

  console.log("2. Assinando mensagem...");
  const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  const messageBytes = new TextEncoder().encode(messageString);

  let signatureBytes: Uint8Array;

  if (typeof wallet.signMessage === "function") {
    signatureBytes = await wallet.signMessage(messageBytes);
  } else if (wallet.payer?.secretKey) {
    signatureBytes = nacl.sign.detached(messageBytes, wallet.payer.secretKey);
  } else {
    throw new Error("Wallet não suporta signMessage e também não expõe payer.secretKey");
  }

  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  console.log("3. Ativando token...");
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

  const raw = await activateRes.text();

  if (!activateRes.ok) {
    throw new Error(`Activate falhou: ${activateRes.status} - ${raw}`);
  }

  let apiToken: string | undefined;

  try {
    const parsed = JSON.parse(raw) as string | { token?: string; apiToken?: string };
    apiToken =
      typeof parsed === "string"
        ? parsed
        : parsed.token ?? parsed.apiToken;
  } catch {
    apiToken = raw.trim();
  }

  if (!apiToken) {
    throw new Error(`Não consegui extrair o token da resposta: ${raw}`);
  }

  console.log("\n====================================");
  console.log("COLE ISSO NO .env");
  console.log("====================================");
  console.log(`TXLINE_JWT=${jwt}`);
  console.log(`TXLINE_API_KEY=${apiToken}`);
  console.log(`TXLINE_API_BASE=${apiOrigin}/api`);
  console.log("====================================\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});