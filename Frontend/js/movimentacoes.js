// Este arquivo controla a tela de movimentações, onde o usuário pode ver o histórico de entradas e saídas de produtos, além de registrar novas movimentações. Ele lida com a exibição dos dados na tabela, o filtro de busca e a interação com o modal para adicionar novas movimentações.

document.addEventListener('DOMContentLoaded', () => {

    // Inicializa os icones do Lucide
    if (window.lucide) lucide.createIcons();

    // Exibe o nome do usuário logado no cabeçalho
    const nomeLogado = localStorage.getItem('vortex_nome_utilizador') || 'Administrador';
    const spanNome   = document.querySelector('#nomeUtilizador');
    if (spanNome) spanNome.innerText = nomeLogado;

    // Carrega as movimentações do banco ao abrir a página
    carregarMovimentacoes();

    // Configura todos os eventos do modal
    configurarModal();

    // Escuta a digitação no campo de busca e filtra a tabela localmente
    document.querySelector('#inputFiltro')?.addEventListener('input', (e) => {
        filtrarTabela(e.target.value);
    });
});


// Guarda todas as movimentações em memória para poder filtrar sem ir ao banco novamente
let todasMovimentacoes = [];


// Essa função busca todas as movimentações no Supabase, ordenadas da mais recente para a mais antiga, junto com cada movimentação, ela traz também o nome do produto relacionado

async function carregarMovimentacoes() {
    const tbody = document.getElementById('tabela-movimentacoes');
    if (!tbody) return;

    try {
        const { data: movs, error } = await supabase
            .from('movimentacoes')
            .select('*, produtos(nome)')       // Traz o nome do produto junto
            .order('data', { ascending: false }); // Mais recente primeiro

        if (error) throw error;

        // Salva em memória para uso do filtro local
        todasMovimentacoes = movs;

        renderizarTabela(movs, tbody);

    } catch (error) {
        console.error("Erro ao carregar movimentações:", error);
    }
}


/**
 
    Essa função serve para limpar e reconstruir as linhas da tabela com a lista de movimentações recebidads, ela foramata as datas e aplica badges visuais para diferenciar entradas e saídas

 * @param {Array}          movs  - Lista de movimentações a exibir
 * @param {HTMLElement}   [tbody] - Elemento tbody da tabela (busca pelo ID se não informado)
 */
