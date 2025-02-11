use anchor_lang::prelude::*;

declare_id!("Ho4PrDkgq4EGQePKT4sJvuFvbFWJNtBmmh7hNg6njMpn");

#[program]
pub mod bux_exchange_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
