// Scroll progress bar
const scrollProgress = document.createElement("div");
scrollProgress.className = "scroll-progress";
document.body.prepend(scrollProgress);
window.addEventListener("scroll", () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  scrollProgress.style.width = pct + "%";
}, { passive: true });

// Tab title trick
const originalTitle = document.title;
document.addEventListener("visibilitychange", () => {
  document.title = document.hidden ? "Sizi bekliyoruz!" : originalTitle;
});

// Dark mode toggle — bu sitede varsayılan tema karanlık (kayıtlı tercih yoksa sistem ayarını değil karanlığı esas alır)
const themeToggle = document.getElementById("themeToggle");
const root = document.documentElement;

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  themeToggle.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
}

const savedTheme = localStorage.getItem("theme");
applyTheme(savedTheme || "dark");

themeToggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("theme", next);
});

// Mobile menu toggle
const menuToggle = document.getElementById("menuToggle");
const navMobile = document.getElementById("navMobile");

menuToggle.addEventListener("click", () => {
  navMobile.classList.toggle("open");
});

navMobile.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => navMobile.classList.remove("open"));
});

// Scroll reveal
const revealEls = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
revealEls.forEach((el) => revealObserver.observe(el));

// Confetti burst
function fireConfetti(originEl) {
  const rect = originEl.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top;
  const colors = ["#c9a227", "#4d7a54", "#ece7db", "#8a6d1d"];

  for (let i = 0; i < 24; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${originX}px`;
    piece.style.top = `${originY}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--x", `${(Math.random() - 0.5) * 260}px`);
    piece.style.setProperty("--y", `${Math.random() * -180 - 40}px`);
    piece.style.setProperty("--r", `${Math.random() * 360}deg`);
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 1200);
  }
}

// Hizmetler sayfası: kategori sekmeleri (tab) arasında geçiş
const serviceTabs = document.querySelectorAll(".service-tab");
const servicePanels = document.querySelectorAll(".service-panel");

if (serviceTabs.length) {
  serviceTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      serviceTabs.forEach((t) => t.classList.toggle("active", t === tab));
      servicePanels.forEach((p) => p.classList.toggle("active", p.dataset.panel === target));
    });
  });
}

// Hizmet seçimi ("sepete ekle" tarzı) — localStorage üzerinden sayfalar arası taşınır
const SELECTED_SERVICES_KEY = "selectedServices";

function getSelectedServices() {
  try {
    return JSON.parse(localStorage.getItem(SELECTED_SERVICES_KEY)) || [];
  } catch {
    return [];
  }
}

function setSelectedServices(list) {
  localStorage.setItem(SELECTED_SERVICES_KEY, JSON.stringify(list));
}

// Hizmetler sayfası: kartlara seç/kaldır butonları
const serviceCards = document.querySelectorAll(".service-card");
const cartBar = document.getElementById("cartBar");
const cartBarText = document.getElementById("cartBarText");

function updateCartBar() {
  if (!cartBar) return;
  const selected = getSelectedServices();
  cartBarText.textContent = `${selected.length} hizmet seçildi`;
  cartBar.classList.toggle("visible", selected.length > 0);
}

if (serviceCards.length) {
  const selected = getSelectedServices();
  serviceCards.forEach((card) => {
    const name = card.querySelector("h3").textContent;
    const btn = card.querySelector(".service-select-btn");
    if (!btn) return;

    function paint(isSelected) {
      card.classList.toggle("selected", isSelected);
      btn.classList.toggle("is-selected", isSelected);
      btn.textContent = isSelected ? "✓" : "+";
    }
    paint(selected.includes(name));

    btn.addEventListener("click", () => {
      const current = getSelectedServices();
      const idx = current.indexOf(name);
      if (idx === -1) {
        current.push(name);
      } else {
        current.splice(idx, 1);
      }
      setSelectedServices(current);
      paint(current.includes(name));
      updateCartBar();
    });
  });
  updateCartBar();
}

// İletişim sayfası: seçilen hizmetleri chip olarak göster
const selectedServicesEl = document.getElementById("selectedServices");

function renderSelectedServices() {
  if (!selectedServicesEl) return;
  const selected = getSelectedServices();

  if (!selected.length) {
    selectedServicesEl.innerHTML =
      '<p class="selected-services-empty">Henüz hizmet seçmediniz. <a href="hizmetler.html">Hizmetler sayfasından</a> seçim yapabilirsiniz.</p>';
    return;
  }

  const chips = selected
    .map(
      (name, i) =>
        `<span class="service-chip">${name}<button type="button" data-index="${i}" aria-label="${name} seçimini kaldır">×</button></span>`
    )
    .join("");

  selectedServicesEl.innerHTML = `
    <span class="selected-services-label">Seçtiğiniz hizmetler:</span>
    <div class="selected-services-chips">${chips}</div>
  `;

  selectedServicesEl.querySelectorAll(".service-chip button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const current = getSelectedServices();
      current.splice(Number(btn.dataset.index), 1);
      setSelectedServices(current);
      renderSelectedServices();
    });
  });
}
renderSelectedServices();

// Randevu formu — bu bir portfolyo/demo sitesi, gerçek bir backend'e bağlı değil.
// Gönderim yalnızca arayüzde simüle edilir, hiçbir yere veri iletilmez.
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("submitBtn");
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Gönderiliyor...";
    formStatus.textContent = "";
    formStatus.className = "form-status";

    setTimeout(() => {
      formStatus.textContent = "Randevu talebiniz alındı, en kısa sürede dönüş yapacağız.";
      formStatus.classList.add("success");
      fireConfetti(submitBtn);
      contactForm.reset();
      setSelectedServices([]);
      renderSelectedServices();
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }, 700);
  });
}
