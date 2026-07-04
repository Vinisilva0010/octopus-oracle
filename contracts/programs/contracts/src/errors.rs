use anchor_lang::prelude::*;

#[error_code]
pub enum OracleError {
    #[msg("Este mercado já foi resolvido.")]
    MarketAlreadyResolved,
    #[msg("O valor da posição deve ser maior que zero.")]
    InvalidAmount,
}