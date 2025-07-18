// 1) Função única de notificação — injeta dentro de #flash-container
window.showNotification = (message, type = "success") => {
  // Remove notificação anterior, se houver
  const prev = document.getElementById("flashMessage");
  if (prev) prev.remove();

  // Procura o container reservado no header
  const container = document.getElementById("flash-container");
  if (!container) {
    console.warn(
      "⚠️ #flash-container não encontrado — verifique seu header.html"
    );
    return;
  }

  // Classes base para o flash
  const base = [
    "w-full", // ocupa toda a largura do container
    "px-4",
    "py-3",
    "rounded",
    "shadow",
    "text-center",
    "text-sm",
    "pointer-events-auto", // permite clique no botão de fechar
    "transition-opacity",
    "duration-500",
    "opacity-100",
    "mb-2", // espaçamento entre mensagens
  ].join(" ");

  // Cores de fundo, borda e texto
  const palette = {
    success: "bg-green-100 border border-green-400 text-green-800",
    error: "bg-red-50 border border-red-400 text-red-800",
    info: "bg-blue-100 border border-blue-400 text-blue-800",
  };

  // Cria o elemento
  const flash = document.createElement("div");
  flash.id = "flashMessage";
  flash.className = `${base} ${palette[type] || palette.info}`;
  flash.innerText = message;

  if (type === "error") {
    flash.style.backgroundColor = "#fececeff"; // red-600
    flash.style.borderColor = "#f9a2a2ff"; // red-700
    //flash.style.border = "1px solid";
  }

  // Insere no container
  container.appendChild(flash);

  // Desaparecer após 5s
  setTimeout(() => {
    flash.classList.add("opacity-0");
    // remover do DOM após a transição
    setTimeout(() => flash.remove(), 500);
  }, 5000);
};

// 2) Funções de navegação
window.redirectToLogin = (type) => {
  window.location.href =
    type === "admin" ? "/login.html?type=admin" : "/login.html";
};
window.redirectToBookCatalog = () => {
  window.location.href = "/catalogo.html";
};
window.scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

document.addEventListener("DOMContentLoaded", () => {
  // 3) Injeção de CSS e Font‑Awesome
  if (!document.querySelector('link[href="/css/style.css"]')) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "/css/style.css";
    document.head.appendChild(l);
  }
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css";
    document.head.appendChild(l);
  }

  // 4) Carrega e injeta header.html
  fetch("/header.html")
    .then((r) => {
      if (!r.ok) throw new Error("Não foi possível carregar header.html");
      return r.text();
    })
    .then((html) => {
      document.body.insertAdjacentHTML("afterbegin", html);

      // Vincula botões do header (se existirem)
      document
        .getElementById("catalogBtn")
        ?.addEventListener("click", redirectToBookCatalog);
      document
        .getElementById("loginBtn")
        ?.addEventListener("click", () => redirectToLogin("user"));
      document
        .getElementById("adminBtn")
        ?.addEventListener("click", () => redirectToLogin("admin"));

      // menu mobile
      if (typeof setupMobileMenu === "function") setupMobileMenu();
    })
    .catch((err) => console.error("Erro ao carregar header:", err));
});
