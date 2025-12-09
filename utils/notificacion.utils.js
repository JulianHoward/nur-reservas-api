const NotificacionController = require("../controllers/notificacion.controller");

// Crear notificación de solicitud recibida
exports.notificarSolicitudRecibida = async (usuario_id, reserva_id, espacioNombre) => {
  await NotificacionController.create(
    usuario_id,
    "solicitud_recibida",
    "Solicitud de reserva recibida",
    `Tu solicitud de reserva para el espacio "${espacioNombre}" ha sido recibida y está en revisión.`,
    reserva_id
  );
};

// Crear notificación de solicitud aprobada
exports.notificarSolicitudAprobada = async (usuario_id, reserva_id, espacioNombre, fechaInicio) => {
  await NotificacionController.create(
    usuario_id,
    "solicitud_aprobada",
    "Reserva aprobada",
    `Tu solicitud de reserva para el espacio "${espacioNombre}" el ${new Date(fechaInicio).toLocaleDateString()} ha sido aprobada.`,
    reserva_id
  );
};

// Crear notificación de solicitud rechazada
exports.notificarSolicitudRechazada = async (usuario_id, reserva_id, espacioNombre, motivo) => {
  await NotificacionController.create(
    usuario_id,
    "solicitud_rechazada",
    "Reserva rechazada",
    `Tu solicitud de reserva para el espacio "${espacioNombre}" ha sido rechazada. Motivo: ${motivo || "No especificado"}`,
    reserva_id
  );
};

// Notificar a administradores sobre nueva solicitud
exports.notificarNuevaSolicitudAdmin = async (reserva_id, espacioNombre, usuarioNombre) => {
  const db = require("../models");
  const admins = await db.usuarios.findAll({
    where: { role: { [db.Sequelize.Op.in]: ["admin", "encargado"] }, is_active: true },
  });

  for (const admin of admins) {
    await NotificacionController.create(
      admin.id,
      "nueva_solicitud_admin",
      "Nueva solicitud de reserva",
      `Nueva solicitud de reserva para el espacio "${espacioNombre}" por ${usuarioNombre}.`,
      reserva_id
    );
  }
};

// Crear notificación de recordatorio
exports.notificarRecordatorio = async (usuario_id, reserva_id, espacioNombre, fechaInicio) => {
  await NotificacionController.create(
    usuario_id,
    "recordatorio_evento",
    "Recordatorio de evento",
    `Recordatorio: Tienes una reserva para el espacio "${espacioNombre}" el ${new Date(fechaInicio).toLocaleDateString()} a las ${new Date(fechaInicio).toLocaleTimeString()}.`,
    reserva_id
  );
};

