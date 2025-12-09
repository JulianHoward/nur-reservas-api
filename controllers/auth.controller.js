// controllers/auth.controller.js
const db = require("../models");
const { checkRequiredFields, sendError500 } = require("../utils/request.utils");
const { signToken } = require("../utils/jwt.utils");
const { hashPassword, verifyPassword } = require("../utils/password.utils");

/**
 * POST /auth/register
 * body: { nombre, apellido, correo, password, role?, user_type? }
 */
exports.register = async (req, res) => {
  const required = ["nombre", "apellido", "correo", "password"];
  const missing = checkRequiredFields(required, req.body);
  if (missing.length) return res.status(400).json({ message: `Faltan: ${missing.join(", ")}` });

  try {
    const { nombre, apellido, correo, password, role, user_type } = req.body;

    // ¿correo existe?
    const exists = await db.usuarios.findOne({ where: { correo } });
    if (exists) return res.status(400).json({ message: "El correo ya está registrado" });

    const password_hash = await hashPassword(password);

    const user = await db.usuarios.create({
      nombre,
      apellido,
      correo,
      password_hash,
      role: role || "usuario",          // 'admin' | 'encargado' | 'usuario'
      user_type: user_type || null      // 'estudiante' | 'docente' | 'administrativo' | null
    });

    // firmar JWT
    const payload = { id: user.id, role: user.role };
    const token = signToken(payload);

    // guardar sesión en usuarioauth
    await db.usuarioAuth.create({ usuario_id: user.id, token });

    const { password_hash: _, ...safe } = user.toJSON();
    return res.status(201).json({ user: safe, token });
  } catch (err) {
    return sendError500(res, err);
  }
};

/**
 * POST /auth/login
 * body: { correo, password }
 */
exports.login = async (req, res) => {
  const required = ["correo", "password"];
  const missing = checkRequiredFields(required, req.body);
  if (missing.length) return res.status(400).json({ message: `Faltan: ${missing.join(", ")}` });

  try {
    const { correo, password } = req.body;

    const user = await db.usuarios.findOne({ where: { correo } });
    if (!user) return res.status(401).json({ message: "Usuario o contraseña incorrectos" });

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Usuario o contraseña incorrectos" });

    const payload = { id: user.id, role: user.role };
    const token = signToken(payload);

    await db.usuarioAuth.create({ usuario_id: user.id, token });

    const { password_hash, ...safe } = user.toJSON();
    return res.json({ user: safe, token });
  } catch (err) {
    return sendError500(res, err);
  }
};

/**
 * GET /auth/me
 * header: Authorization: Bearer <token>
 * requiere requireAuth
 */
exports.me = async (req, res) => {
  return res.json({ user: res.locals.user });
};

/**
 * POST /auth/logout
 * header: Authorization: Bearer <token>
 * requiere requireAuth
 */
exports.logout = async (req, res) => {
  try {
    const token = res.locals.token;
    if (token) {
      await db.usuarioAuth.destroy({ where: { token } });
    }
    return res.json({ message: "Sesión cerrada" });
  } catch (err) {
    return sendError500(res, err);
  }
};
