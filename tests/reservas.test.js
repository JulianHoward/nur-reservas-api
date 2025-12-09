const request = require("supertest");
const app = require("../app");
const db = require("../models");
const Reserva = db.reservas;
const bcrypt = require("bcryptjs");

describe("Gestión de Reservas", () => {
  let usuario;
  let espacio;
  let otroUsuario;

  // Middleware para mockear res.locals.user correctamente
  app.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (auth) {
      if (auth.startsWith("Bearer token-usuario-")) {
        const userId = parseInt(auth.split("-").pop());
        res.locals.user = { id: userId, role: "usuario" };
      } else if (auth.includes("token-admin")) {
        res.locals.user = { id: 0, role: "admin" };
      }
    }
    next();
  });

  beforeAll(async () => {
    // Reiniciamos la DB
    await db.sequelize.sync({ force: true });

    // Crear usuario principal
    usuario = await db.usuarios.create({
      nombre: "Test",
      apellido: "User",
      correo: "testuser@example.com",
      password_hash: await bcrypt.hash("123456", 10),
    });

    // Crear otro usuario
    otroUsuario = await db.usuarios.create({
      nombre: "Otro",
      apellido: "Usuario",
      correo: "otro@example.com",
      password_hash: await bcrypt.hash("123456", 10),
    });

    // Crear espacio
    espacio = await db.espacios.create({
      nombre: "Auditorio Principal",
      ubicacion: "Edificio A",
      capacidad: 100,
    });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  test("Debería crear una nueva reserva", async () => {
    const res = await request(app).post("/api/reservas").send({
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
    expect(res.body.tipo_evento).toBe("académico");
  });

  test("No debería permitir reservas con horarios conflictivos", async () => {
    await Reserva.create({
      usuario_id: usuario.id,
      espacio_id: espacio.id,
      fecha_inicio: "2025-12-16T10:00:00",
      fecha_fin: "2025-12-16T12:00:00",
      tipo_evento: "académico",
      asistentes: 30,
    });

    const res = await request(app).post("/api/reservas").send({
      usuario_id: usuario.id,
      espacio_id: espacio.id,
      fecha_inicio: "2025-12-16T11:00:00",
      fecha_fin: "2025-12-16T13:00:00",
      tipo_evento: "académico",
      asistentes: 20,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("El espacio ya está reservado en ese horario.");
  });

  test("Un admin debería poder aprobar una reserva", async () => {
    const reserva = await Reserva.create({
      usuario_id: usuario.id,
      espacio_id: espacio.id,
      fecha_inicio: "2025-12-17T10:00:00",
      fecha_fin: "2025-12-17T12:00:00",
      tipo_evento: "académico",
      asistentes: 20,
      estado: "pendiente",
    });

    const res = await request(app)
      .put(`/api/reservas/${reserva.id}/aprobar`)
      .set("Authorization", "Bearer token-admin")
      .send();

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Reserva aprobada");

    const updated = await Reserva.findByPk(reserva.id);
    expect(updated.estado).toBe("aprobada");
  });

  test("Un admin debería poder rechazar una reserva indicando motivo", async () => {
    const reserva = await Reserva.create({
      usuario_id: usuario.id,
      espacio_id: espacio.id,
      fecha_inicio: "2025-12-18T10:00:00",
      fecha_fin: "2025-12-18T12:00:00",
      tipo_evento: "académico",
      asistentes: 25,
      estado: "pendiente",
    });

    const res = await request(app)
      .put(`/api/reservas/${reserva.id}/rechazar`)
      .set("Authorization", "Bearer token-admin")
      .send({ motivo_rechazo: "Conflicto de horarios" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Reserva rechazada");

    const updated = await Reserva.findByPk(reserva.id);
    expect(updated.estado).toBe("rechazada");
    expect(updated.motivo_rechazo).toBe("Conflicto de horarios");
  });

  test("No se puede rechazar sin motivo", async () => {
    const reserva = await Reserva.create({
      usuario_id: usuario.id,
      espacio_id: espacio.id,
      fecha_inicio: "2025-12-19T10:00:00",
      fecha_fin: "2025-12-19T12:00:00",
      tipo_evento: "deportivo",
      asistentes: 20,
      estado: "pendiente",
    });

    const res = await request(app)
      .put(`/api/reservas/${reserva.id}/rechazar`)
      .set("Authorization", "Bearer token-admin")
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Debe indicar un motivo de rechazo.");
  });

  test("Un usuario puede cancelar su propia reserva pendiente", async () => {
    const reserva = await Reserva.create({
      usuario_id: usuario.id,
      espacio_id: espacio.id,
      fecha_inicio: "2025-12-20T10:00:00",
      fecha_fin: "2025-12-20T12:00:00",
      tipo_evento: "académico",
      asistentes: 15,
      estado: "pendiente",
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

  test("Un usuario no puede cancelar una reserva que no le pertenece", async () => {
    const reserva = await Reserva.create({
      usuario_id: usuario.id,
      espacio_id: espacio.id,
      fecha_inicio: "2025-12-21T10:00:00",
      fecha_fin: "2025-12-21T12:00:00",
      tipo_evento: "académico",
      asistentes: 20,
      estado: "pendiente",
    });

    const res = await request(app)
      .put(`/api/reservas/${reserva.id}/cancelar`)
      .set("Authorization", `Bearer token-usuario-${otroUsuario.id}`)
      .send();

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("No autorizado para cancelar esta reserva");
  });

  test("Usuario puede listar sus propias reservas", async () => {
    await Reserva.create({
      usuario_id: usuario.id,
      espacio_id: espacio.id,
      fecha_inicio: "2025-12-22T10:00:00",
      fecha_fin: "2025-12-22T12:00:00",
      tipo_evento: "académico",
      asistentes: 10,
      estado: "pendiente",
    });

    const res = await request(app)
      .get("/api/reservas/mis-reservas")
      .set("Authorization", `Bearer token-usuario-${usuario.id}`)
      .send();

    expect(res.statusCode).toBe(200);
    expect(res.body.every((r) => r.usuario_id === usuario.id)).toBe(true);
  });

  test("Admin puede listar todas las reservas y filtrarlas", async () => {
    const res = await request(app)
      .get("/api/reservas")
      .set("Authorization", "Bearer token-admin")
      .send();

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test("Admin puede desactivar una reserva", async () => {
    const reserva = await Reserva.create({
      usuario_id: usuario.id,
      espacio_id: espacio.id,
      fecha_inicio: "2025-12-23T10:00:00",
      fecha_fin: "2025-12-23T12:00:00",
      tipo_evento: "cultural",
      asistentes: 15,
      estado: "pendiente",
      is_active: true,
    });

    const res = await request(app)
      .delete(`/api/reservas/${reserva.id}`)
      .set("Authorization", "Bearer token-admin")
      .send();

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Reserva desactivada");

    const reservaDB = await Reserva.findByPk(reserva.id);
    expect(reservaDB.is_active).toBe(false);
  });
});
