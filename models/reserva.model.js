module.exports = (sequelize, Sequelize) => {
  const Reserva = sequelize.define("reserva", {
    usuario_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    espacio_id: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    fecha_inicio: {
      type: Sequelize.DATE,
      allowNull: false
    },
    fecha_fin: {
      type: Sequelize.DATE,
      allowNull: false
    },
    tipo_evento: {
      type: Sequelize.ENUM("académico", "deportivo", "cultural", "administrativo"),
      allowNull: false
    },
    asistentes: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    estado: {
      type: Sequelize.ENUM("pendiente", "aprobada", "rechazada"),
      defaultValue: "pendiente",
      allowNull: false
    },
    motivo_rechazo: {
      type: Sequelize.STRING,
      allowNull: true
    },
    documentos: {
      type: Sequelize.JSON, // lista de URLs de documentos adjuntos
      allowNull: true
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });

  return Reserva;
};
