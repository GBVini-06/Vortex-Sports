// Inicializa os ícones do Lucide
lucide.createIcons();

const loginForm = document.getElementById('loginForm');
const mensagemErro = document.getElementById('mensagemErro');

loginForm.addEventListener('submit', function(event) {
    // 1. Evita que o formulário recarregue a página
    event.preventDefault();

    // 2. Captura os valores dos inputs
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;

    // 3. Validação (Simulando consulta ao banco de dados)
    if (usuario === 'admin' && senha === 'admin123') {
        // Sucesso: Limpa o erro e redireciona
        mensagemErro.classList.add('hidden');
        alert('Acesso permitido! Bem-vindo à Vortex Sports.');
        
        // No futuro, redireciona para a tela principal:
        // window.location.href = 'dashboard.html';
    } else {
        // Falha: Mostra a mensagem de erro
        mensagemErro.classList.remove('hidden');
        
        // Efeito visual de erro nos inputs
        loginForm.reset(); 
    }
});