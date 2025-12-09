require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const bodyParser = require("body-parser");

const db = require("./models");
const authRoutes = require("./routes/auth.routes");
const espacioRoutes = require("./routes/espacio.routes");
const reservaRoutes = require("./routes/reserva.routes");
const notificacionRoutes = require("./routes/notificacion.routes");
const reporteRoutes = require("./routes/reporte.routes");
const calendarioRoutes = require("./routes/calendario.routes");
const configuracionRoutes = require("./routes/configuracion.routes");

const app = express();

// --- SESIONES ---
app.set("trust proxy", 1);
app.use(
  session({
    secret: "howard",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// --- CORS ---
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// --- BODY PARSER ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- MANEJO DE ERRORES DE JSON ---
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error(err);
    return res.status(400).send({ message: "Invalid data" });
  }
  next();
});

// --- MOCK DE AUTENTICACIÓN GLOBAL PARA TESTS ---
if (process.env.NODE_ENV === "test") {
  app.use((req, res, next) => {
    let token = req.headers.authorization || "";
    if (token.startsWith("Bearer ")) token = token.slice(7);

    // Guardar el token en res.locals para el logout
    res.locals.token = token;

    const match = token.match(/token-usuario-(\d+)/);
    if (match) {
      res.locals.user = { id: Number(match[1]), role: "usuario" };
    } else if (token.includes("admin")) {
      res.locals.user = { id: 0, role: "admin" };
    }

    next();
  });
}

// --- RUTAS ---
app.get("/", (req, res) => {
  res.json({ ok: true, message: "API de Reservas NUR funcionando 🚀" });
});
app.use("/api/auth", authRoutes);
app.use("/api/espacios", espacioRoutes);
app.use("/api/reservas", reservaRoutes);
app.use("/api/notificaciones", notificacionRoutes);
app.use("/api/reportes", reporteRoutes);
app.use("/api/calendario", calendarioRoutes);
app.use("/api/configuracion", configuracionRoutes);

// --- EXPORTAR APP ---
module.exports = app;
