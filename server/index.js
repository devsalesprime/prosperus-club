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

// ============================================
// MIDDLEWARE - ORDEM IMPORTANTE!
// ============================================

// 1. CORS deve vir primeiro
app.use(cors({
    origin: '*', // Em produção, especifique seu domínio
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Body Parser
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// 3. Logger para debug
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================
// CONFIGURAÇÃO DE ARQUIVOS ESTÁTICOS
// ============================================

const distPath = path.resolve(__dirname, '..', 'dist');

console.log('================================================');
console.log(`🚀 Iniciando Servidor Prosperus na porta ${PORT}`);
console.log(`📁 Servindo arquivos estáticos de: ${distPath}`);

if (fs.existsSync(distPath)) {
    console.log('✅ Pasta dist encontrada com sucesso.');
    const assetsPath = path.join(distPath, 'assets');
    if (fs.existsSync(assetsPath)) {
        const files = fs.readdirSync(assetsPath);
        console.log(`📦 Conteúdo da pasta assets (${files.length} arquivos)`);
    } else {
        console.warn('⚠️  ALERTA: Pasta assets não encontrada dentro de dist.');
    }
} else {
    console.error('❌ ERRO CRÍTICO: Pasta dist não encontrada! Execute "npm run build".');
}
console.log('================================================\n');

// Serve arquivos estáticos (DEPOIS das rotas de API)
// Não coloque isso aqui, vai ficar no final!

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
    
    if (!token) {
        console.log('❌ Token não fornecido');
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.log('❌ Token inválido:', err.message);
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// ============================================
// UTILS: TXT REPORT GENERATOR
// ============================================

const generateTxtReport = (sub) => {
    const divider = "================================================================\n";
    const subDivider = "----------------------------------------------------------------\n";
    let txt = `RELATÓRIO DE DIAGNÓSTICO - PROSPERUS CLUB\n`;
    txt += `Data: ${new Date(sub.updatedAt).toLocaleString('pt-BR')}\n`;
    txt += `Nome: ${sub.userName}\n`;
    txt += `Email: ${sub.userEmail}\n`;
    txt += divider + "\n";

    // 1. MENTOR MODULE
    if (sub.mentorData) {
        txt += `MÓDULO 1: O MENTOR\n${subDivider}`;
        txt += `Pitch: ${sub.mentorData.step1?.field4 || 'N/A'}\n\n`;
        
        txt += `Linha do Tempo:\n`;
        sub.mentorData.step2?.moments?.forEach(m => {
            txt += ` - [${m.year}] ${m.description}\n`;
        });
        txt += "\n";

        txt += `Conquistas (Pódio):\n`;
        txt += ` 1. Ouro: ${sub.mentorData.step3?.first || 'N/A'}\n`;
        txt += ` 2. Prata: ${sub.mentorData.step3?.second || 'N/A'}\n`;
        txt += ` 3. Bronze: ${sub.mentorData.step3?.third || 'N/A'}\n\n`;

        txt += `Cultura (MVV):\n`;
        txt += ` Missão: ${sub.mentorData.step4?.mission || 'N/A'}\n`;
        txt += ` Visão: ${sub.mentorData.step4?.vision || 'N/A'}\n`;
        txt += ` Valores: ${sub.mentorData.step4?.values || 'N/A'}\n\n`;
        
        txt += `Diferenciação:\n`;
        txt += ` Mercado: ${sub.mentorData.step7?.marketStandard || 'N/A'}\n`;
        txt += ` Diferença: ${sub.mentorData.step7?.myDifference || 'N/A'}\n`;
        txt += divider + "\n";
    }

    // 2. MENTEE MODULE
    if (sub.menteeData) {
        txt += `MÓDULO 2: O MENTORADO\n${subDivider}`;
        txt += `Já tem clientes? ${sub.menteeData.hasClients === 'yes' ? 'Sim' : 'Não'}\n\n`;
        
        if (sub.menteeData.hasClients === 'no') {
            txt += `Perfil Demográfico: ${sub.menteeData.demographics?.detailedProfile || 'N/A'}\n`;
            txt += `Motivação (Topo): ${sub.menteeData.decisionMountain?.motivation || 'N/A'}\n`;
            txt += `Barreiras (Muro): ${sub.menteeData.decisionMountain?.barriers || 'N/A'}\n`;
            txt += `Jornada de Consumo (${sub.menteeData.consumptionJourney?.steps?.length || 0} passos)\n`;
            txt += `Frase do Alvo: ${sub.menteeData.icpTarget?.centerPhrase || 'N/A'}\n`;
        } else {
            txt += `Personas Mapeadas: ${sub.menteeData.personas?.length || 0}\n`;
            txt += `Síntese do ICP: ${sub.menteeData.icpSynthesis?.phrase || 'N/A'}\n`;
        }
        txt += divider + "\n";
    }

    // 3. METHOD MODULE
    if (sub.methodData) {
        txt += `MÓDULO 3: O MÉTODO\n${subDivider}`;
        txt += `Estágio: ${sub.methodData.stage}\n`;
        
        if (sub.methodData.stage === 'structured') {
            txt += `Nome do Método: ${sub.methodData.name}\n`;
            txt += `Transformação: ${sub.methodData.transformation}\n`;
            txt += `Pilares:\n`;
            sub.methodData.pillars?.forEach((p, i) => {
                txt += ` ${i+1}. ${p.what} (Por que: ${p.why})\n`;
            });
        } else {
            txt += `Ponto A (Dores): ${sub.methodData.purpose?.pointA?.pain || 'N/A'}\n`;
            txt += `Ponto B (Ganhos): ${sub.methodData.purpose?.pointB?.worth || 'N/A'}\n`;
            txt += `Etapas da Jornada: ${sub.methodData.journeyMap?.length || 0}\n`;
        }
        txt += divider + "\n";
    }

    // 4. DELIVERY MODULE
    if (sub.deliveryData) {
        txt += `MÓDULO 4: A OFERTA\n${subDivider}`;
        txt += `Nome do Grupo: ${sub.deliveryData.groupName || 'N/A'}\n`;
        txt += `Objetivo Único: ${sub.deliveryData.uniqueObjective || 'N/A'}\n`;
        txt += `Frequência Presencial: ${sub.deliveryData.mandatory?.frequency || 0}x ao ano\n`;
        txt += `Engajamento Online: ${sub.deliveryData.mandatory?.onlineEngagement?.join(', ') || 'N/A'}\n`;
        if (sub.deliveryData.mandatory?.otherEngagementText) {
            txt += `Outro Engajamento: ${sub.deliveryData.mandatory.otherEngagementText}\n`;
        }
        txt += `Regras: ${sub.deliveryData.mandatory?.communityRules || 'N/A'}\n`;
        txt += `Overdelivery Individual: ${sub.deliveryData.overdelivery?.hasIndividual === 'yes' ? 'Sim' : 'Não'}\n`;
        if (sub.deliveryData.overdelivery?.hasIndividual === 'yes') {
            txt += `Detalhes Individual: ${sub.deliveryData.overdelivery?.individualDetails}\n`;
        }
        txt += divider + "\n";
    }
    
    return txt;
};

// ============================================
// API ROUTES - TODAS AS ROTAS DE API DEVEM VIR ANTES DO CATCH-ALL!
// ============================================

// Health Check (útil para monitoramento)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        distExists: fs.existsSync(distPath)
    });
});

