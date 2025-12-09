// Script para inicializar configuraciones por defecto
const db = require("../models");

const configuracionesDefault = [
  {
    clave: "dias_anticipacion_minima",
    valor: "2",
    tipo: "numero",
    descripcion: "Días mínimos de anticipación para solicitar una reserva",
  },
  {
    clave: "duracion_maxima_horas",
    valor: "8",
    tipo: "numero",
    descripcion: "Duración máxima permitida para una reserva en horas",
  },
  {
    clave: "horario_apertura_default",
    valor: "08:00:00",
    tipo: "tiempo",
    descripcion: "Horario de apertura por defecto para espacios",
  },
  {
    clave: "horario_cierre_default",
    valor: "22:00:00",
    tipo: "tiempo",
    descripcion: "Horario de cierre por defecto para espacios",
  },
  {
    clave: "prioridad_eventos_academicos",
    valor: "true",
    tipo: "booleano",
    descripcion: "Dar prioridad a eventos académicos sobre otros tipos",
  },
  {
    clave: "dias_recordatorio_evento",
    valor: "1",
    tipo: "numero",
    descripcion: "Días antes del evento para enviar recordatorio",
  },
];

async function inicializarConfiguraciones() {
  try {
    console.log("Sincronizando base de datos...");
    await db.sequelize.sync({ alter: true });
    console.log("✓ Base de datos sincronizada");

    console.log("Inicializando configuraciones por defecto...");

    for (const config of configuracionesDefault) {
      const [configuracion, created] = await db.configuracion.findOrCreate({
        where: { clave: config.clave },
        defaults: config,
      });

      if (created) {
        console.log(`✓ Configuración creada: ${config.clave}`);
      } else {
        console.log(`- Configuración ya existe: ${config.clave}`);
      }
    }

    console.log("✅ Configuraciones inicializadas correctamente");
  } catch (error) {
    console.error("❌ Error al inicializar configuraciones:", error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  inicializarConfiguraciones()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { inicializarConfiguraciones };

