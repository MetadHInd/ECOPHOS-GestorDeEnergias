import pool from './db.js';

(async () => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS resultado');
    console.log('✅ Conexión exitosa a MySQL. Resultado:', rows[0].resultado);
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
})();
