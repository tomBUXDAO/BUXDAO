import express from 'express';

function rawBodyMiddleware() {
  return express.raw({
    type: '*/*',
    limit: '100kb',
    verify: (req, res, buf) => {
      // Store the raw body buffer
      req.rawBody = buf;
    }
  });
}

export default rawBodyMiddleware; 