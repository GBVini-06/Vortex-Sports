const modal = document.querySelector('#modalProduto');
const modalMov = document.querySelector('#modalMovimentacao');
const btnNovoProduto = document.querySelector('#btnNovoProduto');
const btnFecharModal = document.querySelector('#closeModal');
const formProduto = document.querySelector('#formProduto');
const formMovimentacao = document.querySelector('#formMovimentacao');
const tabelaBody = document.querySelector('#tabela-produtos');

let idProdutoEdicao = null;

// Inicia os ícones do Lucide
if (window.lucide) lucide.createIcons();

// Algoritmo de ordenação alfabética (Bubble Sort)
function ordenarAlfabeticamente(array) {
    let n = array.length;
    let trocou;
    do {
        trocou = false;
        for (let i = 0; i < n - 1; i++) {
            if (array[i].nome.toLowerCase() > array[i + 1].nome.toLowerCase()) {
                let temp = array[i];
                array[i] = array[i + 1];
                array[i + 1] = temp;
                trocou = true;
            }
        }
        n--;
    } while (trocou);
    return array;
}

// ==========================================
// BUSCA EM TEMPO REAL
// ==========================================
document.querySelector('#inputBusca')?.addEventListener('input', (e) => {
    carregarProdutos(e.target.value);
});


// Mostrar status na tabela (carregando, erro, vazio)
function setStatusTabela(mensagem, isErro = false) {
    if (!tabelaBody) return;
    tabelaBody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = mensagem;
    td.className = isErro ? 'status-tabela erro-tabela' : 'status-tabela';
    tr.appendChild(td);
    tabelaBody.appendChild(tr);
}

// Carregar e listar produtos
async function carregarProdutos(termoBusca = '') {
    if (!tabelaBody) return;
    setStatusTabela('Carregando produtos...');

    const { data: produtosBanco, error } = await supabase.from('produtos').select('*');

    if (error) {
        setStatusTabela('Erro ao carregar dados.', true);
        return;
    }

    let produtosParaExibir = produtosBanco;

    if (termoBusca.trim() !== '') {
        const termoMin = termoBusca.toLowerCase();
        produtosParaExibir = produtosParaExibir.filter(p => 
            p.nome.toLowerCase().includes(termoMin) || 
            (p.categoria && p.categoria.toLowerCase().includes(termoMin))
        );
    }

    produtosParaExibir = ordenarAlfabeticamente(produtosParaExibir);
    tabelaBody.innerHTML = '';

    if (produtosParaExibir.length === 0) {
        setStatusTabela('Nenhum produto encontrado.');
        return;
    }

    const templateLinha = document.querySelector('#tpl-linha-produto');

    produtosParaExibir.forEach(produto => {
        const clone = templateLinha.content.cloneNode(true);
        const tr = clone.querySelector('tr');

        tr.querySelector('.td-id').textContent = `#${produto.id.substring(0,6).toUpperCase()}`;
        tr.querySelector('.td-nome').textContent = produto.nome;
        tr.querySelector('.td-categoria').textContent = produto.categoria || '-';
        tr.querySelector('.td-preco').textContent = `R$ ${parseFloat(produto.preco).toFixed(2).replace('.', ',')}`;
        
        const badge = tr.querySelector('.td-estoque');
        badge.textContent = produto.estoque_atual;
        
        const min = produto.estoque_minimo || 5;
        if (produto.estoque_atual === 0) badge.classList.add('badge-danger');
        else if (produto.estoque_atual <= min) badge.classList.add('badge-warning');
        else badge.classList.add('badge-success');

        tr.querySelector('.btn-mov').addEventListener('click', () => abrirMovimentacaoRapida(produto.id, produto.nome));
        tr.querySelector('.btn-edit').addEventListener('click', () => prepararEdicao(produto));
        tr.querySelector('.btn-del').addEventListener('click', () => excluirProduto(produto.id));

        tabelaBody.appendChild(tr);
    });
}

// Movimentações e CRUD
async function registrarMovimentacao(produtoId, tipo, quantidade) {
    await supabase.from('movimentacoes').insert([{
        produto_id: produtoId,
        tipo: tipo,
        quantidade: Math.abs(quantidade),
        data: new Date().toISOString()
    }]);
}

