import { AnchorProvider, setProvider, Program, web3 } from "@coral-xyz/anchor";

const TXLINE_PROGRAM_ID = new web3.PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

async function main() {
  const provider = AnchorProvider.env();
  setProvider(provider);

  const idl = await Program.fetchIdl(TXLINE_PROGRAM_ID, provider);
  const txlineProgram = new Program(idl!, provider) as any;
  
  const [pricingMatrixPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    TXLINE_PROGRAM_ID
  );
  
  const matrix = await txlineProgram.account.pricingMatrix.fetch(pricingMatrixPda);
  
  // Inspeciona a árvore do objeto sem limite de profundidade
  console.dir(matrix, { depth: null, colors: true });
}

main().catch(console.error);
