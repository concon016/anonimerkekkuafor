const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

function toClient(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    adSoyad: row.ad_soyad,
    telefon: row.telefon,
    hizmet: row.hizmet,
    tarih: row.tarih,
    ucret: row.ucret,
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
    if (req.method === "GET") {
      if (!requireAdmin(req, res)) return;
      const rows = await sql`
        SELECT v.*, c.ad_soyad, c.telefon
        FROM visits v
        JOIN customers c ON c.id = v.customer_id
        ORDER BY v.tarih DESC, v.id DESC
      `;
      return res.status(200).json(rows.map(toClient));
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      const b = req.body || {};
      if (!b.customerId || !b.hizmet || !b.tarih) {
        return res.status(400).json({ error: "customerId, hizmet ve tarih zorunlu." });
      }
      const rows = await sql`
        INSERT INTO visits (customer_id, hizmet, tarih, ucret)
        VALUES (${b.customerId}, ${b.hizmet}, ${b.tarih}, ${b.ucret ?? null})
        RETURNING *
      `;
      const withCust = await sql`
        SELECT v.*, c.ad_soyad, c.telefon FROM visits v JOIN customers c ON c.id = v.customer_id WHERE v.id = ${rows[0].id}
      `;
      return res.status(201).json(toClient(withCust[0]));
    }

    if (req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id gerekli." });
      const rows = await sql`DELETE FROM visits WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) return res.status(404).json({ error: "Ziyaret bulunamadı." });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Desteklenmeyen method." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
};
