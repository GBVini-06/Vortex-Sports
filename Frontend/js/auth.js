// Esse arquivo aqui é responsável por controlar a autenticação do usuário em todas as páginas internas do sistema. Ele garante que o nome do usuário logado seja exibido corretamente e que o botão "Sair" funcione para encerrar a sessão. Além de proteger as páginas internas, se o usuário não estiver logado ele manda de volta par ao login

document.addEventListener('DOMContentLoaded', () => {

    // Recupera o nome do usuário salvo no navegador após o login
    const nomeLogado = localStorage.getItem('vortex_nome_utilizador');

    // Descobre se o usuário está na tela de login (index.html ou raiz do projeto)
    const naPaginaLogin = window.location.href.includes('index.html')
                       || window.location.pathname === '/'
                       || window.location.pathname === '';

    // Se não tem ninguém logado e não está no login, redireciona para o login.
    // Isso impede acesso direto à URL sem autenticação.
    if (!nomeLogado && !naPaginaLogin) {
        window.location.href = 'index.html';
        return;
    }

    // Encontra o elemento de exibição do nome e preenche.
    const spanNome = document.querySelector('#nomeUtilizador');
    if (spanNome) {
        spanNome.innerText = nomeLogado || 'Administrador';
    }

    // Configura o botão "Sair" que aparece em todas as páginas internas
    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', async (e) => {
            e.preventDefault();

            // Remove o nome do localStorage — isso "desloga" o usuário localmente
            localStorage.removeItem('vortex_nome_utilizador');

            // Encerra também a sessão no Supabase, caso exista uma sessão ativa
            if (typeof window.supabase !== 'undefined') {
                await window.supabase.auth.signOut();
            }

            // Redireciona para a tela de login
            window.location.href = 'index.html';
        });
    }
});
