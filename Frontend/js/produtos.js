// Esse arquivo controla a página de Produtos, ela é responsável por carregar a lista de produtos do banco, exibir na tabela, permitir a busca em tempo real, abrir o modal para criar ou editar um produto, registrar movimentações rápidas e excluir produtos. Ele também mostra notificações do estoque quando um produto fica abaixo do estoque mínimo definido.

const modal          = document.querySelector('#modalProduto');
const modalMov       = document.querySelector('#modalMovimentacao');
const btnNovoProduto = document.querySelector('#btnNovoProduto');
const btnFecharModal = document.querySelector('#closeModal');
const formProduto    = document.querySelector('#formProduto');
const formMovimentacao = document.querySelector('#formMovimentacao');
const tabelaBody     = document.querySelector('#tabela-produtos');

// ID do produto sendo editado; null quando estamos criando um novo
let idProdutoEdicao = null;

/**

    Essa função ordena uma lista de objetos alfabeticamente pelo campo `nome` usando o algoritmo Bubble Sort. Ela compara os nomes ignorando maiúsculas e minúsculas para garantir uma ordenação consistente. O array é modificado in-place e também retornado para conveniência.

 * @param {Array} array - Lista de objetos com a propriedade `nome`
 * @returns {Array}     - Mesma lista ordenada alfabeticamente (mutação in-place + retorno)
 */
function ordenarAlfabeticamente(array) {
    let n = array.length;
    let trocou;

    do {
        trocou = false;

        for (let i = 0; i < n - 1; i++) {
            // Compara os nomes ignorando maiúsculas/minúsculas
            if (array[i].nome.toLowerCase() > array[i + 1].nome.toLowerCase()) {
                // Troca os dois elementos de lugar
                let temp     = array[i];
                array[i]     = array[i + 1];
                array[i + 1] = temp;
                trocou       = true;
            }
        }
        n--;
    } while (trocou); // Para quando nenhuma troca ocorrer (lista já ordenada)

    return array;
}

// Busca em tempo real. A cada tecla digitada no campo de busca, a função carregarProdutos é chamada com o termo atual para filtrar os resultados. Se o campo estiver vazio, ela recarrega todos os produtos normalmente.

document.querySelector('#inputBusca')?.addEventListener('input', (e) => {
    carregarProdutos(e.target.value);
});

/**

    Essa função exibe uma mensagem centralizada na tabela, usada para mostrar status como "Carregando...", "Nenhum produto encontrado" ou mensagens de erro. Ela limpa as linhas atuais da tabela e insere uma nova linha com a mensagem, estilizada de acordo com o tipo (erro ou informação).

 * @param {string}  mensagem - Texto a exibir
 * @param {boolean} isErro   - Se true, aplica a classe CSS de erro (texto vermelho)
 */
function setStatusTabela(mensagem, isErro = false) {
    if (!tabelaBody) return;

    tabelaBody.innerHTML = '';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan   = 6;
    td.textContent = mensagem;
    td.className   = isErro ? 'status-tabela erro-tabela' : 'status-tabela';
    tr.appendChild(td);
    tabelaBody.appendChild(tr);
}

/**

    Essa função busca todos os produtos no banco, aplica filtro de busca (se houver),
    ordena alfabeticamente e renderiza cada linha usando o template HTML.
    O template #tpl-linha-produto evita concatenação de HTML manual.

 * @param {string} termoBusca - Texto do campo de busca (vazio = mostra tudo)
 */
