lucide.createIcons();

const modal = document.getElementById('modalMovimentacao');
const btnNovo = document.getElementById('btnNovaMovimentacao');
const btnClose = document.getElementById('closeModal');
const btnCancelar = document.getElementById('btnCancelar');
const formMovimentacao = document.getElementById('formMovimentacao');
const selectTipo = document.getElementById('tipoMovimentacao');

// Abre o Modal
btnNovo.addEventListener('click', () => {
    formMovimentacao.reset();
    selectTipo.style.borderColor = 'var(--border-color)'; // Reseta cor
    modal.classList.remove('hidden');
});

// Fecha o Modal
const fecharModal = () => {
    modal.classList.add('hidden');
};

btnClose.addEventListener('click', fecharModal);
btnCancelar.addEventListener('click', fecharModal);

// Dá um feedback visual na cor do input de "Tipo" (Verde pra Entrada, Vermelho pra Saída)
selectTipo.addEventListener('change', (e) => {
    if (e.target.value === 'entrada') {
        e.target.style.borderColor = 'var(--success)';
    } else if (e.target.value === 'saida') {
        e.target.style.borderColor = 'var(--danger)';
    } else {
        e.target.style.borderColor = 'var(--border-color)';
    }
});

// Simula o registro
formMovimentacao.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Movimentação registrada com sucesso no banco de dados! (Simulação)');
    fecharModal();
});