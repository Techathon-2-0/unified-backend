
---

# Project

## 🛠 Setup Instructions

1. **Install Dependencies**

   ```bash
   npm i
   ```

2. **Create a `.env` file** in the root directory and add the following environment variables:

   ```
   DATABASE_URL=your-database-url-here
   JWT_SECRET=your-secret-key-here
   ```

   Replace `your-database-url-here` and `your-secret-key-here` with actual values.

---

## 🚀 Commands to Run

Start the development server:

```bash
npm run dev
```

---

## 🔄 Database Schema Changes

If you make any changes to the database schema, run the following commands:

1. **Generate Migrations**:

   ```bash
   npx drizzle-kit generate
   ```

2. **Apply Migrations**:

   ```bash
   npx drizzle-kit migrate
   ```

---

## 🗂 Project Structure

* `main.ts`: Entry point where main routes are defined.

---

## ⚠️ Important Notes

* **Do not modify** the `drizzle` files.

---

## ✅ How to Run

```bash
npm run dev
```

---
