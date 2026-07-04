use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};
use crate::state::{Market, Position};
use crate::errors::OracleError;

#[derive(Accounts)]
#[instruction(choice: u8)]
pub struct PlacePosition<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        init,
        payer = user,
        space = 8 + Position::INIT_SPACE,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,
    
    pub system_program: Program<'info, System>,
}

// Altere apenas esta linha (mantenha o resto igual):
pub fn exec_place_position(ctx: Context<PlacePosition>, choice: u8, amount: u64) -> Result<()> {
    let market = &ctx.accounts.market;
    let position = &mut ctx.accounts.position;

    require!(!market.is_resolved, OracleError::MarketAlreadyResolved);
    require!(amount > 0, OracleError::InvalidAmount);

    position.owner = ctx.accounts.user.key();
    position.market = market.key();
    position.choice = choice;
    position.amount = amount;
    position.bump = ctx.bumps.position;

    // Escrow nativo usando CPI de baixo nível da Solana
    invoke(
        &system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.market.key(),
            amount,
        ),
        &[
            ctx.accounts.user.to_account_info(),
            ctx.accounts.market.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    Ok(())
}