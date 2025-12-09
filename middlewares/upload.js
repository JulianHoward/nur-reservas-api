// middlewares/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Asegurarse de que la carpeta uploads exista
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname); // Mantener la extensión
    cb(null, uniqueSuffix + ext);
  },
});

// Filtro por tipo de archivo
const fileFilter = (req, file, cb) => {
  const allowedTypes = /\.(jpeg|jpg|png|pdf)$/; // incluye el punto
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de archivo no permitido"), false);
  }
};

// Exportar middleware
exports.uploadDocs = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB por archivo
}).array("documentos", 10); // hasta 10 archivos
