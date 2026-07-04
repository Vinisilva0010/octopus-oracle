use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, instruction::Instruction};
use borsh::BorshSerialize;
use sha2::{Sha256, Digest};
use crate::state::Market;
use crate::errors::OracleError;
use crate::txline_types::{ScoresBatchSummary, ProofNode, TraderPredicate, StatTerm};

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority @ OracleError::InvalidMarketAuthority,
        constraint = !market.is_resolved @ OracleError::MarketAlreadyResolved
    )]
    pub market: Account<'info, Market>,

    /// CHECK: Conta de validação da TxLINE (daily_scores_merkle_roots)
    pub txline_merkle_roots: UncheckedAccount<'info>,

    /// CHECK: O programa oficial da TxLINE na Devnet
    pub txline_program: UncheckedAccount<'info>,
}

pub fn exec_resolve_market(
    ctx: Context<ResolveMarket>,
    ts: i64,
    fixture_summary: ScoresBatchSummary,
    fixture_proof: Vec<ProofNode>,
    main_tree_proof: Vec<ProofNode>,
    predicate: TraderPredicate,
    stat_a: StatTerm,
    winning_choice: u8,
) -> Result<()> {
    let market = &mut ctx.accounts.market;

    // 1. Calcula o discriminador da instrução da TxLINE de forma nativa e segura
    let mut hasher = Sha256::new();
    hasher.update(b"global:validate_stat");
    let discriminator = hasher.finalize()[..8].to_vec();

    // 2. Serializa os argumentos exatamente na ordem exigida pela TxLINE
    let mut ix_data = discriminator;
    ix_data.extend(ts.to_le_bytes());
    ix_data.extend(fixture_summary.try_to_vec()?);
    ix_data.extend(fixture_proof.try_to_vec()?);
    ix_data.extend(main_tree_proof.try_to_vec()?);
    ix_data.extend(predicate.try_to_vec()?);
    ix_data.extend(stat_a.try_to_vec()?);
    
    // stat_b: Option<StatTerm> = None (0 representa a tag do None no Borsh)
    ix_data.push(0); 
    // op: Option<BinaryExpression> = None
    ix_data.push(0); 

    // 3. Monta a conta para a CPI da TxLINE
    let accounts = vec![
        anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
            ctx.accounts.txline_merkle_roots.key(),
            false,
        ),
    ];

    let txline_instruction = Instruction {
        program_id: ctx.accounts.txline_program.key(),
        accounts,
        data: ix_data,
    };

    // 4. Invoca o contrato da TxLINE
    invoke(
        &txline_instruction,
        &[
            ctx.accounts.txline_merkle_roots.to_account_info(),
            ctx.accounts.txline_program.to_account_info(),
        ],
    )?;

    // 5. Se passou da CPI com sucesso, o resultado é verídico. Atualiza e fecha o mercado.
    market.is_resolved = true;
    market.winning_choice = winning_choice;

    Ok(())
}