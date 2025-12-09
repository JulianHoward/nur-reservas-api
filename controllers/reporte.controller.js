const db = require("../models");
const { Op } = require("sequelize");
const { sendError500 } = require("../utils/request.utils");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

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

// Exportar reporte de reservas a PDF
exports.exportarReservasPDF = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, espacio_id, tipo_evento, estado } = req.query;

    const where = { is_active: true };
    if (fecha_inicio && fecha_fin) {
      where.fecha_inicio = { [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)] };
    }
    if (espacio_id) where.espacio_id = espacio_id;
    if (tipo_evento) where.tipo_evento = tipo_evento;
    if (estado) where.estado = estado;

    const reservas = await db.reservas.findAll({
      where,
      include: [
        { model: db.usuarios, as: "usuario", attributes: ["nombre", "apellido", "correo", "user_type"] },
        { model: db.espacios, as: "espacio", attributes: ["nombre", "ubicacion", "capacidad"] },
        { model: db.usuarios, as: "aprobador", attributes: ["nombre", "apellido"], required: false },
        { model: db.usuarios, as: "rechazador", attributes: ["nombre", "apellido"], required: false },
      ],
      order: [["fecha_inicio", "ASC"]],
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=reporte-reservas-${Date.now()}.pdf`);
    doc.pipe(res);

    // Encabezado
    doc.fontSize(20).text("Reporte de Reservas - Universidad NUR", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Fecha de generación: ${new Date().toLocaleString("es-BO")}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Total de reservas: ${reservas.length}`, { align: "center" });
    doc.moveDown(2);

    // Tabla de reservas
    let y = doc.y;
    const pageWidth = doc.page.width - 100;
    const colWidth = pageWidth / 6;

    // Encabezados de tabla
    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("ID", 50, y, { width: colWidth });
    doc.text("Espacio", 50 + colWidth, y, { width: colWidth });
    doc.text("Solicitante", 50 + colWidth * 2, y, { width: colWidth });
    doc.text("Fecha Inicio", 50 + colWidth * 3, y, { width: colWidth });
    doc.text("Fecha Fin", 50 + colWidth * 4, y, { width: colWidth });
    doc.text("Estado", 50 + colWidth * 5, y, { width: colWidth });

    y += 20;
    doc.moveTo(50, y).lineTo(50 + pageWidth, y).stroke();
    y += 10;

    // Datos
    doc.font("Helvetica").fontSize(8);
    reservas.forEach((reserva) => {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }

      const fechaInicio = new Date(reserva.fecha_inicio).toLocaleString("es-BO");
      const fechaFin = new Date(reserva.fecha_fin).toLocaleString("es-BO");
      const solicitante = `${reserva.usuario?.nombre || ""} ${reserva.usuario?.apellido || ""}`.trim();

      doc.text(String(reserva.id), 50, y, { width: colWidth });
      doc.text(reserva.espacio?.nombre || "N/A", 50 + colWidth, y, { width: colWidth });
      doc.text(solicitante, 50 + colWidth * 2, y, { width: colWidth });
      doc.text(fechaInicio, 50 + colWidth * 3, y, { width: colWidth });
      doc.text(fechaFin, 50 + colWidth * 4, y, { width: colWidth });
      doc.text(reserva.estado, 50 + colWidth * 5, y, { width: colWidth });

      y += 15;
    });

    doc.end();
  } catch (err) {
    return sendError500(res, err);
  }
};

