// ========== MOSTRAR DADOS DO LIVRO ==========
function carregarLivro(id) {
  fetch(`/api/books/${id}`)
    .then((res) => {
      if (!res.ok) throw new Error("Erro ao carregar o livro");
      return res.json();
    })
    .then((data) => {
      const livro = data.data;

      if (!livro) {
        showNotification("Livro não encontrado.", "error");
        return;
      }

      document.getElementById("tituloLivro").textContent = livro.title;
      document.getElementById("autorLivro").textContent = livro.author;
      document.getElementById("anoLivro").textContent = livro.publication_year;
      document.getElementById("editoraLivro").textContent = livro.editor;
      document.getElementById("categoriaLivro").textContent = livro.category;
      document.getElementById("paginasLivro").textContent = livro.pages;
      document.getElementById("formatoLivro").textContent = livro.format;
      document.getElementById("idiomaLivro").textContent = livro.language;
      document.getElementById("disponibilidadeLivro").textContent =
        livro.available > 0 ? `${livro.available} em estoque` : "Indisponível";
      document.getElementById("resumoLivro").textContent = livro.description;

      const capa = document.getElementById("capaLivro");
      if (livro.cover_image) {
        capa.src = `/img/capas/${livro.cover_image}`;
        capa.alt = `Capa do livro ${livro.title}`;
      } else {
        capa.style.display = "none";
      }

      const disponibilidadeEl = document.getElementById("disponibilidadeLivro");

      if (livro.available > 0) {
        disponibilidadeEl.textContent = `${livro.available} em estoque`;
        disponibilidadeEl.classList.remove("text-red-600");
        disponibilidadeEl.classList.add("text-green-600");
      } else {
        disponibilidadeEl.textContent = "Indisponível";
        disponibilidadeEl.classList.remove("text-green-600");
        disponibilidadeEl.classList.add("text-red-600");
      }

      // Ativa o botão de reserva
      const btn = document.getElementById("btnReservar");
      btn.disabled = false;
      btn.addEventListener("click", () => reservarLivro(livro));
    })
    .catch((err) => {
      console.error(err);
      showNotification("Erro ao carregar os dados do livro.", "error");
    });
}

// ========== RESERVA DE LIVRO ==========
function reservarLivro(livro) {
  const carrinho = JSON.parse(localStorage.getItem("reservas")) || [];

  if (carrinho.length >= 3) {
    showNotification("Você só pode reservar até 3 livros por vez.", "error");
    return;
  }

  const jaReservado = carrinho.some((item) => item.id === livro.id);
  if (jaReservado) {
    showNotification("Você já reservou esse livro.", "info");
    return;
  }

  const novoLivro = {
    id: livro.id,
    titulo: livro.title,
    autor: livro.author,
    capa: livro.cover_image ? `/img/capas/${livro.cover_image}` : null,
    editora: livro.editor,
    ano: livro.publication_year,
    categoria: livro.category,
    paginas: livro.pages,
    formato: livro.format,
    idioma: livro.language,
    disponibilidade: livro.available,
    resumo: livro.description,
  };

adicionarReserva(novoLivro);

  showNotification("Livro reservado com sucesso!", "success");
  if (typeof atualizarContadorCarrinho === "function")
    atualizarContadorCarrinho();
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    showNotification("Livro não especificado na URL.", "error");
    return;
  }

  carregarLivro(id);

  if (typeof atualizarContadorCarrinho === "function")
    atualizarContadorCarrinho();
});
