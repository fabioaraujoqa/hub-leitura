let limit = 12;
let offset = 0;
const grid = document.getElementById('booksGrid');

// filtros
const searchInput    = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const editorFilter   = document.getElementById('editorFilter');
const authorFilter   = document.getElementById('authorFilter');
const clearBtn       = document.getElementById('clearFilters');
const loadMoreBtn    = document.getElementById('loadMore');

// Busca e renderiza livros
async function fetchBooks(reset = false) {
  if (reset) {
    offset = 0;
    grid.innerHTML = '';
  }

  const params = new URLSearchParams({
    limit,
    offset,
    search: searchInput.value,
    category: categoryFilter.value,
    editor: editorFilter.value,
    author: authorFilter.value
  });

  const res = await fetch(`/api/books?${params}`);
  const { data: books } = await res.json();

  books.forEach(book => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow p-4 flex flex-col justify-between';
    card.innerHTML = `
      <div>
        <i class="fas fa-book"></i>
        <h3 class="font-semibold text-lg">${book.title}</h3>
        <p class="text-sm text-gray-600">${book.author}</p>
        <p class="text-sm text-gray-600">${book.editor || '—'}</p>
        <p class="mt-2 text-sm text-green-600">${book.available} disponíveis</p>
      </div>
      <div class="mt-4 flex justify-between items-center">
        <button class="reserve-btn px-3 py-1 bg-blue-600 text-white rounded" data-book-id="${book.id}">
          <i class="fas fa-calendar-plus mr-1"></i>Reservar
        </button>
        <button class="favorite-btn text-red-500 text-xl" data-book-id="${book.id}">
          <i class="far fa-heart"></i>
        </button>
        <button class="details-btn text-blue-600 text-xl" data-book-id="${book.id}">
          <i class="fas fa-info-circle"></i>
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  offset += books.length;
  loadMoreBtn.style.display = books.length < limit ? 'none' : 'inline-block';

  // Vincula eventos nos botões recém-criados
  attachCatalogHandlers();
}

// Inicializa filtros (categoria, editoras, autores)
async function initFilters() {
  const res = await fetch('/api/books?limit=1000&offset=0');
  const allBooks = (await res.json()).data;
  const unique = (arr, key) => [...new Set(arr.map(x => x[key] || ''))].filter(v => v).sort();

  unique(allBooks, 'category').forEach(c => {
    categoryFilter.innerHTML += `<option value="${c}">${c}</option>`;
  });
  unique(allBooks, 'editor').forEach(e => {
    editorFilter.innerHTML += `<option value="${e}">${e}</option>`;
  });
  unique(allBooks, 'author').forEach(a => {
    authorFilter.innerHTML += `<option value="${a}">${a}</option>`;
  });
}

// Eventos de filtro e carregamento
if (searchInput) {
  searchInput.addEventListener('input', () => fetchBooks(true));
}
if (categoryFilter) {
  categoryFilter.addEventListener('change', () => fetchBooks(true));
}
if (editorFilter) {
  editorFilter.addEventListener('change', () => fetchBooks(true));
}
if (authorFilter) {
  authorFilter.addEventListener('change', () => fetchBooks(true));
}
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    categoryFilter.value = '';
    editorFilter.value = '';
    authorFilter.value = '';
    fetchBooks(true);
  });
}
if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', () => fetchBooks());
}

// Ao carregar a página
window.addEventListener('DOMContentLoaded', async () => {
  await initFilters();
  fetchBooks(true);
});

// Anexa manipuladores aos botões do catálogo
typeof showNotification === 'undefined' || console.warn('showNotification não definido');

function attachCatalogHandlers() {
  // — Favoritar / desfavoritar —
  document.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bookId = btn.dataset.bookId;
      const icon = btn.querySelector('i');
      const isAdding = icon.classList.contains('far');
      try {
        const res = await fetch(`/api/favorites/${bookId}`, {
          method: isAdding ? 'POST' : 'DELETE',
          credentials: 'include'
        });
        const body = await res.json();
        if (res.ok) {
          // alterna ícone
          icon.classList.toggle('far');
          icon.classList.toggle('fas');
          showNotification(body.message || 'Favorito atualizado!', 'success');
        } else if (res.status === 401) {
          showNotification(body.message || 'Você precisa estar logado para favoritar', 'error');
        } else if (res.status === 404) {
          showNotification(body.message || 'Livro não encontrado', 'error');
        } else {
          showNotification(body.message || 'Erro ao atualizar favorito', 'error');
        }
      } catch (err) {
        showNotification('Falha na comunicação', 'error');
      }
    });
  });

  // — Reservar —
  document.querySelectorAll('.reserve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bookId = btn.dataset.bookId;
      try {
        const res = await fetch('/api/loans', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId })
        });
        let body = {};
        try {
          body = await res.json();
        } catch (e) {
          body = {};
        }
        if (res.ok) {
          showNotification(body.message || 'Livro reservado! Confira seu carrinho.', 'success');
        } else if (res.status === 401) {
          showNotification(body.message || 'Você precisa estar logado para reservar', 'error');
        } else {
          showNotification(body.message || 'Erro ao reservar livro', 'error');
        }
      } catch (err) {
        showNotification('Falha na comunicação', 'error');
      }
    });
  });

  // — Detalhes 
  document.querySelectorAll('.details-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bookId = btn.dataset.bookId;
      window.location.href = `/catalogo.html?id=${bookId}`;
    });
  });
}