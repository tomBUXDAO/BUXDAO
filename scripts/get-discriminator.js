import crypto from 'crypto';

// Calculate the discriminator for the "claim" instruction
// Anchor uses: first 8 bytes of sha256("global:claim")
const instructionName = "global:claim";
const hash = crypto.createHash('sha256').update(instructionName).digest();
const discriminator = hash.slice(0, 8);

console.log('Instruction name:', instructionName);
console.log('Full hash:', hash.toString('hex'));
console.log('Discriminator (hex):', discriminator.toString('hex'));
console.log('Discriminator (array):', Array.from(discriminator)); 