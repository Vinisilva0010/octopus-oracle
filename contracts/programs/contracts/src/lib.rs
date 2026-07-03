use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

// TODO: Atualizar com o Program ID gerado pelo Anchor após o primeiro build
declare_id!("GUCH4uCVy2x3k88Mwn1j43zShVQXA8SVpZJprCF1cPLL");

#[program]
pub mod octopus_oracle {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        fixture_id: u64,
        market_type: u8,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.fixture_id = fixture_id;
        market.market_type = market_type;
        market.is_resolved = false;
        market.bump = ctx.bumps.market;
        
        Ok(())
    }

    pub fn place_position(
        ctx: Context<PlacePosition>,
        choice: u8,
        amount: u64,
    ) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.position;

        require!(!market.is_resolved, OracleError::MarketAlreadyResolved);
        require!(amount > 0, OracleError::InvalidAmount);

        // Define o estado da posição
        position.owner = ctx.accounts.user.key();
        position.market = market.key();
        position.choice = choice;
        position.amount = amount;
        position.bump = ctx.bumps.position;

        // Executa o escrow: transfere SOL da wallet do usuário para o PDA do mercado
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.market.to_account_info(),
            },
        );
        transfer(cpi_context, amount)?;

        Ok(())
    }

    // TODO: Implementar a resolução via CPI com a TxLINE (validate_stat)
    // pub fn resolve_market(ctx: Context<ResolveMarket>, proof_payload: ...) -> Result<()> { ... }
}

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

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub authority: Pubkey,
    pub fixture_id: u64,
    pub market_type: u8,
    pub is_resolved: bool,
    pub winning_choice: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub choice: u8,
    pub amount: u64,
    pub bump: u8,
}

#[error_code]
pub enum OracleError {
    #[msg("Este mercado já foi resolvido.")]
    MarketAlreadyResolved,
    #[msg("O valor da posição deve ser maior que zero.")]
    InvalidAmount,
}