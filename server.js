// server.js
const app = require('./app');
const db = require('./models');

const port = process.env.PORT || 3000;

// Sincronizar DB antes de levantar servidor
db.sequelize.sync()
  .then(() => {
    console.log('✅ Base de datos sincronizada');
    app.listen(port, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error al sincronizar la base de datos:', err);
  });
