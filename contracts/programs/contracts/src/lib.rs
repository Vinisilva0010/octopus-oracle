use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod txline_types; 

use instructions::*;
use txline_types::{ScoresBatchSummary, ProofNode, TraderPredicate, StatTerm};

declare_id!("GUCH4uCVy2x3k88Mwn1j43zShVQXA8SVpZJprCF1cPLL");

#[program]
pub mod contracts {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        fixture_id: u64,
        market_type: u8,
    ) -> Result<()> {
        exec_initialize_market(ctx, fixture_id, market_type)
    }

    pub fn place_position(
        ctx: Context<PlacePosition>,
        choice: u8,
        amount: u64,
    ) -> Result<()> {
        exec_place_position(ctx, choice, amount)
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        ts: i64,
        fixture_summary: ScoresBatchSummary,
        fixture_proof: Vec<ProofNode>,
        main_tree_proof: Vec<ProofNode>,
        predicate: TraderPredicate,
        stat_a: StatTerm, 
        winning_choice: u8,
    ) -> Result<()> {
        exec_resolve_market(
            ctx,
            ts,
            fixture_summary,
            fixture_proof,
            main_tree_proof,
            predicate,
            stat_a,
            winning_choice,
        )
    }
}