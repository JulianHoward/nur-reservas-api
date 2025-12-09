// app.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');

const db = require('./models');
const authRoutes = require('./routes/auth.routes');
const espacioRoutes = require("./routes/espacio.routes");
const reservaRoutes = require("./routes/reserva.routes");

const app = express();

// --- SESIONES ---
app.set('trust proxy', 1);
app.use(
  session({
    secret: 'howard',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// --- CORS ---
app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// --- BODY PARSER ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- MANEJO DE ERRORES DE JSON ---
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error(err);
    return res.status(400).send({ message: 'Invalid data' });
  }
  next();
});

// --- MOCK DE AUTENTICACIÓN PARA TESTS ---
if (process.env.NODE_ENV === "test") {
  const authMiddleware = require('./middlewares/auth.middleware');

  // Mock requireAuth
  authMiddleware.requireAuth = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: 'No autorizado' });

    const match = token.match(/token-usuario-(\d+)/);
    if (match) {
      res.locals.user = { id: parseInt(match[1], 10), role: "user" };
    } else if (token.includes("admin")) {
      res.locals.user = { id: 0, role: "admin" };
    } else {
      return res.status(401).json({ message: 'Token inválido' });
    }
    next();
  };

  // Mock requireRole
  authMiddleware.requireRole = (...roles) => (req, res, next) => {
    const u = res.locals.user;
    if (!u) return res.status(401).json({ message: 'No autenticado' });
    if (!roles.includes(u.role)) return res.status(403).json({ message: 'No autorizado' });
    next();
  };
}

// --- RUTAS ---
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'API de Reservas NUR funcionando 🚀' });
});
app.use("/api/auth", authRoutes);
app.use("/api/espacios", espacioRoutes);
app.use("/api/reservas", reservaRoutes);

// --- EXPORTAR APP ---
module.exports = app;
