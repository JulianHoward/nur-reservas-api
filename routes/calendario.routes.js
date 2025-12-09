const express = require("express");
const router = express.Router();
const CalendarioController = require("../controllers/calendario.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

// Todas las rutas requieren autenticación
router.use(requireAuth);

router.get("/mensual", CalendarioController.mensual);
router.get("/semanal", CalendarioController.semanal);
router.get("/diario", CalendarioController.diario);

module.exports = router;

