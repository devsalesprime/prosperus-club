const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Configuração de Proxy para Nginx (importante para req.ip funcionar)
app.set('trust proxy', 1);

app.use(cors({
    origin: '*', // Em produção, pode restringir ao seu domínio
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Log de todas as requisições para debug
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
    
    // Forçar header JSON
    res.setHeader('Content-Type', 'application/json');

    const member = ALLOWED_MEMBERS.find(m => m.email.toLowerCase() === (email || '').trim().toLowerCase());
    
    if (member) {
        return res.json({ allowed: true, name: member.name });
    }
    
    // Fallback para permitir qualquer email em modo de teste/dev se necessário
    // return res.json({ allowed: true, name: 'Visitante' }); 
    
    return res.json({ allowed: false, error: 'E-mail não encontrado na base de membros.' });
};

const submitHandler = (req, res) => {
    console.log('Recebendo submissão do módulo:', req.body.module);
    res.json({ success: true, message: 'Dados salvos com sucesso' });
};

// --- ROTAS DA API ---
// Definimos com E sem o prefixo /api para garantir que funcione
// independente de como o Nginx rewrite a URL.

// Rota de Login
app.post('/api/auth/login', loginHandler);
app.post('/auth/login', loginHandler);

// Rota de Verificação de Membro
app.post('/api/auth/verify-member', verifyMemberHandler);
app.post('/auth/verify-member', verifyMemberHandler);

// Rota de Submissão de Dados
app.post('/api/submit', submitHandler);
app.post('/submit', submitHandler);

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', server: 'node-express' }));

// --- TRATAMENTO DE ERROS DA API ---
// Captura qualquer rota /api/* que não exista e retorna 404 JSON
// Isso impede que o Nginx/React devolva index.html para chamadas de API erradas
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Rota API não encontrada: ${req.url}` });
});

// --- SERVIR ARQUIVOS ESTÁTICOS (FRONTEND) ---
// Em produção com Nginx, o Nginx serve os arquivos.
// Mas se o Nginx falhar ou para teste local, o Node serve.
const distPath = path.join(__dirname, '../dist');

if (fs.existsSync(distPath)) {
    console.log(`✅ Pasta estática encontrada em: ${distPath}`);
    app.use(express.static(distPath));

    // Rota Catch-All para SPA (React)
    // Qualquer rota que NÃO seja /api e NÃO seja arquivo estático cai aqui
    app.get('*', (req, res) => {
        // Proteção extra: se parecer API, devolve erro JSON
        if (req.url.startsWith('/api') || req.url.startsWith('/auth')) {
             return res.status(404).json({ error: 'Endpoint não encontrado' });
        }
        
        // Ignora favicon para limpar logs
        if (req.url === '/favicon.ico') {
            return res.status(204).end();
        }

        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    console.log('⚠️ Pasta dist/ não encontrada. Rode "npm run build" se quiser servir o frontend pelo Node.');
    app.get('/', (req, res) => res.send('Backend API rodando. Frontend não buildado.'));
}

// --- INICIALIZAÇÃO ---
app.listen(PORT, '0.0.0.0', () => {
    console.log('---------------------------------------------------');
    console.log(`🚀 SERVER NODE.JS RODANDO NA PORTA ${PORT}`);
    console.log(`👉 Teste Local: http://localhost:${PORT}/api/health`);
    console.log('---------------------------------------------------');
});
