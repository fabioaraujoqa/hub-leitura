document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      name: form.elements[0].value,
      email: form.elements[1].value,
      subject: form.elements[2].value,
      message: form.elements[3].value
    };

    try {
      const res  = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const body = await res.json();

      if (res.ok) {
        showNotification(body.message || 'Mensagem enviada com sucesso!', 'success');
        form.reset();
      } else {
        // aqui você pode tratar 400, 500…
        showNotification(body.message || 'Erro ao enviar a mensagem', 'error');
      }
    } catch (err) {
      showNotification('Falha na comunicação com o servidor', 'error');
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
  if (typeof atualizarContadorReservas === "function") {
    atualizarContadorReservas();
  }
});
});