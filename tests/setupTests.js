// tests/setupTests.js
jest.mock('../middlewares/auth.middleware', () => ({
  requireAuth: (req, res, next) => {
    // Usuario mockeado
    res.locals.user = { id: 1, role: 'user' };
    next();
  },
  requireRole: (...roles) => (req, res, next) => {
    // Admin mockeado
    res.locals.user = { id: 0, role: 'admin' };
    next();
  },
}));
