const db = require("../models");
const { Op } = require("sequelize");
const { sendError500 } = require("../utils/request.utils");

// Calendario mensual
exports.mensual = async (req, res) => {
  try {
    const { mes, anio, espacio_id } = req.query;

    if (!mes || !anio) {
      return res.status(400).json({ message: "Faltan parámetros: mes y anio son requeridos" });
    }

    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0, 23, 59, 59);

    const where = {
      is_active: true,
      estado: { [Op.in]: ["aprobada", "pendiente"] },
      fecha_inicio: { [Op.gte]: fechaInicio },
      fecha_fin: { [Op.lte]: fechaFin },
    };

    if (espacio_id) where.espacio_id = espacio_id;

    const reservas = await db.reservas.findAll({
      where,
      include: [
        {
          model: db.espacios,
          as: "espacio",
          attributes: ["id", "nombre", "ubicacion", "capacidad"],
        },
        {
          model: db.usuarios,
          as: "usuario",
          attributes: ["id", "nombre", "apellido"],
        },
      ],
      order: [["fecha_inicio", "ASC"]],
    });

    // Agrupar por día
    const eventosPorDia = {};
    reservas.forEach((reserva) => {
      const fecha = new Date(reserva.fecha_inicio);
      const dia = fecha.getDate();
      if (!eventosPorDia[dia]) {
        eventosPorDia[dia] = [];
      }
      eventosPorDia[dia].push({
        id: reserva.id,
        titulo: reserva.espacio?.nombre || "Espacio",
        fecha_inicio: reserva.fecha_inicio,
        fecha_fin: reserva.fecha_fin,
        tipo_evento: reserva.tipo_evento,
        estado: reserva.estado,
        espacio: reserva.espacio,
        usuario: reserva.usuario,
      });
    });

    return res.json({
      mes: parseInt(mes),
      anio: parseInt(anio),
      eventosPorDia,
    });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Calendario semanal
exports.semanal = async (req, res) => {
  try {
    const { fecha_inicio } = req.query;

    if (!fecha_inicio) {
      return res.status(400).json({ message: "Parámetro fecha_inicio es requerido" });
    }

    const fechaInicio = new Date(fecha_inicio);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + 6);
    fechaFin.setHours(23, 59, 59);

    const where = {
      is_active: true,
      estado: { [Op.in]: ["aprobada", "pendiente"] },
      fecha_inicio: { [Op.gte]: fechaInicio },
      fecha_fin: { [Op.lte]: fechaFin },
    };

    const reservas = await db.reservas.findAll({
      where,
      include: [
        {
          model: db.espacios,
          as: "espacio",
          attributes: ["id", "nombre", "ubicacion", "capacidad"],
        },
        {
          model: db.usuarios,
          as: "usuario",
          attributes: ["id", "nombre", "apellido"],
        },
      ],
      order: [["fecha_inicio", "ASC"]],
    });

    // Agrupar por día de la semana
    const eventosPorDia = {};
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + i);
      const diaSemana = fecha.toISOString().split("T")[0];
      eventosPorDia[diaSemana] = [];
    }

    reservas.forEach((reserva) => {
      const fecha = new Date(reserva.fecha_inicio);
      const diaSemana = fecha.toISOString().split("T")[0];
      if (eventosPorDia[diaSemana]) {
        eventosPorDia[diaSemana].push({
          id: reserva.id,
          titulo: reserva.espacio?.nombre || "Espacio",
          fecha_inicio: reserva.fecha_inicio,
          fecha_fin: reserva.fecha_fin,
          tipo_evento: reserva.tipo_evento,
          estado: reserva.estado,
          espacio: reserva.espacio,
          usuario: reserva.usuario,
        });
      }
    });

    return res.json({
      fecha_inicio: fechaInicio.toISOString(),
      fecha_fin: fechaFin.toISOString(),
      eventosPorDia,
    });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Calendario diario
exports.diario = async (req, res) => {
  try {
    const { fecha, espacio_id } = req.query;

    if (!fecha) {
      return res.status(400).json({ message: "Parámetro fecha es requerido" });
    }

    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const where = {
      is_active: true,
      estado: { [Op.in]: ["aprobada", "pendiente"] },
      fecha_inicio: { [Op.gte]: fechaInicio },
      fecha_fin: { [Op.lte]: fechaFin },
    };

    if (espacio_id) where.espacio_id = espacio_id;

    const reservas = await db.reservas.findAll({
      where,
      include: [
        {
          model: db.espacios,
          as: "espacio",
          attributes: ["id", "nombre", "ubicacion", "capacidad"],
        },
        {
          model: db.usuarios,
          as: "usuario",
          attributes: ["id", "nombre", "apellido", "correo"],
        },
      ],
      order: [["fecha_inicio", "ASC"]],
    });

    return res.json({
      fecha: fechaInicio.toISOString(),
      eventos: reservas.map((reserva) => ({
        id: reserva.id,
        titulo: reserva.espacio?.nombre || "Espacio",
        fecha_inicio: reserva.fecha_inicio,
        fecha_fin: reserva.fecha_fin,
        tipo_evento: reserva.tipo_evento,
        estado: reserva.estado,
        asistentes: reserva.asistentes,
        espacio: reserva.espacio,
        usuario: reserva.usuario,
      })),
    });
  } catch (err) {
    return sendError500(res, err);
  }
};

