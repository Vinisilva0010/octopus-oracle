use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, instruction::Instruction};
use borsh::BorshSerialize;
use crate::state::Market;
use crate::errors::OracleError;
use crate::txline_types::{ScoresBatchSummary, ProofNode, TraderPredicate, StatTerm, BinaryExpression};

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

    /// CHECK: Conta de validação da TxLINE
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

    // Discriminator exato extraído do IDL da TxLINE
    let discriminator: [u8; 8] = [107, 197, 232, 90, 191, 136, 105, 185];

    let mut ix_data = discriminator.to_vec();
    ix_data.extend(ts.try_to_vec()?);
    ix_data.extend(fixture_summary.try_to_vec()?);
    ix_data.extend(fixture_proof.try_to_vec()?);
    ix_data.extend(main_tree_proof.try_to_vec()?);
    ix_data.extend(predicate.try_to_vec()?);
    ix_data.extend(stat_a.try_to_vec()?); 

    // Option::None para stat_b e op mapeados rigidamente pro Borsh
    let stat_b: Option<StatTerm> = None;
    ix_data.extend(stat_b.try_to_vec()?);
    
    let op: Option<BinaryExpression> = None;
    ix_data.extend(op.try_to_vec()?);

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

    invoke(
        &txline_instruction,
        &[
            ctx.accounts.txline_merkle_roots.to_account_info(),
            ctx.accounts.txline_program.to_account_info(),
        ],
    )?;

    market.is_resolved = true;
    market.winning_choice = winning_choice;

    Ok(())
}