use anchor_lang::prelude::*;
extern crate spl_token;

declare_id!("3TePi2zcFYLdtttQykiUxQ1MP26Nk1uaCqQuRQGJrows");

#[program]
pub mod bux_claim {
    use super::*;

    pub fn claim(ctx: Context<Claim>, amount: u64) -> Result<()> {
        // Simple transfer using CPI to SPL token program
        let transfer_instruction = spl_token::instruction::transfer(
            &spl_token::id(),
            &ctx.accounts.treasury_token_account.key(),
            &ctx.accounts.user_token_account.key(),
            &ctx.accounts.treasury_authority.key(),
            &[],
            amount,
        )?;

        // Execute the transfer
        anchor_lang::solana_program::program::invoke_signed(
            &transfer_instruction,
            &[
                ctx.accounts.treasury_token_account.to_account_info(),
                ctx.accounts.user_token_account.to_account_info(),
                ctx.accounts.treasury_authority.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
            &[&[b"treasury", &[ctx.bumps.treasury_authority]]],
        )?;

        msg!("Transferred {} BUX tokens to user", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub treasury_token_account: Account<'info, spl_token::state::Account>,
    #[account(mut)]
    pub user_token_account: Account<'info, spl_token::state::Account>,
    /// CHECK: This is a PDA, not a real account
    #[account(seeds = [b"treasury"], bump)]
    pub treasury_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, spl_token::Token>,
}