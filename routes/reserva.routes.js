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

// Listar disponibilidad de espacios
// NOTE: esta ruta usa query params, debe estar antes de rutas con :id
router.get("/disponibilidad", ReservaController.listDisponibilidad);

/*
  IMPORTANT: colocar rutas que contienen texto después de :id ANTES
  que la ruta dinámica GET /:id. Así Express no confundirá /:id/cancelar
  con /:id.
*/

// Cancelar reserva por usuario dueño (PRIMERO entre las rutas con :id)
router.put("/:id/cancelar", ReservaController.cancelarPorUsuario);

// Aprobar reserva (solo admin/encargado)
router.put("/:id/aprobar", requireRole("admin", "encargado"), ReservaController.aprobar);

// Rechazar reserva (solo admin/encargado)
router.put("/:id/rechazar", requireRole("admin", "encargado"), ReservaController.rechazar);

// Eliminar (desactivar) reserva (solo admin/encargado)
router.delete("/:id", requireRole("admin", "encargado"), ReservaController.delete);

// Actualizar reserva (solo admin/encargado)
router.put("/:id", requireRole("admin", "encargado"), ReservaController.update);

// Obtener una reserva por ID (ÚLTIMO)
router.get("/:id", ReservaController.getById);

module.exports = router;
