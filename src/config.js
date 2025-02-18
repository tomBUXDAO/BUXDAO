// Get the base API URL based on environment
const isDev = import.meta.env.DEV;
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isDev ? 'http://localhost:3001' : 'https://buxdao.com');
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || (isDev ? 'http://localhost:5173' : 'https://buxdao.com');
export const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'; 