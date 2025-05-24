import express from 'express';
import holdings from './holdings.js';
import claim from './claim.js';

const router = express.Router();

router.use('/holdings', holdings);
router.use('/claim', claim);

export default router; 