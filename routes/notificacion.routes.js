const express = require("express");
const router = express.Router();
const NotificacionController = require("../controllers/notificacion.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

// Todas las rutas requieren autenticación
router.use(requireAuth);

router.get("/", NotificacionController.list);
router.get("/no-leidas", NotificacionController.contarNoLeidas);
router.put("/:id/leida", NotificacionController.marcarLeida);
router.put("/marcar-todas-leidas", NotificacionController.marcarTodasLeidas);
router.delete("/:id", NotificacionController.delete);

module.exports = router;

