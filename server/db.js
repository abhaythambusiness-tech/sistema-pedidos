const Database = require('better-sqlite3');
const path = require('path');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'admin', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS ingredients (id TEXT PRIMARY KEY, name TEXT NOT NULL, emoji TEXT NOT NULL DEFAULT '', stock REAL NOT NULL DEFAULT 0, min_stock REAL NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT 'u');
CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, emoji TEXT NOT NULL DEFAULT '', price REAL NOT NULL, description TEXT NOT NULL DEFAULT '', recipe_json TEXT NOT NULL, removable_json TEXT NOT NULL DEFAULT '[]', extras_json TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT (datetime('now')), customer_name TEXT NOT NULL, source TEXT NOT NULL, items_json TEXT NOT NULL, total REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending', printed_at TEXT);
CREATE TABLE IF NOT EXISTS inventory_movements (id INTEGER PRIMARY KEY AUTOINCREMENT, ingredient_id TEXT NOT NULL, delta REAL NOT NULL, reason TEXT NOT NULL, note TEXT, order_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_movements_created ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
`);
module.exports = db;
