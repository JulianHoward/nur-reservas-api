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
const port = process.env.PORT || 3000;

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
    credentials: true,  // ✅ necesario para cookies
  })
);

// --- BODY PARSER ---
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// --- MANEJO DE ERRORES DE JSON ---
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error(err);
    return res.status(400).send({ message: 'Invalid data' });
  }
  next();
});

// --- BASE DE DATOS ---
// 🔧 Usar SOLO cuando agregues campos nuevos o cambies modelos
// db.sequelize
//   .sync({ alter: true })   // <--- Modifica las tablas según los modelos
//   .then(() => {
//     console.log('🔄 Tablas actualizadas (alter:true)');
//   })
//   .catch((err) => {
//     console.error('❌ Error en alter:', err);
//   });

// ▶ Modo normal (sin modificar tablas)
db.sequelize
  .sync()   // <--- Más seguro y estable
  .then(() => {
    console.log('✅ Base de datos sincronizada (sin cambios estructurales)');
  })
  .catch((err) => {
    console.error('❌ Error al conectar con la base de datos:', err);
  });

// --- RUTAS ---
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'API de Reservas NUR funcionando 🚀' });
});

// rutas de autenticación (login, register, me, logout)
app.use('/auth', authRoutes);

// rutas de espacios
app.use("/espacios", espacioRoutes);

// rutas de reservas
app.use("/reservas", reservaRoutes);

// --- INICIO DEL SERVIDOR ---
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
