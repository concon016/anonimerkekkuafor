const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

function toClient(row) {
  return {
    id: row.id,
    messageId: row.message_id,
    adSoyad: row.ad_soyad,
    telefon: row.telefon,
    siklikGun: row.siklik_gun,
    sonHizmet: row.son_hizmet ?? null,
    sonTarih: row.son_tarih ?? null,
    sonUcret: row.son_ucret ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

const VALID_SIKLIK = [10, 20, 30];

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      if (!requireAdmin(req, res)) return;
      const rows = await sql`
        SELECT c.*, v.hizmet AS son_hizmet, v.tarih AS son_tarih, v.ucret AS son_ucret
        FROM customers c
        LEFT JOIN LATERAL (
          SELECT hizmet, tarih, ucret FROM visits WHERE customer_id = c.id ORDER BY tarih DESC, id DESC LIMIT 1
        ) v ON true
        ORDER BY v.tarih ASC NULLS FIRST
      `;
      return res.status(200).json(rows.map(toClient));
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      const b = req.body || {};
      if (!b.adSoyad || !b.hizmet || !b.tarih) {
        return res.status(400).json({ error: "adSoyad, hizmet ve tarih zorunlu." });
      }
      const siklik = VALID_SIKLIK.includes(Number(b.siklikGun)) ? Number(b.siklikGun) : 20;

      const custRows = await sql`
        INSERT INTO customers (message_id, ad_soyad, telefon, siklik_gun)
        VALUES (${b.messageId ?? null}, ${b.adSoyad}, ${b.telefon ?? null}, ${siklik})
        RETURNING *
      `;
      const customer = custRows[0];

      await sql`
        INSERT INTO visits (customer_id, hizmet, tarih, ucret)
        VALUES (${customer.id}, ${b.hizmet}, ${b.tarih}, ${b.ucret ?? null})
      `;

      if (b.messageId) {
        await sql`UPDATE messages SET profil_olusturuldu = TRUE WHERE id = ${b.messageId}`;
      }

      return res.status(201).json(toClient({ ...customer, son_hizmet: b.hizmet, son_tarih: b.tarih, son_ucret: b.ucret ?? null }));
    }

    if (req.method === "PATCH") {
      if (!requireAdmin(req, res)) return;
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id gerekli." });
      const b = req.body || {};

      const current = await sql`SELECT * FROM customers WHERE id = ${id}`;
      if (current.length === 0) return res.status(404).json({ error: "Müşteri bulunamadı." });
      const c = current[0];

      const telefon = b.telefon !== undefined ? b.telefon : c.telefon;
      const siklikGun = b.siklikGun !== undefined
        ? (VALID_SIKLIK.includes(Number(b.siklikGun)) ? Number(b.siklikGun) : c.siklik_gun)
        : c.siklik_gun;

      const rows = await sql`
        UPDATE customers SET telefon = ${telefon}, siklik_gun = ${siklikGun}, updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `;
      return res.status(200).json(toClient(rows[0]));
    }

    if (req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id gerekli." });
      const rows = await sql`DELETE FROM customers WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) return res.status(404).json({ error: "Müşteri bulunamadı." });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Desteklenmeyen method." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Sunucu hatası." });
  }
};
