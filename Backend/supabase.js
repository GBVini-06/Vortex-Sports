const SUPABASE_URL = 'https://asxpnlxlquevzfyrnvtn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeHBubHhscXVldnpmeXJudnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjMxMTQsImV4cCI6MjA5MTkzOTExNH0.ET8XpEveOqjStTY-G9uP8vi6KUkLZMacxiDka8QZjGY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


console.log("Arquivo do Supabase carregado!");