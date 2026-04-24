# PharmaDesk — Pharmacy Inventory & Business Management System

A full-stack web application built for small and mid-sized pharmacies to manage inventory, track sales and purchases, monitor expiry dates, forecast demand, and handle payment ledgers — all in one place.

---

## Features

- **Inventory Management** — Add, update, and track products with HSN codes, pack quantities, and UN codes
- **Sales & Purchase Tracking** — Log transactions with GST, bill numbers, supplier/buyer details
- **Expiry Alert System** — Automated 30-day lookahead flagging products at risk of expiry
- **Demand Forecasting** — Rule-based monthly demand estimation using 3-month rolling sales averages weighted by India-specific seasonal factors (monsoon, flu season)
- **Substitute Suggestion Engine** — Surfaces in-stock alternatives for out-of-stock products using keyword-matching and same-company heuristics
- **Payment Ledger** — Track partial and full payments for both customers and suppliers with full transaction history
- **Live Dashboard** — Real-time KPIs including daily revenue, profit margin, units sold, and low-stock alerts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Auth | JWT (JSON Web Tokens) |
| API | RESTful, 8 modular route groups |

---

## Project Structure

```
meditrack/
├── frontend/
│   ├── public/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.js
│       │   ├── Products.js
│       │   ├── Sales.js
│       │   ├── Purchases.js
│       │   ├── Expiry.js
│       │   ├── Forecast.js
│       │   ├── Payments.js
│       │   ├── Login.js
│       │   └── Register.js
│       ├── App.js
│       ├── api.js
│       └── Toast.js
└── backend/
    └── src/
        ├── config/
        │   └── db.js
        ├── middleware/
        │   └── authMiddleware.js
        ├── routes/
        │   ├── auth.js
        │   ├── products.js
        │   ├── sales.js
        │   ├── purchases.js
        │   ├── dashboard.js
        │   ├── expiry.js
        │   ├── forecast.js
        │   ├── substitutes.js
        │   └── payments.js
        └── index.js
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MySQL 8+

### 1. Clone the repository

```bash
git clone https://github.com/VarunTejaDasari/PharmaDesk.git
cd meditrack
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=stockrx
JWT_SECRET=your_jwt_secret
PORT=5000
```

Start the backend server:

```bash
node src/index.js
```

> The database schema and all tables are auto-created on first run — no manual SQL setup needed.

### 3. Set up the frontend

```bash
cd frontend
npm install
npm start
```

The app runs at `http://localhost:3000` and connects to the backend at `http://localhost:5000`.

---

## Database Schema

Six normalized tables with automated migrations on startup:

| Table | Description |
|---|---|
| `users` | Registered pharmacy accounts |
| `products` | Inventory items with pricing, expiry, HSN |
| `sales` | Sales transactions with GST and buyer info |
| `purchases` | Purchase records with supplier details |
| `pending_payments` | Customer/supplier payment records |
| `payment_transactions` | Individual payment installments |

---

## API Routes

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/products` | List all products |
| POST | `/api/products` | Add new product |
| GET | `/api/sales` | List sales |
| POST | `/api/sales` | Record a sale |
| GET | `/api/purchases` | List purchases |
| POST | `/api/purchases` | Record a purchase |
| GET | `/api/dashboard/summary` | Live KPI summary |
| GET | `/api/expiry` | All products with expiry info |
| GET | `/api/expiry/alerts` | Products expiring within 30 days |
| GET | `/api/forecast` | Next month demand forecast |
| GET | `/api/substitutes/:id` | Suggest substitutes for a product |
| GET | `/api/payments` | List all payment records |
| POST | `/api/payments` | Create payment record |
| POST | `/api/payments/:id/pay` | Record a payment installment |

---

## License

MIT License — free to use and modify.

---

## Author

**Varun Teja Dasari**
[LinkedIn](https://linkedin.com/in/dasarivarunteja) · [GitHub](https://github.com/VarunTejaDasari)