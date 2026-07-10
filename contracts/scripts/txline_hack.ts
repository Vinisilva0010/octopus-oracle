import { AnchorProvider, setProvider, web3 } from "@coral-xyz/anchor";

const TXLINE_PROGRAM_ID = new web3.PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const TOKEN_PROGRAM_ID = new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

async function main() {
  const provider = AnchorProvider.env();
  setProvider(provider);

  console.log("Escaneando a RPC da Devnet por cofres da tesouraria TxLINE...");

  // Sementes mais utilizadas para PDAs de tesouraria em contratos Anchor
  const possibleSeeds = [
    "treasury", "token_treasury", "vault", "token_vault",
    "treasury_vault", "admin_vault", "txline_treasury", "pricing_vault"
  ];
  
  let mintAddress = null;

  for (const seed of possibleSeeds) {
    const [pda] = web3.PublicKey.findProgramAddressSync([Buffer.from(seed)], TXLINE_PROGRAM_ID);
    const vaults = await provider.connection.getTokenAccountsByOwner(pda, { programId: TOKEN_PROGRAM_ID });

    if (vaults.value.length > 0) {
        console.log(`\n[+] Semente da tesouraria encontrada: "${seed}"`);
        console.log(`[+] Treasury PDA: ${pda.toBase58()}`);

        for (const { pubkey, account } of vaults.value) {
            // No layout de uma Token Account em C/Rust, os primeiros 32 bytes sempre guardam o Pubkey do Mint
            const mint = new web3.PublicKey(account.data.slice(0, 32));
            console.log(`[+] Treasury Vault: ${pubkey.toBase58()}`);
            console.log(`[+] Token Mint Oficial: ${mint.toBase58()}`);
            mintAddress = mint.toBase58();
        }
        break;
    }
  }

  if (!mintAddress) {
    console.log("\n[-] A semente da tesouraria está ofuscada ou não usa um padrão comum de nomenclatura.");
  }
}
main().catch(console.error);
