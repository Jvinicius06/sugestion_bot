import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Criar diretório data/ se não existir
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Caminho do banco de dados
const dbPath = path.join(dataDir, 'suggestions.db');
const db = new Database(dbPath);

console.log(`📂 Banco de dados: ${dbPath}`);

// Criar tabelas se não existirem
db.exec(`
  CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT UNIQUE NOT NULL,
    thread_id TEXT,
    audit_message_id TEXT,
    author_id TEXT NOT NULL,
    author_username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK(vote_type IN ('up', 'down')),
    voted_at INTEGER NOT NULL,
    FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE CASCADE,
    UNIQUE(suggestion_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS edit_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_id INTEGER NOT NULL,
    old_content TEXT NOT NULL,
    new_content TEXT NOT NULL,
    edited_by_id TEXT NOT NULL,
    edited_by_username TEXT NOT NULL,
    edited_at INTEGER NOT NULL,
    FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_votes_suggestion ON votes(suggestion_id);
  CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
  CREATE INDEX IF NOT EXISTS idx_edit_history_suggestion ON edit_history(suggestion_id);
`);

// Preparar queries
export const queries = {
  // Criar nova sugestão
  createSuggestion: db.prepare(`
    INSERT INTO suggestions (message_id, thread_id, author_id, author_username, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  // Buscar sugestão por message_id
  getSuggestionByMessageId: db.prepare(`
    SELECT * FROM suggestions WHERE message_id = ?
  `),

  // Adicionar ou atualizar voto
  upsertVote: db.prepare(`
    INSERT INTO votes (suggestion_id, user_id, vote_type, voted_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(suggestion_id, user_id)
    DO UPDATE SET vote_type = excluded.vote_type, voted_at = excluded.voted_at
  `),

  // Remover voto (quando usuário clica no mesmo botão)
  removeVote: db.prepare(`
    DELETE FROM votes WHERE suggestion_id = ? AND user_id = ?
  `),

  // Buscar voto específico de um usuário
  getUserVote: db.prepare(`
    SELECT vote_type FROM votes WHERE suggestion_id = ? AND user_id = ?
  `),

  // Contar votos de uma sugestão
  countVotes: db.prepare(`
    SELECT
      COUNT(CASE WHEN vote_type = 'up' THEN 1 END) as upvotes,
      COUNT(CASE WHEN vote_type = 'down' THEN 1 END) as downvotes
    FROM votes
    WHERE suggestion_id = ?
  `),

  // Atualizar thread_id
  updateThreadId: db.prepare(`
    UPDATE suggestions SET thread_id = ? WHERE id = ?
  `),

  // Buscar sugestões recentes (para sincronização de nicknames)
  getRecentSuggestions: db.prepare(`
    SELECT * FROM suggestions WHERE created_at > ? ORDER BY created_at DESC
  `),

  // Atualizar username/nickname do autor
  updateAuthorUsername: db.prepare(`
    UPDATE suggestions SET author_username = ? WHERE id = ?
  `),

  // Deletar sugestão (CASCADE vai remover os votos automaticamente)
  deleteSuggestion: db.prepare(`
    DELETE FROM suggestions WHERE id = ?
  `),

  // Buscar sugestão por thread_id
  getSuggestionByThreadId: db.prepare(`
    SELECT * FROM suggestions WHERE thread_id = ?
  `),

  // Atualizar audit_message_id
  updateAuditMessageId: db.prepare(`
    UPDATE suggestions SET audit_message_id = ? WHERE id = ?
  `),

  // Salvar histórico de edição
  saveEditHistory: db.prepare(`
    INSERT INTO edit_history (suggestion_id, old_content, new_content, edited_by_id, edited_by_username, edited_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  // Buscar histórico de edições de uma sugestão
  getEditHistory: db.prepare(`
    SELECT * FROM edit_history WHERE suggestion_id = ? ORDER BY edited_at ASC
  `),

  // Atualizar conteúdo da sugestão
  updateSuggestionContent: db.prepare(`
    UPDATE suggestions SET content = ? WHERE id = ?
  `)
};

export default db;
