-- anonimerkekkuaförü — randevu mesajları + müşteri CRM profilleri + ziyaret geçmişi (demo)

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  ad_soyad TEXT NOT NULL,
  telefon TEXT,
  mesaj TEXT NOT NULL,
  profil_olusturuldu BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  ad_soyad TEXT NOT NULL,
  telefon TEXT,
  siklik_gun INTEGER NOT NULL DEFAULT 20, -- müşterinin ne sıklıkla geldiği: 10 / 20 / 30 gün
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Her ziyaret ayrı bir satır — böylece "hizmete göre ciro" gerçek toplamı yansıtır,
-- sadece son ziyaret üzerine yazılmaz.
CREATE TABLE IF NOT EXISTS visits (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  hizmet TEXT NOT NULL,
  tarih DATE NOT NULL DEFAULT CURRENT_DATE,
  ucret NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_customer ON visits (customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_tarih ON visits (tarih DESC);
CREATE INDEX IF NOT EXISTS idx_visits_hizmet ON visits (hizmet);
