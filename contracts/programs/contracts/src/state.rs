use anchor_lang::prelude::*;

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