import express from 'express';
import holdings from './holdings.js';
import rewards from './rewards.js';
import claimRewards from './claim-rewards.js';

const router = express.Router();

router.use('/holdings', holdings);
router.use('/rewards', rewards);
router.use('/claim-rewards', claimRewards);

export default router; 