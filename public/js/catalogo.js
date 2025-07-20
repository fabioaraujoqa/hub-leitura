let limit = 12;
let offset = 0;
let allBooksData = []; // Cache dos livros carregados
const grid = document.getElementById("booksGrid");

// filtros
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const editorFilter = document.getElementById("editorFilter");
const authorFilter = document.getElementById("authorFilter");
const clearBtn = document.getElementById("clearFilters");
const loadMoreBtn = document.getElementById("loadMore");

// Busca e renderiza livros
async function fetchBooks(reset = false) {
  if (reset) {
    offset = 0;
    grid.innerHTML = "";
    allBooksData = []; // Limpa o cache
  }

  const params = new URLSearchParams({
    limit,
    offset,
    search: searchInput.value,
    category: categoryFilter.value,
    editor: editorFilter.value,
    author: authorFilter.value,
  });

  try {
    const res = await fetch(`/api/books?${params}`);
    if (!res.ok) {
      throw new Error('Erro ao carregar livros');
    }
    
    const { data: books } = await res.json();

    // Adiciona os novos livros ao cache
    allBooksData.push(...books);

    books.forEach((book) => {
      const card = document.createElement("div");
      card.className =
        "bg-white rounded shadow p-4 flex flex-col items-center relative";

      card.innerHTML = `
      <!-- Ícone do livro -->
      <div class="flex justify-center w-full mt-6 mb-3">
        <span class="text-blue-600 text-5xl">
          <i class="fas fa-book"></i>
        </span>
      </div>

      <!-- Informações -->
      <h3 class="font-semibold text-lg text-gray-800">
        <a href="/livro.html?id=${book.id}" class="hover:underline">${book.title}</a>
      </h3>
      <p class="text-sm text-gray-600">${book.author}</p>
      <p class="text-sm text-gray-600">${book.editor || "—"}</p>
      <p class="text-sm text-green-600 mt-1">${book.available} disponíveis</p>

      <!-- Botões -->
      <div class="mt-4 flex flex-col w-full gap-2">
        <button class="reserve-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors" data-book-id="${book.id}">
          <i class="fas fa-calendar-plus mr-1"></i>Reservar
        </button>
        <button class="details-btn bg-white border border-blue-600 text-blue-600 px-4 py-2 rounded font-medium transition-colors hover:bg-blue-50" data-book-id="${book.id}">
          <i class="fas fa-info-circle mr-1"></i>Detalhes
        </button>
      </div>
    `;

      grid.appendChild(card);
    });

    offset += books.length;
    loadMoreBtn.style.display = books.length < limit ? "none" : "inline-block";

    // Vincula eventos nos botões recém-criados
    attachCatalogHandlers();
    updateReservationIcons();
  } catch (error) {
    console.error('Erro ao carregar livros:', error);
    if (typeof showNotification === 'function') {
      showNotification('Erro ao carregar livros. Tente novamente.', 'error');
    }
  }
}

// Inicializa filtros (categoria, editoras, autores)
async function initFilters() {
  try {
    const res = await fetch("/api/books?limit=1000&offset=0");
    if (!res.ok) {
      throw new Error('Erro ao carregar filtros');
    }
    
    const allBooks = (await res.json()).data;
    const unique = (arr, key) =>
      [...new Set(arr.map((x) => x[key] || ""))].filter((v) => v).sort();

    unique(allBooks, "category").forEach((c) => {
      categoryFilter.innerHTML += `<option value="${c}">${c}</option>`;
    });
    unique(allBooks, "editor").forEach((e) => {
      editorFilter.innerHTML += `<option value="${e}">${e}</option>`;
    });
    unique(allBooks, "author").forEach((a) => {
      authorFilter.innerHTML += `<option value="${a}">${a}</option>`;
    });
  } catch (error) {
    console.error('Erro ao inicializar filtros:', error);
  }
}

// Função para encontrar um livro pelo ID no cache
function findBookById(bookId) {
  return allBooksData.find(book => book.id.toString() === bookId.toString());
}

// Função para buscar livro individual se não estiver no cache
async function getBookData(bookId) {
  let book = findBookById(bookId);
  
  if (!book) {
    try {
      const res = await fetch(`/api/books/${bookId}`);
      if (res.ok) {
        const data = await res.json();
        book = data.data;
      }
    } catch (error) {
      console.error('Erro ao buscar dados do livro:', error);
    }
  }
  
  return book;
}

