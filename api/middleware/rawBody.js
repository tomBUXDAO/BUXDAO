import express from 'express';

function rawBodyMiddleware() {
  return express.json({
    verify: (req, res, buf) => {
      // Store the raw body buffer
      req.rawBody = buf;
    },
    type: '*/*' // Accept all content types
  });
}

export default rawBodyMiddleware; 