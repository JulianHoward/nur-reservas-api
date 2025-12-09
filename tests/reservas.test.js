process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../app");
const db = require("../models");
const Reserva = db.reservas;
const bcrypt = require("bcryptjs");

describe("Gestión de Reservas", () => {
  let usuario;
  let otroUsuario;
  let admin;
  let espacio;
  let espacio2;

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    usuario = await db.usuarios.create({
      nombre: "Test",
      apellido: "User",
      correo: "testuser@example.com",
      password_hash: await bcrypt.hash("123456", 10),
      role: "usuario",
    });

    otroUsuario = await db.usuarios.create({
      nombre: "Otro",
      apellido: "Usuario",
      correo: "otro@example.com",
      password_hash: await bcrypt.hash("123456", 10),
      role: "usuario",
    });

    admin = await db.usuarios.create({
      nombre: "Admin",
      apellido: "Test",
      correo: "admin@example.com",
      password_hash: await bcrypt.hash("123456", 10),
      role: "admin",
    });

    espacio = await db.espacios.create({
      nombre: "Auditorio Principal",
      ubicacion: "Edificio A",
      capacidad: 100,
    });

    espacio2 = await db.espacios.create({
      nombre: "Sala de Conferencias",
      ubicacion: "Edificio B",
      capacidad: 50,
    });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("POST /api/reservas", () => {
    it("Debería crear una nueva reserva", async () => {
      const res = await request(app)
        .post("/api/reservas")
        .set("Authorization", `Bearer token-usuario-${usuario.id}`)
        .send({
          usuario_id: usuario.id,
          espacio_id: espacio.id,
          fecha_inicio: "2025-12-15T10:00:00",
          fecha_fin: "2025-12-15T12:00:00",
          tipo_evento: "académico",
          asistentes: 50,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.usuario_id).toBe(usuario.id);
      expect(res.body.espacio_id).toBe(espacio.id);
      expect(res.body.estado).toBe("pendiente");
      expect(res.body.is_active).toBe(true);
    });

    it("Debería fallar si faltan campos requeridos", async () => {
      const res = await request(app)
        .post("/api/reservas")
        .set("Authorization", `Bearer token-usuario-${usuario.id}`)
        .send({
          usuario_id: usuario.id,
          espacio_id: espacio.id,
          // Faltan fecha_inicio, fecha_fin, tipo_evento, asistentes
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Faltan");
    });

    it("Debería fallar si el usuario no existe", async () => {
      const res = await request(app)
        .post("/api/reservas")
        .set("Authorization", `Bearer token-usuario-${usuario.id}`)
        .send({
          usuario_id: 99999,
          espacio_id: espacio.id,
          fecha_inicio: "2025-12-16T10:00:00",
          fecha_fin: "2025-12-16T12:00:00",
          tipo_evento: "académico",
          asistentes: 30,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Usuario no encontrado");
    });

    it("Debería fallar si el espacio no existe", async () => {
      const res = await request(app)
        .post("/api/reservas")
        .set("Authorization", `Bearer token-usuario-${usuario.id}`)
        .send({
          usuario_id: usuario.id,
          espacio_id: 99999,
          fecha_inicio: "2025-12-17T10:00:00",
          fecha_fin: "2025-12-17T12:00:00",
          tipo_evento: "académico",
          asistentes: 30,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Espacio no encontrado");
    });

    it("Debería fallar si el tipo de evento no es válido", async () => {
      const res = await request(app)
        .post("/api/reservas")
        .set("Authorization", `Bearer token-usuario-${usuario.id}`)
        .send({
          usuario_id: usuario.id,
          espacio_id: espacio.id,
          fecha_inicio: "2025-12-18T10:00:00",
          fecha_fin: "2025-12-18T12:00:00",
          tipo_evento: "tipo_invalido",
          asistentes: 30,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Tipo de evento no válido");
    });

    it("Debería fallar si el número de asistentes es inválido", async () => {
      const res = await request(app)
        .post("/api/reservas")
        .set("Authorization", `Bearer token-usuario-${usuario.id}`)
        .send({
          usuario_id: usuario.id,
          espacio_id: espacio.id,
          fecha_inicio: "2025-12-19T10:00:00",
          fecha_fin: "2025-12-19T12:00:00",
          tipo_evento: "académico",
          asistentes: -5,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Número de asistentes inválido");
    });

    it("Debería fallar si la fecha de inicio es después de la fecha de fin", async () => {
      const res = await request(app)
        .post("/api/reservas")
        .set("Authorization", `Bearer token-usuario-${usuario.id}`)
        .send({
          usuario_id: usuario.id,
          espacio_id: espacio.id,
          fecha_inicio: "2025-12-20T12:00:00",
          fecha_fin: "2025-12-20T10:00:00",
          tipo_evento: "académico",
          asistentes: 30,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("La fecha de inicio debe ser antes de la fecha de fin");
    });

    it("Debería fallar si hay conflicto de horario", async () => {
      // Crear una reserva existente
      await Reserva.create({
        usuario_id: usuario.id,
        espacio_id: espacio.id,
        fecha_inicio: "2025-12-21T10:00:00",
        fecha_fin: "2025-12-21T12:00:00",
        tipo_evento: "académico",
        asistentes: 20,
        estado: "aprobada",
        is_active: true,
      });

      // Intentar crear otra reserva en el mismo horario
      const res = await request(app)
        .post("/api/reservas")
        .set("Authorization", `Bearer token-usuario-${usuario.id}`)
        .send({
          usuario_id: usuario.id,
          espacio_id: espacio.id,
          fecha_inicio: "2025-12-21T11:00:00",
          fecha_fin: "2025-12-21T13:00:00",
          tipo_evento: "académico",
          asistentes: 30,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("ya está reservado");
    });
  });

  describe("GET /api/reservas", () => {
    it("Debería listar todas las reservas (admin)", async () => {
      const res = await request(app)
        .get("/api/reservas")
        .set("Authorization", `Bearer token-usuario-${admin.id}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("Debería filtrar reservas por usuario_id", async () => {
      const res = await request(app)
        .get(`/api/reservas?usuario_id=${usuario.id}`)
        .set("Authorization", `Bearer token-usuario-${admin.id}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((reserva) => {
        expect(reserva.usuario_id).toBe(usuario.id);
      });
    });

    it("Debería filtrar reservas por espacio_id", async () => {
      const res = await request(app)
        .get(`/api/reservas?espacio_id=${espacio.id}`)
        .set("Authorization", `Bearer token-usuario-${admin.id}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((reserva) => {
        expect(reserva.espacio_id).toBe(espacio.id);
      });
    });

    it("Debería filtrar reservas por estado", async () => {
      const res = await request(app)
        .get("/api/reservas?estado=pendiente")
        .set("Authorization", `Bearer token-usuario-${admin.id}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((reserva) => {
        expect(reserva.estado).toBe("pendiente");
      });
    });
  });

  describe("GET /api/reservas/mis-reservas", () => {
    it("Debería listar las reservas del usuario autenticado", async () => {
      // Crear una reserva para el usuario
      await Reserva.create({
        usuario_id: usuario.id,
        espacio_id: espacio2.id,
        fecha_inicio: "2025-12-22T10:00:00",
        fecha_fin: "2025-12-22T12:00:00",
        tipo_evento: "cultural",
        asistentes: 25,
        estado: "pendiente",
        is_active: true,
      });

      const res = await request(app)
        .get("/api/reservas/mis-reservas")
        .set("Authorization", `Bearer token-usuario-${usuario.id}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((reserva) => {
        expect(reserva.usuario_id).toBe(usuario.id);
      });
    });
  });

  describe("GET /api/reservas/disponibilidad", () => {
    it("Debería listar la disponibilidad de un espacio", async () => {
      const res = await request(app)
        .get(
          `/api/reservas/disponibilidad?espacio_id=${espacio.id}&fecha_inicio=2025-12-01T00:00:00&fecha_fin=2025-12-31T23:59:59`
        )
        .set("Authorization", `Bearer token-usuario-${usuario.id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("espacio");
      expect(res.body).toHaveProperty("reservas");
      expect(res.body.espacio.id).toBe(espacio.id);
    });

    it("Debería fallar si faltan parámetros", async () => {
      const res = await request(app)
        .get("/api/reservas/disponibilidad?espacio_id=1")
        .set("Authorization", `Bearer token-usuario-${usuario.id}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Faltan parámetros requeridos");
    });
  });

  describe("GET /api/reservas/:id", () => {
    it("Debería obtener una reserva por ID", async () => {
      const reserva = await Reserva.create({
        usuario_id: usuario.id,
        espacio_id: espacio.id,
        fecha_inicio: "2025-12-23T10:00:00",
        fecha_fin: "2025-12-23T12:00:00",
        tipo_evento: "deportivo",
        asistentes: 40,
        estado: "pendiente",
        is_active: true,
      });

      const res = await request(app)
        .get(`/api/reservas/${reserva.id}`)
        .set("Authorization", `Bearer token-usuario-${usuario.id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(reserva.id);
      expect(res.body).toHaveProperty("espacio");
    });

    it("Debería retornar 404 si la reserva no existe", async () => {
      const res = await request(app)
        .get("/api/reservas/99999")
        .set("Authorization", `Bearer token-usuario-${usuario.id}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Reserva no encontrada");
    });
  });

  describe("PUT /api/reservas/:id/aprobar", () => {
    it("Debería aprobar una reserva (admin)", async () => {
      const reserva = await Reserva.create({
        usuario_id: usuario.id,
        espacio_id: espacio.id,
        fecha_inicio: "2025-12-24T10:00:00",
        fecha_fin: "2025-12-24T12:00:00",
        tipo_evento: "administrativo",
        asistentes: 35,
        estado: "pendiente",
        is_active: true,
      });

      // Usar el ID del admin real en lugar del mock
      const res = await request(app)
        .put(`/api/reservas/${reserva.id}/aprobar`)
        .set("Authorization", `Bearer token-usuario-${admin.id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Reserva aprobada");

      const updated = await Reserva.findByPk(reserva.id);
      expect(updated.estado).toBe("aprobada");
    });
  });

  describe("PUT /api/reservas/:id/rechazar", () => {
    it("Debería rechazar una reserva con motivo (admin)", async () => {
      const reserva = await Reserva.create({
        usuario_id: usuario.id,
        espacio_id: espacio.id,
        fecha_inicio: "2025-12-25T10:00:00",
        fecha_fin: "2025-12-25T12:00:00",
        tipo_evento: "académico",
        asistentes: 45,
        estado: "pendiente",
        is_active: true,
      });

      // Usar el ID del admin real en lugar del mock
      const res = await request(app)
        .put(`/api/reservas/${reserva.id}/rechazar`)
        .set("Authorization", `Bearer token-usuario-${admin.id}`)
        .send({ motivo_rechazo: "Espacio no disponible" });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Reserva rechazada");

      const updated = await Reserva.findByPk(reserva.id);
      expect(updated.estado).toBe("rechazada");
      expect(updated.motivo_rechazo).toBe("Espacio no disponible");
    });

    it("Debería fallar si no se proporciona motivo de rechazo", async () => {
      const reserva = await Reserva.create({
        usuario_id: usuario.id,
        espacio_id: espacio.id,
        fecha_inicio: "2025-12-26T10:00:00",
        fecha_fin: "2025-12-26T12:00:00",
        tipo_evento: "académico",
        asistentes: 30,
        estado: "pendiente",
        is_active: true,
      });

      const res = await request(app)
        .put(`/api/reservas/${reserva.id}/rechazar`)
        .set("Authorization", "Bearer token-admin")
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("motivo de rechazo");
    });
  });

  describe("PUT /api/reservas/:id/cancelar", () => {
    it("Un usuario puede cancelar su propia reserva pendiente", async () => {
      const reserva = await Reserva.create({
        usuario_id: usuario.id,
        espacio_id: espacio.id,
        fecha_inicio: "2025-12-27T10:00:00",
        fecha_fin: "2025-12-27T12:00:00",
        tipo_evento: "académico",
        asistentes: 15,
        estado: "pendiente",
        is_active: true,
      });

      const res = await request(app)
        .put(`/api/reservas/${reserva.id}/cancelar`)
        .set("Authorization", `Bearer token-usuario-${usuario.id}`)
        .send();

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Reserva cancelada");

      const updated = await Reserva.findByPk(reserva.id);
      expect(updated.estado).toBe("rechazada");
      expect(updated.motivo_rechazo).toBe("Cancelada por el usuario");
    });

    it("Un usuario no puede cancelar una reserva que no le pertenece", async () => {
      const reserva = await Reserva.create({
        usuario_id: usuario.id,
        espacio_id: espacio.id,
        fecha_inicio: "2025-12-28T10:00:00",
        fecha_fin: "2025-12-28T12:00:00",
        tipo_evento: "académico",
        asistentes: 20,
        estado: "pendiente",
        is_active: true,
      });

      const res = await request(app)
        .put(`/api/reservas/${reserva.id}/cancelar`)
        .set("Authorization", `Bearer token-usuario-${otroUsuario.id}`)
        .send();

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("No autorizado para cancelar esta reserva");
    });

    it("No se puede cancelar una reserva que no está pendiente", async () => {
      const reserva = await Reserva.create({
        usuario_id: usuario.id,
        espacio_id: espacio.id,
        fecha_inicio: "2025-12-29T10:00:00",
        fecha_fin: "2025-12-29T12:00:00",
        tipo_evento: "académico",
        asistentes: 25,
        estado: "aprobada",
        is_active: true,
      });

      const res = await request(app)
        .put(`/api/reservas/${reserva.id}/cancelar`)
        .set("Authorization", `Bearer token-usuario-${usuario.id}`)
        .send();

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Solo reservas pendientes");
    });
  });

  describe("DELETE /api/reservas/:id", () => {
    it("Debería desactivar una reserva (admin)", async () => {
      const reserva = await Reserva.create({
        usuario_id: usuario.id,
        espacio_id: espacio.id,
        fecha_inicio: "2025-12-30T10:00:00",
        fecha_fin: "2025-12-30T12:00:00",
        tipo_evento: "académico",
        asistentes: 30,
        estado: "pendiente",
        is_active: true,
      });

      const res = await request(app)
        .delete(`/api/reservas/${reserva.id}`)
        .set("Authorization", `Bearer token-usuario-${admin.id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Reserva desactivada");

      const updated = await Reserva.findByPk(reserva.id);
      expect(updated.is_active).toBe(false);
    });
  });
});
