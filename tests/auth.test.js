process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../app");
const db = require("../models");
const bcrypt = require("bcryptjs");

describe("Autenticación", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("POST /api/auth/register", () => {
    it("Debería registrar un nuevo usuario", async () => {
      const newUser = {
        nombre: "Juan",
        apellido: "Pérez",
        correo: "juan@example.com",
        password: "123456",
      };

      const res = await request(app).post("/api/auth/register").send(newUser);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("user");
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.correo).toBe("juan@example.com");
      expect(res.body.user.nombre).toBe("Juan");
      expect(res.body.user).not.toHaveProperty("password_hash");
    });

    it("Debería registrar un usuario con rol admin", async () => {
      const newUser = {
        nombre: "Admin",
        apellido: "Test",
        correo: "admin@example.com",
        password: "123456",
        role: "admin",
      };

      const res = await request(app).post("/api/auth/register").send(newUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.user.role).toBe("admin");
    });

    it("Debería fallar si faltan campos requeridos", async () => {
      const incompleteUser = {
        nombre: "Juan",
        correo: "test@example.com",
        // Falta apellido y password
      };

      const res = await request(app).post("/api/auth/register").send(incompleteUser);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Faltan");
    });

    it("Debería fallar si el correo ya está registrado", async () => {
      // Primero creamos un usuario
      await db.usuarios.create({
        nombre: "Existente",
        apellido: "Usuario",
        correo: "existente@example.com",
        password_hash: await bcrypt.hash("123456", 10),
      });

      // Intentamos registrar el mismo correo
      const res = await request(app).post("/api/auth/register").send({
        nombre: "Nuevo",
        apellido: "Usuario",
        correo: "existente@example.com",
        password: "123456",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("El correo ya está registrado");
    });
  });

  describe("POST /api/auth/login", () => {
    let testUser;

    beforeAll(async () => {
      // Crear un usuario de prueba
      testUser = await db.usuarios.create({
        nombre: "Login",
        apellido: "Test",
        correo: "login@example.com",
        password_hash: await bcrypt.hash("123456", 10),
      });
    });

    it("Debería hacer login con credenciales correctas", async () => {
      const res = await request(app).post("/api/auth/login").send({
        correo: "login@example.com",
        password: "123456",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("user");
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.correo).toBe("login@example.com");
      expect(res.body.user).not.toHaveProperty("password_hash");
    });

    it("Debería fallar con contraseña incorrecta", async () => {
      const res = await request(app).post("/api/auth/login").send({
        correo: "login@example.com",
        password: "password_incorrecta",
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Usuario o contraseña incorrectos");
    });

    it("Debería fallar con correo que no existe", async () => {
      const res = await request(app).post("/api/auth/login").send({
        correo: "noexiste@example.com",
        password: "123456",
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Usuario o contraseña incorrectos");
    });

    it("Debería fallar si faltan campos requeridos", async () => {
      const res = await request(app).post("/api/auth/login").send({
        correo: "login@example.com",
        // Falta password
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Faltan");
    });
  });

  describe("GET /api/auth/me", () => {
    it("Debería retornar el usuario autenticado", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer token-admin");

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("user");
      expect(res.body.user).toHaveProperty("id");
      expect(res.body.user).toHaveProperty("role");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("Debería cerrar sesión correctamente", async () => {
      // Crear un token de prueba
      const user = await db.usuarios.create({
        nombre: "Logout",
        apellido: "Test",
        correo: "logout@example.com",
        password_hash: await bcrypt.hash("123456", 10),
      });

      const token = "test-token-123";
      await db.usuarioAuth.create({
        usuario_id: user.id,
        token: token,
      });

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Sesión cerrada");

      // Verificar que el token fue eliminado
      const tokenExists = await db.usuarioAuth.findOne({ where: { token } });
      expect(tokenExists).toBeNull();
    });
  });
});

