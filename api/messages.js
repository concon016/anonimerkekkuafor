const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

function toClient(row) {
  return {
    id: row.id,
    adSoyad: row.ad_soyad,
    telefon: row.telefon,
    mesaj: row.mesaj,
    profilOlusturuldu: row.profil_olusturuldu,
    createdAt: row.created_at,
  };
}

function requireAdmin(req, res) {
  const key = req.headers["x-admin-key"];
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    res.status(401).json({ error: "Yetkisiz. Admin şifresi hatalı." });
    return false;
  }
  return true;
}

module.exports = async (req, res) => {
  try {
    if (req.method === "POST") {
      const b = req.body || {};
      if (b.botcheck) return res.status(201).json({ ok: true }); // spam honeypot
      if (!b.name || !b.phone || !b.message) {
        return res.status(400).json({ error: "Ad, telefon ve mesaj zorunlu." });
      }
      await sql`
        INSERT INTO messages (ad_soyad, telefon, mesaj)
        VALUES (${b.name}, ${b.phone}, ${b.message})
      `;
      return res.status(201).json({ ok: true });
    }

    if (req.method === "GET") {
      if (!requireAdmin(req, res)) return;
      const rows = await sql`SELECT * FROM messages ORDER BY created_at DESC`;
      return res.status(200).json(rows.map(toClient));
    }

    if (req.method === "PATCH") {
      if (!requireAdmin(req, res)) return;
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id gerekli." });
      const rows = await sql`
        UPDATE messages SET profil_olusturuldu = TRUE WHERE id = ${id} RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: "Mesaj bulunamadı." });
      return res.status(200).json(toClient(rows[0]));
    }

    if (req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id gerekli." });
      const rows = await sql`DELETE FROM messages WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) return res.status(404).json({ error: "Mesaj bulunamadı." });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Desteklenmeyen method." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
};
