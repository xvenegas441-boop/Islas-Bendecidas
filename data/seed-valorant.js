import { pool } from '../db.js';

const agents = [
  "Astra", "Breach", "Brimstone", "Chamber", "Clove", "Cypher", "Deadlock", "Fade", "Gekko", "Harbor",
  "Iso", "Jett", "KAY/O", "Killjoy", "Neon", "Omen", "Phoenix", "Raze", "Reyna", "Sage",
  "Skye", "Sova", "Viper", "Yoru"
];

async function seed() {
  await pool.query('BEGIN');
  try {
    for (const name of agents) {
      await pool.query(
        'INSERT INTO valorant_agents (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [name]
      );
    }
    await pool.query('COMMIT');
    console.log('✅ Agentes de Valorant insertados correctamente.');
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error('❌ Error insertando agentes:', e);
  } finally {
    process.exit(0);
  }
}

seed();