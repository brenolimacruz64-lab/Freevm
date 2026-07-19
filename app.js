/* PrimePlay — catálogo estilo Prime Video com contas de usuário (Firebase).
   - Ao entrar, mostra a tela de login/criar conta.
   - Qualquer usuário logado assiste aos títulos.
   - Somente ADMIN_EMAIL pode adicionar/editar/excluir. */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";

const CATEGORIES = ["Filmes", "Séries", "Desenhos", "Terror"];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/** @typedef {{id:string,title:string,category:string,poster:string,video:string,desc:string}} Title */
/** @type {Title[]} */
let catalog = [];
let isAdmin = false;
let activeCategory = "";

/* ---------- Elementos ---------- */
const el = {
  // auth
  authScreen: document.getElementById("authScreen"),
  authForm: document.getElementById("authForm"),
  authEmail: document.getElementById("authEmail"),
  authPass: document.getElementById("authPass"),
  authSubmit: document.getElementById("authSubmit"),
  authTitle: document.getElementById("authTitle"),
  authSub: document.getElementById("authSub"),
  authToggle: document.getElementById("authToggle"),
  authToggleText: document.getElementById("authToggleText"),
  authError: document.getElementById("authError"),
  googleBtn: document.getElementById("googleBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  userEmail: document.getElementById("userEmail"),
  // app
  nav: document.getElementById("nav"),
  content: document.getElementById("content"),
  empty: document.getElementById("empty"),
  search: document.getElementById("searchInput"),
  addBtn: document.getElementById("addBtn"),
  heroAddBtn: document.getElementById("heroAddBtn"),
  emptyAddBtn: document.getElementById("emptyAddBtn"),
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
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function youtubeEmbed(url) {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function authErrorMessage(code) {
  const map = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/missing-password": "Digite a senha.",
    "auth/weak-password": "A senha precisa ter ao menos 6 caracteres.",
    "auth/email-already-in-use": "Este e-mail já tem conta. Tente entrar.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/user-not-found": "Conta não encontrada. Crie uma conta.",
    "auth/popup-closed-by-user": "Login com Google cancelado.",
    "auth/operation-not-allowed": "Ative o método de login no console do Firebase.",
  };
  return map[code] || "Não foi possível concluir. Tente novamente.";
}

/* ---------- Autenticação ---------- */
let signupMode = false;

function renderAuthMode() {
  if (signupMode) {
    el.authTitle.textContent = "Criar conta";
    el.authSub.textContent = "Crie sua conta para assistir aos títulos.";
    el.authSubmit.textContent = "Criar conta";
    el.authToggleText.textContent = "Já tem conta?";
    el.authToggle.textContent = "Entrar";
    el.authPass.autocomplete = "new-password";
  } else {
    el.authTitle.textContent = "Entrar";
    el.authSub.textContent = "Entre para assistir aos títulos.";
    el.authSubmit.textContent = "Entrar";
    el.authToggleText.textContent = "Ainda não tem conta?";
    el.authToggle.textContent = "Criar conta";
    el.authPass.autocomplete = "current-password";
  }
  el.authError.textContent = "";
}

el.authToggle.addEventListener("click", (e) => {
  e.preventDefault();
  signupMode = !signupMode;
  renderAuthMode();
});

el.authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  el.authError.textContent = "";
  el.authSubmit.disabled = true;
  const email = el.authEmail.value.trim();
  const pass = el.authPass.value;
  try {
    if (signupMode) {
      await createUserWithEmailAndPassword(auth, email, pass);
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
  } catch (err) {
    el.authError.textContent = authErrorMessage(err.code);
  } finally {
    el.authSubmit.disabled = false;
  }
});

el.googleBtn.addEventListener("click", async () => {
  el.authError.textContent = "";
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    el.authError.textContent = authErrorMessage(err.code);
  }
});

el.logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  const authed = !!user;
  isAdmin = authed && user.email === ADMIN_EMAIL;
  document.body.classList.toggle("is-authed", authed);
  document.body.classList.toggle("is-admin", isAdmin);
  el.authScreen.hidden = authed;
  if (authed) {
    el.userEmail.textContent = user.email;
    el.authForm.reset();
    subscribeCatalog();
  } else {
    el.userEmail.textContent = "";
    catalog = [];
    render();
  }
});

/* ---------- Catálogo (Firestore) ---------- */
let unsubscribe = null;

function subscribeCatalog() {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(
    collection(db, "titles"),
    (snap) => {
      catalog = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    },
    (err) => {
      el.content.innerHTML = `<p style="color:var(--danger);padding:20px 0;">Erro ao carregar o catálogo: ${escapeHtml(err.message)}</p>`;
    }
  );
}

async function saveTitle(id, data) {
  if (!isAdmin) return;
  if (id) {
    await updateDoc(doc(db, "titles", id), data);
  } else {
    await addDoc(collection(db, "titles"), { ...data, createdAt: serverTimestamp() });
  }
}

async function removeTitle(id) {
  if (!isAdmin) return;
  await deleteDoc(doc(db, "titles", id));
}

/* ---------- Renderização ---------- */
function renderNav() {
  el.nav.innerHTML = "";
  const items = [{ cat: "", label: "Início" }, ...CATEGORIES.map((c) => ({ cat: c, label: c }))];
  items.forEach(({ cat, label }, i) => {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = label;
    a.dataset.cat = cat;
    if (i === 0) a.classList.add("active");
    a.addEventListener("click", (e) => {
      e.preventDefault();
      el.nav.querySelectorAll("a").forEach((x) => x.classList.remove("active"));
      a.classList.add("active");
      activeCategory = cat;
      render();
    });
    el.nav.appendChild(a);
  });
}

function cardHtml(t) {
  const id = escapeHtml(t.id);
  const poster = t.poster
    ? `<img class="card__poster" src="${escapeHtml(t.poster)}" alt="${escapeHtml(t.title)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'card__placeholder',textContent:'🎬'}))" />`
    : `<div class="card__placeholder">🎬</div>`;
  return `
    <div class="card" data-id="${id}">
      ${poster}
      <div class="card__actions">
        <button class="card__edit" data-edit="${id}" title="Editar">✎</button>
      </div>
      <div class="card__body">
        <p class="card__title">${escapeHtml(t.title)}</p>
      </div>
    </div>`;
}

function render() {
  const query = el.search.value.trim().toLowerCase();
  const filtered = catalog.filter((t) => {
    const matchQuery = !query || (t.title || "").toLowerCase().includes(query);
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
    inner = `<div class="player__empty">Nenhum link de vídeo cadastrado para este título.</div>`;
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
  if (!isAdmin) return;
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

el.form.addEventListener("submit", async (e) => {
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
  try {
    await saveTitle(id, data);
    closeForm();
  } catch (err) {
    alert("Não foi possível salvar: " + err.message);
  }
});

el.deleteBtn.addEventListener("click", async () => {
  const id = el.fId.value;
  if (!id) return;
  if (!confirm("Excluir este título?")) return;
  try {
    await removeTitle(id);
    closeForm();
  } catch (err) {
    alert("Não foi possível excluir: " + err.message);
  }
});

/* ---------- Modais ---------- */
document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => { closeForm(); closePlayer(); });
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
renderAuthMode();
renderNav();
render();
