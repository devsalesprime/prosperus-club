
import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { motion } from 'framer-motion';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userData: { name: string, email: string }) => void;
  onAdminAccess?: () => void;
}

// Ícone do WhatsApp em SVG para uso nos botões
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess, onAdminAccess }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // URL do Backend PHP para validação no HubSpot
  const API_URL = 'https://salesprime.com.br/verify_member.php';

  const handleCheckAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         throw new Error("O servidor retornou uma resposta inválida (não é JSON). Verifique o arquivo PHP.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erro no servidor: ${response.status}`);
      }

      if (data.allowed) {
        setStatus('success');
        // Pequeno delay para mostrar o status de sucesso antes de transicionar
        setTimeout(() => {
            onLoginSuccess({
                name: data.name || 'Membro',
                email: email
            });
            // Reset state for next time
            setStatus('idle');
            setEmail('');
        }, 1000);
      } else {
        throw new Error(data.error || 'Acesso não autorizado.');
      }

    } catch (err: any) {
      console.error("Erro na verificação:", err);
      setStatus('error');
      
      if (err.message && err.message.includes('Failed to fetch')) {
        setErrorMessage('Erro de conexão. Verifique sua internet.');
      } else {
        setErrorMessage(err.message || 'Ocorreu um erro ao validar seu acesso.');
      }
    }
  };

  const tryAgain = () => {
    setStatus('idle');
    setErrorMessage('');
  };

  // Close handler that resets state
  const handleClose = () => {
    setStatus('idle');
    setEmail('');
    setErrorMessage('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="text-center relative">
        <h2 className="font-serif text-3xl text-white mb-2">Área do Membro</h2>
        <p className="font-sans text-prosperus-neutral-grey/60 mb-8 text-sm">
          Acesso exclusivo para mentores aprovados no Prosperus Club.
        </p>

        {status === 'success' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="bg-prosperus-navy-dark border border-green-500/30 p-8 rounded-sm"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 border border-green-500/50">
              <span className="text-green-400 text-3xl">✓</span>
            </div>
            <h3 className="font-serif text-2xl text-white mb-2">Login Efetuado</h3>
            <p className="font-sans text-sm text-prosperus-neutral-grey/80 mb-6">
              Redirecionando para o ambiente de diagnóstico...
            </p>
            <div className="w-full h-1 bg-white/10 rounded overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1 }}
                    className="h-full bg-green-400"
                />
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleCheckAccess} className="space-y-6">
            <div className="text-left relative group">
              <label htmlFor="email" className="block font-sans text-xs uppercase tracking-widest text-prosperus-gold mb-2">
                Seu Email Cadastrado
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder="ex: nome@empresa.com.br"
                  disabled={status === 'loading'}
                  className={`w-full bg-prosperus-navy-dark border p-4 text-white font-sans disabled:opacity-50 transition-all duration-300
                    ${status === 'error' 
                      ? 'border-red-500/50 focus:border-red-500' 
                      : 'border-white/10 focus:border-prosperus-gold'
                    } outline-none`}
                />
                {/* Ícone de status dentro do input */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  {status === 'loading' && (
                    <div className="w-4 h-4 border-2 border-prosperus-gold border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </div>
            </div>

            {status === 'error' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-900/20 border border-red-500/30 p-4 text-left rounded-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="text-red-400 mt-0.5 font-bold text-lg">✕</span>
                  <div className="flex-1 w-full">
                    <p className="text-red-200 text-sm font-sans font-bold mb-2">Acesso Negado</p>
                    
                    {/* Mensagem técnica do backend */}
                    <p className="text-red-100 font-sans text-xs mb-3 font-semibold">
                      {errorMessage}
                    </p>

                    <div className="w-full h-[1px] bg-red-500/20 my-2"></div>

                    {/* Bloco 1: Suporte para membros */}
                    <div className="mb-4">
                      <p className="text-red-200/70 text-[10px] font-sans leading-relaxed mb-1 uppercase tracking-wider">
                        Já é membro?
                      </p>
                      <p className="text-red-100 text-xs font-sans mb-2">
                        Verifique se o e-mail é o mesmo do contrato.
                      </p>
                      <p className="text-red-100 text-xs font-sans mb-2">
                        Ou contate nosso suporte:
                      </p>
                      <a 
                        href="https://wa.me/5511956663958" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-xs font-bold rounded transition-colors group"
                      >
                        <WhatsAppIcon />
                        Suporte
                      </a>
                    </div>

                    {/* Bloco 2: Vendas para não membros */}
                    <div className="pt-2 border-t border-red-500/20">
                      <p className="text-red-200/70 text-[10px] font-sans leading-relaxed mb-1 mt-2 uppercase tracking-wider">
                        Não é membro do Prosperus Club?
                      </p>
                      <a 
                        href="https://wa.me/551131634500" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full py-2 bg-white/5 hover:bg-white/10 border border-white/20 text-white text-xs font-bold rounded transition-colors"
                      >
                         <WhatsAppIcon />
                         Falar com SDR
                      </a>
                    </div>
                  </div>
                </div>
                
                {/* Botão para limpar estado e tentar novamente */}
                <button 
                  type="button"
                  onClick={tryAgain}
                  className="mt-4 w-full py-2 bg-transparent hover:bg-red-500/10 text-red-300 text-[10px] uppercase tracking-wider transition-colors"
                >
                  ← Tentar outro e-mail
                </button>
              </motion.div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={status === 'loading' || !email || status === 'error'}
            >
              {status === 'loading' ? "Verificando..." : "Validar Acesso"}
            </Button>
            
            <div className="flex justify-between items-center text-xs text-prosperus-neutral-grey/30 pt-4 border-t border-white/5">
              <p>Ambiente Seguro <i className="bi bi-lock-fill"></i></p>
              {onAdminAccess && (
                  <button type="button" onClick={onAdminAccess} className="hover:text-prosperus-gold transition-colors">
                      Sou Admin
                  </button>
              )}
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
