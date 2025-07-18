const express = require('express');
const { db } = require('../config/database');
const router = express.Router();

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Enviar mensagem de contato
 *     tags: [Contato]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, subject, message]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Mensagem recebida com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.post('/', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }
  const stmt = db.prepare(
    `INSERT INTO messages (name,email,subject,message) VALUES (?,?,?,?)`
  );
  stmt.run(name, email, subject, message, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Obrigado pelo contato!' });
  });
  stmt.finalize();
});

module.exports = router;
