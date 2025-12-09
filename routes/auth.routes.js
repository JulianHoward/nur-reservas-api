// routes/auth.routes.js
const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Registro y login
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Perfil y logout (requieren token)
router.get('/me', requireAuth, AuthController.me);
router.post('/logout', requireAuth, AuthController.logout);

module.exports = router;
