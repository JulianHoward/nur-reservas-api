// tests/setupTests.js
jest.mock('../middlewares/auth.middleware', () => ({
  requireAuth: (req, res, next) => {
    // Si ya hay un usuario establecido por el mock de app.js, no sobrescribirlo
    if (!res.locals.user) {
      // Extraer token del header
      let token = req.headers.authorization || "";
      if (token.startsWith("Bearer ")) token = token.slice(7);
      
      const match = token.match(/token-usuario-(\d+)/);
      if (match) {
        res.locals.user = { id: Number(match[1]), role: "usuario" };
      } else if (token.includes("admin")) {
        res.locals.user = { id: 0, role: "admin" };
      } else {
        // Default para compatibilidad con tests antiguos
        res.locals.user = { id: 1, role: "usuario" };
      }
    }
    
    // Asegurar que el token esté en res.locals
    if (!res.locals.token) {
      let token = req.headers.authorization || "";
      if (token.startsWith("Bearer ")) token = token.slice(7);
      res.locals.token = token;
    }
    
    next();
  },
  requireRole: (...roles) => (req, res, next) => {
    // Si ya hay un usuario establecido, verificar su rol
    if (!res.locals.user) {
      // Extraer token del header
      let token = req.headers.authorization || "";
      if (token.startsWith("Bearer ")) token = token.slice(7);
      
      if (token.includes("admin")) {
        res.locals.user = { id: 0, role: "admin" };
      } else {
        res.locals.user = { id: 1, role: "usuario" };
      }
    }
    
    // Verificar que el rol del usuario esté en los roles permitidos
    if (!roles.includes(res.locals.user.role)) {
      return res.status(403).json({ message: "No autorizado" });
    }
    
    next();
  },
}));
