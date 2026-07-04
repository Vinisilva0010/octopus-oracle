import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import type { Contracts } from "../target/types/contracts";
import { expect } from "chai";
import BN from "bn.js"; // Correção: Import direto da fonte, imune ao erro de ESM do Node 22

describe("octopus-oracle", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Contracts as Program<Contracts>;
  
  const marketAuthority = anchor.web3.Keypair.generate();
  const user = anchor.web3.Keypair.generate();

  const fixtureId = new BN(17952170);
  const marketType = 1;

  let marketPda: anchor.web3.PublicKey;
  let positionPda: anchor.web3.PublicKey;

  before(async () => {
    const sig1 = await provider.connection.requestAirdrop(marketAuthority.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    const sig2 = await provider.connection.requestAirdrop(user.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    
    await provider.connection.confirmTransaction({ signature: sig1, ...latestBlockhash });
    await provider.connection.confirmTransaction({ signature: sig2, ...latestBlockhash });

    [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market"), fixtureId.toArrayLike(Buffer, "le", 8), Buffer.from([marketType])],
      program.programId
    );

    [positionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketPda.toBuffer(), user.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Inicializa o PDA do Mercado", async () => {
    await program.methods
      .initializeMarket(fixtureId, marketType)
      .accounts({
        authority: marketAuthority.publicKey,
        market: marketPda,
        // systemProgram: Removido. O Anchor 1.0 auto-resolve.
      })
      .signers([marketAuthority])
      .rpc();

    const marketAccount = await program.account.market.fetch(marketPda);
    expect(marketAccount.fixtureId.toNumber()).to.equal(fixtureId.toNumber());
    expect(marketAccount.marketType).to.equal(marketType);
    expect(marketAccount.isResolved).to.be.false;
  });

  it("Executa uma aposta e trava o SOL no Escrow do Mercado", async () => {
    const amount = new BN(2 * anchor.web3.LAMPORTS_PER_SOL);
    const choice = 1;

    const preBalance = await provider.connection.getBalance(marketPda);

    await program.methods
      .placePosition(choice, amount)
      .accounts({
        user: user.publicKey,
        market: marketPda,
        // position e systemProgram: Removidos. O Anchor 1.0 deriva ambos via IDL.
      })
      .signers([user])
      .rpc();

    const positionAccount = await program.account.position.fetch(positionPda);
    expect(positionAccount.choice).to.equal(choice);
    expect(positionAccount.amount.toString()).to.equal(amount.toString());
    expect(positionAccount.owner.toBase58()).to.equal(user.publicKey.toBase58());

    const postBalance = await provider.connection.getBalance(marketPda);
    expect(postBalance).to.equal(preBalance + amount.toNumber());
  });
});