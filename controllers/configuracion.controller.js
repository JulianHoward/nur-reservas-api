const db = require("../models");
const { checkRequiredFields, sendError500 } = require("../utils/request.utils");

// Obtener todas las configuraciones
exports.list = async (req, res) => {
  try {
    const configuraciones = await db.configuracion.findAll({
      order: [["clave", "ASC"]],
    });

    // Convertir valores según su tipo
    const configs = configuraciones.map((config) => {
      let valor = config.valor;
      if (config.tipo === "json") {
        try {
          valor = JSON.parse(config.valor);
        } catch (e) {
          valor = config.valor;
        }
      } else if (config.tipo === "numero") {
        valor = parseFloat(config.valor);
      } else if (config.tipo === "booleano") {
        valor = config.valor === "true" || config.valor === "1";
      }

      return {
        clave: config.clave,
        valor,
        tipo: config.tipo,
        descripcion: config.descripcion,
      };
    });

    return res.json(configs);
  } catch (err) {
    return sendError500(res, err);
  }
};

// Obtener una configuración por clave
exports.getByClave = async (req, res) => {
  try {
    const { clave } = req.params;
    const config = await db.configuracion.findOne({ where: { clave } });

    if (!config) {
      return res.status(404).json({ message: "Configuración no encontrada" });
    }

    let valor = config.valor;
    if (config.tipo === "json") {
      try {
        valor = JSON.parse(config.valor);
      } catch (e) {
        valor = config.valor;
      }
    } else if (config.tipo === "numero") {
      valor = parseFloat(config.valor);
    } else if (config.tipo === "booleano") {
      valor = config.valor === "true" || config.valor === "1";
    }

    return res.json({
      clave: config.clave,
      valor,
      tipo: config.tipo,
      descripcion: config.descripcion,
    });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Crear o actualizar configuración
exports.createOrUpdate = async (req, res) => {
  try {
    const required = ["clave", "valor", "tipo"];
    const missing = checkRequiredFields(required, req.body);
    if (missing.length) {
      return res.status(400).json({ message: `Faltan: ${missing.join(", ")}` });
    }

    const { clave, valor, tipo, descripcion } = req.body;

    // Validar tipo
    const tiposValidos = ["numero", "texto", "booleano", "json", "tiempo"];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ message: "Tipo no válido" });
    }

    // Convertir valor a string según tipo
    let valorString = String(valor);
    if (tipo === "json") {
      valorString = JSON.stringify(valor);
    } else if (tipo === "booleano") {
      valorString = valor ? "true" : "false";
    }

    const [config, created] = await db.configuracion.findOrCreate({
      where: { clave },
      defaults: {
        clave,
        valor: valorString,
        tipo,
        descripcion: descripcion || null,
      },
    });

    if (!created) {
      await config.update({
        valor: valorString,
        tipo,
        descripcion: descripcion || config.descripcion,
      });
    }

    let valorRetorno = config.valor;
    if (config.tipo === "json") {
      try {
        valorRetorno = JSON.parse(config.valor);
      } catch (e) {
        valorRetorno = config.valor;
      }
    } else if (config.tipo === "numero") {
      valorRetorno = parseFloat(config.valor);
    } else if (config.tipo === "booleano") {
      valorRetorno = config.valor === "true" || config.valor === "1";
    }

    return res.json({
      clave: config.clave,
      valor: valorRetorno,
      tipo: config.tipo,
      descripcion: config.descripcion,
      created,
    });
  } catch (err) {
    return sendError500(res, err);
  }
};

// Obtener valor de configuración (helper para usar en otros controladores)
exports.getValor = async (clave, defaultValue = null) => {
  try {
    const config = await db.configuracion.findOne({ where: { clave } });
    if (!config) return defaultValue;

    let valor = config.valor;
    if (config.tipo === "json") {
      try {
        valor = JSON.parse(config.valor);
      } catch (e) {
        valor = config.valor;
      }
    } else if (config.tipo === "numero") {
      valor = parseFloat(config.valor);
    } else if (config.tipo === "booleano") {
      valor = config.valor === "true" || config.valor === "1";
    }

    return valor;
  } catch (err) {
    console.error("Error al obtener configuración:", err);
    return defaultValue;
  }
};

