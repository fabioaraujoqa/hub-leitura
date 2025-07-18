require('dotenv').config();
const app = require('./src/app');
const { initDatabase } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await initDatabase();
    console.log('✅ Banco inicializado');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Falha ao iniciar servidor:', err);
    process.exit(1);
  }
})();
