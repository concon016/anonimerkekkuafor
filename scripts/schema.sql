-- anonimerkekkuaförü — randevu mesajları + müşteri CRM profilleri (demo)

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
  son_hizmet TEXT,
  son_tarih DATE NOT NULL DEFAULT CURRENT_DATE,
  odenen_ucret NUMERIC,
  siklik_gun INTEGER NOT NULL DEFAULT 20, -- müşterinin ne sıklıkla geldiği: 10 / 20 / 30 gün
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_son_tarih ON customers (son_tarih);
