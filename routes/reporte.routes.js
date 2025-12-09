const express = require("express");
const router = express.Router();
const ReporteController = require("../controllers/reporte.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

// Todas las rutas requieren autenticación y rol admin/encargado
router.use(requireAuth);
router.use(requireRole("admin", "encargado"));

router.get("/reservas", ReporteController.reservas);
router.get("/espacios-mas-usados", ReporteController.espaciosMasUsados);
router.get("/cancelados-rechazados", ReporteController.canceladosRechazados);
router.get("/por-area-solicitante", ReporteController.porAreaSolicitante);

// Exportaciones
router.get("/reservas/exportar-pdf", ReporteController.exportarReservasPDF);
router.get("/reservas/exportar-excel", ReporteController.exportarReservasExcel);
router.get("/espacios-mas-usados/exportar-excel", ReporteController.exportarEspaciosMasUsadosExcel);
router.get("/cancelados-rechazados/exportar-excel", ReporteController.exportarCanceladosRechazadosExcel);

module.exports = router;

