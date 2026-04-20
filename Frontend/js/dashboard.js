// Este arquivo contém a lógica principal para o Dashboard. Ele busca os dados de produtos e movimentações no Supabase, preenche os 4 cards (total, valor, estoque baixo, entradas hoje), renderiza a tabela das últimas 5 movimentações, desenha os gráficos com o chart.js e dispara notificações de estoque baixo.

document.addEventListener('DOMContentLoaded', () => {

    // Inicializa os icones do Lucide
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

    // Dispara o carregamento principal dos dados
    carregarDashboard();
});


// Essa função busca produtos e movimentações no Supabase e chama as funções de atualização da interface
async function carregarDashboard() {
    console.log("Iniciando a busca de dados no Supabase...");

    // Verifica se o cliente do Supabase foi carregado antes de continuar
    if (typeof window.supabase === 'undefined') {
        console.error("ERRO: A conexão com o Supabase não foi encontrada.");
        return;
    }

    try {
        // Busca todos os produtos cadastrados
        const { data: produtos, error: errProd } = await window.supabase
            .from('produtos')
            .select('*');

        if (errProd) throw errProd;

        // Busca as movimentações com o nome e categoria do produto relacionado
        // Ordenado do mais recente para o mais antigo
        const { data: movs, error: errMov } = await window.supabase
            .from('movimentacoes')
            .select('*, produtos(nome, categoria)')
            .order('data', { ascending: false });

        if (errMov) throw errMov;

        console.log("Dados recebidos!", { produtos, movs });

        // Com os dados em mãos, atualiza cada parte da interface
        atualizarCards(produtos, movs);
        atualizarTabela(movs);
        renderizarGraficos(produtos, movs);
        verificarEstoqueBaixo(produtos);

    } catch (error) {
        console.error("Erro ao carregar o Dashboard:", error);
    }
}


/**
    Essa função atualiza os 4 cards principais do dashboard com base nos dados de produtos e movimentações: Total de produtos cadastrados, valor total em estoque (soma de preço x quantidade de cada produto), quantidade de produtos com estoque igual ou abaixo do mínimo, número de entradas registadas no dia atual

 * @param {Array} produtos - Lista de todos os produtos do banco
 * @param {Array} movs     - Lista de todas as movimentações do banco
 */
function atualizarCards(produtos, movs) {

    // Card 1: Total de produtos 
    document.getElementById('card-total').innerText = produtos.length;

    // Card 2: Valor total em estoque 
    // Multiplica preço × estoque de cada produto e soma tudo
    const valorEstoque = produtos.reduce((acc, p) => {
        const preco   = parseFloat(p.preco) || 0;
        const estoque = parseInt(p.estoque_atual) || 0;
        return acc + (preco * estoque);
    }, 0);

    document.getElementById('card-valor').innerText = valorEstoque.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    // Card 3: Produtos em estoque baixo 
    // Considera "baixo" quando o estoque atual está abaixo do que foi definido como padrão definido
    const estoqueBaixo = produtos.filter(p => {
        const min = p.estoque_minimo || 5;
        return p.estoque_atual <= min;
    }).length;

    document.getElementById('card-baixo').innerText = estoqueBaixo;

    // Card 4: Entradas de hoje 
    // Compara a data da movimentação (no formato ISO) com o dia atual
    const hoje = new Date().toISOString().split('T')[0];
    const entradasHoje = movs.filter(m =>
        m.tipo === 'entrada' &&
        (m.data && m.data.startsWith(hoje))
    ).length;

    document.getElementById('card-entradas').innerText = entradasHoje;
}


/**
    Essa função renderiza as 5 movimentações mais recentes na tabela do dashboard e formata a data e aplica badges coloridos para entradas (verde) e saídas (vermelho)

 * @param {Array} movs - Lista de movimentações já ordenadas (mais recente primeiro)
 */
function atualizarTabela(movs) {
    const tbody = document.getElementById('tabela-movimentacoes');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Pega apenas as 5 primeiras (as mais recentes)
    const ultimasMovs = movs.slice(0, 5);

    if (ultimasMovs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhuma movimentação.</td></tr>';
        return;
    }

    ultimasMovs.forEach(m => {
        const tr = document.createElement('tr');
        const isEntrada = m.tipo === 'entrada';

        // Formata a data para o padrão brasileiro: "dd/mm/aaaa HH:MM"
        const dataOriginal  = new Date(m.data);
        const dataFormatada = dataOriginal.toLocaleDateString('pt-BR') + ' ' +
                              dataOriginal.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

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


/**
 
    Essa função verifica os produtos com estoque crítico e dispara uma notificação para cada um. O pequeno delay de 400ms entre as notificações evita que elas apareçam todas ao mesmo tempo e fiquem sobrepostas

 * @param {Array} produtos - Lista completa de produtos
 */
function verificarEstoqueBaixo(produtos) {
    const criticos = produtos.filter(p => {
        const min = p.estoque_minimo || 5;
        return p.estoque_atual <= min;
    });

    if (criticos.length === 0) return;

    // Cada notificação aparece 400ms depois da anterior
    criticos.forEach((p, index) => {
        setTimeout(() => {
            mostrarNotificacao(p.nome, p.estoque_atual, p.estoque_minimo || 5);
        }, index * 400);
    });
}


/**

    Essa função cria e exibe um card flutuante de alerta no canto superior direito da tela. O card some automaticamente após 7 segundos ou fechar clicando no botão "x"

 * @param {string} nomeProduto - Nome do produto com estoque baixo
 * @param {number} qtdAtual    - Quantidade atual em estoque
 * @param {number} min         - Estoque mínimo definido para o produto
 */
function mostrarNotificacao(nomeProduto, qtdAtual, min) {
    // Garante que o container de notificações existe (cria se necessário)
    let container = document.getElementById('container-notificacoes');
    if (!container) {
        container = document.createElement('div');
        container.id = 'container-notificacoes';
        document.body.appendChild(container);
    }

    // Cria o elemento da notificação com os dados do produto
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

    // Botão de fechar remove a notificação imediatamente
    notif.querySelector('.notificacao-fechar').addEventListener('click', () => notif.remove());

    container.appendChild(notif);

    // Remove automaticamente após 7 segundos com uma animação
    setTimeout(() => {
        if (notif.parentElement) {
            notif.style.opacity    = '0';
            notif.style.transform  = 'translateX(100%)';
            notif.style.transition = 'all 0.4s ease';
            // Aguarda a animação terminar antes de remover o elemento do DOM
            setTimeout(() => notif.remove(), 400);
        }
    }, 7000);
}


/**

    Essa função cria dois gráficos de dashboard usando a biblioteca Chart.js: 
    1 - Gráfico de pizza mostrando a distribuição do estoque por categoria
    2 - Gráfico de barras comparando o total de entradas e de saídas

 * @param {Array} produtos - Lista de produtos (usada no gráfico de categorias)
 * @param {Array} movs     - Lista de movimentações (usada no gráfico de barras)
 */
function renderizarGraficos(produtos, movs) {

    // Configurações globais do Chart.js para seguir a paleta do sistema
    Chart.defaults.color       = '#64748b';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Gráfico 1: Produtos por Categoria (Pizza)
    const ctxCat = document.getElementById('categoriaChart');
    if (ctxCat) {
        // Agrupa o estoque total por categoria usando um objeto como mapa
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

    // Gráfico 2: Movimentação Geral (Barras)
    const ctxMov = document.getElementById('movimentacaoChart');
    if (ctxMov) {
        // Soma separadamente o total de entradas e de saídas
        let totalEntradas = 0;
        let totalSaidas   = 0;

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
