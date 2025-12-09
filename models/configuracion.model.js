module.exports = (sequelize, Sequelize) => {
  const Configuracion = sequelize.define("configuracion", {
    clave: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    },
    valor: {
      type: Sequelize.TEXT, // JSON string para valores complejos
      allowNull: false,
    },
    descripcion: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    tipo: {
      type: Sequelize.ENUM("numero", "texto", "booleano", "json", "tiempo"),
      defaultValue: "texto",
    },
  });

  return Configuracion;
};