// 1. Admin Login
app.post('/api/auth/login', (req, res) => {
    console.log('🔑 Tentativa de login:', req.body.email);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    
    // Hardcoded para MVP. Em produção, use bcrypt e database.
    if (email === 'admin@prosperus.com' && password === 'admin123') {
        const token = jwt.sign({ role: 'admin', email }, SECRET_KEY, { expiresIn: '12h' });
        console.log('✅ Login bem-sucedido');
        return res.json({ token, message: 'Login realizado com sucesso' });
    } else {
        console.log('❌ Credenciais inválidas');
        return res.status(401).json({ error: 'Email ou senha incorretos' });
    }
});

// 2. Save User Data (Upsert)
app.post('/api/submit', (req, res) => {
    const { email, name, module, data } = req.body;
    
    console.log('💾 Salvando dados:', { email, name, module, dataSize: JSON.stringify(data).length });
    
    if (!email) {
        return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const db = getDb();
    let submission = db.submissions.find(s => s.userEmail === email);

    if (!submission) {
        submission = {
            id: Date.now().toString(),
            userEmail: email,
            userName: name || 'Sem Nome',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            mentorData: null,
            menteeData: null,
            methodData: null,
            deliveryData: null
        };
        db.submissions.push(submission);
        console.log('➕ Nova submissão criada');
    } else {
        console.log('🔄 Atualizando submissão existente');
    }

    // Update specific module data
    submission.updatedAt = new Date().toISOString();
    submission.userName = name || submission.userName;
    
    if (module === 'mentor') submission.mentorData = data;
    if (module === 'mentee') submission.menteeData = data;
    if (module === 'method') submission.methodData = data;
    if (module === 'delivery') submission.deliveryData = data;

    const saved = saveDb(db);
    
    if (saved) {
        console.log('✅ Dados salvos com sucesso');
        res.json({ success: true, message: 'Dados salvos com sucesso' });
    } else {
        console.log('❌ Erro ao salvar dados');
        res.status(500).json({ error: 'Erro ao salvar dados' });
    }
});

// 3. List Submissions (Admin Only)
app.get('/api/admin/submissions', authenticateToken, (req, res) => {
    console.log('📋 Listando submissões (Admin)');
    
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
    
    console.log(`✅ Retornando ${summary.length} submissões`);
    res.json(summary);
});

// 4. Download TXT (Admin Only)
app.get('/api/admin/download/:email', authenticateToken, (req, res) => {
    console.log('📥 Download solicitado para:', req.params.email);
    
    const db = getDb();
    const submission = db.submissions.find(s => s.userEmail === req.params.email);
    
    if (!submission) {
        console.log('❌ Usuário não encontrado');
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    try {
        const txtContent = generateTxtReport(submission);
        const filename = `diagnostico_${submission.userName.replace(/\s+/g, '_')}.txt`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(txtContent);
        
        console.log('✅ Download enviado com sucesso');
    } catch (e) {
        console.error('❌ Erro ao gerar relatório:', e);
        res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
});

// ============================================
// ARQUIVOS ESTÁTICOS E CATCH-ALL (ÚLTIMO!)
// ============================================

// Serve arquivos estáticos da pasta dist
app.use(express.static(distPath, {
    index: false, // Não serve index.html automaticamente
    dotfiles: 'ignore'
}));

// CATCH-ALL: Serve o React para qualquer rota não-API
// IMPORTANTE: Esta rota DEVE ser a última!
app.get('*', (req, res) => {
    // Se for rota de API que não existe, retorna 404
    if (req.path.startsWith('/api')) {
        console.log('❌ API endpoint não encontrado:', req.path);
        return res.status(404).json({ 
            error: 'API endpoint não encontrado',
            path: req.path 
        });
    }
    
    // Serve o index.html para todas as outras rotas (React Router)
    const indexPath = path.join(distPath, 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        console.error('❌ index.html não encontrado em:', indexPath);
        res.status(404).send(`
            <h1>Aplicação não encontrada</h1>
            <p>O arquivo index.html não foi encontrado em: ${indexPath}</p>
            <p>Por favor, execute <code>npm run build</code> para compilar a aplicação.</p>
        `);
    }
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
    console.error('💥 Erro não tratado:', err);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: err.message 
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, '0.0.0.0', () => {
    console.log('\n================================================');
    console.log(`✅ Servidor Prosperus rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log('================================================\n');
});