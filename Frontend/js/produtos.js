lucide.createIcons();


const modal = document.getElementById('modalProduto');
const btnNovo = document.getElementById('btnNovoProduto');
const btnClose = document.getElementById('closeModal');
const btnCancelar = document.getElementById('btnCancelar');
const formProduto = document.getElementById('formProduto');
const modalTitle = document.querySelector('.modal-header h2'); 

btnNovo.addEventListener('click', () => {
    modalTitle.textContent = 'Cadastrar Produto'; 
    formProduto.reset(); 
    modal.classList.remove('hidden');
});

const botoesEditar = document.querySelectorAll('.text-blue');
botoesEditar.forEach(btn => {
    btn.addEventListener('click', (e) => {
        modalTitle.textContent = 'Editar Produto';

        const linha = e.target.closest('tr');
        const nomeDoProduto = linha.cells[1].textContent;
        const inputNome = formProduto.querySelector('input[type="text"]');
        inputNome.value = nomeDoProduto;
        
        modal.classList.remove('hidden');
    });
});

const fecharModal = () => {
    modal.classList.add('hidden');
    formProduto.reset();
};

btnClose.addEventListener('click', fecharModal);
btnCancelar.addEventListener('click', fecharModal);

formProduto.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const acao = modalTitle.textContent === 'Editar Produto' ? 'atualizado' : 'salvo';
    alert(`Produto ${acao} com sucesso! (Simulação)`);
    
    fecharModal();
});

const botoesExcluir = document.querySelectorAll('.text-danger');
botoesExcluir.forEach(btn => {
    btn.addEventListener('click', () => {
        const confirmar = confirm('Tem certeza que deseja excluir este produto?');
        if (confirmar) {
            const linha = btn.closest('tr');
            linha.remove();
            alert('Produto excluído com sucesso!');
        }
    });
});