async function carregarProdutos(termoBusca = '') {
    if (!tabelaBody) return;

    setStatusTabela('Carregando produtos...');

    const { data: produtosBanco, error } = await supabase.from('produtos').select('*');

    if (error) {
        setStatusTabela('Erro ao carregar dados.', true);
        return;
    }

    let produtosParaExibir = produtosBanco;

    // Aplica o filtro de busca: verifica nome E categoria
    if (termoBusca.trim() !== '') {
        const termoMin = termoBusca.toLowerCase();
        produtosParaExibir = produtosParaExibir.filter(p =>
            p.nome.toLowerCase().includes(termoMin) ||
            (p.categoria && p.categoria.toLowerCase().includes(termoMin))
        );
    }

    // Ordena antes de renderizar para garantir a ordem visual consistente
    produtosParaExibir = ordenarAlfabeticamente(produtosParaExibir);

    tabelaBody.innerHTML = '';

    if (produtosParaExibir.length === 0) {
        setStatusTabela('Nenhum produto encontrado.');
        return;
    }

    const templateLinha = document.querySelector('#tpl-linha-produto');

    produtosParaExibir.forEach(produto => {
        const clone = templateLinha.content.cloneNode(true);
        const tr    = clone.querySelector('tr');

        // Preenche cada célula com os dados do produto
        tr.querySelector('.td-id').textContent       = `#${produto.id.substring(0, 6).toUpperCase()}`;
        tr.querySelector('.td-nome').textContent     = produto.nome;
        tr.querySelector('.td-categoria').textContent = produto.categoria || '-';
        tr.querySelector('.td-preco').textContent    = `R$ ${parseFloat(produto.preco).toFixed(2).replace('.', ',')}`;

        // Badge de estoque: vermelho (0), amarelo (baixo), verde (ok)
        const badge = tr.querySelector('.td-estoque');
        badge.textContent = produto.estoque_atual;
        const min = produto.estoque_minimo || 5;

        if (produto.estoque_atual === 0)         badge.classList.add('badge-danger');
        else if (produto.estoque_atual <= min)   badge.classList.add('badge-warning');
        else                                     badge.classList.add('badge-success');

        // Associa os eventos dos botões de ação à linha
        tr.querySelector('.btn-mov').addEventListener('click',  () => abrirMovimentacaoRapida(produto.id, produto.nome));
        tr.querySelector('.btn-edit').addEventListener('click', () => prepararEdicao(produto));
        tr.querySelector('.btn-del').addEventListener('click',  () => excluirProduto(produto.id));

        tabelaBody.appendChild(tr);
    });

    // Reativa os ícones do Lucide nas novas linhas inseridas
    if (window.lucide) lucide.createIcons();
}

/**

    Essa função insere um registro na tabela "movimentacoes" para rastrear toda alteração de estoque, seja por edição do produto ou por movimentação rápida. Ela recebe o ID do produto, o tipo de movimentação (entrada ou saída) e a quantidade movimentada. A data é registrada automaticamente como o momento da operação.

 * @param {string} produtoId - UUID do produto
 * @param {string} tipo      - 'entrada' ou 'saida'
 * @param {number} quantidade - Quantidade movimentada (sempre positiva; o tipo define o sinal)
 */
async function registrarMovimentacao(produtoId, tipo, quantidade) {
    await supabase.from('movimentacoes').insert([{
        produto_id: produtoId,
        tipo:       tipo,
        quantidade: Math.abs(quantidade), // Garante que nunca salva um valor negativo
        data:       new Date().toISOString()
    }]);
}


/**

    Essa função preenche o modal com os dados do produto selecionaod e o abre em modo de edição, o ID do produto é guardade em "idProdutoEdicao" para o submit sabeer que é uma edição e não uma criação

 * @param {Object} produto - Objeto completo do produto vindo do banco
 */
window.prepararEdicao = function(produto) {
    idProdutoEdicao = produto.id;

    // Preenche cada campo do formulário com os dados atuais do produto
    document.querySelector('#nome').value      = produto.nome;
    document.querySelector('#categoria').value = produto.categoria || '';
    document.querySelector('#preco').value     = produto.preco;
    document.querySelector('#estoque').value   = produto.estoque_atual;

    const inputMinimo = document.querySelector('#estoque_minimo');
    if (inputMinimo) inputMinimo.value = produto.estoque_minimo || 5;

    document.querySelector('#modalTitle').textContent = 'Editar Produto';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};


