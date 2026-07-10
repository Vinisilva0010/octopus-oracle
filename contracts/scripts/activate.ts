import { AnchorProvider, setProvider, Program, web3 } from "@coral-xyz/anchor";
import { 
    getAssociatedTokenAddress, 
    createAssociatedTokenAccountIdempotentInstruction, 
    ASSOCIATED_TOKEN_PROGRAM_ID 
} from "@solana/spl-token";
import nacl from "tweetnacl";

const TXLINE_PROGRAM_ID = new web3.PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

async function main() {
  const provider = AnchorProvider.env();
  setProvider(provider);
  const wallet = provider.wallet;
  const connection = provider.connection;

  console.log("1. Lendo histórico com bypass de Rate Limit (1.5s delay)...");

  const sigs = await connection.getSignaturesForAddress(
      TXLINE_PROGRAM_ID, 
      { limit: 15 }, 
      "confirmed"
  );
  
  let templateAccounts: web3.PublicKey[] | null = null;

  for (const sig of sigs) {
      if (sig.err) continue;
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log(`   Analisando tx: ${sig.signature.slice(0, 15)}...`);
      
      const tx = await connection.getTransaction(sig.signature, { 
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed" 
      });
      
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

  if (!templateAccounts) {
      throw new Error("Gabarito não encontrado. Rode o script novamente.");
  }

  const pricingMatrixPda = templateAccounts[1];
  const TOKEN_MINT = templateAccounts[2];
  const treasuryVault = templateAccounts[4];
  const treasuryPda = templateAccounts[5];

  console.log(`\n   [+] Mint Oficial Interceptado: ${TOKEN_MINT.toBase58()}`);
  
  const mintInfo = await connection.getAccountInfo(TOKEN_MINT);
  if (!mintInfo) throw new Error("Mint não encontrado na blockchain.");
  const dynamicTokenProgram = mintInfo.owner;
  
  console.log(`   [+] Engine do Token detectada: ${dynamicTokenProgram.toBase58()}`);

  const userAta = await getAssociatedTokenAddress(
      TOKEN_MINT, 
      wallet.publicKey, 
      false, 
      dynamicTokenProgram
  );
  
  const tx = new web3.Transaction();

  const ataInfo = await connection.getAccountInfo(userAta, "confirmed");
  if (!ataInfo) {
      console.log("   Criando ATA com a engine Token-2022...");
      tx.add(createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey, 
          userAta, 
          wallet.publicKey, 
          TOKEN_MINT,
          dynamicTokenProgram
      ));
  }

  const idl = await Program.fetchIdl(TXLINE_PROGRAM_ID, provider);
  const txlineProgram = new Program(idl!, provider);

  console.log("2. Enviando Inscrição on-chain...");
  const subscribeIx = await txlineProgram.methods.subscribe(1, 4)
      .accounts({
          user: wallet.publicKey,
          pricingMatrix: pricingMatrixPda,
          tokenMint: TOKEN_MINT,
          userTokenAccount: userAta,
          tokenTreasuryVault: treasuryVault,
          tokenTreasuryPda: treasuryPda,
          tokenProgram: dynamicTokenProgram,
          systemProgram: web3.SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction();

  tx.add(subscribeIx);

  const txSig = await provider.sendAndConfirm(tx);
  console.log(`   Sucesso! Hash: ${txSig}`);

  console.log("3. Solicitando JWT Guest off-chain...");
  const guestRes = await fetch("https://txline-dev.txodds.com/auth/guest/start", { method: "POST" });
  if (!guestRes.ok) throw new Error(`Falha HTTP Guest: ${guestRes.status}`);
  const guestData = (await guestRes.json()) as { token: string };
  const jwt = guestData.token;

  console.log("4. Assinando a prova criptográfica...");
  // CORRIGIDO: mensagem com dois pontos duplos (leagues vazio)
  const messageStr = `${txSig}::${jwt}`;
  const messageBytes = new TextEncoder().encode(messageStr);
  const secretKey = (wallet as any).payer.secretKey;
  const signatureBytes = nacl.sign.detached(messageBytes, secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  console.log("5. Ativando token de API...");
  const activateRes = await fetch("https://txline-dev.txodds.com/api/token/activate", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${jwt}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ txSig, walletSignature, leagues: [] })
  });

  if (!activateRes.ok) {
    const errBody = await activateRes.text();
    throw new Error(`Falha HTTP Activate: ${activateRes.status} — ${errBody}`);
  }
  const activateData = (await activateRes.json()) as { apiToken: string };

  console.log("\n=======================================================");
  console.log("✅ SUCESSO! ATUALIZE O SEU .env:");
  console.log("=======================================================");
  console.log(`TXLINE_JWT=${jwt}`);
  console.log(`TXLINE_API_KEY=${activateData.apiToken}`);
  console.log("=======================================================\n");
}

main().catch(console.error);