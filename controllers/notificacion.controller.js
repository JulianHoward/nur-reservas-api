const db = require("../models");
const { sendError500 } = require("../utils/request.utils");

// Crear una notificación
exports.create = async (usuario_id, tipo, titulo, mensaje, reserva_id = null) => {
  try {
    const notificacion = await db.notificaciones.create({
      usuario_id,
      tipo,
      titulo,
      mensaje,
      reserva_id,
    });
    return notificacion;
  } catch (err) {
    console.error("Error al crear notificación:", err);
    return null;
  }
};

// Listar notificaciones del usuario autenticado
exports.list = async (req, res) => {
  try {
    const userId = res.locals.user.id;
    const { leida, limit = 50 } = req.query;

    const where = { usuario_id: userId };
    if (leida !== undefined) {
      where.leida = leida === "true";
    }

    const notificaciones = await db.notificaciones.findAll({
      where,
      include: [
        {
          model: db.reservas,
          as: "reserva",
          attributes: ["id", "fecha_inicio", "fecha_fin", "estado"],
          include: [
            {
              model: db.espacios,
              as: "espacio",
              attributes: ["id", "nombre"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    return res.json(notificaciones);
  } catch (err) {
    return sendError500(res, err);
  }
};

// Marcar notificación como leída
exports.marcarLeida = async (req, res) => {
  try {
    const userId = res.locals.user.id;
    const { id } = req.params;

    const notificacion = await db.notificaciones.findOne({
      where: { id, usuario_id: userId },
    });

    if (!notificacion) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    await notificacion.update({
      leida: true,
      fecha_leida: new Date(),
    });

    return res.json({ message: "Notificación marcada como leída", notificacion });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Marcar todas las notificaciones como leídas
exports.marcarTodasLeidas = async (req, res) => {
  try {
    const userId = res.locals.user.id;

    await db.notificaciones.update(
      {
        leida: true,
        fecha_leida: new Date(),
      },
      {
        where: { usuario_id: userId, leida: false },
      }
    );

    return res.json({ message: "Todas las notificaciones fueron marcadas como leídas" });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Contar notificaciones no leídas
exports.contarNoLeidas = async (req, res) => {
  try {
    const userId = res.locals.user.id;

    const count = await db.notificaciones.count({
      where: { usuario_id: userId, leida: false },
    });

    return res.json({ count });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Eliminar notificación
exports.delete = async (req, res) => {
  try {
    const userId = res.locals.user.id;
    const { id } = req.params;

    const notificacion = await db.notificaciones.findOne({
      where: { id, usuario_id: userId },
    });

    if (!notificacion) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    await notificacion.destroy();

    return res.json({ message: "Notificación eliminada" });
  } catch (err) {
    return sendError500(res, err);
  }
};

