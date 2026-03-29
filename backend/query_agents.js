const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const result = await pool.query(`
      SELECT id, slug, name, system_prompt, description, category, is_premium, is_active 
      FROM agents 
      ORDER BY sort_order
    `);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
main();
