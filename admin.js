/* Anonim Erkek Kuaförü — admin paneli (demo CRM) */

const ADMIN_KEY_STORAGE = "aek_admin_key";

function adminKey() {
  return sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

function showMsg(text, ok) {
  const el = document.getElementById("adminMsg");
  el.textContent = text;
  el.className = ok ? "ok" : "err";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function unauthorize() {
  sessionStorage.removeItem(ADMIN_KEY_STORAGE);
  showMsg("Şifre hatalı görünüyor, lütfen tekrar giriş yap.", false);
  document.getElementById("adminGate").style.display = "";
  document.getElementById("adminPanel").style.display = "none";
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

function fmtDateOnly(d) {
  return new Date(d).toLocaleDateString("tr-TR", { dateStyle: "medium" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Number(days));
  return d;
}

function daysBetween(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

let allMessages = [];
let allCustomers = [];

/* ---------------- Mesajlar ---------------- */

function drawMessages() {
  const list = document.getElementById("msgList");
  document.getElementById("msgCount").textContent = `${allMessages.length} mesaj`;

  if (!allMessages.length) {
    list.innerHTML = `<p class="admin-empty">Henüz mesaj yok.</p>`;
    return;
  }

  list.innerHTML = allMessages.map((m) => `
    <div class="msg-row${m.profilOlusturuldu ? " done" : ""}">
      <div class="msg-head">
        <b>${m.adSoyad}</b>
        <span class="msg-date">${fmtDate(m.createdAt)}</span>
      </div>
      <div class="msg-phone">${m.telefon || ""}</div>
      <div class="msg-body">${m.mesaj}</div>
      <div class="msg-actions">
        ${m.telefon ? `<a href="tel:${m.telefon}" class="btn-primary-sm" style="background:var(--bg);border:1px solid var(--border);color:var(--text);">Ara</a>` : ""}
        <button class="btn-primary-sm" data-profile-open="${m.id}">${m.profilOlusturuldu ? "Profil Oluşturuldu ✓" : "Profil Oluştur"}</button>
        <button class="btn-del" data-msg-delete="${m.id}">Sil</button>
      </div>
      <div class="profile-form" id="profile-form-${m.id}">
        <div>
          <label>Ad Soyad</label>
          <input type="text" data-pf-ad="${m.id}" value="${m.adSoyad}">
        </div>
        <div>
          <label>Telefon</label>
          <input type="text" data-pf-telefon="${m.id}" value="${m.telefon || ""}">
        </div>
        <div>
          <label>Son Aldığı Hizmet</label>
          <input type="text" data-pf-hizmet="${m.id}" placeholder="örn. Saç Kesimi + Sakal Tıraşı">
        </div>
        <div>
          <label>Hizmet Tarihi</label>
          <input type="date" data-pf-tarih="${m.id}" value="${todayISO()}">
        </div>
        <div>
          <label>Ödediği Ücret (₺)</label>
          <input type="number" data-pf-ucret="${m.id}" placeholder="örn. 350">
        </div>
        <div>
          <label>Ne Sıklıkla Gelir?</label>
          <select data-pf-siklik="${m.id}">
            <option value="10">10 günde bir</option>
            <option value="20" selected>20 günde bir</option>
            <option value="30">30 günde bir</option>
          </select>
        </div>
        <div class="profile-form-full">
          <button class="btn-primary-sm" data-profile-save="${m.id}" style="width:100%;padding:10px;">Profili Kaydet</button>
        </div>
      </div>
    </div>`).join("");
}

async function fetchMessages() {
  const res = await fetch("/api/messages", { headers: { "x-admin-key": adminKey() } });
  if (res.status === 401) return unauthorize();
  allMessages = await res.json();
  drawMessages();
}

async function deleteMessage(id) {
  if (!confirm("Bu mesajı silmek istediğine emin misin?")) return;
  const res = await fetch(`/api/messages?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "x-admin-key": adminKey() },
  });
  if (res.status === 401) return unauthorize();
  showMsg("Mesaj silindi.", true);
  fetchMessages();
}

async function saveProfileFromMessage(messageId) {
  const ad = document.querySelector(`[data-pf-ad="${messageId}"]`).value.trim();
  const telefon = document.querySelector(`[data-pf-telefon="${messageId}"]`).value.trim();
  const hizmet = document.querySelector(`[data-pf-hizmet="${messageId}"]`).value.trim();
  const tarih = document.querySelector(`[data-pf-tarih="${messageId}"]`).value;
  const ucret = document.querySelector(`[data-pf-ucret="${messageId}"]`).value;
  const siklik = document.querySelector(`[data-pf-siklik="${messageId}"]`).value;

  if (!ad || !tarih) {
    showMsg("Ad Soyad ve Hizmet Tarihi zorunlu.", false);
    return;
  }

  const res = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": adminKey() },
    body: JSON.stringify({
      messageId,
      adSoyad: ad,
      telefon,
      sonHizmet: hizmet,
      sonTarih: tarih,
      odenenUcret: ucret ? Number(ucret) : null,
      siklikGun: Number(siklik),
    }),
  });
  if (res.status === 401) return unauthorize();
  if (!res.ok) {
    const data = await res.json();
    showMsg("Hata: " + (data.error || "bilinmeyen"), false);
    return;
  }
  showMsg("Müşteri profili oluşturuldu.", true);
  await fetchMessages();
  await fetchCustomers();
  switchTab("musteriler");
}

/* ---------------- Müşteri Profilleri ---------------- */

function customerStatus(c) {
  const expected = addDays(c.sonTarih, c.siklikGun);
  const today = new Date();
  const diff = daysBetween(today, expected);
  if (diff < 0) return { level: "overdue", label: `${Math.abs(diff)} gün gecikti`, expected };
  if (diff <= 3) return { level: "soon", label: `${diff} gün kaldı`, expected };
  return { level: "ok", label: `${diff} gün kaldı`, expected };
}

function drawCustomers() {
  const list = document.getElementById("custList");
  const overdueCount = allCustomers.filter((c) => customerStatus(c).level === "overdue").length;
  document.getElementById("custCount").textContent =
    `${allCustomers.length} müşteri` + (overdueCount ? ` · ${overdueCount} tanesinin süresi geçti ⚠️` : "");

  if (!allCustomers.length) {
    list.innerHTML = `<p class="admin-empty">Henüz müşteri profili yok. Gelen Mesajlar sekmesinden bir mesajı profile çevirebilirsin.</p>`;
    return;
  }

  list.innerHTML = allCustomers.map((c) => {
    const status = customerStatus(c);
    const badgeText = status.level === "overdue" ? `⚠️ Süresi Geçti — ${status.label}`
      : status.level === "soon" ? `Yakında — ${status.label}`
      : `Zamanında — ${status.label}`;
    return `
    <div class="cust-card${status.level === "overdue" ? " overdue" : ""}">
      <div class="cust-head">
        <b>${c.adSoyad}</b>
        <span class="cust-badge ${status.level}">${badgeText}</span>
      </div>
      <div class="cust-grid">
        <div><div class="l">Telefon</div>${c.telefon || "—"}</div>
        <div><div class="l">Son Hizmet</div>${c.sonHizmet || "—"}</div>
        <div><div class="l">Son Ziyaret</div>${fmtDateOnly(c.sonTarih)}</div>
        <div><div class="l">Ödediği Ücret</div>${c.odenenUcret != null ? c.odenenUcret + " ₺" : "—"}</div>
        <div><div class="l">Sıklık</div>${c.siklikGun} günde bir</div>
        <div><div class="l">Beklenen Ziyaret</div>${fmtDateOnly(status.expected)}</div>
      </div>
      <div class="msg-actions">
        ${c.telefon ? `<a href="tel:${c.telefon}" style="background:var(--bg);border:1px solid var(--border);color:var(--text);">Ara</a>` : ""}
        <button class="btn-primary-sm" data-cust-edit-open="${c.id}">Yeni Ziyaret Kaydet / Düzenle</button>
        <button class="btn-del" data-cust-delete="${c.id}">Sil</button>
      </div>
      <div class="cust-edit" id="cust-edit-${c.id}">
        <div>
          <label>Telefon</label>
          <input type="text" data-ce-telefon="${c.id}" value="${c.telefon || ""}">
        </div>
        <div>
          <label>Son Aldığı Hizmet</label>
          <input type="text" data-ce-hizmet="${c.id}" value="${c.sonHizmet || ""}">
        </div>
        <div>
          <label>Ziyaret Tarihi</label>
          <input type="date" data-ce-tarih="${c.id}" value="${new Date(c.sonTarih).toISOString().slice(0,10)}">
        </div>
        <div>
          <label>Ödediği Ücret (₺)</label>
          <input type="number" data-ce-ucret="${c.id}" value="${c.odenenUcret != null ? c.odenenUcret : ""}">
        </div>
        <div class="cust-edit-full">
          <select data-ce-siklik="${c.id}" style="flex:1;">
            <option value="10"${c.siklikGun === 10 ? " selected" : ""}>10 günde bir</option>
            <option value="20"${c.siklikGun === 20 ? " selected" : ""}>20 günde bir</option>
            <option value="30"${c.siklikGun === 30 ? " selected" : ""}>30 günde bir</option>
          </select>
          <button class="btn-primary-sm" data-cust-save="${c.id}" style="flex:1;">Kaydet</button>
        </div>
      </div>
    </div>`;
  }).join("");
}

async function fetchCustomers() {
  const res = await fetch("/api/customers", { headers: { "x-admin-key": adminKey() } });
  if (res.status === 401) return unauthorize();
  allCustomers = await res.json();
  drawCustomers();
  drawByService();
}

/* ---------------- Hizmete Göre ---------------- */

function drawByService() {
  const list = document.getElementById("hizmetList");
  if (!list) return;

  const groups = {};
  allCustomers.forEach((c) => {
    const key = (c.sonHizmet || "").trim() || "Belirtilmemiş";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  const groupNames = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  if (!groupNames.length) {
    list.innerHTML = `<p class="admin-empty">Henüz müşteri profili yok.</p>`;
    return;
  }

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  list.innerHTML = groupNames.map((name, idx) => {
    const custs = groups[name];
    const rows = custs.map((c) => {
      const status = customerStatus(c);
      return `
      <div class="hizmet-cust-row">
        <div>
          <div class="hizmet-cust-name">${esc(c.adSoyad)}</div>
          <div class="hizmet-cust-sub">${esc(c.telefon || "—")} · Son ziyaret: ${fmtDateOnly(c.sonTarih)}</div>
        </div>
        <span class="cust-badge ${status.level}">${status.level === "overdue" ? "⚠️ " : ""}${status.label}</span>
      </div>`;
    }).join("");

    return `
    <div class="hizmet-group" data-hizmet-group="${idx}">
      <div class="hizmet-group-head" data-hizmet-toggle="${idx}">
        <b>${esc(name)}</b>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="hizmet-group-count">${custs.length} müşteri</span>
          <span class="hizmet-group-arrow">▾</span>
        </div>
      </div>
      <div class="hizmet-group-body">${rows}</div>
    </div>`;
  }).join("");
}

async function saveCustomer(id) {
  const telefon = document.querySelector(`[data-ce-telefon="${id}"]`).value.trim();
  const hizmet = document.querySelector(`[data-ce-hizmet="${id}"]`).value.trim();
  const tarih = document.querySelector(`[data-ce-tarih="${id}"]`).value;
  const ucret = document.querySelector(`[data-ce-ucret="${id}"]`).value;
  const siklik = document.querySelector(`[data-ce-siklik="${id}"]`).value;

  const res = await fetch(`/api/customers?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-key": adminKey() },
    body: JSON.stringify({
      telefon,
      sonHizmet: hizmet,
      sonTarih: tarih,
      odenenUcret: ucret ? Number(ucret) : null,
      siklikGun: Number(siklik),
    }),
  });
  if (res.status === 401) return unauthorize();
  showMsg("Müşteri güncellendi.", true);
  fetchCustomers();
}

async function deleteCustomer(id) {
  if (!confirm("Bu müşteri profilini silmek istediğine emin misin?")) return;
  const res = await fetch(`/api/customers?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "x-admin-key": adminKey() },
  });
  if (res.status === 401) return unauthorize();
  showMsg("Müşteri silindi.", true);
  fetchCustomers();
}

/* ---------------- Genel ---------------- */

function switchTab(tab) {
  document.querySelectorAll(".admin-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".admin-pane").forEach((p) => p.classList.toggle("active", p.id === `pane-${tab}`));
}

function enterPanel() {
  document.getElementById("adminGate").style.display = "none";
  document.getElementById("adminPanel").style.display = "";
  fetchMessages();
  fetchCustomers();
}

document.addEventListener("DOMContentLoaded", () => {
  if (adminKey()) enterPanel();

  document.getElementById("adminEnterBtn").addEventListener("click", () => {
    const pass = document.getElementById("adminPass").value;
    if (!pass) return;
    sessionStorage.setItem(ADMIN_KEY_STORAGE, pass);
    enterPanel();
  });

  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.getElementById("msgList").addEventListener("click", (e) => {
    const delBtn = e.target.closest("[data-msg-delete]");
    if (delBtn) return deleteMessage(delBtn.dataset.msgDelete);

    const openBtn = e.target.closest("[data-profile-open]");
    if (openBtn) {
      const form = document.getElementById(`profile-form-${openBtn.dataset.profileOpen}`);
      if (form) form.classList.toggle("open");
      return;
    }

    const saveBtn = e.target.closest("[data-profile-save]");
    if (saveBtn) saveProfileFromMessage(saveBtn.dataset.profileSave);
  });

  document.getElementById("custList").addEventListener("click", (e) => {
    const delBtn = e.target.closest("[data-cust-delete]");
    if (delBtn) return deleteCustomer(delBtn.dataset.custDelete);

    const openBtn = e.target.closest("[data-cust-edit-open]");
    if (openBtn) {
      const box = document.getElementById(`cust-edit-${openBtn.dataset.custEditOpen}`);
      if (box) box.classList.toggle("open");
      return;
    }

    const saveBtn = e.target.closest("[data-cust-save]");
    if (saveBtn) saveCustomer(saveBtn.dataset.custSave);
  });

  document.getElementById("hizmetList").addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-hizmet-toggle]");
    if (toggle) {
      const group = document.querySelector(`[data-hizmet-group="${toggle.dataset.hizmetToggle}"]`);
      if (group) group.classList.toggle("open");
    }
  });
});