// Exportar reporte de reservas a Excel
exports.exportarReservasExcel = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, espacio_id, tipo_evento, estado } = req.query;

    const where = { is_active: true };
    if (fecha_inicio && fecha_fin) {
      where.fecha_inicio = { [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)] };
    }
    if (espacio_id) where.espacio_id = espacio_id;
    if (tipo_evento) where.tipo_evento = tipo_evento;
    if (estado) where.estado = estado;

    const reservas = await db.reservas.findAll({
      where,
      include: [
        { model: db.usuarios, as: "usuario", attributes: ["nombre", "apellido", "correo", "user_type"] },
        { model: db.espacios, as: "espacio", attributes: ["nombre", "ubicacion", "capacidad"] },
        { model: db.usuarios, as: "aprobador", attributes: ["nombre", "apellido"], required: false },
        { model: db.usuarios, as: "rechazador", attributes: ["nombre", "apellido"], required: false },
      ],
      order: [["fecha_inicio", "ASC"]],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reservas");

    // Encabezados
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Espacio", key: "espacio", width: 25 },
      { header: "Ubicación", key: "ubicacion", width: 20 },
      { header: "Solicitante", key: "solicitante", width: 30 },
      { header: "Correo", key: "correo", width: 30 },
      { header: "Tipo Evento", key: "tipo_evento", width: 15 },
      { header: "Asistentes", key: "asistentes", width: 12 },
      { header: "Fecha Inicio", key: "fecha_inicio", width: 20 },
      { header: "Fecha Fin", key: "fecha_fin", width: 20 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Aprobado Por", key: "aprobado_por", width: 25 },
      { header: "Rechazado Por", key: "rechazado_por", width: 25 },
      { header: "Motivo Rechazo", key: "motivo_rechazo", width: 30 },
    ];

    // Estilo de encabezados
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // Datos
    reservas.forEach((reserva) => {
      worksheet.addRow({
        id: reserva.id,
        espacio: reserva.espacio?.nombre || "N/A",
        ubicacion: reserva.espacio?.ubicacion || "N/A",
        solicitante: `${reserva.usuario?.nombre || ""} ${reserva.usuario?.apellido || ""}`.trim(),
        correo: reserva.usuario?.correo || "N/A",
        tipo_evento: reserva.tipo_evento,
        asistentes: reserva.asistentes,
        fecha_inicio: new Date(reserva.fecha_inicio).toLocaleString("es-BO"),
        fecha_fin: new Date(reserva.fecha_fin).toLocaleString("es-BO"),
        estado: reserva.estado,
        aprobado_por: reserva.aprobador ? `${reserva.aprobador.nombre} ${reserva.aprobador.apellido}` : "",
        rechazado_por: reserva.rechazador ? `${reserva.rechazador.nombre} ${reserva.rechazador.apellido}` : "",
        motivo_rechazo: reserva.motivo_rechazo || "",
      });
    });

    // Autoajustar columnas
    worksheet.columns.forEach((column) => {
      column.width = column.width || 15;
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=reporte-reservas-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    return sendError500(res, err);
  }
};

// Exportar espacios más usados a Excel
exports.exportarEspaciosMasUsadosExcel = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, limite = 10 } = req.query;

    const where = { is_active: true, estado: "aprobada" };
    if (fecha_inicio && fecha_fin) {
      where.fecha_inicio = { [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)] };
    }

    const reservas = await db.reservas.findAll({
      where,
      include: [{ model: db.espacios, as: "espacio", attributes: ["nombre", "ubicacion", "capacidad"] }],
    });

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

    const espaciosArray = Object.values(espaciosMap)
      .sort((a, b) => b.total_reservas - a.total_reservas)
      .slice(0, parseInt(limite));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Espacios Más Usados");

    worksheet.columns = [
      { header: "Espacio", key: "espacio", width: 30 },
      { header: "Ubicación", key: "ubicacion", width: 25 },
      { header: "Capacidad", key: "capacidad", width: 12 },
      { header: "Total Reservas", key: "total_reservas", width: 15 },
      { header: "Total Horas", key: "total_horas", width: 15 },
      { header: "Total Asistentes", key: "total_asistentes", width: 18 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    espaciosArray.forEach((item) => {
      worksheet.addRow({
        espacio: item.espacio?.nombre || "N/A",
        ubicacion: item.espacio?.ubicacion || "N/A",
        capacidad: item.espacio?.capacidad || 0,
        total_reservas: item.total_reservas,
        total_horas: Math.round(item.total_horas * 100) / 100,
        total_asistentes: item.total_asistentes,
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=espacios-mas-usados-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    return sendError500(res, err);
  }
};

// Exportar cancelados/rechazados a Excel
exports.exportarCanceladosRechazadosExcel = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    const where = { is_active: true, estado: { [Op.in]: ["rechazada"] } };
    if (fecha_inicio && fecha_fin) {
      where[Op.or] = [
        { fecha_rechazo: { [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)] } },
        { fecha_cancelacion: { [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)] } },
      ];
    }

    const reservas = await db.reservas.findAll({
      where,
      include: [
        { model: db.usuarios, as: "usuario", attributes: ["nombre", "apellido", "correo"] },
        { model: db.espacios, as: "espacio", attributes: ["nombre", "ubicacion"] },
        { model: db.usuarios, as: "rechazador", attributes: ["nombre", "apellido"], required: false },
        { model: db.usuarios, as: "cancelador", attributes: ["nombre", "apellido"], required: false },
      ],
      order: [["updatedAt", "DESC"]],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Cancelados y Rechazados");

    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Espacio", key: "espacio", width: 25 },
      { header: "Solicitante", key: "solicitante", width: 30 },
      { header: "Correo", key: "correo", width: 30 },
      { header: "Fecha Inicio", key: "fecha_inicio", width: 20 },
      { header: "Fecha Fin", key: "fecha_fin", width: 20 },
      { header: "Estado", key: "estado", width: 15 },
      { header: "Motivo", key: "motivo", width: 40 },
      { header: "Rechazado Por", key: "rechazado_por", width: 25 },
      { header: "Cancelado Por", key: "cancelado_por", width: 25 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDC3545" },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    reservas.forEach((reserva) => {
      worksheet.addRow({
        id: reserva.id,
        espacio: reserva.espacio?.nombre || "N/A",
        solicitante: `${reserva.usuario?.nombre || ""} ${reserva.usuario?.apellido || ""}`.trim(),
        correo: reserva.usuario?.correo || "N/A",
        fecha_inicio: new Date(reserva.fecha_inicio).toLocaleString("es-BO"),
        fecha_fin: new Date(reserva.fecha_fin).toLocaleString("es-BO"),
        estado: reserva.estado,
        motivo: reserva.motivo_rechazo || "Cancelada por usuario",
        rechazado_por: reserva.rechazador ? `${reserva.rechazador.nombre} ${reserva.rechazador.apellido}` : "",
        cancelado_por: reserva.cancelador ? `${reserva.cancelador.nombre} ${reserva.cancelador.apellido}` : "",
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=cancelados-rechazados-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    return sendError500(res, err);
  }
};

