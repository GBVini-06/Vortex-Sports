lucide.createIcons();

const loginForm = document.getElementById('loginForm');
const mensagemErro = document.getElementById('mensagemErro');

loginForm.addEventListener('submit', function(event) {

    event.preventDefault();

    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;

    if (usuario === 'admin' && senha === 'admin123') {

        mensagemErro.classList.add('hidden');
        window.location.href = 'dashboard.html';
        alert('Acesso permitido! Bem-vindo à Vortex Sports.');
       
    } else {
    
        mensagemErro.classList.remove('hidden');
        
        loginForm.reset(); 
    }
});