// Submit do formulário de produto, tanto para criação quanto para edição.

formProduto?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; // Evita duplo clique acidental

    const estoqueNovo = parseInt(document.querySelector('#estoque').value);

    // Monta o objeto de dados para enviar ao banco
    const dados = {
        nome:          document.querySelector('#nome').value,
        categoria:     document.querySelector('#categoria').value,
        preco:         parseFloat(document.querySelector('#preco').value),
        estoque_atual: estoqueNovo
    };

    const inputMinimo = document.querySelector('#estoque_minimo');
    if (inputMinimo) {
        dados.estoque_minimo = parseInt(inputMinimo.value);
    } else if (!idProdutoEdicao) {
        dados.estoque_minimo = 5; // Valor padrão se o campo não existir e for um novo produto
    }

    try {
        if (idProdutoEdicao) {
            // Modo Edição 
            // Busca o estoque anterior para calcular a diferença e registrar a movimentação correta
            const { data: pAntigo } = await supabase
                .from('produtos')
                .select('estoque_atual')
                .eq('id', idProdutoEdicao)
                .single();

            const diff = estoqueNovo - (pAntigo?.estoque_atual || 0);

            // Atualiza o produto
            await supabase.from('produtos').update(dados).eq('id', idProdutoEdicao);

            // Se houve alteração no estoque, registra no histórico de movimentações
            if (diff !== 0) {
                await registrarMovimentacao(idProdutoEdicao, diff > 0 ? 'entrada' : 'saida', diff);
            }

        } else {
            // Modo Criação
            const { data: novoP, error } = await supabase
                .from('produtos')
                .insert([dados])
                .select()
                .single();

            if (error) throw error;

            // Se já tem estoque inicial, registra como entrada
            if (estoqueNovo > 0) {
                await registrarMovimentacao(novoP.id, 'entrada', estoqueNovo);
            }
        }

        fecharTodosModais();
        carregarProdutos(); // Atualiza a tabela

    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
    }
});

/**
 
    Essa função é chamada quando o usuário clica no ícone de movimentação rápida na tabela de produtos. Ela preenche o modal de movimentação com o ID e nome do produto selecionado para que o usuário possa registrar uma entrada ou saída de estoque sem precisar abrir o modal de edição completo. O ID do produto é armazenado em um campo oculto para ser usado no submit do formulário.

 * @param {string} id   - UUID do produto
 * @param {string} nome - Nome do produto (exibido no modal para confirmação visual)
 */
window.abrirMovimentacaoRapida = function(id, nome) {
    document.querySelector('#mov_produto_id').value    = id;
    document.querySelector('#mov_nome_produto').textContent = nome;

    if (modalMov) {
        modalMov.classList.remove('hidden');
        modalMov.style.display = 'flex';
    }
};

// Submit do formulário de movimentação rápida
formMovimentacao?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id  = document.querySelector('#mov_produto_id').value;
    const tipo = document.querySelector('#mov_tipo').value;
    const qtd  = parseInt(document.querySelector('#mov_quantidade').value);

    try {
        // Busca o produto para calcular o novo estoque e verificar o limite mínimo
        const { data: p, error: erroBusca } = await supabase
            .from('produtos')
            .select('estoque_atual, estoque_minimo, nome')
            .eq('id', id)
            .single();

        if (erroBusca) throw erroBusca;

        const novoEstoque = tipo === 'entrada'
            ? p.estoque_atual + qtd
            : p.estoque_atual - qtd;

        // Bloqueia se a saída deixaria o estoque negativo
        if (novoEstoque < 0) throw new Error('Estoque insuficiente para esta saída!');

        // Atualiza o estoque no banco
        const { error: erroUpdate } = await supabase
            .from('produtos')
            .update({ estoque_atual: novoEstoque })
            .eq('id', id);

        if (erroUpdate) throw erroUpdate;

        // Registra no histórico
        await registrarMovimentacao(id, tipo, qtd);

        fecharTodosModais();
        carregarProdutos();

        // Se o novo estoque ficou abaixo do mínimo, avisa o usuário imediatamente
        const min = p.estoque_minimo || 5;
        if (novoEstoque <= min) {
            mostrarNotificacao(p.nome, novoEstoque, min);
        }

    } catch (err) {
        alert(err.message);
    }
});

