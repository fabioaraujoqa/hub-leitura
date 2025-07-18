const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *         avatar:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Listar usuários (Admin)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de usuários
 *       403:
 *         description: Acesso negado
 */
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = 'WHERE name LIKE ? OR email LIKE ?';
      params = [`%${search}%`, `%${search}%`];
    }

    // Contar total
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    
    db.get(countQuery, params, (err, countResult) => {
      if (err) {
        return res.status(500).json({
          error: 'Erro ao contar usuários',
          message: err.message
        });
      }

      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);

      // Buscar usuários
      const usersQuery = `
        SELECT id, name, email, role, avatar, created_at 
        FROM users 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;

      db.all(usersQuery, [...params, limit, offset], (err, users) => {
        if (err) {
          return res.status(500).json({
            error: 'Erro ao buscar usuários',
            message: err.message
          });
        }

        res.json({
          success: true,
          data: users,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obter usuário por ID
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do usuário
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/:id', authenticateToken, requireOwnerOrAdmin, (req, res) => {
  const userId = req.params.id;

  db.get(
    'SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({
          error: 'Erro ao buscar usuário',
          message: err.message
        });
      }

      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'O usuário solicitado não existe'
        });
      }

      res.json({
        success: true,
        data: user
      });
    }
  );
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Atualizar usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *       404:
 *         description: Usuário não encontrado
 */
router.put('/:id', authenticateToken, requireOwnerOrAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, password } = req.body;

    // Verificar se usuário existe
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        return res.status(500).json({
          error: 'Erro ao buscar usuário',
          message: err.message
        });
      }

      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          message: 'O usuário solicitado não existe'
        });
      }

      // Preparar dados para atualização
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      // Atualizar usuário
      db.run(
        `UPDATE users SET 
         name = COALESCE(?, name),
         email = COALESCE(?, email),
         password = COALESCE(?, password),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, email, hashedPassword, userId],
        function(err) {
          if (err) {
            return res.status(500).json({
              error: 'Erro ao atualizar usuário',
              message: err.message
            });
          }

          // Buscar usuário atualizado
          db.get(
            'SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?',
            [userId],
            (err, updatedUser) => {
              if (err) {
                return res.status(500).json({
                  error: 'Erro ao buscar usuário atualizado',
                  message: err.message
                });
              }

              res.json({
                success: true,
                message: 'Usuário atualizado com sucesso',
                data: updatedUser
              });
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/favorites:
 *   get:
 *     summary: Obter livros favoritos do usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de favoritos
 */
router.get('/:id/favorites', authenticateToken, requireOwnerOrAdmin, (req, res) => {
  const userId = req.params.id;

  db.all(
    `SELECT b.*, f.created_at as favorited_at 
     FROM books b 
     INNER JOIN favorites f ON b.id = f.book_id 
     WHERE f.user_id = ? 
     ORDER BY f.created_at DESC`,
    [userId],
    (err, favorites) => {
      if (err) {
        return res.status(500).json({
          error: 'Erro ao buscar favoritos',
          message: err.message
        });
      }

      res.json({
        success: true,
        data: favorites
      });
    }
  );
});

/**
 * @swagger
 * /api/users/{id}/favorites/{bookId}:
 *   post:
 *     summary: Adicionar livro aos favoritos
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Livro adicionado aos favoritos
 *       409:
 *         description: Livro já está nos favoritos
 */
router.post('/:id/favorites/:bookId', authenticateToken, requireOwnerOrAdmin, (req, res) => {
  const userId = req.params.id;
  const bookId = req.params.bookId;

  // Verificar se já está nos favoritos
  db.get(
    'SELECT id FROM favorites WHERE user_id = ? AND book_id = ?',
    [userId, bookId],
    (err, existing) => {
      if (err) {
        return res.status(500).json({
          error: 'Erro ao verificar favoritos',
          message: err.message
        });
      }

      if (existing) {
        return res.status(409).json({
          error: 'Já está nos favoritos',
          message: 'Este livro já está na sua lista de favoritos'
        });
      }

      // Adicionar aos favoritos
      db.run(
        'INSERT INTO favorites (user_id, book_id) VALUES (?, ?)',
        [userId, bookId],
        function(err) {
          if (err) {
            return res.status(500).json({
              error: 'Erro ao adicionar favorito',
              message: err.message
            });
          }

          res.status(201).json({
            success: true,
            message: 'Livro adicionado aos favoritos'
          });
        }
      );
    }
  );
});

/**
 * @swagger
 * /api/users/{id}/favorites/{bookId}:
 *   delete:
 *     summary: Remover livro dos favoritos
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Livro removido dos favoritos
 */
router.delete('/:id/favorites/:bookId', authenticateToken, requireOwnerOrAdmin, (req, res) => {
  const userId = req.params.id;
  const bookId = req.params.bookId;

  db.run(
    'DELETE FROM favorites WHERE user_id = ? AND book_id = ?',
    [userId, bookId],
    function(err) {
      if (err) {
        return res.status(500).json({
          error: 'Erro ao remover favorito',
          message: err.message
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          error: 'Favorito não encontrado',
          message: 'Este livro não está nos seus favoritos'
        });
      }

      res.json({
        success: true,
        message: 'Livro removido dos favoritos'
      });
    }
  );
});

module.exports = router;