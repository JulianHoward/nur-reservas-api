module.exports = (sequelize, Sequelize) => {
  const Notificacion = sequelize.define("notificacion", {
    usuario_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    tipo: {
      type: Sequelize.ENUM(
        "solicitud_recibida",
        "solicitud_aprobada",
        "solicitud_rechazada",
        "recordatorio_evento",
        "nueva_solicitud_admin"
      ),
      allowNull: false,
    },
    titulo: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    mensaje: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    reserva_id: {
      type: Sequelize.INTEGER,
      allowNull: true, // null para notificaciones generales
    },
    leida: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    fecha_leida: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  return Notificacion;
};

