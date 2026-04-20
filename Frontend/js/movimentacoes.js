document.addEventListener('DOMContentLoaded', () => {
    // Inicia os ícones do Lucide
    if (window.lucide) lucide.createIcons();

    const nomeLogado = localStorage.getItem('vortex_nome_utilizador') || 'Administrador';
    const spanNome = document.querySelector('#nomeUtilizador');
    if (spanNome) spanNome.innerText = nomeLogado;

    carregarMovimentacoes();
    configurarModal();

    // Filtro de busca
    document.querySelector('#inputFiltro')?.addEventListener('input', (e) => {
        filtrarTabela(e.target.value);
    });
});

// Armazena todas as movimentações para filtragem local
let todasMovimentacoes = [];

// Carrega as movimentações do banco e renderiza na tabela
async function carregarMovimentacoes() {

    const tbody = document.getElementById('tabela-movimentacoes');
    if (!tbody) return;

    try {
        const { data: movs, error } = await supabase
            .from('movimentacoes')
            .select('*, produtos(nome)')
            .order('data', { ascending: false });

        if (error) throw error;

        todasMovimentacoes = movs;
        renderizarTabela(movs, tbody);

    } catch (error) {
        console.error("Erro ao carregar movimentações:", error);
    }
}

function renderizarTabela(movs, tbody) {
    if (!tbody) tbody = document.getElementById('tabela-movimentacoes');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (movs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhuma movimentação registrada.</td></tr>';
        return;
    }

    movs.forEach(m => {
        const dataObj = new Date(m.data);
        const dataFormatada = dataObj.toLocaleDateString('pt-BR') + ' às ' + dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' });
        
        const isEntrada = m.tipo === 'entrada';
        const badgeClass = isEntrada ? 'badge-in' : 'badge-out';
        const tipoTexto = isEntrada ? 'Entrada' : 'Saída';
        const qtdClass = isEntrada ? 'text-green font-bold' : 'text-red font-bold';
        const qtdSinal = isEntrada ? '+' : '-';

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

// Filtra a tabela localmente sem nova requisição ao banco
function filtrarTabela(termo) {
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

// Configura os eventos do modal de nova movimentação
function configurarModal() {
    const modal = document.getElementById('modalMovimentacao');
    const btnNovo = document.getElementById('btnNovaMovimentacao');
    const btnClose = document.getElementById('closeModal');
    const btnCancelar = document.getElementById('btnCancelar');
    const form = document.getElementById('formMovimentacao');

    if (!modal || !btnNovo || !form) return;

    btnNovo.addEventListener('click', async () => {
        modal.classList.remove('hidden');
        await carregarProdutosNoSelect();
    });

    const fecharModal = () => {
        modal.classList.add('hidden');
        form.reset();
    };

    btnClose?.addEventListener('click', fecharModal);
    btnCancelar?.addEventListener('click', fecharModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const produtoId = document.getElementById('produtoSelect').value;
        const tipo = document.getElementById('tipoMovimentacao').value;
        const quantidade = parseInt(document.getElementById('quantidadeInput').value);
        const btnSalvar = document.getElementById('btnSalvar');

        if (!produtoId || !tipo || isNaN(quantidade)) {
            alert("Preencha todos os campos!");
            return;
        }

        const textoOriginal = btnSalvar.innerText;
        btnSalvar.innerText = "Salvando...";
        btnSalvar.disabled = true;

        try {
            const { data: prodData, error: errGetProd } = await supabase
                .from('produtos')
                .select('estoque_atual')
                .eq('id', produtoId)
                .single();
                
            if (errGetProd) throw errGetProd;

            let novoEstoque = prodData.estoque_atual;
            if (tipo === 'entrada') {
                novoEstoque += quantidade;
            } else if (tipo === 'saida') {
                if (quantidade > novoEstoque) {
                    alert("Atenção: A quantidade de saída é maior que o estoque atual!");
                    btnSalvar.innerText = textoOriginal;
                    btnSalvar.disabled = false;
                    return;
                }
                novoEstoque -= quantidade;
            }

            const { error: errUpdate } = await supabase
                .from('produtos')
                .update({ estoque_atual: novoEstoque })
                .eq('id', produtoId);

            if (errUpdate) throw errUpdate;

            const { error: errInsert } = await supabase
                .from('movimentacoes')
                .insert([{
                    produto_id: produtoId,
                    tipo: tipo,
                    quantidade: quantidade,
                    data: new Date().toISOString()
                }]);

            if (errInsert) throw errInsert;

            fecharModal();
            carregarMovimentacoes();

        } catch (error) {
            console.error("Erro ao salvar movimentação:", error);
            alert("Erro ao salvar. Verifique o console.");
        } finally {
            btnSalvar.innerText = textoOriginal;
            btnSalvar.disabled = false;
        }
    });
}

// Carrega os produtos para o select do modal
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
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.nome} (Estoque: ${p.estoque_atual})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}
