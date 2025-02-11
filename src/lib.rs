use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};
use spl_token::{
    instruction as token_instruction,
    state::Account as TokenAccount,
};
use borsh::{BorshDeserialize, BorshSerialize};

// Declare program ID
solana_program::declare_id!("BUXExchangeProgram1111111111111111111111111111");

// Constants
pub const BUX_MINT: &str = "FMiRxSbLqRTWiBszt1DZmXd7SrscWCccY7fcXNtwWxHK";
pub const TREASURY_WALLET: &str = "FYfLzXckAf2JZoMYBz2W4fpF9vejqpA6UFV17d1A7C75";

// Program entrypoint
entrypoint!(process_instruction);

// Instruction data
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum ExchangeInstruction {
    /// Claims BUX tokens from treasury
    /// 
    /// Accounts expected:
    /// 0. `[signer]` The user claiming tokens
    /// 1. `[writable]` User's BUX token account
    /// 2. `[writable]` Treasury BUX token account
    /// 3. `[]` BUX token mint
    /// 4. `[]` Token program
    /// 5. `[]` PDA account for signing
    Claim {
        /// Amount of BUX to claim
        amount: u64,
    },
}

// Program logic
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = ExchangeInstruction::try_from_slice(instruction_data)?;

    match instruction {
        ExchangeInstruction::Claim { amount } => {
            msg!("Instruction: Claim");
            process_claim(program_id, accounts, amount)
        }
    }
}

// Process claim instruction
fn process_claim(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    // Get accounts
    let user_account = next_account_info(account_info_iter)?;
    let user_token_account = next_account_info(account_info_iter)?;
    let treasury_token_account = next_account_info(account_info_iter)?;
    let token_mint = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let pda_account = next_account_info(account_info_iter)?;

    // Verify user is signer
    if !user_account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Verify token mint
    let bux_mint = Pubkey::try_from(BUX_MINT)
        .map_err(|_| ProgramError::InvalidAccountData)?;
    if token_mint.key != &bux_mint {
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify treasury account
    let treasury = Pubkey::try_from(TREASURY_WALLET)
        .map_err(|_| ProgramError::InvalidAccountData)?;
    if treasury_token_account.key != &treasury {
        return Err(ProgramError::InvalidAccountData);
    }

    // Get PDA for signing
    let (pda, bump_seed) = Pubkey::find_program_address(
        &[b"bux_exchange"],
        program_id
    );
    
    // Verify PDA
    if pda_account.key != &pda {
        return Err(ProgramError::InvalidAccountData);
    }

    // Create transfer instruction
    let transfer_ix = token_instruction::transfer(
        token_program.key,
        treasury_token_account.key,
        user_token_account.key,
        &pda,
        &[&pda],
        amount,
    )?;

    // Execute transfer with PDA signing
    invoke_signed(
        &transfer_ix,
        &[
            treasury_token_account.clone(),
            user_token_account.clone(),
            pda_account.clone(),
            token_program.clone(),
        ],
        &[&[b"bux_exchange", &[bump_seed]]],
    )?;

    msg!("Transferred {} BUX tokens to user", amount);
    Ok(())
}

// Error type for the program
#[derive(Debug, thiserror::Error)]
pub enum ExchangeError {
    #[error("Invalid instruction")]
    InvalidInstruction,
}

pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_program::clock::Epoch;
    use std::str::FromStr;

    #[test]
    fn test_mint_address() {
        let mint = Pubkey::from_str(BUX_MINT).unwrap();
        assert_eq!(mint.to_string(), BUX_MINT);
    }

    #[test]
    fn test_treasury_address() {
        let treasury = Pubkey::from_str(TREASURY_WALLET).unwrap();
        assert_eq!(treasury.to_string(), TREASURY_WALLET);
    }

    // More tests will be added for instruction processing
} 