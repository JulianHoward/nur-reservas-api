module.exports = (sequelize, Sequelize) => {
    const Usuario = sequelize.define("usuario", {
        nombre: {
            type: Sequelize.STRING,
            allowNull: false
        },
        apellido: {
            type: Sequelize.STRING,
            allowNull: false
        },
        correo: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },
        password_hash: {
            type: Sequelize.STRING,
            allowNull: false
        },
        role: {
            type: Sequelize.ENUM('admin', 'encargado', 'usuario'),
            allowNull: false,
            defaultValue: 'usuario'
        },
        user_type: {
            type: Sequelize.ENUM('estudiante', 'docente', 'administrativo'),
            allowNull: true
        },
        is_active: {
            type: Sequelize.BOOLEAN,
            defaultValue: true
        }
    });
    return Usuario;
};
