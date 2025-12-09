const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001; // Porta onde a API vai rodar

// Habilita logs para vermos as requisições chegando
app.use((req, res, next) => {
    console.log(`[API REQUEST] ${req.method} ${req.url}`);
    next();
});

// Configurações de segurança e parser
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- BANCO DE DADOS SIMULADO ---
const ALLOWED_MEMBERS = [
    { email: 'admin@prosperus.com', name: 'Admin', role: 'admin' },
    { email: 'membro@teste.com', name: 'Membro Teste', role: 'member' }
];

// --- ROTAS DA API ---

// 1. Rota de Teste (Health Check)
app.get('/api/health', (req, res) => {
    res.json({ status: 'Online', serverTime: new Date().toISOString() });
});

// 2. Rota de Login do Admin
app.post('/api/auth/login', (req, res) => {
    console.log('Tentativa de login:', req.body);
    const { email, password } = req.body;

    // Login hardcoded para teste
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
});

// 3. Rota de Verificação de Membro
app.post('/api/auth/verify-member', (req, res) => {
    const { email } = req.body;
    console.log('Verificando membro:', email);
    
    // Procura na lista (case insensitive)
    const member = ALLOWED_MEMBERS.find(m => m.email.toLowerCase() === (email || '').toLowerCase());

    if (member) {
        return res.json({ allowed: true, name: member.name });
    }
    
    return res.json({ allowed: false, error: 'E-mail não encontrado na base de membros.' });
});

// --- SERVIR O FRONTEND (PRODUÇÃO) ---
// Isso faz o Node servir o React se a pasta dist existir
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    console.log('📁 Servindo arquivos estáticos da pasta dist');
    app.use(express.static(distPath));
    
    // Qualquer rota que não seja /api devolve o index.html (SPA)
    app.get('*', (req, res) => {
        if (req.url.startsWith('/api')) {
            return res.status(404).json({ error: 'Endpoint API não encontrado' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// INICIAR SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
    console.log('==============================================');
    console.log(`✅ SERVER RODANDO NA PORTA ${PORT}`);
    console.log(`   API Disponível em: http://localhost:${PORT}/api`);
    console.log('==============================================');
});
