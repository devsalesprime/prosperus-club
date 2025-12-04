
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;
const SECRET_KEY = 'prosperus-super-secret-key-change-in-prod';
const DB_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- DATABASE LAYER (Simulated for portability) ---
const getDb = () => {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ submissions: [] }));
    }
    return JSON.parse(fs.readFileSync(DB_FILE));
};

const saveDb = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- UTILS: TXT REPORT GENERATOR ---
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

// --- ROUTES ---

// 1. Admin Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    // Hardcoded for MVP security. In real app, use bcrypt and DB.
    if (email === 'admin@prosperus.com' && password === 'admin123') {
        const token = jwt.sign({ role: 'admin' }, SECRET_KEY, { expiresIn: '12h' });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Credenciais inválidas' });
    }
});

// 2. Save User Data (Upsert)
app.post('/api/submit', (req, res) => {
    const { email, name, module, data } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const db = getDb();
    let submission = db.submissions.find(s => s.userEmail === email);

    if (!submission) {
        submission = {
            id: Date.now().toString(),
            userEmail: email,
            userName: name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Placeholders for modules
            mentorData: null,
            menteeData: null,
            methodData: null,
            deliveryData: null
        };
        db.submissions.push(submission);
    }

    // Update specific module data
    submission.updatedAt = new Date().toISOString();
    submission.userName = name; // Update name in case it changed
    if (module === 'mentor') submission.mentorData = data;
    if (module === 'mentee') submission.menteeData = data;
    if (module === 'method') submission.methodData = data;
    if (module === 'delivery') submission.deliveryData = data;

    saveDb(db);
    res.json({ success: true, message: 'Dados salvos com sucesso.' });
});

// 3. List Submissions (Admin Only)
app.get('/api/admin/submissions', authenticateToken, (req, res) => {
    const db = getDb();
    // Return summary only to save bandwidth
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

// 4. Download TXT (Admin Only)
app.get('/api/admin/download/:email', authenticateToken, (req, res) => {
    const db = getDb();
    const submission = db.submissions.find(s => s.userEmail === req.params.email);
    
    if (!submission) return res.status(404).send("Usuário não encontrado.");

    const txtContent = generateTxtReport(submission);
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="diagnostico_${submission.userName.replace(/\s+/g, '_')}.txt"`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(txtContent);
});

app.listen(PORT, () => {
    console.log(`Prosperus Backend running on http://localhost:${PORT}`);
});
