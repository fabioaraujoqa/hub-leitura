import { fetchProdutos } from './api.js';

async function init() {
  try {
    const produtos = await fetchProdutos();
    const ul = document.getElementById('lista-produtos');
    produtos.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.nome} — R$ ${p.preco.toFixed(2)}`;
      ul.appendChild(li);
    });
  } catch (e) {
    console.error(e);
    document.body.insertAdjacentHTML(
      'beforeend',
      '<p class="erro">Não foi possível carregar os produtos.</p>'
    );
  }
}

document.addEventListener('DOMContentLoaded', init);
