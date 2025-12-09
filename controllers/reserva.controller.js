const db = require("../models");
const { Op } = require("sequelize");
const { checkRequiredFields, sendError500 } = require("../utils/request.utils");

// Crear una reserva
exports.create = async (req, res) => {
  try {
    const required = [
      "usuario_id",
      "espacio_id",
      "fecha_inicio",
      "fecha_fin",
      "tipo_evento",
      "asistentes",
    ];

    const missing = checkRequiredFields(required, req.body);
    if (missing.length)
      return res.status(400).json({ message: `Faltan: ${missing.join(", ")}` });

    const { usuario_id, espacio_id, fecha_inicio, fecha_fin, tipo_evento, asistentes } = req.body;

    const usuario = await db.usuarios.findByPk(usuario_id);
    if (!usuario) return res.status(400).json({ message: "Usuario no encontrado" });

    const espacio = await db.espacios.findByPk(espacio_id);
    if (!espacio) return res.status(400).json({ message: "Espacio no encontrado" });

    const tiposValidos = ["académico", "deportivo", "cultural", "administrativo"];
    if (!tiposValidos.includes(tipo_evento))
      return res.status(400).json({ message: "Tipo de evento no válido" });

    if (isNaN(asistentes) || asistentes <= 0)
      return res.status(400).json({ message: "Número de asistentes inválido" });

    if (new Date(fecha_inicio) >= new Date(fecha_fin))
      return res.status(400).json({ message: "La fecha de inicio debe ser antes de la fecha de fin" });

    const conflicto = await db.reservas.findOne({
      where: {
        espacio_id,
        is_active: true,
        estado: { [Op.ne]: "rechazada" },
        fecha_inicio: { [Op.lt]: fecha_fin },
        fecha_fin: { [Op.gt]: fecha_inicio },
      },
    });

    if (conflicto) return res.status(400).json({ message: "El espacio ya está reservado en ese horario." });

    let documentos = null;
    if (req.files && req.files.length > 0) documentos = req.files.map(f => f.filename);

    const reserva = await db.reservas.create({
      usuario_id,
      espacio_id,
      fecha_inicio,
      fecha_fin,
      tipo_evento,
      asistentes,
      documentos: documentos ? JSON.stringify(documentos) : null,
      estado: "pendiente",
      motivo_rechazo: null,
      is_active: true,
    });

    return res.status(201).json(reserva);
  } catch (err) {
    return sendError500(res, err);
  }
};

// Listar todas las reservas
exports.list = async (req, res) => {
  try {
    const where = { is_active: true };
    if (req.query.usuario_id) where.usuario_id = req.query.usuario_id;
    if (req.query.espacio_id) where.espacio_id = req.query.espacio_id;
    if (req.query.estado) where.estado = req.query.estado;

    const reservas = await db.reservas.findAll({ where });
    return res.json(reservas);
  } catch (err) {
    return sendError500(res, err);
  }
};

// Obtener reserva por ID
exports.getById = async (req, res) => {
  try {
    const reserva = await db.reservas.findByPk(req.params.id, {
      include: [
        {
          model: db.espacios,
          as: "espacio",
          attributes: ["id", "nombre", "tipo", "capacidad"],
        },
      ],
    });

    if (!reserva)
      return res.status(404).json({ message: "Reserva no encontrada" });

    return res.json(reserva);
  } catch (err) {
    return sendError500(res, err);
  }
};

// Actualizar reserva
exports.update = async (req, res) => {
  try {
    const reserva = await db.reservas.findByPk(req.params.id);
    if (!reserva)
      return res.status(404).json({ message: "Reserva no encontrada" });

    await reserva.update(req.body);
    return res.json(reserva);
  } catch (err) {
    return sendError500(res, err);
  }
};

// Aprobar reserva
exports.aprobar = async (req, res) => {
  try {
    const reserva = await db.reservas.findByPk(req.params.id);
    if (!reserva)
      return res.status(404).json({ message: "Reserva no encontrada" });

    await reserva.update({ estado: "aprobada", motivo_rechazo: null });
    return res.json({ message: "Reserva aprobada", reserva });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Rechazar reserva
exports.rechazar = async (req, res) => {
  try {
    const reserva = await db.reservas.findByPk(req.params.id);
    if (!reserva)
      return res.status(404).json({ message: "Reserva no encontrada" });

    if (!req.body.motivo_rechazo)
      return res.status(400).json({ message: "Debe indicar un motivo de rechazo." });

    await reserva.update({
      estado: "rechazada",
      motivo_rechazo: req.body.motivo_rechazo,
    });

    return res.json({ message: "Reserva rechazada", reserva });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Eliminar (desactivar) reserva
exports.delete = async (req, res) => {
  try {
    const reserva = await db.reservas.findByPk(req.params.id);
    if (!reserva)
      return res.status(404).json({ message: "Reserva no encontrada" });

    await reserva.update({ is_active: false });
    return res.json({ message: "Reserva desactivada" });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Cancelar reserva por usuario dueño
exports.cancelarPorUsuario = async (req, res) => {
  try {
    const reserva = await db.reservas.findByPk(req.params.id);
    if (!reserva) return res.status(404).json({ message: "Reserva no encontrada" });

    const user = res.locals.user;
    if (!user) return res.status(403).json({ message: "Usuario no autenticado" });

    if (Number(reserva.usuario_id) !== Number(user.id))
      return res.status(403).json({ message: "No autorizado para cancelar esta reserva" });

    if (reserva.estado !== "pendiente")
      return res.status(400).json({ message: "Solo reservas pendientes se pueden cancelar" });

    await reserva.update({ estado: "rechazada", motivo_rechazo: "Cancelada por el usuario" });

    return res.json({ message: "Reserva cancelada", reserva });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Listar reservas del usuario logueado
exports.listByUsuario = async (req, res) => {
  try {
    const userId = res.locals.user.id;

    const reservas = await db.reservas.findAll({
      where: {
        usuario_id: userId,
        is_active: true,
      },
      include: [
        {
          model: db.espacios,
          as: "espacio",
          attributes: ["id", "nombre", "tipo", "capacidad"],
        },
      ],
      order: [["fecha_inicio", "DESC"]],
    });

    return res.json(reservas);
  } catch (err) {
    return sendError500(res, err);
  }
};

// Listar disponibilidad de un espacio
exports.listDisponibilidad = async (req, res) => {
  try {
    const { espacio_id, fecha_inicio, fecha_fin } = req.query;

    if (!espacio_id || !fecha_inicio || !fecha_fin)
      return res.status(400).json({ message: "Faltan parámetros requeridos" });

    const espacio = await db.espacios.findByPk(espacio_id);
    if (!espacio) return res.status(404).json({ message: "Espacio no encontrado" });

    const reservas = await db.reservas.findAll({
      where: {
        espacio_id,
        is_active: true,
        estado: "aprobada",
        fecha_inicio: { [db.Sequelize.Op.lt]: new Date(fecha_fin) },
        fecha_fin: { [db.Sequelize.Op.gt]: new Date(fecha_inicio) },
      },
      order: [["fecha_inicio", "ASC"]],
      attributes: ["id", "fecha_inicio", "fecha_fin", "tipo_evento", "estado"],
    });

    return res.json({
      espacio: { id: espacio.id, nombre: espacio.nombre, capacidad: espacio.capacidad },
      reservas,
    });
  } catch (err) {
    return sendError500(res, err);
  }
};