/**
 
    Essa função é chamada quando o usuário clica no ícone de lixeira na tabela de produtos. Ela exibe uma confirmação para evitar exclusões acidentais. Se o usuário confirmar, ela remove o produto do banco e recarrega a tabela para refletir a mudança.

 * @param {string} id - UUID do produto a ser excluído
 */
window.excluirProduto = async function(id) {
    if (confirm('Deseja realmente excluir?')) {
        await supabase.from('produtos').delete().eq('id', id);
        carregarProdutos(); // Atualiza a tabela sem o produto deletado
    }
};

/**
   Essa função fecha todos os modais abertos (tanto de produto quanto de movimentação), limpa os formulários e reseta o ID de edição. Ela é usada tanto para o botão "Cancelar" quanto para o "×" de fechar, garantindo que o estado do modal seja sempre limpo ao fechar, evitando dados residuais ou confusões entre criação e edição.
 */
window.fecharTodosModais = function() {
    if (modal)    { modal.classList.add('hidden');    modal.style.display = ''; }
    if (modalMov) { modalMov.classList.add('hidden'); modalMov.style.display = ''; }
    if (formProduto)    formProduto.reset();
    if (formMovimentacao) formMovimentacao.reset();

    // Limpa o ID de edição para que o próximo submit seja tratado como criação
    idProdutoEdicao = null;
};

// Abre o modal de criação de produto
btnNovoProduto?.addEventListener('click', () => {
    fecharTodosModais(); // Garante que nada esteja aberto antes
    document.querySelector('#modalTitle').textContent = 'Cadastrar Produto';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
});

// Eventos de fechar os modais
btnFecharModal?.addEventListener('click', fecharTodosModais);
document.querySelector('#btnCancelar')?.addEventListener('click', fecharTodosModais);


// =============================================
// NOTIFICAÇÕES DE ESTOQUE BAIXO
// =============================================

/**
 
    Essa função cria e exibe um card flutuante de alerta no canto superior direito da tela. O card some automaticamente após 6 segundos ou fechar clicando no botão "x"

 * @param {string} nomeProduto - Nome do produto em alerta
 * @param {number} qtdAtual    - Quantidade atual no estoque
 * @param {number} min         - Estoque mínimo definido para o produto
 */
function mostrarNotificacao(nomeProduto, qtdAtual, min) {
    const container = document.querySelector('#container-notificacoes');
    const template  = document.querySelector('#tpl-notificacao');

    if (!container || !template) return;

    // Clona o template e preenche os dados dinâmicos
    const clone = template.content.cloneNode(true);
    const notif = clone.querySelector('.notificacao');

    notif.querySelector('.notif-nome').textContent = nomeProduto;
    notif.querySelector('.notif-qtd').textContent  = qtdAtual;
    notif.querySelector('.notif-min').textContent  = min;

    // O botão "×" fecha a notificação na hora
    notif.querySelector('.notificacao-fechar').addEventListener('click', () => notif.remove());

    container.appendChild(notif);

    // Animação de saída: desliza para a direita e desaparece após 6 segundos
    setTimeout(() => {
        if (notif.parentElement) {
            notif.style.opacity   = '0';
            notif.style.transform = 'translateX(100%)';
            notif.style.transition = 'all 0.4s ease';
            setTimeout(() => notif.remove(), 400);
        }
    }, 6000);
}


document.addEventListener('DOMContentLoaded', () => {
    // Carrega os produtos ao abrir a página
    carregarProdutos();

    // Inicializa os ícones do Lucide
    if (window.lucide) lucide.createIcons();
});
