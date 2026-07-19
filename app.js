/* PrimePlay — catálogo pessoal estilo Prime Video.
   O catálogo começa vazio; o usuário adiciona os títulos.
   Os dados ficam salvos no localStorage do navegador. */

const STORAGE_KEY = "primeplay.catalog.v1";
const CATEGORIES = ["Filmes", "Séries", "Desenhos", "Terror"];

/** @typedef {{id:string,title:string,category:string,poster:string,video:string,desc:string}} Title */

/** @returns {Title[]} */
function loadCatalog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** @param {Title[]} catalog */
function saveCatalog(catalog) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
}

let catalog = loadCatalog();

/* ---------- Elementos ---------- */
const el = {
  nav: document.getElementById("nav"),
  content: document.getElementById("content"),
  empty: document.getElementById("empty"),
  search: document.getElementById("searchInput"),
  addBtn: document.getElementById("addBtn"),
  heroAddBtn: document.getElementById("heroAddBtn"),
  emptyAddBtn: document.getElementById("emptyAddBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  importFile: document.getElementById("importFile"),
  // form modal
  formModal: document.getElementById("formModal"),
  formTitle: document.getElementById("formTitle"),
  form: document.getElementById("titleForm"),
  fId: document.getElementById("fId"),
  fTitle: document.getElementById("fTitle"),
  fCategory: document.getElementById("fCategory"),
  fPoster: document.getElementById("fPoster"),
  fVideo: document.getElementById("fVideo"),
  fDesc: document.getElementById("fDesc"),
  deleteBtn: document.getElementById("deleteBtn"),
  // player modal
  playerModal: document.getElementById("playerModal"),
  player: document.getElementById("player"),
  playerTitle: document.getElementById("playerTitle"),
  playerDesc: document.getElementById("playerDesc"),
};

/* ---------- Utilidades ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

/** Converte um link do YouTube em URL de embed; senão retorna null. */
function youtubeEmbed(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

/* ---------- Renderização ---------- */
function renderNav() {
  el.nav.innerHTML = "";
  const all = document.createElement("a");
  all.href = "#";
  all.textContent = "Início";
  all.className = "active";
  all.dataset.cat = "";
  el.nav.appendChild(all);
  CATEGORIES.forEach((cat) => {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = cat;
    a.dataset.cat = cat;
    el.nav.appendChild(a);
  });
  el.nav.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      el.nav.querySelectorAll("a").forEach((x) => x.classList.remove("active"));
      a.classList.add("active");
      activeCategory = a.dataset.cat;
      render();
    });
  });
}

let activeCategory = "";

function cardHtml(t) {
  const poster = t.poster
    ? `<img class="card__poster" src="${escapeHtml(t.poster)}" alt="${escapeHtml(t.title)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'card__placeholder',textContent:'🎬'}))" />`
    : `<div class="card__placeholder">🎬</div>`;
  return `
    <div class="card" data-id="${t.id}">
      ${poster}
      <div class="card__actions">
        <button class="card__edit" data-edit="${t.id}" title="Editar">✎</button>
      </div>
      <div class="card__body">
        <p class="card__title">${escapeHtml(t.title)}</p>
      </div>
    </div>`;
}

function render() {
  const query = el.search.value.trim().toLowerCase();
  const filtered = catalog.filter((t) => {
    const matchQuery = !query || t.title.toLowerCase().includes(query);
    const matchCat = !activeCategory || t.category === activeCategory;
    return matchQuery && matchCat;
  });

  if (catalog.length === 0) {
    el.content.innerHTML = "";
    el.empty.hidden = false;
    return;
  }
  el.empty.hidden = true;

  const cats = activeCategory ? [activeCategory] : CATEGORIES;
  let html = "";
  cats.forEach((cat) => {
    const items = filtered.filter((t) => t.category === cat);
    if (items.length === 0) return;
    html += `<section class="shelf">
      <h2 class="shelf__title">${escapeHtml(cat)}</h2>
      <div class="shelf__row">${items.map(cardHtml).join("")}</div>
    </section>`;
  });

  el.content.innerHTML = html || `<p style="color:var(--text-dim);padding:20px 0;">Nenhum título encontrado${query ? ` para "${escapeHtml(query)}"` : ""}.</p>`;

  el.content.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-edit]")) return;
      openPlayer(card.dataset.id);
    });
  });
  el.content.querySelectorAll("[data-edit]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      openForm(b.dataset.edit);
    });
  });
}

