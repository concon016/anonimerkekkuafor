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

// Dark mode toggle
const themeToggle = document.getElementById("themeToggle");
const root = document.documentElement;

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  themeToggle.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
}

const savedTheme = localStorage.getItem("theme");
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(savedTheme || (systemPrefersDark ? "dark" : "light"));

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
  const colors = ["#1f3a3d", "#8a6d1d", "#d7e0df", "#4f8c86"];

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

// Hizmetler sayfası: satırlara seç/kaldır butonları
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

// Saç Stilleri sayfası: "Bana En Uygun Saçı Bul" testi
// Not: Bu bir eğlence/demo aracıdır, bilimsel bir öneri motoru değildir —
// girilen kriterlere göre deterministik ama "kişiye özel" hissettiren bir sonuç üretir.
const quizForm = document.getElementById("quizForm");

if (quizForm) {
  const HAIRSTYLES = [
    {
      name: "Modern Fade",
      desc: "Yanlarda kademeli inceltme, üstte hacimli doku — her ortamda güçlü ve derli toplu bir görünüm.",
    },
    {
      name: "Klasik Yandan Ayrık",
      desc: "Zamansız ve kurumsal, her yaşta güven veren, bakımı kolay bir kesim.",
    },
    {
      name: "Undercut",
      desc: "Sert kontrastlı yanlar, üstte uzun ve şekillendirilebilir saç — karakterli ve dikkat çekici.",
    },
    {
      name: "Buzz Cut",
      desc: "Minimum bakım, maksimum pratiklik — aktif ve yoğun tempolu bir yaşam tarzına uygun.",
    },
    {
      name: "Pompadour",
      desc: "Öne ve yukarı taranan hacimli üst kısım — özgüvenli ve iddialı bir duruş.",
    },
    {
      name: "Slick Back",
      desc: "Geriye taranmış, parlak ve düzgün — akşam davetleri ve özel günler için ideal.",
    },
    {
      name: "Textured Crop",
      desc: "Kısa, dokulu ve dağınık şekillendirilmiş üst kısım — genç ve rahat bir tarz.",
    },
    {
      name: "Quiff",
      desc: "Öne doğru kaldırılmış hacimli ön kısım — yaratıcı ve modaya duyarlı bir seçim.",
    },
  ];

  const quizResult = document.getElementById("quizResult");
  const quizResultName = document.getElementById("quizResultName");
  const quizResultDesc = document.getElementById("quizResultDesc");
  const quizResultWhy = document.getElementById("quizResultWhy");

  quizForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const age = Number(quizForm.age.value) || 25;
    const height = Number(quizForm.height.value) || 175;
    const weight = Number(quizForm.weight.value) || 75;
    const season = quizForm.season.value;
    const sector = quizForm.sector.value;
    const hairType = quizForm.hairType.value;

    const seasonIndex = ["İlkbahar", "Yaz", "Sonbahar", "Kış"].indexOf(season);
    const sectorIndex = ["Kurumsal / Ofis", "Yaratıcı / Serbest", "Spor / Aktif", "Gece Hayatı / Sosyal", "Öğrenci"].indexOf(sector);
    const hairTypeIndex = ["Düz", "Dalgalı", "Kıvırcık"].indexOf(hairType);

    const score =
      age * 3 + height * 2 + weight + seasonIndex * 11 + sectorIndex * 17 + hairTypeIndex * 23;
    const style = HAIRSTYLES[score % HAIRSTYLES.length];

    quizResultName.textContent = style.name;
    quizResultDesc.textContent = style.desc;
    quizResultWhy.textContent = `${age} yaşında, ${height} cm boyunda, ${season.toLowerCase()} mevsiminde ${sector.toLowerCase()} bir ortamda öne çıkmak isteyen, ${hairType.toLowerCase()} saç yapısına sahip biri için hesaplanan en uygun stil budur.`;

    quizResult.classList.add("visible");
    fireConfetti(quizForm.querySelector(".quiz-submit"));
    quizResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}
