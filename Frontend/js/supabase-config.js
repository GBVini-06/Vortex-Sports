// Esse arquivo é responsável por configurar a conexão com o Supabase, definindo a URL do projeto e a chave de acesso anônima. Ele cria um cliente global do Supabase que pode ser usado em outros arquivos JavaScript para interagir com o banco de dados, como buscar produtos, registrar movimentações, etc.

// URL do Projeto no Supabase
const SUPABASE_URL = 'https://asxpnlxlquevzfyrnvtn.supabase.co';


// Chave de Acesso Anônima (publica, sem privilégios administrativos)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeHBubHhscXVldnpmeXJudnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjMxMTQsImV4cCI6MjA5MTkzOTExNH0.ET8XpEveOqjStTY-G9uP8vi6KUkLZMacxiDka8QZjGY';

window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);