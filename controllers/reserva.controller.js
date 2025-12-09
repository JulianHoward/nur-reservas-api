const db = require("../models");
const { Op } = require("sequelize");
const { checkRequiredFields, sendError500 } = require("../utils/request.utils");
const ConfiguracionController = require("./configuracion.controller");
const notificaciones = require("../utils/notificacion.utils");

// Helper para registrar historial
const registrarHistorial = async (reserva_id, accion, usuario_id, detalles = null, observaciones = null) => {
  try {
    await db.historialReservas.create({
      reserva_id,
      accion,
      usuario_id,
      detalles: detalles ? JSON.stringify(detalles) : null,
      observaciones,
    });
  } catch (err) {
    console.error("Error al registrar historial:", err);
  }
};

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

    // Validaciones adicionales
    const fechaInicio = new Date(fecha_inicio);
    const fechaFin = new Date(fecha_fin);
    const ahora = new Date();

    // Validar anticipación mínima (días antes de la reserva)
    const diasAnticipacionMin = await ConfiguracionController.getValor("dias_anticipacion_minima", 2);
    const diasDiferencia = Math.floor((fechaInicio - ahora) / (1000 * 60 * 60 * 24));
    if (diasDiferencia < diasAnticipacionMin) {
      return res.status(400).json({
        message: `La reserva debe solicitarse con al menos ${diasAnticipacionMin} días de anticipación`,
      });
    }

    // Validar duración máxima (horas)
    const duracionMaxHoras = await ConfiguracionController.getValor("duracion_maxima_horas", 8);
    const duracionHoras = (fechaFin - fechaInicio) / (1000 * 60 * 60);
    if (duracionHoras > duracionMaxHoras) {
      return res.status(400).json({
        message: `La duración máxima permitida es de ${duracionMaxHoras} horas`,
      });
    }

    // Validar horarios del espacio
    if (espacio.hora_apertura && espacio.hora_cierre) {
      const horaInicio = fechaInicio.getHours() * 60 + fechaInicio.getMinutes();
      const horaFin = fechaFin.getHours() * 60 + fechaFin.getMinutes();
      const [aperturaH, aperturaM] = espacio.hora_apertura.split(":").map(Number);
      const [cierreH, cierreM] = espacio.hora_cierre.split(":").map(Number);
      const aperturaMin = aperturaH * 60 + aperturaM;
      const cierreMin = cierreH * 60 + cierreM;

      if (horaInicio < aperturaMin || horaFin > cierreMin) {
        return res.status(400).json({
          message: `El espacio solo está disponible entre ${espacio.hora_apertura} y ${espacio.hora_cierre}`,
        });
      }
    }

    // Validar que el espacio esté activo y disponible
    if (!espacio.is_active) {
      return res.status(400).json({ message: "El espacio no está activo" });
    }

    if (espacio.estado === "mantenimiento") {
      return res.status(400).json({ message: "El espacio está en mantenimiento" });
    }

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

    // Registrar historial
    await registrarHistorial(reserva.id, "creada", usuario_id, {
      espacio_id,
      fecha_inicio,
      fecha_fin,
      tipo_evento,
      asistentes,
    });

    // Notificar al usuario
    await notificaciones.notificarSolicitudRecibida(usuario_id, reserva.id, espacio.nombre);

    // Notificar a administradores
    await notificaciones.notificarNuevaSolicitudAdmin(
      reserva.id,
      espacio.nombre,
      `${usuario.nombre} ${usuario.apellido}`
    );

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
    const reserva = await db.reservas.findByPk(req.params.id, {
      include: [{ model: db.espacios, as: "espacio", attributes: ["nombre"] }],
    });
    if (!reserva) return res.status(404).json({ message: "Reserva no encontrada" });

    const adminId = res.locals.user.id;

    await reserva.update({
      estado: "aprobada",
      motivo_rechazo: null,
      aprobado_por: adminId,
      fecha_aprobacion: new Date(),
    });

    // Registrar historial
    await registrarHistorial(reserva.id, "aprobada", adminId, {
      estado_anterior: reserva.estado,
      estado_nuevo: "aprobada",
    });

    // Notificar al usuario
    await notificaciones.notificarSolicitudAprobada(
      reserva.usuario_id,
      reserva.id,
      reserva.espacio?.nombre || "Espacio",
      reserva.fecha_inicio
    );

    return res.json({ message: "Reserva aprobada", reserva });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Rechazar reserva
exports.rechazar = async (req, res) => {
  try {
    const reserva = await db.reservas.findByPk(req.params.id, {
      include: [{ model: db.espacios, as: "espacio", attributes: ["nombre"] }],
    });
    if (!reserva) return res.status(404).json({ message: "Reserva no encontrada" });

    if (!req.body.motivo_rechazo)
      return res.status(400).json({ message: "Debe indicar un motivo de rechazo." });

    const adminId = res.locals.user.id;

    await reserva.update({
      estado: "rechazada",
      motivo_rechazo: req.body.motivo_rechazo,
      rechazado_por: adminId,
      fecha_rechazo: new Date(),
    });

    // Registrar historial
    await registrarHistorial(reserva.id, "rechazada", adminId, {
      estado_anterior: reserva.estado,
      estado_nuevo: "rechazada",
      motivo: req.body.motivo_rechazo,
    });

    // Notificar al usuario
    await notificaciones.notificarSolicitudRechazada(
      reserva.usuario_id,
      reserva.id,
      reserva.espacio?.nombre || "Espacio",
      req.body.motivo_rechazo
    );

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

    await reserva.update({
      estado: "rechazada",
      motivo_rechazo: "Cancelada por el usuario",
      cancelado_por: user.id,
      fecha_cancelacion: new Date(),
    });

    // Registrar historial
    await registrarHistorial(reserva.id, "cancelada", user.id, {
      estado_anterior: reserva.estado,
      estado_nuevo: "rechazada",
      motivo: "Cancelada por el usuario",
    });

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
