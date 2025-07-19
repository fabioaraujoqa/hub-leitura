// Função para adicionar uma reserva de forma padronizada
function adicionarReserva(livro) {
  const reservas = JSON.parse(localStorage.getItem("reservas")) || [];

  // Verifica se o livro já foi reservado
  const jaExiste = reservas.some(r => r.id === livro.id);
  if (jaExiste) {
    showNotification?.("Você já reservou esse livro.", "info");
    return false;
  }

  // Limite de 3 reservas
  if (reservas.length >= 3) {
    showNotification?.("Você só pode reservar até 3 livros por vez.", "error");
    return false;
  }

  reservas.push(livro);
  localStorage.setItem("reservas", JSON.stringify(reservas));

  showNotification?.("Livro reservado com sucesso!", "success");

  // Atualiza o contador se a função existir
  if (typeof atualizarContadorReservas === "function") {
    atualizarContadorReservas();
  }

  return true;
}

// Função para atualizar contador de reservas no header
function atualizarContadorReservas() {
  const reservas = JSON.parse(localStorage.getItem("reservas")) || [];
  const contador = document.getElementById("contadorReservas");
  if (contador) {
    contador.textContent = reservas.length;
  }
}
