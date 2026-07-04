use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

// TODO: Mantenha o ID gerado pelo seu ambiente
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
}