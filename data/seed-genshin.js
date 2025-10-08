import { pool } from '../db.js';

const characters = [
  "Albedo", "Aloy", "Amber", "Arataki Itto", "Barbara", "Beidou", "Bennett", "Candace", "Chongyun", "Collei",
  "Cyno", "Dehya", "Diluc", "Diona", "Dori", "Eula", "Faruzan", "Fischl", "Ganyu", "Gorou",
  "Hu Tao", "Jean", "Kaedehara Kazuha", "Kaeya", "Kamisato Ayaka", "Kamisato Ayato", "Kaveh", "Keqing", "Kirara", "Klee",
  "Kuki Shinobu", "Layla", "Lisa", "Lynette", "Lyney", "Mika", "Mona", "Nahida", "Navia", "Neuvillette",
  "Nilou", "Ningguang", "Noelle", "Qiqi", "Raiden Shogun", "Razor", "Rosaria", "Sangonomiya Kokomi", "Sayu", "Sethos",
  "Shenhe", "Shikanoin Heizou", "Sucrose", "Tartaglia", "Thoma", "Tighnari", "Venti", "Wanderer", "Xiangling", "Xiao",
  "Xingqiu", "Xinyan", "Yae Miko", "Yanfei", "Yaoyao", "Yelan", "Yoimiya", "Yun Jin", "Zhongli"
];

async function seed() {
  await pool.query('BEGIN');
  try {
    for (const name of characters) {
      await pool.query(
        'INSERT INTO genshin_characters (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [name]
      );
    }
    await pool.query('COMMIT');
    console.log('✅ Personajes de Genshin Impact insertados correctamente.');
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error('❌ Error insertando personajes:', e);
  } finally {
    process.exit(0);
  }
}

seed();