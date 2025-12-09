// middlewares/auth.middleware.js
const { verifyToken } = require('../utils/jwt.utils');
const db = require('../models');

function extractBearer(req) {
  const h = req.headers.authorization || '';
  const [scheme, token] = h.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token) return token;
  return null;
}

async function requireAuth(req, res, next) {
  try {
    const token = extractBearer(req);
    if (!token) return res.status(401).json({ message: 'No autorizado' });

    const decoded = verifyToken(token);
    const tokenDB = await db.usuarioAuth.findOne({ where: { token } });
    if (!tokenDB) return res.status(401).json({ message: 'Token inválido o expirado' });

    const user = await db.usuarios.findByPk(decoded.id);
    if (!user || user.is_active === false) {
      return res.status(401).json({ message: 'Usuario inactivo o no existe' });
    }

    res.locals.user = {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      role: user.role,
      user_type: user.user_type,
    };
    res.locals.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido', detail: err.message });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const u = res.locals.user;
    if (!u) return res.status(401).json({ message: 'No autenticado' });
    if (!roles.includes(u.role)) return res.status(403).json({ message: 'No autorizado' });
    next();
  };
}

module.exports = { requireAuth, requireRole };
