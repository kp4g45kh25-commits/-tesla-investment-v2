import express from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database(
  process.env.DATABASE_PATH || "tesla-investment.db"
);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    shares REAL NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

function seedDemoAccounts() {
  const existing = db
    .prepare("SELECT COUNT(*) AS count FROM users")
    .get();

  if (existing.count > 0) return;

  const passwordHash = bcrypt.hashSync(
    "demo123",
    12
  );

  const insertUser = db.prepare(`
    INSERT INTO users
      (name, email, password_hash, role, status)
    VALUES
      (?, ?, ?, ?, ?)
  `);

  const client = insertUser.run(
    "Demo Client",
    "client@example.com",
    passwordHash,
    "client",
    "active"
  );

  insertUser.run(
    "Demo Manager",
    "manager@example.com",
    passwordHash,
    "manager",
    "active"
  );

  const clientId = client.lastInsertRowid;

  db.prepare(`
    INSERT INTO holdings
      (user_id, symbol, name, shares, price)
    VALUES
      (?, ?, ?, ?, ?)
  `).run(
    clientId,
    "TSLA",
    "Tesla",
    25,
    342.50
  );

  db.prepare(`
    INSERT INTO holdings
      (user_id, symbol, name, shares, price)
    VALUES
      (?, ?, ?, ?, ?)
  `).run(
    clientId,
    "CASH",
    "Demo Cash",
    1000,
    1
  );

  db.prepare(`
    INSERT INTO transactions
      (user_id, type, amount, note)
    VALUES
      (?, ?, ?, ?)
  `).run(
    clientId,
    "Demo allocation",
    8562.50,
    "Fictional portfolio record"
  );

  db.prepare(`
    INSERT INTO notifications
      (user_id, title, body)
    VALUES
      (?, ?, ?)
  `).run(
    clientId,
    "Welcome",
    "This is a demonstration account."
  );

  db.prepare(`
    INSERT INTO documents
      (user_id, title, category)
    VALUES
      (?, ?, ?)
  `).run(
    clientId,
    "Demo Account Summary",
    "Account"
  );
}

seedDemoAccounts();

app.use(express.json());

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "development-only-change-this-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

function currentUser(req) {
  if (!req.session.userId) return null;

  return db
    .prepare(`
      SELECT id, name, email, role, status
      FROM users
      WHERE id = ?
    `)
    .get(req.session.userId);
}

function requireLogin(req, res, next) {
  const user = currentUser(req);

  if (!user) {
    return res
      .status(401)
      .json({ error: "Please sign in." });
  }

  if (user.status !== "active") {
    return res
      .status(403)
      .json({ error: "Account is not active." });
  }

  req.user = user;
  next();
}

function requireManager(req, res, next) {
  if (req.user?.role !== "manager") {
    return res
      .status(403)
      .json({ error: "Manager access required." });
  }

  next();
}

app.post("/api/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password
    } = req.body || {};

    if (
      !name ||
      !email ||
      !password ||
      password.length < 8
    ) {
      return res.status(400).json({
        error:
          "Name, email and a password of at least 8 characters are required."
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const passwordHash =
      await bcrypt.hash(password, 12);

    const result = db
      .prepare(`
        INSERT INTO users
          (name, email, password_hash)
        VALUES
          (?, ?, ?)
      `)
      .run(
        String(name).trim(),
        normalizedEmail,
        passwordHash
      );

    req.session.userId =
      result.lastInsertRowid;

    const user = currentUser(req);

    db.prepare(`
      INSERT INTO notifications
        (user_id, title, body)
      VALUES
        (?, ?, ?)
    `).run(
      user.id,
      "Welcome",
      "Your demonstration account has been created."
    );

    res.json({
      ok: true,
      role: user.role
    });

  } catch (error) {
    if (
      String(error.message)
        .includes("UNIQUE")
    ) {
      return res.status(409).json({
        error: "An account with that email already exists."
      });
    }

    console.error(error);

    res.status(500).json({
      error: "Registration failed."
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body || {};

    const user = db
      .prepare(`
        SELECT *
        FROM users
        WHERE email = ?
      `)
      .get(
        String(email || "")
          .trim()
          .toLowerCase()
      );

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    const valid =
      await bcrypt.compare(
        String(password || ""),
        user.password_hash
      );

    if (!valid) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        error: "This account is not active."
      });
    }

    req.session.userId = user.id;

    res.json({
      ok: true,
      role: user.role
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Login failed."
    });
  }
});

app.post(
  "/api/logout",
  (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  }
);

app.get(
  "/api/me",
  requireLogin,
  (req, res) => {
    res.json({
      user: req.user
    });
  }
);

