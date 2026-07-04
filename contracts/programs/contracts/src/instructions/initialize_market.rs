use anchor_lang::prelude::*;
use crate::state::Market;

#[derive(Accounts)]
#[instruction(fixture_id: u64, market_type: u8)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", fixture_id.to_le_bytes().as_ref(), &[market_type]],
        bump
    )]
    pub market: Account<'info, Market>,
    
    pub system_program: Program<'info, System>,
}

// Altere apenas esta linha (mantenha o resto igual):
pub fn exec_initialize_market(ctx: Context<InitializeMarket>, fixture_id: u64, market_type: u8) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.authority = ctx.accounts.authority.key();
    market.fixture_id = fixture_id;
    market.market_type = market_type;
    market.is_resolved = false;
    market.bump = ctx.bumps.market;
    
    Ok(())
}