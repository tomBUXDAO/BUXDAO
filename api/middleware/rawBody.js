import express from 'express';

function rawBodyMiddleware() {
  return express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  });
}

export default rawBodyMiddleware; 