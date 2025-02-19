import express from 'express';
import holdings from './holdings.js';

const router = express.Router();

router.use('/holdings', holdings);

export default router; 