window.prepararEdicao = function(produto) {
    idProdutoEdicao = produto.id;
    document.querySelector('#nome').value = produto.nome;
    document.querySelector('#categoria').value = produto.categoria || '';
    document.querySelector('#preco').value = produto.preco;
    document.querySelector('#estoque').value = produto.estoque_atual;
    
    const inputMinimo = document.querySelector('#estoque_minimo');
    if (inputMinimo) inputMinimo.value = produto.estoque_minimo || 5;

    document.querySelector('#modalTitle').textContent = 'Editar Produto';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

formProduto?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    const estoqueNovo = parseInt(document.querySelector('#estoque').value);
    
    const dados = {
        nome: document.querySelector('#nome').value,
        categoria: document.querySelector('#categoria').value,
        preco: parseFloat(document.querySelector('#preco').value),
        estoque_atual: estoqueNovo
    };

    const inputMinimo = document.querySelector('#estoque_minimo');
    if (inputMinimo) {
        dados.estoque_minimo = parseInt(inputMinimo.value);
    } else if (!idProdutoEdicao) {
        dados.estoque_minimo = 5;
    }

    try {
        if (idProdutoEdicao) {
            const { data: pAntigo } = await supabase.from('produtos').select('estoque_atual').eq('id', idProdutoEdicao).single();
            const diff = estoqueNovo - (pAntigo?.estoque_atual || 0);

            await supabase.from('produtos').update(dados).eq('id', idProdutoEdicao);
            if (diff !== 0) await registrarMovimentacao(idProdutoEdicao, diff > 0 ? 'entrada' : 'saida', diff);
        } else {
            const { data: novoP, error } = await supabase.from('produtos').insert([dados]).select().single();
            if (error) throw error;
            if (estoqueNovo > 0) await registrarMovimentacao(novoP.id, 'entrada', estoqueNovo);
        }
        fecharTodosModais();
        carregarProdutos();
    } catch (err) { alert(err.message); }
    finally { btn.disabled = false; }
});

window.abrirMovimentacaoRapida = function(id, nome) {
    document.querySelector('#mov_produto_id').value = id;
    document.querySelector('#mov_nome_produto').textContent = nome;
    if (modalMov) {
        modalMov.classList.remove('hidden');
        modalMov.style.display = 'flex';
    }
};

formMovimentacao?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.querySelector('#mov_produto_id').value;
    const tipo = document.querySelector('#mov_tipo').value;
    const qtd = parseInt(document.querySelector('#mov_quantidade').value);

    try {
        const { data: p, error: erroBusca } = await supabase.from('produtos').select('estoque_atual, estoque_minimo, nome').eq('id', id).single();
        if (erroBusca) throw erroBusca;

        let novoEstoque = tipo === 'entrada' ? p.estoque_atual + qtd : p.estoque_atual - qtd;
        if (novoEstoque < 0) throw new Error('Estoque insuficiente para esta saída!');

        const { error: erroUpdate } = await supabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', id);
        if (erroUpdate) throw erroUpdate;

        await registrarMovimentacao(id, tipo, qtd);
        fecharTodosModais();
        carregarProdutos();

        const min = p.estoque_minimo || 5;
        if (novoEstoque <= min) {
            mostrarNotificacao(p.nome, novoEstoque, min);
        }
    } catch (err) { alert(err.message); }
});

window.excluirProduto = async function(id) {
    if (confirm('Deseja realmente excluir?')) {
        await supabase.from('produtos').delete().eq('id', id);
        carregarProdutos();
    }
};

window.fecharTodosModais = function() {
    if (modal) { modal.classList.add('hidden'); modal.style.display = ''; }
    if (modalMov) { modalMov.classList.add('hidden'); modalMov.style.display = ''; }
    if (formProduto) formProduto.reset();
    if (formMovimentacao) formMovimentacao.reset();
    idProdutoEdicao = null;
};

btnNovoProduto?.addEventListener('click', () => {
    fecharTodosModais();
    document.querySelector('#modalTitle').textContent = 'Cadastrar Produto';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
});

btnFecharModal?.addEventListener('click', fecharTodosModais);
document.querySelector('#btnCancelar')?.addEventListener('click', fecharTodosModais);

// Notificações de Estoque Baixo
function mostrarNotificacao(nomeProduto, qtdAtual, min) {
    const container = document.querySelector('#container-notificacoes');
    const template = document.querySelector('#tpl-notificacao');
    
    if (!container || !template) return;

    const clone = template.content.cloneNode(true);
    const notif = clone.querySelector('.notificacao');

    notif.querySelector('.notif-nome').textContent = nomeProduto;
    notif.querySelector('.notif-qtd').textContent = qtdAtual;
    notif.querySelector('.notif-min').textContent = min;

    notif.querySelector('.notificacao-fechar').addEventListener('click', () => notif.remove());

    container.appendChild(notif);

    setTimeout(() => {
        if (notif.parentElement) {
            notif.style.opacity = '0';
            notif.style.transform = 'translateX(100%)';
            notif.style.transition = 'all 0.4s ease';
            setTimeout(() => notif.remove(), 400);
        }
    }, 6000);
}

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos();
});
