const db = require("../models");
const { checkRequiredFields, sendError500 } = require("../utils/request.utils");

// Crear un espacio
exports.create = async (req, res) => {
  const required = ["nombre", "ubicacion", "capacidad"];
  const missing = checkRequiredFields(required, req.body);
  if (missing.length) return res.status(400).json({ message: `Faltan: ${missing.join(", ")}` });

  try {
    const espacio = await db.espacios.create(req.body);
    return res.status(201).json(espacio);
  } catch (err) {
    return sendError500(res, err);
  }
};

// Listar todos los espacios activos
exports.list = async (req, res) => {
  try {
    const espacios = await db.espacios.findAll({ where: { is_active: true } });
    return res.json(espacios);
  } catch (err) {
    return sendError500(res, err);
  }
};

// Obtener un espacio por ID
exports.getById = async (req, res) => {
  try {
    const espacio = await db.espacios.findByPk(req.params.id);
    if (!espacio) return res.status(404).json({ message: "Espacio no encontrado" });
    return res.json(espacio);
  } catch (err) {
    return sendError500(res, err);
  }
};

// Actualizar un espacio
exports.update = async (req, res) => {
  try {
    const espacio = await db.espacios.findByPk(req.params.id);
    if (!espacio) return res.status(404).json({ message: "Espacio no encontrado" });

    await espacio.update(req.body);
    return res.json(espacio);
  } catch (err) {
    return sendError500(res, err);
  }
};

// Eliminar (desactivar) un espacio
exports.delete = async (req, res) => {
  try {
    const espacio = await db.espacios.findByPk(req.params.id);
    if (!espacio) return res.status(404).json({ message: "Espacio no encontrado" });

    // Solo desactivamos
    await espacio.update({ is_active: false });
    return res.json({ message: "Espacio desactivado" });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Listar espacios activos (para usuarios normales)
exports.listVisibles = async (req, res) => {
  try {
    const espacios = await db.espacios.findAll({ where: { is_active: true } });
    return res.json(espacios);
  } catch (err) {
    return sendError500(res, err);
  }
};
