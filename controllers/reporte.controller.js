const db = require("../models");
const { Op } = require("sequelize");
const { sendError500 } = require("../utils/request.utils");

// Reporte general de reservas
exports.reservas = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, espacio_id, tipo_evento, estado } = req.query;

    const where = { is_active: true };

    if (fecha_inicio && fecha_fin) {
      where.fecha_inicio = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)],
      };
    }

    if (espacio_id) where.espacio_id = espacio_id;
    if (tipo_evento) where.tipo_evento = tipo_evento;
    if (estado) where.estado = estado;

    const reservas = await db.reservas.findAll({
      where,
      include: [
        {
          model: db.usuarios,
          as: "usuario",
          attributes: ["id", "nombre", "apellido", "correo", "user_type"],
        },
        {
          model: db.espacios,
          as: "espacio",
          attributes: ["id", "nombre", "ubicacion", "capacidad"],
        },
        {
          model: db.usuarios,
          as: "aprobador",
          attributes: ["id", "nombre", "apellido"],
          required: false,
        },
        {
          model: db.usuarios,
          as: "rechazador",
          attributes: ["id", "nombre", "apellido"],
          required: false,
        },
      ],
      order: [["fecha_inicio", "ASC"]],
    });

    // Estadísticas
    const estadisticas = {
      total: reservas.length,
      aprobadas: reservas.filter((r) => r.estado === "aprobada").length,
      pendientes: reservas.filter((r) => r.estado === "pendiente").length,
      rechazadas: reservas.filter((r) => r.estado === "rechazada").length,
      por_tipo_evento: {},
      por_espacio: {},
    };

    reservas.forEach((reserva) => {
      // Por tipo de evento
      if (!estadisticas.por_tipo_evento[reserva.tipo_evento]) {
        estadisticas.por_tipo_evento[reserva.tipo_evento] = 0;
      }
      estadisticas.por_tipo_evento[reserva.tipo_evento]++;

      // Por espacio
      const espacioNombre = reserva.espacio?.nombre || "Desconocido";
      if (!estadisticas.por_espacio[espacioNombre]) {
        estadisticas.por_espacio[espacioNombre] = 0;
      }
      estadisticas.por_espacio[espacioNombre]++;
    });

    return res.json({
      reservas,
      estadisticas,
    });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Espacios más utilizados
exports.espaciosMasUsados = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, limite = 10 } = req.query;

    const where = {
      is_active: true,
      estado: "aprobada",
    };

    if (fecha_inicio && fecha_fin) {
      where.fecha_inicio = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)],
      };
    }

    const reservas = await db.reservas.findAll({
      where,
      include: [
        {
          model: db.espacios,
          as: "espacio",
          attributes: ["id", "nombre", "ubicacion", "capacidad"],
        },
      ],
    });

    // Agrupar por espacio
    const espaciosMap = {};
    reservas.forEach((reserva) => {
      const espacioId = reserva.espacio_id;
      if (!espaciosMap[espacioId]) {
        espaciosMap[espacioId] = {
          espacio: reserva.espacio,
          total_reservas: 0,
          total_horas: 0,
          total_asistentes: 0,
        };
      }
      espaciosMap[espacioId].total_reservas++;
      const horas = (new Date(reserva.fecha_fin) - new Date(reserva.fecha_inicio)) / (1000 * 60 * 60);
      espaciosMap[espacioId].total_horas += horas;
      espaciosMap[espacioId].total_asistentes += reserva.asistentes || 0;
    });

    // Convertir a array y ordenar por total de reservas
    const espaciosArray = Object.values(espaciosMap)
      .sort((a, b) => b.total_reservas - a.total_reservas)
      .slice(0, parseInt(limite));

    return res.json(espaciosArray);
  } catch (err) {
    return sendError500(res, err);
  }
};

// Reporte de cancelados/rechazados
exports.canceladosRechazados = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    const where = {
      is_active: true,
      estado: { [Op.in]: ["rechazada"] },
    };

    if (fecha_inicio && fecha_fin) {
      where[Op.or] = [
        { fecha_rechazo: { [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)] } },
        { fecha_cancelacion: { [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)] } },
      ];
    }

    const reservas = await db.reservas.findAll({
      where,
      include: [
        {
          model: db.usuarios,
          as: "usuario",
          attributes: ["id", "nombre", "apellido", "correo"],
        },
        {
          model: db.espacios,
          as: "espacio",
          attributes: ["id", "nombre", "ubicacion"],
        },
        {
          model: db.usuarios,
          as: "rechazador",
          attributes: ["id", "nombre", "apellido"],
          required: false,
        },
        {
          model: db.usuarios,
          as: "cancelador",
          attributes: ["id", "nombre", "apellido"],
          required: false,
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    const estadisticas = {
      total_rechazadas: reservas.filter((r) => r.estado === "rechazada" && r.rechazado_por).length,
      total_canceladas: reservas.filter((r) => r.cancelado_por).length,
      por_motivo: {},
    };

    reservas.forEach((reserva) => {
      if (reserva.motivo_rechazo) {
        if (!estadisticas.por_motivo[reserva.motivo_rechazo]) {
          estadisticas.por_motivo[reserva.motivo_rechazo] = 0;
        }
        estadisticas.por_motivo[reserva.motivo_rechazo]++;
      }
    });

    return res.json({
      reservas,
      estadisticas,
    });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Reporte de uso por área solicitante
exports.porAreaSolicitante = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    const where = {
      is_active: true,
      estado: "aprobada",
    };

    if (fecha_inicio && fecha_fin) {
      where.fecha_inicio = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)],
      };
    }

    const reservas = await db.reservas.findAll({
      where,
      include: [
        {
          model: db.usuarios,
          as: "usuario",
          attributes: ["id", "nombre", "apellido", "user_type"],
        },
      ],
    });

    const porArea = {};
    reservas.forEach((reserva) => {
      const area = reserva.usuario?.user_type || "sin_tipo";
      if (!porArea[area]) {
        porArea[area] = {
          area: area,
          total_reservas: 0,
          total_asistentes: 0,
        };
      }
      porArea[area].total_reservas++;
      porArea[area].total_asistentes += reserva.asistentes || 0;
    });

    return res.json(Object.values(porArea));
  } catch (err) {
    return sendError500(res, err);
  }
};

