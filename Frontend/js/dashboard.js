document.addEventListener('DOMContentLoaded', () => {
    // Inicializa os ícones do Lucide
    if (window.lucide) {
        lucide.createIcons();
    }

    const btnSair = document.getElementById('btnSair');
    if (btnSair) {
        btnSair.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('vortex_nome_utilizador');
            window.location.href = 'index.html';
        });
    }

    // Inicia o carregamento dos dados do Supabase
    carregarDashboard();
});

async function carregarDashboard() {
    console.log("Iniciando a busca de dados no Supabase...");

    if (typeof window.supabase === 'undefined') {
        console.error("ERRO: A conexão com o Supabase não foi encontrada.");
        return;
    }

    try {
        const { data: produtos, error: errProd } = await window.supabase
            .from('produtos')
            .select('*');
            
        if (errProd) throw errProd;

        const { data: movs, error: errMov } = await window.supabase
            .from('movimentacoes')
            .select('*, produtos(nome, categoria)')
            .order('data', { ascending: false });
            
        if (errMov) throw errMov;

        console.log("Dados recebidos!", { produtos, movs });

        atualizarCards(produtos, movs);
        atualizarTabela(movs);
        renderizarGraficos(produtos, movs);
        verificarEstoqueBaixo(produtos);

    } catch (error) {
        console.error("Erro ao carregar o Dashboard:", error);
    }
}

function atualizarCards(produtos, movs) {
    // Total de Produtos
    document.getElementById('card-total').innerText = produtos.length;

    // Valor em Estoque
    const valorEstoque = produtos.reduce((acc, p) => {
        const preco = parseFloat(p.preco) || 0;
        const estoque = parseInt(p.estoque_atual) || 0;
        return acc + (preco * estoque);
    }, 0);

    document.getElementById('card-valor').innerText = valorEstoque.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    // Estoque Baixo
    const estoqueBaixo = produtos.filter(p => {
        const min = p.estoque_minimo || 5;
        return p.estoque_atual <= min;
    }).length;
    document.getElementById('card-baixo').innerText = estoqueBaixo;

    // Entradas Hoje
    const hoje = new Date().toISOString().split('T')[0];
    const entradasHoje = movs.filter(m => 
        m.tipo === 'entrada' && 
        (m.data && m.data.startsWith(hoje))
    ).length;
    document.getElementById('card-entradas').innerText = entradasHoje;
}

function atualizarTabela(movs) {
    const tbody = document.getElementById('tabela-movimentacoes');
    if (!tbody) return;

    tbody.innerHTML = '';

    const ultimasMovs = movs.slice(0, 5);

    if (ultimasMovs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhuma movimentação.</td></tr>';
        return;
    }

    ultimasMovs.forEach(m => {
        const tr = document.createElement('tr');
        const isEntrada = m.tipo === 'entrada';
        
        const dataOriginal = new Date(m.data);
        const dataFormatada = dataOriginal.toLocaleDateString('pt-BR') + ' ' + 
                              dataOriginal.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

        tr.innerHTML = `
            <td>${m.produtos?.nome || 'Produto Indisponível'}</td>
            <td>${m.produtos?.categoria || '-'}</td>
            <td><span class="badge ${isEntrada ? 'badge-in' : 'badge-out'}">${isEntrada ? 'Entrada' : 'Saída'}</span></td>
            <td class="${isEntrada ? 'text-green' : 'text-red'} font-bold">${isEntrada ? '+' : '-'}${m.quantidade}</td>
            <td>${dataFormatada}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Alertas de Estoque Baixo ao entrar

function verificarEstoqueBaixo(produtos) {
    const criticos = produtos.filter(p => {
        const min = p.estoque_minimo || 5;
        return p.estoque_atual <= min;
    });

    if (criticos.length === 0) return;

    // Exibe com um pequeno delay entre cada notificação para não empilhar tudo de uma vez
    criticos.forEach((p, index) => {
        setTimeout(() => {
            mostrarNotificacao(p.nome, p.estoque_atual, p.estoque_minimo || 5);
        }, index * 400);
    });
}

function mostrarNotificacao(nomeProduto, qtdAtual, min) {
    let container = document.getElementById('container-notificacoes');
    if (!container) {
        container = document.createElement('div');
        container.id = 'container-notificacoes';
        document.body.appendChild(container);
    }

    const notif = document.createElement('div');
    notif.className = 'notificacao';
    notif.innerHTML = `
        <button class="notificacao-fechar">&times;</button>
        <div class="notificacao-titulo">⚠️ Estoque Baixo!</div>
        <div class="notificacao-texto">
            O produto <strong>${nomeProduto}</strong> atingiu níveis críticos.<br>
            Restam apenas <strong>${qtdAtual}</strong> unidades (Mínimo: ${min}).
        </div>
    `;

    notif.querySelector('.notificacao-fechar').addEventListener('click', () => notif.remove());
    container.appendChild(notif);

    setTimeout(() => {
        if (notif.parentElement) {
            notif.style.opacity = '0';
            notif.style.transform = 'translateX(100%)';
            notif.style.transition = 'all 0.4s ease';
            setTimeout(() => notif.remove(), 400);
        }
    }, 7000);
}

function renderizarGraficos(produtos, movs) {
    Chart.defaults.color = '#64748b';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Gráfico de Categorias (Pizza)
    const ctxCat = document.getElementById('categoriaChart');
    if (ctxCat) {
        const categoriasMap = {};
        produtos.forEach(p => {
            const cat = p.categoria || 'Outros';
            categoriasMap[cat] = (categoriasMap[cat] || 0) + parseInt(p.estoque_atual || 0);
        });

        new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoriasMap),
                datasets: [{
                    data: Object.values(categoriasMap),
                    backgroundColor: ['#FF6B00', '#0A192F', '#3B82F6', '#10B981', '#F59E0B'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    // Gráfico de Movimentação (Barra)
    const ctxMov = document.getElementById('movimentacaoChart');
    if (ctxMov) {
        let totalEntradas = 0;
        let totalSaidas = 0;

        movs.forEach(m => {
            if (m.tipo === 'entrada') totalEntradas += m.quantidade;
            else totalSaidas += m.quantidade;
        });

        new Chart(ctxMov, {
            type: 'bar',
            data: {
                labels: ['Entradas', 'Saídas'],
                datasets: [{
                    label: 'Quantidade Total',
                    data: [totalEntradas, totalSaidas],
                    backgroundColor: ['#10B981', '#EF4444'],
                    borderRadius: 8,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}
