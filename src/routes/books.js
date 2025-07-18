const express = require('express');
const { db } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Book:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         author:
 *           type: string
 *         isbn:
 *           type: string
 *         category:
 *           type: string
 *         description:
 *           type: string
 *         cover_image:
 *           type: string
 *         publication_year:
 *           type: integer
 *         pages:
 *           type: integer
 *         language:
 *           type: string
 *         available:
 *           type: boolean
 *         rating:
 *           type: number
 *         total_ratings:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *     BookInput:
 *       type: object
 *       required:
 *         - title
 *         - author
 *         - category
 *       properties:
 *         title:
 *           type: string
 *         author:
 *           type: string
 *         isbn:
 *           type: string
 *         category:
 *           type: string
 *         description:
 *           type: string
 *         publication_year:
 *           type: integer
 *         pages:
 *           type: integer
 *         language:
 *           type: string
 */

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Listar todos os livros
 *     tags: [Livros]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Livros por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por título ou autor
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoria
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filtrar por disponibilidade
 *     responses:
 *       200:
 *         description: Lista de livros
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Book'
 *                 pagination:
 *                   type: object
 */

/**
 * GET /api/books
 * Listagem com busca, filtros e paginação (limit/offset)
 */
router.get('/', (req, res) => {
  const page      = parseInt(req.query.page)  || 1;
  const limit     = parseInt(req.query.limit) || 12;
  const offset    = (page - 1) * limit;
  const search    = req.query.search  || '';
  const category  = req.query.category || '';
  const editor    = req.query.editor   || '';
  const author    = req.query.author   || '';
  const available = req.query.available;

  // monta WHERE dinâmico
  const where = [];
  const params = [];

  if (search) {
    where.push('(title LIKE ? OR author LIKE ? OR isbn LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  if (editor) {
    where.push('editor = ?');
    params.push(editor);
  }
  if (author) {
    where.push('author = ?');
    params.push(author);
  }
  if (available !== undefined) {
    where.push('available = ?');
    params.push(available === 'true' ? 1 : 0);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  // conta total de resultados
  const countSql = `SELECT COUNT(*) as total FROM books ${whereClause}`;
  db.get(countSql, params, (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });

    const total      = countRow.total;
    const totalPages = Math.ceil(total / limit);

    // busca página atual
    const dataSql = `
      SELECT * FROM books
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    db.all(dataSql, [...params, limit, offset], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        success: true,
        data: rows,
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
});

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Obter livro por ID
 *     tags: [Livros]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do livro
 *       404:
 *         description: Livro não encontrado
 */
router.get('/:id', (req, res) => {
  const bookId = req.params.id;

  db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, book) => {
    if (err) {
      return res.status(500).json({
        error: 'Erro ao buscar livro',
        message: err.message
      });
    }

    if (!book) {
      return res.status(404).json({
        error: 'Livro não encontrado',
        message: 'O livro solicitado não existe'
      });
    }

    res.json({
      success: true,
      data: book
    });
  });
});

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Criar novo livro (Admin)
 *     tags: [Livros]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookInput'
 *     responses:
 *       201:
 *         description: Livro criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 */
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      title,
      author,
      isbn,
      category,
      description,
      publication_year,
      pages,
      language = 'pt-BR'
    } = req.body;

    // Validações
    if (!title || !author || !category) {
      return res.status(400).json({
        error: 'Dados obrigatórios',
        message: 'Título, autor e categoria são obrigatórios'
      });
    }

    // Verificar se ISBN já existe (se fornecido)
    if (isbn) {
      db.get('SELECT id FROM books WHERE isbn = ?', [isbn], (err, existingBook) => {
        if (err) {
          return res.status(500).json({
            error: 'Erro no banco de dados',
            message: err.message
          });
        }

        if (existingBook) {
          return res.status(409).json({
            error: 'ISBN já cadastrado',
            message: 'Este ISBN já está sendo usado por outro livro'
          });
        }

        insertBook();
      });
    } else {
      insertBook();
    }

    function insertBook() {
      db.run(
        `INSERT INTO books (title, author, isbn, category, description, publication_year, pages, language)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, author, isbn, category, description, publication_year, pages, language],
        function(err) {
          if (err) {
            return res.status(500).json({
              error: 'Erro ao criar livro',
              message: err.message
            });
          }

          // Buscar livro criado
          db.get('SELECT * FROM books WHERE id = ?', [this.lastID], (err, book) => {
            if (err) {
              return res.status(500).json({
                error: 'Erro ao buscar livro criado',
                message: err.message
              });
            }

            res.status(201).json({
              success: true,
              message: 'Livro criado com sucesso',
              data: book
            });
          });
        }
      );
    }
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Atualizar livro (Admin)
 *     tags: [Livros]
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
 *             $ref: '#/components/schemas/BookInput'
 *     responses:
 *       200:
 *         description: Livro atualizado com sucesso
 *       404:
 *         description: Livro não encontrado
 */
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const bookId = req.params.id;
    const {
      title,
      author,
      isbn,
      category,
      description,
      publication_year,
      pages,
      language,
      available
    } = req.body;

    // Verificar se livro existe
    db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, book) => {
      if (err) {
        return res.status(500).json({
          error: 'Erro ao buscar livro',
          message: err.message
        });
      }

      if (!book) {
        return res.status(404).json({
          error: 'Livro não encontrado',
          message: 'O livro solicitado não existe'
        });
      }

      // Atualizar livro
      db.run(
        `UPDATE books SET 
         title = COALESCE(?, title),
         author = COALESCE(?, author),
         isbn = COALESCE(?, isbn),
         category = COALESCE(?, category),
         description = COALESCE(?, description),
         publication_year = COALESCE(?, publication_year),
         pages = COALESCE(?, pages),
         language = COALESCE(?, language),
         available = COALESCE(?, available),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [title, author, isbn, category, description, publication_year, pages, language, available, bookId],
        function(err) {
          if (err) {
            return res.status(500).json({
              error: 'Erro ao atualizar livro',
              message: err.message
            });
          }

          // Buscar livro atualizado
          db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, updatedBook) => {
            if (err) {
              return res.status(500).json({
                error: 'Erro ao buscar livro atualizado',
                message: err.message
              });
            }

            res.json({
              success: true,
              message: 'Livro atualizado com sucesso',
              data: updatedBook
            });
          });
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
 * /api/books/{id}:
 *   delete:
 *     summary: Deletar livro (Admin)
 *     tags: [Livros]
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
 *         description: Livro deletado com sucesso
 *       404:
 *         description: Livro não encontrado
 */
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const bookId = req.params.id;

  // Verificar se livro existe
  db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, book) => {
    if (err) {
      return res.status(500).json({
        error: 'Erro ao buscar livro',
        message: err.message
      });
    }

    if (!book) {
      return res.status(404).json({
        error: 'Livro não encontrado',
        message: 'O livro solicitado não existe'
      });
    }

    // Deletar livro
    db.run('DELETE FROM books WHERE id = ?', [bookId], function(err) {
      if (err) {
        return res.status(500).json({
          error: 'Erro ao deletar livro',
          message: err.message
        });
      }

      res.json({
        success: true,
        message: 'Livro deletado com sucesso'
      });
    });
  });
});

/**
 * @swagger
 * /api/books/categories:
 *   get:
 *     summary: Listar todas as categorias
 *     tags: [Livros]
 *     responses:
 *       200:
 *         description: Lista de categorias
 */
router.get('/categories', (req, res) => {
  db.all(
    'SELECT category, COUNT(*) as count FROM books GROUP BY category ORDER BY category',
    [],
    (err, categories) => {
      if (err) {
        return res.status(500).json({
          error: 'Erro ao buscar categorias',
          message: err.message
        });
      }

      res.json({
        success: true,
        data: categories
      });
    }
  );
});

module.exports = router;