app.get(
  "/api/client/dashboard",
  requireLogin,
  (req, res) => {
    if (req.user.role !== "client") {
      return res.status(403).json({
        error: "Client access required."
      });
    }

    const holdings = db
      .prepare(`
        SELECT
          id,
          symbol,
          name,
          shares,
          price,
          shares * price AS value
        FROM holdings
        WHERE user_id = ?
      `)
      .all(req.user.id);

    const transactions = db
      .prepare(`
        SELECT
          id,
          type,
          amount,
          note,
          created_at
        FROM transactions
        WHERE user_id = ?
        ORDER BY id DESC
      `)
      .all(req.user.id);

    const requests = db
      .prepare(`
        SELECT
          id,
          type,
          amount,
          status,
          created_at
        FROM requests
        WHERE user_id = ?
        ORDER BY id DESC
      `)
      .all(req.user.id);

    const notifications = db
      .prepare(`
        SELECT
          id,
          title,
          body,
          created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY id DESC
      `)
      .all(req.user.id);

    const documents = db
      .prepare(`
        SELECT
          id,
          title,
          category
        FROM documents
        WHERE user_id = ?
        ORDER BY id DESC
      `)
      .all(req.user.id);

    const total = holdings.reduce(
      (sum, item) =>
        sum + Number(item.value),
      0
    );

    res.json({
      user: req.user,
      holdings,
      transactions,
      requests,
      notifications,
      documents,
      total
    });
  }
);

app.post(
  "/api/client/request",
  requireLogin,
  (req, res) => {
    if (req.user.role !== "client") {
      return res.status(403).json({
        error: "Client access required."
      });
    }

    const {
      type,
      amount
    } = req.body || {};

    const allowed = [
      "deposit",
      "withdrawal"
    ];

    const numericAmount =
      Number(amount);

    if (
      !allowed.includes(type) ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        error: "Enter a valid request type and amount."
      });
    }

    db.prepare(`
      INSERT INTO requests
        (user_id, type, amount)
      VALUES
        (?, ?, ?)
    `).run(
      req.user.id,
      type,
      numericAmount
    );

    db.prepare(`
      INSERT INTO notifications
        (user_id, title, body)
      VALUES
        (?, ?, ?)
    `).run(
      req.user.id,
      "Request received",
      `Your ${type} request was recorded for review.`
    );

    res.json({
      ok: true
    });
  }
);

app.get(
  "/api/manager/overview",
  requireLogin,
  requireManager,
  (req, res) => {
    const clients = db
      .prepare(`
        SELECT
          id,
          name,
          email,
          status,
          created_at
        FROM users
        WHERE role = 'client'
        ORDER BY id DESC
      `)
      .all();

    const requests = db
      .prepare(`
        SELECT
          requests.id,
          requests.type,
          requests.amount,
          requests.status,
          requests.created_at,
          users.name,
          users.email
        FROM requests
        JOIN users
          ON users.id = requests.user_id
        ORDER BY requests.id DESC
      `)
      .all();

    const pending =
      requests.filter(
        item => item.status === "pending"
      ).length;

    const demoAssets =
      db.prepare(`
        SELECT
          COALESCE(
            SUM(shares * price),
            0
          ) AS total
        FROM holdings
      `).get().total;

    res.json({
      clients,
      requests,
      stats: {
        clients: clients.length,
        pendingRequests: pending,
        demoAssets
      }
    });
  }
);

app.post(
  "/api/manager/user/:id/status",
  requireLogin,
  requireManager,
  (req, res) => {
    const status =
      req.body?.status;

    if (
      ![
        "active",
        "suspended"
      ].includes(status)
    ) {
      return res.status(400).json({
        error: "Invalid status."
      });
    }

    db.prepare(`
      UPDATE users
      SET status = ?
      WHERE id = ?
        AND role = 'client'
    `).run(
      status,
      req.params.id
    );

    res.json({
      ok: true
    });
  }
);

app.post(
  "/api/manager/request/:id",
  requireLogin,
  requireManager,
  (req, res) => {
    const status =
      req.body?.status;

    if (
      ![
        "approved",
        "rejected"
      ].includes(status)
    ) {
      return res.status(400).json({
        error: "Invalid request status."
      });
    }

    const request = db
      .prepare(`
        SELECT *
        FROM requests
        WHERE id = ?
      `)
      .get(req.params.id);

    if (!request) {
      return res.status(404).json({
        error: "Request not found."
      });
    }

    db.prepare(`
      UPDATE requests
      SET status = ?
      WHERE id = ?
    `).run(
      status,
      req.params.id
    );

    db.prepare(`
      INSERT INTO notifications
        (user_id, title, body)
      VALUES
        (?, ?, ?)
    `).run(
      request.user_id,
      "Request updated",
      `Your ${request.type} request is now ${status}.`
    );

    res.json({
      ok: true
    });
  }
);

app.get(
  "/health",
  (req, res) => {
    res.json({
      ok: true,
      service: "Tesla Investment prototype"
    });
  }
);

app.get(
  "*",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );
  }
);

app.listen(
  PORT,
  () => {
    console.log(
      `Tesla Investment prototype running on port ${PORT}`
    );
  }
);