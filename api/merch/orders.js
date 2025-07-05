const express = require('express');
const router = express.Router();
const db = require('../config/database');

// POST /api/merch/orders - Insert a new order
router.post('/orders', async (req, res) => {
  try {
    const { wallet_address, tx_signature, cart, shipping_info } = req.body;
    if (!wallet_address || !tx_signature || !cart || !shipping_info) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await db.query(
      `INSERT INTO orders (wallet_address, tx_signature, cart, shipping_info, status)
       VALUES ($1, $2, $3, $4, 'processing') RETURNING *`,
      [wallet_address, tx_signature, cart, shipping_info]
    );
    res.json({ order: result.rows[0] });
  } catch (err) {
    console.error('Insert order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/merch/orders?wallet=... - Fetch orders for a wallet
router.get('/orders', async (req, res) => {
  try {
    const { wallet } = req.query;
    if (!wallet) return res.status(400).json({ error: 'Missing wallet address' });
    const result = await db.query(
      `SELECT * FROM orders WHERE wallet_address = $1 ORDER BY created_at DESC`,
      [wallet]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 