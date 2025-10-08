import { pool } from '../db.js';

const champions = [
  "Aatrox","Ahri","Akali","Akshan","Alistar","Amumu","Anivia","Annie","Aphelios","Ashe",
  "Aurelion Sol","Azir","Bard","Bel'Veth","Blitzcrank","Brand","Braum","Caitlyn","Camille",
  "Cassiopeia","Cho'Gath","Corki","Darius","Diana","Dr. Mundo","Draven","Ekko","Elise","Evelynn",
  "Ezreal","Fiddlesticks","Fiora","Fizz","Galio","Gangplank","Garen","Gnar","Gragas","Graves",
  "Gwen","Hecarim","Heimerdinger","Hwei","Illaoi","Irelia","Ivern","Janna","Jarvan IV","Jax",
  "Jayce","Jhin","Jinx","Kai'Sa","Kalista","Karma","Karthus","Kassadin","Katarina","Kayle",
  "Kayn","Kennen","Kha'Zix","Kindred","Kled","Kog'Maw","LeBlanc","Lee Sin","Leona","Lillia",
  "Lissandra","Lucian","Lulu","Lux","Malphite","Malzahar","Maokai","Master Yi","Milio","Miss Fortune",
  "Mordekaiser","Morgana","Naafiri","Nami","Nasus","Nautilus","Neeko","Nidalee","Nilah","Nocturne",
  "Nunu y Willump","Olaf","Orianna","Ornn","Pantheon","Poppy","Pyke","Qiyana","Quinn","Rakan",
  "Rammus","Rek'Sai","Rell","Renata Glasc","Renekton","Rengar","Riven","Rumble","Ryze","Samira",
  "Sejuani","Senna","Seraphine","Sett","Shaco","Shen","Shyvana","Singed","Sion","Sivir",
  "Skarner","Smolder","Sona","Soraka","Swain","Sylas","Syndra","Tahm Kench","Taliyah","Talon",
  "Taric","Teemo","Thresh","Tristana","Trundle","Tryndamere","Twisted Fate","Twitch","Udyr","Urgot",
  "Varus","Vayne","Veigar","Vel'Koz","Vex","Vi","Viego","Viktor","Vladimir","Volibear",
  "Warwick","Wukong","Xayah","Xerath","Xin Zhao","Yasuo","Yone","Yorick","Yuumi","Zac",
  "Zed","Zeri","Ziggs","Zilean","Zoe","Zyra"
];

async function seed() {
  await pool.query('BEGIN');
  try {
    for (const name of champions) {
      await pool.query(
        'INSERT INTO champions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [name]
      );
    }
    await pool.query('COMMIT');
    console.log('✅ Campeones insertados correctamente.');
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error('❌ Error insertando campeones:', e);
  } finally {
    process.exit(0);
  }
}

seed();
