const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001; // Porta onde a API vai rodar

// Configurações de segurança e parser
app.use(cors()); // Aceita requisições de qualquer origem (útil se frontend e backend estiverem em portas/domínios diferentes)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Log de requisições para debug
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Ignora favicon para não sujar logs
app.get('/favicon.ico', (req, res) => res.status(204).end());

// --- BANCO DE DADOS SIMULADO ---
const ALLOWED_MEMBERS = [
    { email: 'admin@prosperus.com', name: 'Admin', role: 'admin' },
    { email: 'membro@teste.com', name: 'Membro Teste', role: 'member' }
];

// --- HANDLERS (FUNÇÕES DE CONTROLE) ---
// Separamos as funções para poder usar em múltiplas rotas (com e sem /api)

const healthHandler = (req, res) => {
    res.json({ status: 'Online', serverTime: new Date().toISOString() });
};

const loginHandler = (req, res) => {
    console.log('Tentativa de login:', req.body);
    const { email, password } = req.body;

    if (email === 'admin@prosperus.com' && password === 'admin123') {
        console.log('Login SUCESSO');
        return res.json({ 
            success: true, 
            token: 'admin-secret-token-12345',
            user: { name: 'Administrador', email }
        });
    }

    console.log('Login FALHA');
    return res.status(401).json({ error: 'Credenciais inválidas' });
};

const verifyMemberHandler = (req, res) => {
    const { email } = req.body;
    console.log('Verificando membro:', email);
    
    // Procura na lista (case insensitive)
    const member = ALLOWED_MEMBERS.find(m => m.email.toLowerCase() === (email || '').toLowerCase());

    if (member) {
        return res.json({ allowed: true, name: member.name });
    }
    
    return res.json({ allowed: false, error: 'E-mail não encontrado na base de membros.' });
};

const submitHandler = (req, res) => {
    // Apenas simula um salvamento com sucesso
    // Aqui você conectaria com banco de dados real
    console.log('Recebido submit do módulo:', req.body.module);
    res.json({ success: true, message: 'Dados salvos com sucesso' });
};

// --- DEFINIÇÃO DE ROTAS (DUPLA CAMADA) ---
// Define rotas COM e SEM /api para garantir compatibilidade com qualquer config de Nginx

// Health Check
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Login Admin
app.post('/api/auth/login', loginHandler);
app.post('/auth/login', loginHandler);

// Verificação de Membro
app.post('/api/auth/verify-member', verifyMemberHandler);
app.post('/auth/verify-member', verifyMemberHandler);

// Submissão de Dados
app.post('/api/submit', submitHandler);
app.post('/submit', submitHandler);


// --- TRATAMENTO DE ERRO DE API (404 JSON) ---
// Importante: Qualquer rota que comece com /api e não foi tratada acima deve retornar JSON 404,
// e NÃO cair no fallback do React (HTML). Isso evita o erro "Unexpected token <".
app.all('/api/*', (req, res) => {
    console.warn(`[404 API] Rota não encontrada: ${req.url}`);
    res.status(404).json({ error: `Endpoint API não encontrado: ${req.url}` });
});

// --- SERVIR O FRONTEND (PRODUÇÃO) ---
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    console.log('📁 Servindo arquivos estáticos da pasta dist');
    app.use(express.static(distPath));
    
    // SPA Fallback: Qualquer outra rota retorna o index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    console.log('⚠️ Pasta dist não encontrada. Rodando apenas como API.');
    app.get('/', (req, res) => {
        res.send('Backend Prosperus rodando. Frontend não encontrado em ../dist');
    });
}

// INICIAR SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
    console.log('==============================================');
    console.log(`✅ SERVER RODANDO NA PORTA ${PORT}`);
    console.log(`   Rotas API ativas em /api/... e /...`);
    console.log('==============================================');
});
