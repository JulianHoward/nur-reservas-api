const express = require("express");
const router = express.Router();
const ConfiguracionController = require("../controllers/configuracion.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

// Todas las rutas requieren autenticación y rol admin
router.use(requireAuth);
router.use(requireRole("admin"));

router.get("/", ConfiguracionController.list);
router.get("/:clave", ConfiguracionController.getByClave);
router.post("/", ConfiguracionController.createOrUpdate);
router.put("/:clave", ConfiguracionController.createOrUpdate);

module.exports = router;

