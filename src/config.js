// Get the base API URL based on environment
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://buxdao.com'
  : 'http://localhost:3001'; 