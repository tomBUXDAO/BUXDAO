import claimRouter from './user/claim.js';

// Routes
app.use('/api/auth', authRouter);
app.use('/api/user/balance', balanceRouter);
app.use('/api/user/claim', claimRouter); 