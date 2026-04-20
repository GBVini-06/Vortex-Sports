document.addEventListener('DOMContentLoaded', () => {
    // Inicializa os ícones do Lucide
    if (window.lucide) {
        lucide.createIcons();
    }

    const formLogin = document.querySelector('#form-login');
    const mensagemErro = document.querySelector('#mensagemErro');

    if (!formLogin) return;

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = document.querySelector('#usuario').value;
        const senhaInput = document.querySelector('#senha').value;
        const btnSubmit = formLogin.querySelector('.btn-login');

        // Esconde a mensagem de erro de tentativa anterior
        if (mensagemErro) mensagemErro.classList.add('hidden');

        // Efeito visual no botão enquanto carrega
        const textoOriginal = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<span>Entrando...</span>';
        btnSubmit.disabled = true;

        try {
            // Busca o usuário na tabela 'usuarios'
            const { data: usuario, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('email', emailInput)
                .eq('senha', senhaInput)
                .single();

            if (error || !usuario) {
                throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
            }

            // Salva o nome no localStorage e redireciona
            localStorage.setItem('vortex_nome_utilizador', usuario.nome);
            window.location.href = 'dashboard.html';

        } catch (err) {
            if (mensagemErro) {
                mensagemErro.classList.remove('hidden');
                mensagemErro.innerText = err.message;
            } else {
                alert(err.message);
            }

            btnSubmit.innerHTML = textoOriginal;
            if (window.lucide) lucide.createIcons();
            btnSubmit.disabled = false;
        }
    });
});