/* ---------- Player ---------- */
function openPlayer(id) {
  const t = catalog.find((x) => x.id === id);
  if (!t) return;
  const yt = youtubeEmbed(t.video);
  let inner;
  if (yt) {
    inner = `<iframe src="${escapeHtml(yt)}?autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
  } else if (t.video) {
    inner = `<video src="${escapeHtml(t.video)}" controls autoplay></video>`;
  } else {
    inner = `<div class="player__empty">Nenhum link de vídeo cadastrado para este título.<br/>Edite o título e adicione um link (.mp4 ou YouTube).</div>`;
  }
  el.player.innerHTML = inner;
  el.playerTitle.textContent = t.title;
  el.playerDesc.textContent = t.desc || "";
  el.playerModal.hidden = false;
}

function closePlayer() {
  el.player.innerHTML = "";
  el.playerModal.hidden = true;
}

/* ---------- Formulário ---------- */
function openForm(id) {
  el.form.reset();
  if (id) {
    const t = catalog.find((x) => x.id === id);
    if (!t) return;
    el.formTitle.textContent = "Editar título";
    el.fId.value = t.id;
    el.fTitle.value = t.title;
    el.fCategory.value = t.category;
    el.fPoster.value = t.poster || "";
    el.fVideo.value = t.video || "";
    el.fDesc.value = t.desc || "";
    el.deleteBtn.hidden = false;
  } else {
    el.formTitle.textContent = "Adicionar título";
    el.fId.value = "";
    el.fCategory.value = activeCategory || "Filmes";
    el.deleteBtn.hidden = true;
  }
  el.formModal.hidden = false;
  el.fTitle.focus();
}

function closeForm() {
  el.formModal.hidden = true;
}

el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = el.fId.value;
  const data = {
    title: el.fTitle.value.trim(),
    category: el.fCategory.value,
    poster: el.fPoster.value.trim(),
    video: el.fVideo.value.trim(),
    desc: el.fDesc.value.trim(),
  };
  if (!data.title) return;
  if (id) {
    const t = catalog.find((x) => x.id === id);
    if (t) Object.assign(t, data);
  } else {
    catalog.push({ id: uid(), ...data });
  }
  saveCatalog(catalog);
  closeForm();
  render();
});

el.deleteBtn.addEventListener("click", () => {
  const id = el.fId.value;
  if (!id) return;
  if (!confirm("Excluir este título?")) return;
  catalog = catalog.filter((x) => x.id !== id);
  saveCatalog(catalog);
  closeForm();
  render();
});

/* ---------- Importar / Exportar ---------- */
el.exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "primeplay-catalogo.json";
  a.click();
  URL.revokeObjectURL(url);
});

el.importBtn.addEventListener("click", () => el.importFile.click());
el.importFile.addEventListener("change", async () => {
  const file = el.importFile.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Formato inválido");
    catalog = data
      .filter((t) => t && t.title)
      .map((t) => ({
        id: t.id || uid(),
        title: String(t.title),
        category: CATEGORIES.includes(t.category) ? t.category : "Filmes",
        poster: t.poster || "",
        video: t.video || "",
        desc: t.desc || "",
      }));
    saveCatalog(catalog);
    render();
    alert(`Catálogo importado: ${catalog.length} título(s).`);
  } catch (err) {
    alert("Não foi possível importar o arquivo: " + err.message);
  }
  el.importFile.value = "";
});

/* ---------- Fechamento de modais ---------- */
document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => {
    closeForm();
    closePlayer();
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeForm(); closePlayer(); }
});

/* ---------- Eventos ---------- */
el.addBtn.addEventListener("click", () => openForm());
el.heroAddBtn.addEventListener("click", () => openForm());
el.emptyAddBtn.addEventListener("click", () => openForm());
el.search.addEventListener("input", render);

/* ---------- Início ---------- */
renderNav();
render();
