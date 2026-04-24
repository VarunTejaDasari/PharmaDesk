const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

const LOCK_FILE = path.join(__dirname, '.db_initialized');
const MIGRATION_FILE = path.join(__dirname, '.db_migrated_user_id');

async function initDB() {
  if (!fs.existsSync(LOCK_FILE)) {
    try {
      // USERS
      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          unique_id VARCHAR(12) NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(150) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // PRODUCTS
      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(150) NOT NULL,
          quantity INT DEFAULT 0,
          purchase_price DECIMAL(10,2) DEFAULT 0,
          selling_price DECIMAL(10,2) DEFAULT 0,
          company VARCHAR(150),
          expiry_date DATE NULL,
          un_code VARCHAR(20),
          quantity_per_pack INT DEFAULT 1,
          hsn_number VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // SALES
      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS sales (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity_sold INT NOT NULL,
          sale_price DECIMAL(10,2) NOT NULL,
          buyer_name VARCHAR(150),
          buyer_type VARCHAR(50),
          gst_percent DECIMAL(5,2) DEFAULT 0,
          expiry_date DATE NULL,
          bill_number VARCHAR(20),
          sale_date DATE DEFAULT (CURDATE()),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `);

      // PURCHASES
      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS purchases (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity_purchased INT NOT NULL,
          purchase_price DECIMAL(10,2) NOT NULL,
          supplier_name VARCHAR(150),
          gst_percent DECIMAL(5,2) DEFAULT 0,
          expiry_date DATE NULL,
          hsn_code VARCHAR(50),
          purchase_date DATE DEFAULT (CURDATE()),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `);

      // PENDING PAYMENTS
      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS pending_payments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          party_name VARCHAR(100) NOT NULL,
          party_type ENUM('customer', 'supplier') NOT NULL DEFAULT 'customer',
          total_amount DECIMAL(12,2) NOT NULL,
          description TEXT,
          due_date DATE,
          status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // PAYMENT TRANSACTIONS
      await promisePool.query(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          payment_id INT NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          note VARCHAR(255),
          paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (payment_id) REFERENCES pending_payments(id) ON DELETE CASCADE
        )
      `);

      await promisePool.query(`CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(expiry_date)`);
      await promisePool.query(`CREATE INDEX IF NOT EXISTS idx_payments_user ON pending_payments(user_id, status)`);

      fs.writeFileSync(LOCK_FILE, new Date().toISOString());
      fs.writeFileSync(MIGRATION_FILE, new Date().toISOString());

      console.log(' Fresh DB setup completed');

    } catch (err) {
      console.error(' DB init failed:', err.message);
    }

  } else {
    console.log(' DB already initialized');
    await runMigrations();
  }
}

async function runMigrations() {
  if (fs.existsSync(MIGRATION_FILE)) {
    console.log(' Migrations already applied');
  } else {
    console.log(' Running migrations...');
    try {
      const [cols] = await promisePool.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'user_id'
      `, [process.env.DB_NAME]);

      if (cols.length === 0) {
        await promisePool.query(`ALTER TABLE products ADD COLUMN user_id INT`);
        await promisePool.query(`ALTER TABLE products ADD FOREIGN KEY (user_id) REFERENCES users(id)`);
      }

      fs.writeFileSync(MIGRATION_FILE, new Date().toISOString());
      console.log(' Migration completed');
    } catch (err) {
      console.error(' Migration failed:', err.message);
    }
  }

  // Always run new column migrations (safe — IF NOT EXISTS)
  const newCols = [
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date DATE NULL`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS un_code VARCHAR(20)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_per_pack INT DEFAULT 1`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_number VARCHAR(50)`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS gst_percent DECIMAL(5,2) DEFAULT 0`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS expiry_date DATE NULL`,
    `ALTER TABLE sales ADD COLUMN IF NOT EXISTS bill_number VARCHAR(20)`,
    `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS gst_percent DECIMAL(5,2) DEFAULT 0`,
    `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS expiry_date DATE NULL`,
    `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50)`,
  ];
  for (const sql of newCols) {
    try { await promisePool.query(sql); } catch (e) { /* ignore if already exists */ }
  }
  console.log(' Column migrations done');
}

pool.getConnection((err, conn) => {
  if (err) {
    console.error(' MySQL connection failed:', err.message);
    return;
  }
  conn.release();
  initDB();
});

module.exports = promisePool;
