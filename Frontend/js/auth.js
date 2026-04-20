document.addEventListener('DOMContentLoaded', () => {
    
    if (typeof window.supabase !== 'undefined') {
        window.supabase.auth.getSession().then(({ data: { session } }) => {
            const naSessao = !!session;
            const noPaginaLogin = window.location.href.includes('index.html');

            if (!naSessao && !noPaginaLogin) {
                // Sessão inválida fora do login -> redireciona
                window.location.href = 'index.html';
                return;
            }

            // Exibe o nome do utilizador guardado no login
            const nomeLogado = localStorage.getItem('vortex_nome_utilizador') || 'Administrador';
            const spanNome = document.querySelector('#nomeUtilizador');
            if (spanNome) {
                spanNome.innerText = nomeLogado;
            }
        });
    } else {
        // Fallback: se o supabase não estiver disponível, usa apenas localStorage
        const nomeLogado = localStorage.getItem('vortex_nome_utilizador') || 'Administrador';
        const spanNome = document.querySelector('#nomeUtilizador');
        if (spanNome) {
            spanNome.innerText = nomeLogado;
        }

        if (!localStorage.getItem('vortex_nome_utilizador') && !window.location.href.includes('index.html')) {
            window.location.href = 'index.html';
        }
    }

    
    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', async (e) => {
            e.preventDefault();
            localStorage.removeItem('vortex_nome_utilizador');
            if (typeof window.supabase !== 'undefined') {
                await window.supabase.auth.signOut();
            }
            window.location.href = 'index.html';
        });
    }
});
