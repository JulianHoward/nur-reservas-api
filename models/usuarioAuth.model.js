module.exports = (sequelize, Sequelize) => {
    const UsuarioAuth = sequelize.define("usuarioauth", {
        usuario_id: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        token: {
            type: Sequelize.STRING,
            allowNull: false
        }
    });

    return UsuarioAuth;
};
