require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

(async () => {
  // Veri modeli değişti (tek "son ziyaret" yerine tam ziyaret geçmişi) — demo verisiyle
  // birlikte eski customers tablosunu yeniden kuruyoruz, messages tablosuna dokunmuyoruz.
  await sql`DROP TABLE IF EXISTS visits`;
  await sql`DROP TABLE IF EXISTS customers`;

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  const statements = schema.split(";").map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  console.log("Migration tamam.");
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log(tables);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
