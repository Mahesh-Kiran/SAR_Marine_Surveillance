const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  const token = req.cookies?.token;
  if (token) return res.json({ authenticated: true });
  return res.json({ authenticated: false });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

module.exports = router;
