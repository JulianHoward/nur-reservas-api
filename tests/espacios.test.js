process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../app");
const db = require("../models");
const { sequelize, espacios: Espacio } = db;

let token;
let espacioId;

describe("Gestión de Espacios", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    token = "token-admin";
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe("POST /api/espacios", () => {
    it("Debería crear un nuevo espacio", async () => {
      const newEspacio = {
        nombre: "Auditorio Principal",
        capacidad: 200,
        equipamiento: ["proyector", "sonido"],
        ubicacion: "Edificio A",
        estado: "Disponible",
      };

      const res = await request(app)
        .post("/api/espacios")
        .set("Authorization", token)
        .send(newEspacio);

      expect(res.statusCode).toBe(201);
      expect(res.body.nombre).toBe("Auditorio Principal");
      expect(res.body.capacidad).toBe(200);
      expect(res.body.ubicacion).toBe("Edificio A");
      expect(res.body.is_active).toBe(true);

      espacioId = res.body.id;
    });

    it("Debería fallar si faltan campos requeridos", async () => {
      const incompleteEspacio = {
        nombre: "Espacio Test",
        // Falta capacidad y ubicacion
      };

      const res = await request(app)
        .post("/api/espacios")
        .set("Authorization", token)
        .send(incompleteEspacio);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Faltan");
    });
  });

  describe("GET /api/espacios", () => {
    beforeAll(async () => {
      // Crear espacios de prueba
      await Espacio.create({
        nombre: "Espacio Activo 1",
        capacidad: 50,
        ubicacion: "Edificio B",
        is_active: true,
      });

      await Espacio.create({
        nombre: "Espacio Inactivo",
        capacidad: 30,
        ubicacion: "Edificio C",
        is_active: false,
      });
    });

    it("Debería listar solo espacios activos", async () => {
      const res = await request(app)
        .get("/api/espacios")
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((espacio) => {
        expect(espacio.is_active).toBe(true);
      });
    });
  });

  describe("GET /api/espacios/visibles", () => {
    it("Debería listar espacios visibles para usuarios autenticados", async () => {
      const res = await request(app)
        .get("/api/espacios/visibles")
        .set("Authorization", "Bearer token-usuario-1");

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/espacios/:id", () => {
    it("Debería obtener un espacio por ID", async () => {
      const res = await request(app)
        .get(`/api/espacios/${espacioId}`)
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(espacioId);
      expect(res.body.nombre).toBe("Auditorio Principal");
    });

    it("Debería retornar 404 si el espacio no existe", async () => {
      const res = await request(app)
        .get("/api/espacios/99999")
        .set("Authorization", token);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Espacio no encontrado");
    });
  });

  describe("PUT /api/espacios/:id", () => {
    it("Debería actualizar un espacio", async () => {
      const res = await request(app)
        .put(`/api/espacios/${espacioId}`)
        .set("Authorization", token)
        .send({
          nombre: "Auditorio Actualizado",
          capacidad: 250,
          estado: "En mantenimiento",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.nombre).toBe("Auditorio Actualizado");
      expect(res.body.capacidad).toBe(250);
      expect(res.body.estado).toBe("En mantenimiento");
    });

    it("Debería retornar 404 si el espacio no existe", async () => {
      const res = await request(app)
        .put("/api/espacios/99999")
        .set("Authorization", token)
        .send({ nombre: "Test" });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Espacio no encontrado");
    });
  });

  describe("DELETE /api/espacios/:id", () => {
    it("Debería desactivar un espacio", async () => {
      // Crear un espacio para eliminar
      const espacioToDelete = await Espacio.create({
        nombre: "Espacio a Eliminar",
        capacidad: 40,
        ubicacion: "Edificio D",
      });

      const res = await request(app)
        .delete(`/api/espacios/${espacioToDelete.id}`)
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Espacio desactivado");

      // Verificar que el espacio fue desactivado
      const espacioDesactivado = await Espacio.findByPk(espacioToDelete.id);
      expect(espacioDesactivado.is_active).toBe(false);
    });

    it("Debería retornar 404 si el espacio no existe", async () => {
      const res = await request(app)
        .delete("/api/espacios/99999")
        .set("Authorization", token);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Espacio no encontrado");
    });
  });
});
