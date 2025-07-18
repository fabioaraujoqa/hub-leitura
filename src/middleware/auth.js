const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

// Chave secreta JWT (em produção, usar variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'hub-de-leitura-secret-key-2024';

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Token de acesso requerido',
      message: 'Você precisa estar logado para acessar este recurso'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Token inválido',
        message: 'Seu token de acesso expirou ou é inválido'
      });
    }

    req.user = user;
    next();
  });
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Apenas administradores podem acessar este recurso'
    });
  }
  next();
};

// Middleware para verificar se é o próprio usuário ou admin
const requireOwnerOrAdmin = (req, res, next) => {
  const userId = parseInt(req.params.id);
  
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Você só pode acessar seus próprios dados'
    });
  }
  next();
};

// Função para gerar token JWT
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Função para verificar se usuário existe
const verifyUserExists = (userId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnerOrAdmin,
  generateToken,
  verifyUserExists,
  JWT_SECRET
};
