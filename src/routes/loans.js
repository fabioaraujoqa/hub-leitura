const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// POST /api/loans — reservar um livro
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.id;            // disponível após o middleware
  const { bookId } = req.body;

  // 1) Verifica se já tem < 3 empréstimos ativos
  db.get(
    `SELECT COUNT(*) AS cnt 
     FROM loans 
     WHERE user_id = ? 
       AND status = 'active'`,
    [userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro no banco', message: err.message });
      if (row.cnt >= 3) {
        return res.status(403).json({ error: 'Limite atingido', message: 'Você só pode reservar 3 livros por vez.' });
      }

      // 2) Insere o empréstimo
      db.run(
        `INSERT INTO loans (user_id, book_id, due_date) 
         VALUES (?, ?, datetime('now', '+7 days'))`,
        [userId, bookId],
        function(err) {
          if (err) return res.status(500).json({ error: 'Erro ao reservar', message: err.message });
          res.status(201).json({ success: true, message: 'Reservado com sucesso', loanId: this.lastID });
        }
      );
    }
  );
});

module.exports = router;
