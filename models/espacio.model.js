module.exports = (sequelize, Sequelize) => {
  const Espacio = sequelize.define("espacio", {
    nombre: {
      type: Sequelize.STRING,
      allowNull: false
    },
    ubicacion: {
      type: Sequelize.STRING,
      allowNull: false
    },
    capacidad: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    equipamiento: {
      type: Sequelize.JSON,
      allowNull: true
    },
    estado: {
      type: Sequelize.ENUM("disponible", "reservado", "mantenimiento"),
      defaultValue: "disponible",
      allowNull: false
    },
    hora_apertura: {
      type: Sequelize.TIME,
      allowNull: true,
      defaultValue: "08:00:00"
    },
    hora_cierre: {
      type: Sequelize.TIME,
      allowNull: true,
      defaultValue: "22:00:00"
    },
    tipo: {                    // <-- NUEVO
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "general"
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });

  return Espacio;
};
