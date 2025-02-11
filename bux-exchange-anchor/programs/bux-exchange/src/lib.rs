use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("5FmuPcTCJSxB4gJhYpKMZDMgbZAhNezHVWML6htJNXrX");

#[program]
pub mod bux_exchange {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>, amount: u64) -> Result<()> {
        // Create the transfer instruction
        let transfer_instruction = Transfer {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.treasury_authority.to_account_info(),
        };

        // Get the seeds for PDA signing
        let seeds = b"bux_exchange";
        let bump = *ctx.bumps.get("treasury_authority").unwrap();
        let signer_seeds = &[seeds, &[bump]];

        // Execute the transfer with PDA signing
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_instruction,
                &[&[signer_seeds][..]],
            ),
            amount,
        )?;

        msg!("Transferred {} BUX tokens to user", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = user_token_account.mint == BUX_MINT_PUBKEY,
        constraint = user_token_account.owner == user.key()
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = treasury_token_account.mint == BUX_MINT_PUBKEY,
        constraint = treasury_token_account.owner == treasury_authority.key()
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: PDA that signs for the treasury
    #[account(
        seeds = [b"bux_exchange"],
        bump,
    )]
    pub treasury_authority: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

// Constants
pub const BUX_MINT_PUBKEY: Pubkey = pubkey!("BUXkvwP9JjzqtH3bkh5j9JH8qFUhvrKHKUnTkqeJHVQz"); 