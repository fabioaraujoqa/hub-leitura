// ========== INSERÇÃO DO FOOTER ==========
document.addEventListener("DOMContentLoaded", async () => {
  if (document.getElementById("footer-loaded")) return; // evita múltiplas injeções

  // verifica se há cache no sessionStorage
  const cached = sessionStorage.getItem("footerHtml");
  const wrapper = document.createElement("div");
  wrapper.id = "footer-loaded";

  if (cached) {
    wrapper.innerHTML = cached;
    document.body.appendChild(wrapper);
    return;
  }

  try {
    const res = await fetch("/footer.html");
    if (!res.ok) throw new Error("Não foi possível carregar footer.html");
    const html = await res.text();
    sessionStorage.setItem("footerHtml", html); // salva em cache
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);
  } catch (err) {
    console.error("Erro ao carregar footer:", err);
  }
});
