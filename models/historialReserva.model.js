module.exports = (sequelize, Sequelize) => {
  const HistorialReserva = sequelize.define("historial_reserva", {
    reserva_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    accion: {
      type: Sequelize.ENUM(
        "creada",
        "aprobada",
        "rechazada",
        "cancelada",
        "modificada",
        "reactivada"
      ),
      allowNull: false,
    },
    usuario_id: {
      type: Sequelize.INTEGER,
      allowNull: false, // Usuario que realizó la acción
    },
    detalles: {
      type: Sequelize.JSON, // Cambios realizados, motivo, etc.
      allowNull: true,
    },
    observaciones: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
  });

  return HistorialReserva;
};

