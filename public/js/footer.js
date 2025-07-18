document.addEventListener('DOMContentLoaded', () => {
  fetch('/footer.html')
    .then(res => {
      if (!res.ok) throw new Error('Não foi possível carregar footer.html');
      return res.text();
    })
    .then(html => {
      // insere o footer ao fim do body
      document.body.insertAdjacentHTML('beforeend', html);
    })
    .catch(err => console.error('Erro ao carregar footer:', err));
});
