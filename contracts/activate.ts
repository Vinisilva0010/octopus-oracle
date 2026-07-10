import { AnchorProvider, setProvider, Program, web3 } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import nacl from "tweetnacl";

const TXLINE_PROGRAM_ID = new web3.PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

async function main() {
  const provider = AnchorProvider.env();
  setProvider(provider);
  const wallet = provider.wallet;
  const connection = provider.connection;

  console.log("1. Lendo histórico...");
  const sigs = await connection.getSignaturesForAddress(TXLINE_PROGRAM_ID, { limit: 15 }, "confirmed");
  let templateAccounts: web3.PublicKey[] | null = null;

  for (const sig of sigs) {
    if (sig.err) continue;
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(`   Analisando tx: ${sig.signature.slice(0, 15)}...`);
    const tx = await connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
    if (!tx) continue;
    const message = tx.transaction.message;
    const accountKeys = message.staticAccountKeys;
    for (const ix of message.compiledInstructions) {
      const programId = accountKeys[ix.programIdIndex];
      if (programId.equals(TXLINE_PROGRAM_ID) && ix.accountKeyIndexes.length === 9) {
        templateAccounts = ix.accountKeyIndexes.map(idx => accountKeys[idx]);
        break;
      }
    }
    if (templateAccounts) break;
  }

  if (!templateAccounts) throw new Error("Gabarito não encontrado.");

  const pricingMatrixPda = templateAccounts[1];
  const TOKEN_MINT = templateAccounts[2];
  const treasuryVault = templateAccounts[4];
  const treasuryPda = templateAccounts[5];

  const mintInfo = await connection.getAccountInfo(TOKEN_MINT);
  if (!mintInfo) throw new Error("Mint não encontrado.");
  const dynamicTokenProgram = mintInfo.owner;

  const userAta = await getAssociatedTokenAddress(TOKEN_MINT, wallet.publicKey, false, dynamicTokenProgram);
  const tx = new web3.Transaction();
  const ataInfo = await connection.getAccountInfo(userAta, "confirmed");
  if (!ataInfo) tx.add(createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userAta, wallet.publicKey, TOKEN_MINT, dynamicTokenProgram));

  const idl = await Program.fetchIdl(TXLINE_PROGRAM_ID, provider);
  const txlineProgram = new Program(idl!, provider);

  console.log("2. Enviando Inscrição on-chain...");
  const subscribeIx = await txlineProgram.methods.subscribe(1, 4)
    .accounts({ user: wallet.publicKey, pricingMatrix: pricingMatrixPda, tokenMint: TOKEN_MINT, userTokenAccount: userAta, tokenTreasuryVault: treasuryVault, tokenTreasuryPda: treasuryPda, tokenProgram: dynamicTokenProgram, systemProgram: web3.SystemProgram.programId, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID })
    .instruction();
  tx.add(subscribeIx);
  const txSig = await provider.sendAndConfirm(tx);
  console.log(`   Sucesso! Hash: ${txSig}`);

  console.log("3. Pegando JWT...");
  const guestRes = await fetch("https://txline-dev.txodds.com/auth/guest/start", { method: "POST" });
  if (!guestRes.ok) throw new Error(`Falha Guest: ${guestRes.status}`);
  const jwt = (await guestRes.json() as { token: string }).token;

  console.log("4. Assinando...");
  const messageBytes = new TextEncoder().encode(`${txSig}::${jwt}`);
  const secretKey = (wallet as any).payer.secretKey;
  const walletSignature = Buffer.from(nacl.sign.detached(messageBytes, secretKey)).toString("base64");

  console.log("5. Ativando...");
  const activateRes = await fetch("https://txline-dev.txodds.com/api/token/activate", {
    method: "POST",
    headers: { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ txSig, walletSignature, leagues: [] })
  });
  if (!activateRes.ok) throw new Error(`Falha Activate: ${activateRes.status} — ${await activateRes.text()}`);
  const activateData = await activateRes.json() as { apiToken: string };

  console.log("\n=======================================================");
  console.log(`TXLINE_JWT=${jwt}`);
  console.log(`TXLINE_API_KEY=${activateData.apiToken}`);
  console.log("=======================================================");
}

main().catch(console.error);
