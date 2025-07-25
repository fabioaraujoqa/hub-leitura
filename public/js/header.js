// ========== APP HEADER ==========
window.AppHeader = {
  showNotification(message, type = "success") {
    document.getElementById("flashMessage")?.remove();

    const container = document.getElementById("flash-container");
    if (!container) {
      console.warn("⚠️ #flash-container não encontrado — verifique seu header.html");
      return;
    }

    const base = [
      "w-full", "px-4", "py-3", "rounded", "shadow", "text-center", "text-sm",
      "pointer-events-auto", "transition-opacity", "duration-500", "opacity-100", "mb-2",
    ].join(" ");

    const palette = {
      success: "bg-green-100 border border-green-400 text-green-800",
      error: "bg-red-50 border border-red-400 text-red-800",
      info: "bg-blue-100 border border-blue-400 text-blue-800",
    };

    const flash = document.createElement("div");
    flash.id = "flashMessage";
    flash.className = `${base} ${palette[type] || palette.info}`;
    flash.textContent = message;

    container.appendChild(flash);

    setTimeout(() => {
      flash.classList.add("opacity-0");
      setTimeout(() => flash.remove(), 500);
    }, 5000);
  },

  redirectToLogin(type) {
    window.location.href = type === "admin" ? "/login.html?type=admin" : "/login.html";
  },

  redirectToBookCatalog() {
    window.location.href = "/catalogo.html";
  },

  scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  },

  atualizarContadorReservas() {
    const reservas = JSON.parse(localStorage.getItem("reservas")) || [];
    const badge = document.getElementById("cartCount");
    if (badge) {
      badge.textContent = reservas.length;
      // Sempre mostra o contador, mesmo que seja 0
      badge.style.display = "inline-block";
    }
    
    // Dispara evento personalizado para notificar que o contador foi atualizado
    window.dispatchEvent(new CustomEvent('reservasUpdated', { 
      detail: { count: reservas.length } 
    }));
  },

  // Nova função para forçar atualização
  forceUpdateCounter() {
    this.atualizarContadorReservas();
  },

  async loadHeader() {
    if (document.getElementById("header-loaded")) return;

    // Carrega CSS extra se necessário
    [
      { href: "/css/style.css", rel: "stylesheet" },
      { href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css", rel: "stylesheet" }
    ].forEach(({ href, rel }) => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = rel;
        link.href = href;
        document.head.appendChild(link);
      }
    });

    try {
      let html = sessionStorage.getItem("headerHTML");
      if (!html) {
        const res = await fetch("/header.html");
        if (!res.ok) throw new Error("Não foi possível carregar header.html");
        html = await res.text();
        sessionStorage.setItem("headerHTML", html);
      }

      const wrapper = document.createElement("div");
      wrapper.id = "header-loaded";
      wrapper.innerHTML = html;
      document.body.insertAdjacentElement("afterbegin", wrapper);

      [
        ["catalogBtn", this.redirectToBookCatalog],
        ["loginBtn", () => this.redirectToLogin("user")],
        ["adminBtn", () => this.redirectToLogin("admin")]
      ].forEach(([id, fn]) => {
        document.getElementById(id)?.addEventListener("click", fn);
      });

      if (typeof setupMobileMenu === "function") setupMobileMenu();

      this.atualizarContadorReservas();

      // Observa mudanças no localStorage
      this.setupStorageListener();

    } catch (err) {
      console.error("Erro ao carregar header:", err);
    }
  },

  // Nova função para observar mudanças no localStorage
  setupStorageListener() {
    // Listener para mudanças diretas no localStorage
    window.addEventListener('storage', (e) => {
      if (e.key === 'reservas') {
        this.atualizarContadorReservas();
      }
    });

    // MutationObserver para detectar mudanças no localStorage da mesma aba
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      if (key === 'reservas') {
        // Delay pequeno para garantir que a mudança foi aplicada
        setTimeout(() => {
          AppHeader.atualizarContadorReservas();
        }, 10);
      }
    };

    // Atualiza periodicamente como fallback
    setInterval(() => {
      this.atualizarContadorReservas();
    }, 1000);
  }
};

// ========== ATALHOS GLOBAIS ==========
window.showNotification = AppHeader.showNotification.bind(AppHeader);
window.redirectToLogin = AppHeader.redirectToLogin.bind(AppHeader);
window.redirectToBookCatalog = AppHeader.redirectToBookCatalog.bind(AppHeader);
window.scrollToSection = AppHeader.scrollToSection.bind(AppHeader);

// Função global para atualizar o contador (mantém compatibilidade)
window.atualizarContadorReservas = () => AppHeader.atualizarContadorReservas();
window.updateReservationCountOnly = () => AppHeader.atualizarContadorReservas();

// ========== INSERÇÃO DO HEADER ==========
document.addEventListener("DOMContentLoaded", () => AppHeader.loadHeader());