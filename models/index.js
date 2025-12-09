const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(
    dbConfig.DB,
    dbConfig.USER,
    dbConfig.PASSWORD,
    {
        host: dbConfig.HOST,
        port: dbConfig.PORT,
        dialect: dbConfig.dialect,
        logging: false,
        define: {
            timestamps: true, // agrega createdAt y updatedAt
            freezeTableName: true, // no pluraliza los nombres de las tablas
            underscored: true, // usa snake_case en lugar de camelCase
        },
        timezone: "-05:00" // Ajusta a tu zona horaria
    }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// --- Modelos ---
db.usuarios = require("./user.model.js")(sequelize, Sequelize);
db.usuarioAuth = require("./usuarioAuth.model.js")(sequelize, Sequelize);
db.espacios = require("./espacio.model.js")(sequelize, Sequelize);
db.reservas = require("./reserva.model.js")(sequelize, Sequelize);

// --- Relaciones ---
// Usuarios <-> Tokens
db.usuarios.hasMany(db.usuarioAuth, { as: "tokens", foreignKey: "usuario_id" });
db.usuarioAuth.belongsTo(db.usuarios, { foreignKey: "usuario_id", as: "usuario" });

// Usuarios <-> Reservas
db.usuarios.hasMany(db.reservas, { as: "reservas", foreignKey: "usuario_id" });
db.reservas.belongsTo(db.usuarios, { foreignKey: "usuario_id", as: "usuario" });

// Espacios <-> Reservas
db.espacios.hasMany(db.reservas, { as: "reservas", foreignKey: "espacio_id" });
db.reservas.belongsTo(db.espacios, { foreignKey: "espacio_id", as: "espacio" });

module.exports = db;
