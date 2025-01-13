import { randomBytes } from 'crypto';

export const generateState = () => {
  return randomBytes(16).toString('hex');
};

export const validateState = (req, res, next) => {
  const { state } = req.query;
  const storedState = req.session.discordState;

  if (!state || !storedState || state !== storedState) {
    return res.redirect('/verify?error=invalid_state');
  }

  // Clear the state after validation
  delete req.session.discordState;
  next();
};

export const initDiscordAuth = (req, res, next) => {
  const state = generateState();
  req.session.discordState = state;
  req.session.save((err) => {
    if (err) {
      console.error('Error saving session:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    next();
  });
}; 