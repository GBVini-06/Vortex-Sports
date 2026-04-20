// Esse arquivo é responsável por controlar tudo que acontece na tela de login, desde a captura dos dados do formulário, passando pela autenticação no Supabase, até o redirecionamento para o dashboard. Ele também lida com mensagens de erro para o usuário.

document.addEventListener('DOMContentLoaded', () => {

    // Inicializa os icones do Lucide
    if (window.lucide) {
        lucide.createIcons();
    }

    const formLogin = document.querySelector('#form-login');
    const mensagemErro = document.querySelector('#mensagemErro');
    if (!formLogin) return;

    // Escuta o submit do formulário de login
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput  = document.querySelector('#usuario').value;
        const senhaInput  = document.querySelector('#senha').value;
        const btnSubmit   = formLogin.querySelector('.btn-login');

        // Esconde a mensagem de erro de uma tentativa anterior, se houver
        if (mensagemErro) mensagemErro.classList.add('hidden');

        // Desabilita o botão e mostra "Entrando..." para o usuário perceber que está processando
        const textoOriginal = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<span>Entrando...</span>';
        btnSubmit.disabled  = true;

        try {
            // Busca na tabela 'usuarios' um registro que bata exatamente com o e-mail e a senha informados.
            const { data: usuario, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('email', emailInput)
                .eq('senha', senhaInput)
                .single();

            if (error || !usuario) {
                throw new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
            }

            // Login OK — salva o nome do usuário no localStorage e vai para o dashboard
            localStorage.setItem('vortex_nome_utilizador', usuario.nome);
            window.location.href = 'dashboard.html';

        } catch (err) {
            // Exibe o erro no bloco visual da tela (ou em alert, como fallback)
            if (mensagemErro) {
                mensagemErro.classList.remove('hidden');
                mensagemErro.innerText = err.message;
            } else {
                alert(err.message);
            }

            // Restaura o botão para o estado original
            btnSubmit.innerHTML = textoOriginal;

            // Reativa os ícones porque o innerHTML do botão foi substituído
            if (window.lucide) lucide.createIcons();

            btnSubmit.disabled = false;
        }
    });
});