// Anexa manipuladores aos botões do catálogo
function attachCatalogHandlers() {
  // — Favoritar / desfavoritar —
  document.querySelectorAll(".favorite-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const bookId = btn.dataset.bookId;
      const icon = btn.querySelector("i");
      const isAdding = icon.classList.contains("far");
      try {
        const res = await fetch(`/api/favorites/${bookId}`, {
          method: isAdding ? "POST" : "DELETE",
          credentials: "include",
        });
        const body = await res.json();
        if (res.ok) {
          // alterna ícone
          icon.classList.toggle("far");
          icon.classList.toggle("fas");
          if (typeof showNotification === 'function') {
            showNotification(body.message || "Favorito atualizado!", "success");
          }
        } else if (res.status === 401) {
          if (typeof showNotification === 'function') {
            showNotification(
              body.message || "Você precisa estar logado para favoritar",
              "error"
            );
          }
        } else if (res.status === 404) {
          if (typeof showNotification === 'function') {
            showNotification(body.message || "Livro não encontrado", "error");
          }
        } else {
          if (typeof showNotification === 'function') {
            showNotification(
              body.message || "Erro ao atualizar favorito",
              "error"
            );
          }
        }
      } catch (err) {
        if (typeof showNotification === 'function') {
          showNotification("Falha na comunicação", "error");
        }
      }
    });
  });

  // — Reservar —
  document.querySelectorAll(".reserve-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const bookId = btn.dataset.bookId;
      let cart = JSON.parse(localStorage.getItem("reservas")) || [];

      // Verifica se o livro já está reservado
      const jaReservado = cart.some(item => item.id.toString() === bookId.toString());

      if (jaReservado) {
        // Remove a reserva
        cart = cart.filter((item) => item.id.toString() !== bookId.toString());
        localStorage.setItem("reservas", JSON.stringify(cart));
        
        if (typeof showNotification === 'function') {
          showNotification("Reserva cancelada com sucesso!", "info");
        }
        
        updateReservationIcons();
        updateReservationCountOnly();
        
        // Força atualização do header
        if (typeof AppHeader !== 'undefined' && AppHeader.forceUpdateCounter) {
          AppHeader.forceUpdateCounter();
        }
        return;
      }

      // Verifica limite de reservas
      if (cart.length >= 3) {
        if (typeof showNotification === 'function') {
          showNotification("Você só pode reservar até 3 livros.", "error");
        }
        return;
      }

      // Busca os dados completos do livro
      const livro = await getBookData(bookId);
      
      if (!livro) {
        if (typeof showNotification === 'function') {
          showNotification("Erro ao carregar dados do livro.", "error");
        }
        return;
      }

      // Verifica disponibilidade
      if (livro.available <= 0) {
        if (typeof showNotification === 'function') {
          showNotification("Este livro não está disponível no momento.", "error");
        }
        return;
      }

      // Cria o objeto do livro para o carrinho
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

      // Adiciona à reserva usando a função externa se existir
      if (typeof adicionarReserva === 'function') {
        adicionarReserva(novoLivro);
      } else {
        // Fallback: adiciona diretamente ao localStorage
        cart.push(novoLivro);
        localStorage.setItem("reservas", JSON.stringify(cart));
      }

      if (typeof showNotification === 'function') {
        showNotification("Livro reservado com sucesso!", "success");
      }

      updateReservationIcons();
      updateReservationCountOnly();
      
      // Força atualização do header
      if (typeof AppHeader !== 'undefined' && AppHeader.forceUpdateCounter) {
        AppHeader.forceUpdateCounter();
      }
    });
  });

  // — Detalhes —
  document.querySelectorAll(".details-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bookId = btn.dataset.bookId;
      window.location.href = `/livro.html?id=${bookId}`;
    });
  });
}

function updateReservationIcons() {
  const cart = JSON.parse(localStorage.getItem("reservas")) || [];
  document.querySelectorAll(".reserve-btn").forEach((btn) => {
    const bookId = btn.dataset.bookId;
    const jaReservado = cart.some(item => item.id.toString() === bookId.toString());
    
    if (jaReservado) {
      btn.innerHTML = '<i class="fas fa-calendar-minus mr-1"></i>Cancelar';
      btn.classList.remove("bg-blue-600", "hover:bg-blue-700");
      btn.classList.add("bg-red-600", "hover:bg-red-700");
    } else {
      btn.innerHTML = '<i class="fas fa-calendar-plus mr-1"></i>Reservar';
      btn.classList.remove("bg-red-600", "hover:bg-red-700");
      btn.classList.add("bg-blue-600", "hover:bg-blue-700");
    }
  });

  // Atualiza o contador no header (se existir)
  updateReservationCountOnly();
}

function updateReservationCountOnly() {
  const cart = JSON.parse(localStorage.getItem("reservas")) || [];
  const badge = document.getElementById("cartCount");
  if (badge) {
    badge.textContent = cart.length;
  }

  // Chama a função externa se existir
  if (typeof atualizarContadorReservas === 'function') {
    atualizarContadorReservas();
  }
}

// Eventos de filtro e carregamento
if (searchInput) {
  searchInput.addEventListener("input", () => fetchBooks(true));
}
if (categoryFilter) {
  categoryFilter.addEventListener("change", () => fetchBooks(true));
}
if (editorFilter) {
  editorFilter.addEventListener("change", () => fetchBooks(true));
}
if (authorFilter) {
  authorFilter.addEventListener("change", () => fetchBooks(true));
}
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "";
    editorFilter.value = "";
    authorFilter.value = "";
    fetchBooks(true);
  });
}
if (loadMoreBtn) {
  loadMoreBtn.addEventListener("click", () => fetchBooks());
}

// Inicialização
window.addEventListener("DOMContentLoaded", async () => {
  await initFilters();
  fetchBooks(true);
  updateReservationCountOnly();
});

// Compatibilidade com código existente
document.addEventListener("DOMContentLoaded", () => {
  if (typeof atualizarContadorReservas === "function") {
    atualizarContadorReservas();
  }
});