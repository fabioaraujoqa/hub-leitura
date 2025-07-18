const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Caminho para o arquivo do banco de dados
const DB_PATH = path.join(__dirname, '../../database/biblioteca.db');
// Garante que a pasta existe
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// Conexão com o SQLite
const db = new sqlite3.Database(DB_PATH, err => {
  if (err) console.error('❌ Erro ao conectar com SQLite:', err.message);
  else console.log('✅ Conectado ao banco SQLite');
});

// Inicializa todas as tabelas e popula dados iniciais
async function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Usuários
      db.run(
        `CREATE TABLE IF NOT EXISTS users (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           name TEXT NOT NULL,
           email TEXT UNIQUE NOT NULL,
           password TEXT NOT NULL,
           role TEXT DEFAULT 'user' CHECK(role IN ('user','admin')),
           avatar TEXT,
           created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
           updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
         );`
      );

      // Livros (sem UNIQUE em isbn para permitir seeds com mesmo ISBN)
      db.run(
        `CREATE TABLE IF NOT EXISTS books (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           title TEXT NOT NULL,
           author TEXT NOT NULL,
           isbn TEXT,
           editor TEXT,
           category TEXT NOT NULL,
           description TEXT,
           cover_image TEXT,
           publication_year INTEGER,
           pages INTEGER,
           language TEXT DEFAULT 'pt-BR',
           available INTEGER DEFAULT 1,
           rating REAL DEFAULT 0,
           total_ratings INTEGER DEFAULT 0,
           created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
           updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
         );`
      );

      // Empréstimos
      db.run(
        `CREATE TABLE IF NOT EXISTS loans (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           user_id INTEGER NOT NULL,
           book_id INTEGER NOT NULL,
           loan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
           return_date DATETIME,
           due_date DATETIME NOT NULL,
           status TEXT DEFAULT 'active' CHECK(status IN ('active','returned','overdue')),
           FOREIGN KEY(user_id) REFERENCES users(id),
           FOREIGN KEY(book_id) REFERENCES books(id)
         );`
      );

      // Favoritos
      db.run(
        `CREATE TABLE IF NOT EXISTS favorites (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           user_id INTEGER NOT NULL,
           book_id INTEGER NOT NULL,
           created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
           UNIQUE(user_id, book_id),
           FOREIGN KEY(user_id) REFERENCES users(id),
           FOREIGN KEY(book_id) REFERENCES books(id)
         );`
      );

      // Avaliações
      db.run(
        `CREATE TABLE IF NOT EXISTS reviews (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           user_id INTEGER NOT NULL,
           book_id INTEGER NOT NULL,
           rating INTEGER NOT NULL CHECK(rating>=1 AND rating<=5),
           comment TEXT,
           created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
           UNIQUE(user_id, book_id),
           FOREIGN KEY(user_id) REFERENCES users(id),
           FOREIGN KEY(book_id) REFERENCES books(id)
         );`
      );

      // Mensagens de contato
      db.run(
        `CREATE TABLE IF NOT EXISTS contacts (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           name TEXT NOT NULL,
           email TEXT NOT NULL,
           subject TEXT NOT NULL,
           message TEXT NOT NULL,
           created_at DATETIME DEFAULT CURRENT_TIMESTAMP
         );`
      );

      // Inserção de dados iniciais
      insertInitialUsers();
      seedBooksFromJson();
    });

    resolve();
  });
}

// Insere usuários admin e teste
function insertInitialUsers() {
  const bcrypt = require('bcryptjs');
  db.get('SELECT COUNT(*) AS cnt FROM users', (err, row) => {
    if (err) return console.error(err.message);
    if (row.cnt > 0) return;

    console.log('📝 Inserindo usuários iniciais...');
    const adminPwd = bcrypt.hashSync('admin123', 10);
    db.run(
      `INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)`,
      ['Administrador','admin@hubdeleitura.com',adminPwd,'admin']
    );

    const userPwd = bcrypt.hashSync('user123', 10);
    db.run(
      `INSERT INTO users (name,email,password) VALUES (?,?,?)`,
      ['João Silva','user@email.com',userPwd]
    );

    console.log('✅ Usuários iniciais inseridos');
  });
}

// Popula tabela de livros a partir de seeds/books.json
function seedBooksFromJson() {
  const seedFile = path.join(__dirname, '../../seeds/books.json');
  if (!fs.existsSync(seedFile)) return;

  db.get('SELECT COUNT(*) AS cnt FROM books', (err, row) => {
    if (err) return console.error(err.message);
    if (row.cnt > 0) return;

    const books = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    console.log(`📝 Inserindo seed de ${books.length} livros...`);
    const stmt = db.prepare(
      `INSERT INTO books 
         (title,author,isbn,editor,category,description,cover_image,publication_year,pages,language,available) 
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    );

    books.forEach(b => {
      stmt.run(
        b.title,
        b.author,
        b.isbn || null,
        b.editor || '',
        b.category,
        b.description || '',
        b.cover_image || '',
        b.publication_year || null,
        b.pages || null,
        b.language || 'pt-BR',
        b.available || 0
      );
    });

    stmt.finalize(() => console.log('✅ Seed de livros inserido'));
  });
}

module.exports = { db, initDatabase };
