const request = require("supertest");
const app = require("../app");
const db = require("../models");
const { sequelize, espacios: Espacio } = db;

let token; 
let espacioId;

// Middleware mock de autenticación
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.includes("token-usuario-")) {
    const id = parseInt(auth.split("-").pop());
    res.locals.user = { id, role: "usuario" };
  } else if (auth && auth.includes("token-admin")) {
    res.locals.user = { id: 0, role: "admin" };
  }
  next();
});

describe("Gestión de Espacios", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Registrar usuario admin vía API
    const resRegister = await request(app).post("/auth/register").send({
      nombre: "Admin",
      apellido: "Test",
      correo: "admin@test.com",
      password: "1234",
      role: "admin",
    });

    token = resRegister.body.token;
  });

  beforeAll(async () => {
    const espacio = await Espacio.create({
      nombre: "Auditorio Test",
      capacidad: 100,
      estado: "Disponible",
      ubicacion: "Edificio A", // 🔑 necesario para pasar validación
    });

    espacioId = espacio.id;
  });

  it("Debería crear un nuevo espacio", async () => {
    const newEspacio = {
      nombre: "Auditorio Principal",
      capacidad: 200,
      equipamiento: ["proyector", "sonido"],
      ubicacion: "Edificio A",
      estado: "Disponible",
    };

    const res = await request(app)
      .post("/espacios")
      .set("Authorization", `Bearer ${token}`)
      .send(newEspacio);

    expect(res.statusCode).toEqual(201);
    expect(res.body.nombre).toBe("Auditorio Principal");

    espacioId = res.body.id;
  });

  it("Debería actualizar el estado de un espacio", async () => {
    const res = await request(app)
      .put(`/espacios/${espacioId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ estado: "En mantenimiento" });

    expect(res.statusCode).toEqual(200);
    expect(res.body.estado).toBe("En mantenimiento");
  });

  it("Debería eliminar un espacio", async () => {
    const res = await request(app)
      .delete(`/espacios/${espacioId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe("Espacio desactivado");
  });

  afterAll(async () => {
    await sequelize.close();
  });
});
