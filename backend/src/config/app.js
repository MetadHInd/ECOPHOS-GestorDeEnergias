import express from "express";
import dotenv from "dotenv";
import pool from "./src/config/db.js";

dotenv.config();

const app = express();
app.use(express.json());

// Ruta para probar conexión
app.get("/api/health", async (req, res) => {
  const [rows] = await pool.query("SELECT NOW() as time");
  res.json({ message: "Conexión exitosa ✅", time: rows[0].time });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor backend activo en http://localhost:${PORT}`));

