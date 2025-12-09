const express = require("express");
const router = express.Router();
const EspacioController = require("../controllers/espacio.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

router.get("/visibles", requireAuth, EspacioController.listVisibles);

// Todas las rutas requieren token y rol admin o encargado
router.use(requireAuth);
router.use(requireRole("admin", "encargado"));

router.post("/", EspacioController.create);
router.get("/", EspacioController.list);
router.get("/:id", EspacioController.getById);
router.put("/:id", EspacioController.update);
router.delete("/:id", EspacioController.delete);


module.exports = router;
