const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

function toClient(row) {
  return {
    id: row.id,
    messageId: row.message_id,
    adSoyad: row.ad_soyad,
    telefon: row.telefon,
    sonHizmet: row.son_hizmet,
    sonTarih: row.son_tarih,
    odenenUcret: row.odenen_ucret,
    siklikGun: row.siklik_gun,
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
      const rows = await sql`SELECT * FROM customers ORDER BY son_tarih ASC`;
      return res.status(200).json(rows.map(toClient));
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      const b = req.body || {};
      if (!b.adSoyad || !b.sonTarih) {
        return res.status(400).json({ error: "adSoyad ve sonTarih zorunlu." });
      }
      const siklik = VALID_SIKLIK.includes(Number(b.siklikGun)) ? Number(b.siklikGun) : 20;

      const rows = await sql`
        INSERT INTO customers (message_id, ad_soyad, telefon, son_hizmet, son_tarih, odenen_ucret, siklik_gun)
        VALUES (${b.messageId ?? null}, ${b.adSoyad}, ${b.telefon ?? null}, ${b.sonHizmet ?? null}, ${b.sonTarih}, ${b.odenenUcret ?? null}, ${siklik})
        RETURNING *
      `;

      if (b.messageId) {
        await sql`UPDATE messages SET profil_olusturuldu = TRUE WHERE id = ${b.messageId}`;
      }

      return res.status(201).json(toClient(rows[0]));
    }

    if (req.method === "PATCH") {
      if (!requireAdmin(req, res)) return;
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id gerekli." });
      const b = req.body || {};

      const fields = [];
      const current = await sql`SELECT * FROM customers WHERE id = ${id}`;
      if (current.length === 0) return res.status(404).json({ error: "Müşteri bulunamadı." });
      const c = current[0];

      const sonHizmet = b.sonHizmet !== undefined ? b.sonHizmet : c.son_hizmet;
      const sonTarih = b.sonTarih !== undefined ? b.sonTarih : c.son_tarih;
      const odenenUcret = b.odenenUcret !== undefined ? b.odenenUcret : c.odenen_ucret;
      const siklikGun = b.siklikGun !== undefined
        ? (VALID_SIKLIK.includes(Number(b.siklikGun)) ? Number(b.siklikGun) : c.siklik_gun)
        : c.siklik_gun;
      const telefon = b.telefon !== undefined ? b.telefon : c.telefon;

      const rows = await sql`
        UPDATE customers
        SET son_hizmet = ${sonHizmet}, son_tarih = ${sonTarih}, odenen_ucret = ${odenenUcret},
            siklik_gun = ${siklikGun}, telefon = ${telefon}, updated_at = now()
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
