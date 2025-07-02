use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

use spl_token::{
    instruction as token_instruction,
    state::{Account as TokenAccount, Mint},
};

// Program entrypoint
entrypoint!(process_instruction);

// Treasury PDA seeds
const TREASURY_SEED: &[u8] = b"treasury";

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    
    // Get accounts
    let treasury_token_account = next_account_info(accounts_iter)?;
    let user_token_account = next_account_info(accounts_iter)?;
    let treasury_authority = next_account_info(accounts_iter)?;
    let token_program = next_account_info(accounts_iter)?;
    let user = next_account_info(accounts_iter)?;
    
    // Verify treasury authority is a PDA
    let (expected_treasury_authority, bump) = Pubkey::find_program_address(
        &[TREASURY_SEED],
        program_id,
    );
    
    if expected_treasury_authority != *treasury_authority.key {
        return Err(ProgramError::InvalidArgument);
    }
    
    // Verify token program
    if *token_program.key != spl_token::id() {
        return Err(ProgramError::IncorrectProgramId);
    }
    
    // Verify user is signer
    if !user.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Parse amount from instruction data (first 8 bytes)
    if instruction_data.len() < 8 {
        return Err(ProgramError::InvalidInstructionData);
    }
    
    let amount = u64::from_le_bytes([
        instruction_data[0], instruction_data[1], instruction_data[2], instruction_data[3],
        instruction_data[4], instruction_data[5], instruction_data[6], instruction_data[7],
    ]);
    
    if amount == 0 {
        return Err(ProgramError::InvalidArgument);
    }
    
    // Create transfer instruction
    let transfer_ix = token_instruction::transfer(
        &spl_token::id(),
        treasury_token_account.key,
        user_token_account.key,
        treasury_authority.key,
        &[],
        amount,
    )?;
    
    // Execute transfer with PDA signature
    invoke_signed(
        &transfer_ix,
        &[
            treasury_token_account.clone(),
            user_token_account.clone(),
            treasury_authority.clone(),
            token_program.clone(),
        ],
        &[&[TREASURY_SEED, &[bump]]],
    )?;
    
    msg!("Successfully transferred {} BUX tokens", amount);
    Ok(())
} 