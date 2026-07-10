import { AnchorProvider, setProvider, Program, web3 } from "@coral-xyz/anchor";
import BN from "bn.js";
import fs from "fs";

const provider = AnchorProvider.env();
setProvider(provider);

const idl = JSON.parse(fs.readFileSync("./target/idl/contracts.json", "utf8"));
const program = new Program(idl, provider);

async function main() {
  const fixtureId = new BN(17952170);
  const marketType = 1;

  const [marketPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("market"), fixtureId.toArrayLike(Buffer, "le", 8), Buffer.from([marketType])],
    program.programId
  );

  console.log("Criando PDA do Mercado na Devnet:", marketPda.toBase58());

  const tx = await program.methods
    .initializeMarket(fixtureId, marketType)
    .accounts({
      authority: provider.wallet.publicKey,
      market: marketPda,
    })
    .rpc();

  console.log("Mercado inicializado com sucesso! Hash da transação:", tx);
}

main().catch(console.error);
