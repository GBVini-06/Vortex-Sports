lucide.createIcons();

// Função para o botão de Sair
document.getElementById('btnSair').addEventListener('click', function(e) {
    e.preventDefault();
    const confirmar = confirm('Deseja realmente sair do sistema?');
    
    if(confirmar) {
        window.location.href = 'login.html';
    }
});

// GRÁFICOS COM CHART.JS

// Gráfico de Barras

const ctxMov = document.getElementById('movimentacaoChart').getContext('2d');
new Chart(ctxMov, {
    type: 'bar',
    data: {
        labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
        datasets: [{
            label: 'Entradas (+)',
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: '#1c76fd', 
            borderRadius: 4
        }, {
            label: 'Saídas (-)',
            data: [2, 3, 20, 5, 1, 4],
            backgroundColor: '#fa8735', 
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { position: 'bottom' }
        },
        scales: {
            y: { beginAtZero: true }
        }
    }
});

// Gráfico de Pizza
const ctxCat = document.getElementById('categoriaChart').getContext('2d');
new Chart(ctxCat, {
    type: 'doughnut',
    data: {
        labels: ['Futebol', 'Bolas', 'Natação', 'Acessórios'],
        datasets: [{
            data: [40, 25, 20, 15],
            backgroundColor: [
                '#1c76fd',
                '#FF6B00',
                '#10cfff', 
                '#ff5f03'  
            ],
            borderWidth: 0,
            hoverOffset: 4
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { position: 'bottom' }
        },
        cutout: '70%' 
    }
});