const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'prosperus-super-secret-key-change-in-prod';
const DB_FILE = path.join(__dirname, 'database.json');

// Define o caminho para a pasta dist (onde está o build do React)
// __dirname é a pasta 'server', então voltamos um nível para achar a 'dist'
const distPath = path.join(__dirname, '..', 'dist');

console.log('================================================');
console.log(`🚀 Iniciando Servidor Prosperus na porta ${PORT}`);
console.log(`📁 Buscando arquivos estáticos em: ${distPath}`);

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Log de todas as requisições para debug
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// ============================================
// DATABASE LAYER
// ============================================

const getDb = () => {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ submissions: [] }));
    }
    try {
        return JSON.parse(fs.readFileSync(DB_FILE));
    } catch (e) {
        console.error('Erro ao ler database:', e);
        return { submissions: [] };
    }
};

const saveDb = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Erro ao salvar database:', e);
        return false;
    }
};

// ============================================
// AUTH MIDDLEWARE
// ============================================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

// ============================================
// UTILS: TXT REPORT
// ============================================
const generateTxtReport = (sub) => {
    // (Simplificado para o exemplo, mas funcional)
    let txt = `RELATÓRIO DE DIAGNÓSTICO\nData: ${new Date(sub.updatedAt).toLocaleString()}\nNome: ${sub.userName}\nEmail: ${sub.userEmail}\n\n`;
    if(sub.mentorData) txt += `[MENTOR]\nPitch: ${sub.mentorData.step1?.field4 || ''}\n\n`;
    if(sub.menteeData) txt += `[MENTORADO]\nTem Clientes? ${sub.menteeData.hasClients}\n\n`;
    if(sub.methodData) txt += `[MÉTODO]\nNome: ${sub.methodData.name}\nPromessa: ${sub.methodData.transformation}\n\n`;
    if(sub.deliveryData) txt += `[ENTREGA]\nGrupo: ${sub.deliveryData.groupName}\n\n`;
    return txt;
};

// ============================================
// API ROUTES
// ============================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Admin Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    // MVP Hardcoded
    if (email === 'admin@prosperus.com' && password === 'admin123') {
        const token = jwt.sign({ role: 'admin', email }, SECRET_KEY, { expiresIn: '12h' });
        return res.json({ token });
    }
    return res.status(401).json({ error: 'Credenciais inválidas' });
});

// Save Data
app.post('/api/submit', (req, res) => {
    const { email, name, module, data } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });

    const db = getDb();
    let submission = db.submissions.find(s => s.userEmail === email);

    if (!submission) {
        submission = {
            id: Date.now().toString(),
            userEmail: email,
            userName: name || 'Sem Nome',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            mentorData: null, menteeData: null, methodData: null, deliveryData: null
        };
        db.submissions.push(submission);
    }

    submission.updatedAt = new Date().toISOString();
    submission.userName = name || submission.userName;
    if (module === 'mentor') submission.mentorData = data;
    if (module === 'mentee') submission.menteeData = data;
    if (module === 'method') submission.methodData = data;
    if (module === 'delivery') submission.deliveryData = data;

    saveDb(db);
    res.json({ success: true });
});

// Admin Routes
app.get('/api/admin/submissions', authenticateToken, (req, res) => {
    const db = getDb();
    const summary = db.submissions.map(s => ({
        id: s.id,
        userEmail: s.userEmail,
        userName: s.userName,
        updatedAt: s.updatedAt,
        progress: {
            mentor: !!s.mentorData,
            mentee: !!s.menteeData,
            method: !!s.methodData,
            delivery: !!s.deliveryData
        }
    }));
    res.json(summary);
});

app.get('/api/admin/download/:email', authenticateToken, (req, res) => {
    const db = getDb();
    const sub = db.submissions.find(s => s.userEmail === req.params.email);
    if (!sub) return res.status(404).json({ error: 'Não encontrado' });

    const txt = generateTxtReport(sub);
    const filename = `diagnostico_${sub.userName.replace(/\s+/g, '_')}.txt`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(txt);
});

// ============================================
// STATIC FILES & SPA FALLBACK (POR ÚLTIMO)
// ============================================

// Verifica se a pasta dist existe
if (fs.existsSync(distPath)) {
    // Serve os arquivos estáticos (JS, CSS, Imagens)
    app.use(express.static(distPath));

    // Para qualquer outra rota não-API, serve o index.html (React Router)
    app.get('*', (req, res) => {
        // Se a requisição pede API e chegou aqui, é 404 da API
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    console.error('❌ PASTA DIST NÃO ENCONTRADA! Execute "npm run build".');
    app.get('*', (req, res) => res.status(500).send('Servidor configurado incorretamente: pasta dist não encontrada.'));
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