function renderizarTabela(movs, tbody) {
    if (!tbody) tbody = document.getElementById('tabela-movimentacoes');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (movs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhuma movimentação registrada.</td></tr>';
        return;
    }

    movs.forEach(m => {
        // Formata a data para "dd/mm/aaaa às HH:MM"
        const dataObj       = new Date(m.data);
        const dataFormatada = dataObj.toLocaleDateString('pt-BR') + ' às ' +
                              dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const isEntrada  = m.tipo === 'entrada';
        const badgeClass = isEntrada ? 'badge-in'  : 'badge-out';
        const tipoTexto  = isEntrada ? 'Entrada'   : 'Saída';
        const qtdClass   = isEntrada ? 'text-green font-bold' : 'text-red font-bold';
        const qtdSinal   = isEntrada ? '+' : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${m.produtos?.nome || 'Produto Removido'}</td>
            <td><span class="badge ${badgeClass}">${tipoTexto}</span></td>
            <td class="${qtdClass}">${qtdSinal}${m.quantidade}</td>
            <td>Admin</td>
        `;
        tbody.appendChild(tr);
    });
}


/**

    Essa função serve para filtrar a lista de movimentações já carregada em memória, ela compara o termo digitado com o nome do produto de cada movimentação e atualiza a tabela para mostrar apenas as que correspondem ao filtro. Se o campo de busca estiver vazio, ela mostra todas as movimentações novamente.

 * @param {string} termo - Texto digitado pelo usuário no campo de busca
 */
function filtrarTabela(termo) {
    // Se o campo está vazio, mostra tudo novamente
    if (!termo.trim()) {
        renderizarTabela(todasMovimentacoes);
        return;
    }

    const termoMin = termo.toLowerCase();
    const filtradas = todasMovimentacoes.filter(m =>
        (m.produtos?.nome || '').toLowerCase().includes(termoMin)
    );

    renderizarTabela(filtradas);
}


// Essa função configura os eventos do modal de nova movimentação: abrir, fechar, carregar produtos e salvar a movimentação

function configurarModal() {
    const modal      = document.getElementById('modalMovimentacao');
    const btnNovo    = document.getElementById('btnNovaMovimentacao');
    const btnClose   = document.getElementById('closeModal');
    const btnCancelar = document.getElementById('btnCancelar');
    const form       = document.getElementById('formMovimentacao');

    // Se algum elemento essencial não existe na página, não faz nada
    if (!modal || !btnNovo || !form) return;

    // Abre o modal e carrega os produtos no select
    btnNovo.addEventListener('click', async () => {
        modal.classList.remove('hidden');
        await carregarProdutosNoSelect();
    });

    // Fecha o modal e reseta o formulário
    const fecharModal = () => {
        modal.classList.add('hidden');
        form.reset();
    };

    btnClose?.addEventListener('click', fecharModal);
    btnCancelar?.addEventListener('click', fecharModal);

    // Envio do formulário de nova movimentação
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const produtoId = document.getElementById('produtoSelect').value;
        const tipo      = document.getElementById('tipoMovimentacao').value;
        const quantidade = parseInt(document.getElementById('quantidadeInput').value);
        const btnSalvar = document.getElementById('btnSalvar');

        // Validação básica dos campos
        if (!produtoId || !tipo || isNaN(quantidade)) {
            alert("Preencha todos os campos!");
            return;
        }

        // Feedback visual enquanto salva
        const textoOriginal  = btnSalvar.innerText;
        btnSalvar.innerText  = "Salvando...";
        btnSalvar.disabled   = true;

        try {
            // Busca o estoque atual do produto antes de alterar
            const { data: prodData, error: errGetProd } = await supabase
                .from('produtos')
                .select('estoque_atual')
                .eq('id', produtoId)
                .single();

            if (errGetProd) throw errGetProd;

            // Calcula o novo estoque conforme o tipo de movimentação
            let novoEstoque = prodData.estoque_atual;
            if (tipo === 'entrada') {
                novoEstoque += quantidade;
            } else if (tipo === 'saida') {
                // Impede saída maior do que o disponível
                if (quantidade > novoEstoque) {
                    alert("Atenção: A quantidade de saída é maior que o estoque atual!");
                    btnSalvar.innerText = textoOriginal;
                    btnSalvar.disabled  = false;
                    return;
                }
                novoEstoque -= quantidade;
            }

            // Atualiza o estoque do produto no banco
            const { error: errUpdate } = await supabase
                .from('produtos')
                .update({ estoque_atual: novoEstoque })
                .eq('id', produtoId);

            if (errUpdate) throw errUpdate;

            // Registra a movimentação no histórico
            const { error: errInsert } = await supabase
                .from('movimentacoes')
                .insert([{
                    produto_id: produtoId,
                    tipo:       tipo,
                    quantidade: quantidade,
                    data:       new Date().toISOString()
                }]);

            if (errInsert) throw errInsert;

            // Fecha o modal e atualiza a tabela com a nova movimentação
            fecharModal();
            carregarMovimentacoes();

        } catch (error) {
            console.error("Erro ao salvar movimentação:", error);
            alert("Erro ao salvar. Verifique o console.");
        } finally {
            // Garante que o botão seja restaurado mesmo em caso de erro
            btnSalvar.innerText = textoOriginal;
            btnSalvar.disabled  = false;
        }
    });
}


// Essa função busca todas os produtos no banco e os carrega no select do modal, mostrando também o estoque atual para ajudar o usuário a escolher a movimentação correta

async function carregarProdutosNoSelect() {
    const select = document.getElementById('produtoSelect');
    select.innerHTML = '<option value="">Carregando...</option>';

    try {
        const { data: produtos, error } = await supabase
            .from('produtos')
            .select('id, nome, estoque_atual')
            .order('nome'); 

        if (error) throw error;

        select.innerHTML = '<option value="">Selecione o produto...</option>';
        produtos.forEach(p => {
            const option       = document.createElement('option');
            option.value       = p.id;
            option.textContent = `${p.nome} (Estoque: ${p.estoque_atual})`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}
