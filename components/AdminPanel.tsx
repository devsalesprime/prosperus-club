
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Logo } from './ui/Logo';

interface SubmissionSummary {
    id: string;
    userEmail: string;
    userName: string;
    updatedAt: string;
    progress: {
        mentor: boolean;
        mentee: boolean;
        method: boolean;
        delivery: boolean;
    };
}

interface AdminPanelProps {
    onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_URL = 'http://localhost:3001/api';

    useEffect(() => {
        if (token) {
            fetchSubmissions();
        }
    }, [token]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                setToken(data.token);
                localStorage.setItem('adminToken', data.token);
            } else {
                setError(data.error || 'Erro ao entrar');
            }
        } catch (err) {
            setError('Erro de conexão com o servidor. Verifique se o backend está rodando.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/admin/submissions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSubmissions(data);
            } else {
                if (res.status === 401 || res.status === 403) {
                    handleLogoutLocal();
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (userEmail: string, userName: string) => {
        try {
            const res = await fetch(`${API_URL}/admin/download/${userEmail}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `diagnostico_${userName.replace(/\s+/g, '_')}.txt`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert('Erro ao baixar relatório');
            }
        } catch (err) {
            alert('Erro de conexão');
        }
    };

    const handleLogoutLocal = () => {
        localStorage.removeItem('adminToken');
        setToken(null);
        onLogout();
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-[#031A2B] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#081e30] border border-white/10 p-8 rounded-xl w-full max-w-md shadow-2xl"
                >
                    <div className="flex justify-center mb-8">
                        <Logo className="w-32" variant="footer" />
                    </div>
                    <h2 className="text-2xl font-serif text-white text-center mb-6">Acesso Administrativo</h2>
                    
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Email Admin</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-[#051522] border border-white/10 p-3 rounded text-white outline-none focus:border-[#CA9A43]"
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Senha</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-[#051522] border border-white/10 p-3 rounded text-white outline-none focus:border-[#CA9A43]"
                            />
                        </div>
                        
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-[#CA9A43] text-[#031A2B] font-bold py-3 rounded hover:bg-[#FFE39B] transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Entrando...' : 'Acessar Painel'}
                        </button>
                    </form>
                    <button onClick={onLogout} className="w-full mt-4 text-gray-500 text-xs hover:text-white">Voltar ao Site</button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#031A2B] font-sans">
            <header className="bg-[#081e30] border-b border-white/5 px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Logo className="w-24" variant="footer" />
                    <div className="h-6 w-[1px] bg-white/10"></div>
                    <span className="text-[#CA9A43] font-bold uppercase tracking-widest text-xs">Painel Administrativo</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={fetchSubmissions} className="text-gray-400 hover:text-white"><i className="bi bi-arrow-clockwise text-xl"></i></button>
                    <button onClick={handleLogoutLocal} className="text-red-400 hover:text-red-300 text-sm font-bold uppercase">Sair</button>
                </div>
            </header>

            <main className="p-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-3xl font-serif text-white mb-2">Relatório de Envios</h1>
                        <p className="text-gray-400 text-sm">Acompanhe quem está preenchendo o diagnóstico.</p>
                    </div>
                </div>

                <div className="bg-[#081e30] border border-white/5 rounded-lg overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#051522] text-gray-400 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="p-4">Nome / Email</th>
                                    <th className="p-4">Última Atualização</th>
                                    <th className="p-4 text-center">Progresso</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                                {loading && submissions.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">Carregando dados...</td></tr>
                                ) : submissions.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum envio encontrado.</td></tr>
                                ) : (
                                    submissions.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-white">{sub.userName}</div>
                                                <div className="text-gray-500 text-xs">{sub.userEmail}</div>
                                            </td>
                                            <td className="p-4 text-gray-400">
                                                {new Date(sub.updatedAt).toLocaleDateString('pt-BR')} <span className="text-[10px]">{new Date(sub.updatedAt).toLocaleTimeString('pt-BR')}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2">
                                                    <span title="O Mentor" className={`w-3 h-3 rounded-full ${sub.progress.mentor ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-700'}`}></span>
                                                    <span title="O Mentorado" className={`w-3 h-3 rounded-full ${sub.progress.mentee ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-700'}`}></span>
                                                    <span title="O Método" className={`w-3 h-3 rounded-full ${sub.progress.method ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-700'}`}></span>
                                                    <span title="A Oferta" className={`w-3 h-3 rounded-full ${sub.progress.delivery ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-700'}`}></span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => handleDownload(sub.userEmail, sub.userName)}
                                                    className="bg-[#CA9A43]/10 text-[#CA9A43] hover:bg-[#CA9A43] hover:text-[#031A2B] border border-[#CA9A43]/50 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all flex items-center gap-2 ml-auto"
                                                >
                                                    <i className="bi bi-download"></i> Baixar TXT
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};
