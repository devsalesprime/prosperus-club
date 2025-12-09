const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Configuração de Proxy para Nginx (importante para req.ip funcionar corretamente)
app.set('trust proxy', 1);

app.use(cors({
    origin: '*', // Em produção, idealmente restrinja ao seu domínio, mas '*' evita erros de CORS iniciais
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Log de todas as requisições para debug no console do servidor
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

// --- DADOS SIMULADOS ---
const ALLOWED_MEMBERS = [
    { email: 'admin@prosperus.com', name: 'Admin', role: 'admin' },
    { email: 'membro@teste.com', name: 'Membro Teste', role: 'member' }
];

// --- HANDLERS ---

const loginHandler = (req, res) => {
    const { email, password } = req.body;
    console.log(`Tentativa de Login Admin: ${email}`);

    // Forçar header JSON
    res.setHeader('Content-Type', 'application/json');

    if (email === 'admin@prosperus.com' && password === 'admin123') {
        return res.json({ 
            success: true, 
            token: 'admin-secret-token-12345',
            user: { name: 'Administrador', email }
        });
    }
    return res.status(401).json({ error: 'Credenciais inválidas' });
};

const verifyMemberHandler = (req, res) => {
    const { email } = req.body;
    console.log(`Verificando membro: ${email}`);
    
    res.setHeader('Content-Type', 'application/json');

    // Verifica se o email está na lista simulada (case insensitive)
    const member = ALLOWED_MEMBERS.find(m => m.email.toLowerCase() === (email || '').trim().toLowerCase());
    
    if (member) {
        return res.json({ allowed: true, name: member.name });
    }
    
    return res.json({ allowed: false, error: 'E-mail não encontrado na base de membros.' });
};

const submitHandler = (req, res) => {
    console.log('Recebendo submissão do módulo:', req.body.module);
    // Aqui você conectaria com um banco de dados real
    res.json({ success: true, message: 'Dados salvos com sucesso' });
};

// --- ROTAS DA API ---
// Importante: Definimos rotas com E sem o prefixo /api
// Isso garante que funcione independente de como o Nginx faz o roteamento (rewrite ou pass)

// Rota de Login
app.post('/api/auth/login', loginHandler);
app.post('/auth/login', loginHandler);

// Rota de Verificação de Membro
app.post('/api/auth/verify-member', verifyMemberHandler);
app.post('/auth/verify-member', verifyMemberHandler);

// Rota de Submissão de Dados
app.post('/api/submit', submitHandler);
app.post('/submit', submitHandler);

// Health Check (Para testar se o servidor está vivo)
app.get('/api/health', (req, res) => res.json({ status: 'ok', server: 'node-express', time: new Date() }));
app.get('/health', (req, res) => res.json({ status: 'ok', server: 'node-express', time: new Date() }));

// --- TRATAMENTO DE ERROS DA API (FALLBACK) ---
// Se uma requisição chegar em /api/... e não bater em nenhuma rota acima,
// retornamos 404 JSON para não devolver HTML do React por engano.
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Rota API não encontrada: ${req.url}` });
});

// --- SERVIR ARQUIVOS ESTÁTICOS (FRONTEND) ---
// Em produção com Nginx configurado corretamente, o Nginx serve os arquivos e essa parte nunca é atingida.
// Porém, mantemos como fallback para testes locais ou caso o Nginx falhe no roteamento estático.
const distPath = path.join(__dirname, '../dist');

if (fs.existsSync(distPath)) {
    console.log(`✅ Pasta estática encontrada em: ${distPath}`);
    app.use(express.static(distPath));

    // Rota Catch-All para SPA (React)
    app.get('*', (req, res) => {
        // Ignora favicon para limpar logs
        if (req.url === '/favicon.ico') return res.status(204).end();
        
        // Se a requisição pedir JSON ou parecer API, nega o HTML
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
             return res.status(404).json({ error: 'Rota não encontrada' });
        }

        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    console.log('⚠️ Pasta dist/ não encontrada. Rode "npm run build" se quiser servir o frontend pelo Node.');
    app.get('/', (req, res) => res.send('Backend API rodando. Frontend não compilado.'));
}

// --- INICIALIZAÇÃO ---
app.listen(PORT, '0.0.0.0', () => {
    console.log('===================================================');
    console.log(`🚀 SERVER NODE.JS RODANDO NA PORTA ${PORT}`);
    console.log(`👉 Teste de Saúde: http://localhost:${PORT}/api/health`);
    console.log('===================================================');
});
