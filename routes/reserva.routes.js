// routes/reserva.routes.js
const express = require("express");
const router = express.Router();
const ReservaController = require("../controllers/reserva.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const { uploadDocs } = require("../middlewares/upload");

// Todas las rutas requieren login
router.use(requireAuth);

// Crear reserva (usuarios) con archivos
router.post("/", uploadDocs, ReservaController.create);

// Listar todas las reservas (solo admins y encargados)
router.get("/", requireRole("admin", "encargado"), ReservaController.list);

// Mis reservas (usuario normal)
router.get("/mis-reservas", ReservaController.listByUsuario);

// Obtener una reserva por ID
router.get("/:id", ReservaController.getById);

// Actualizar reserva (solo admin/encargado)
router.put("/:id", requireRole("admin", "encargado"), ReservaController.update);

// Aprobar reserva (solo admin/encargado)
router.put("/:id/aprobar", requireRole("admin", "encargado"), ReservaController.aprobar);

// Rechazar reserva (solo admin/encargado)
router.put("/:id/rechazar", requireRole("admin", "encargado"), ReservaController.rechazar);

// Eliminar (desactivar) reserva (solo admin/encargado)
router.delete("/:id", requireRole("admin", "encargado"), ReservaController.delete);

// Cancelar reserva por usuario dueño
router.put("/:id/cancelar", ReservaController.cancelarPorUsuario);

// Listar disponibilidad de espacios
router.get("/disponibilidad", ReservaController.listDisponibilidad);


module.exports = router;
