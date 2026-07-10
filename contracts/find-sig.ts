import { AnchorProvider, setProvider, web3 } from "@coral-xyz/anchor";

const TXLINE_PROGRAM_ID = new web3.PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

async function main() {
  const provider = AnchorProvider.env();
  setProvider(provider);

  const sigs = await provider.connection.getSignaturesForAddress(provider.wallet.publicKey, { limit: 50 }, "confirmed");

  for (const s of sigs) {
    const tx = await provider.connection.getTransaction(s.signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
    if (!tx) continue;
    const keys = tx.transaction.message.staticAccountKeys;
    const hasProgram = keys.some(k => k.toBase58() === TXLINE_PROGRAM_ID.toBase58());
    if (hasProgram) {
      console.log("txSig encontrada:", s.signature);
      process.exit(0);
    }
  }
  console.log("Nenhuma tx encontrada.");
}

main().catch(console.error);
