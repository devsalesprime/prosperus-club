

import React, { useState, useEffect } from 'react';
import { Logo } from './ui/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import { MentorModule, MentorData, INITIAL_MENTOR_DATA } from './modules/MentorModule';
import { MethodModule, MethodData, INITIAL_METHOD_DATA } from './modules/MethodModule';
import { MenteeModule, MenteeData, INITIAL_MENTEE_DATA } from './modules/MenteeModule';
import { DeliveryModule, DeliveryData, INITIAL_DELIVERY_DATA } from './modules/DeliveryModule';
import { Modal } from './ui/Modal';

interface DashboardProps {
  userEmail: string;
  userName: string;
  userDescription: string;
  onUpdateProfile: (data: { name: string; description: string }) => void;
  onLogout: () => void;
  initialModule?: string;
}

// Tipos para Menu e Estrutura
type MenuItem = {
  id: string;
  label: string;
};

type MenuSection = {
  id: string;
  title: string;
  items: MenuItem[];
};

// Estrutura do Menu
const menuStructure: MenuSection[] = [
  {
      id: 'geral',
      title: 'PRINCIPAL',
      items: [
          { id: 'overview', label: 'Dashboard - Visão Geral' }
      ]
  },
  {
    id: 'fundacao',
    title: 'FUNDAÇÃO',
    items: [
      { id: 'mentor', label: 'O Mentor' },
      { id: 'mentorado', label: 'O Mentorado' },
      { id: 'metodo', label: 'O Método' },
      { id: 'entrega_fundacao', label: 'A Oferta' },
    ]
  },
  {
    id: 'preparacao',
    title: 'PREPARAÇÃO',
    items: [
      { id: 'marketing', label: 'Marketing' },
      { id: 'vendas', label: 'Vendas' },
      { id: 'entrega_preparacao', label: 'Entrega' },
    ]
  },
  {
    id: 'acao',
    title: 'AÇÃO',
    items: [
      { id: 'plano_acao', label: 'Plano de Execução' }
    ]
  }
];

// Tipos de Status do Módulo
type ModuleStatus = 'todo' | 'completed' | 'under_review';

export const Dashboard: React.FC<DashboardProps> = ({ 
    userEmail, 
    userName, 
    userDescription, 
    onUpdateProfile, 
    onLogout, 
    initialModule = 'overview' 
}) => {
  const [activeItem, setActiveItem] = useState(initialModule);
  const [openSections, setOpenSections] = useState<string[]>(['geral', 'fundacao']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editDescription, setEditDescription] = useState(userDescription);

  // --- STATE LIFTING: DADOS DOS MÓDULOS ---
  const [mentorData, setMentorData] = useState<MentorData>(INITIAL_MENTOR_DATA);
  const [mentorStatus, setMentorStatus] = useState<ModuleStatus>('todo');

  const [menteeData, setMenteeData] = useState<MenteeData>(INITIAL_MENTEE_DATA);
  const [menteeStatus, setMenteeStatus] = useState<ModuleStatus>('todo');

  const [methodData, setMethodData] = useState<MethodData>(INITIAL_METHOD_DATA);
  const [methodStatus, setMethodStatus] = useState<ModuleStatus>('todo');

  const [deliveryData, setDeliveryData] = useState<DeliveryData>(INITIAL_DELIVERY_DATA);
  const [deliveryStatus, setDeliveryStatus] = useState<ModuleStatus>('todo');

  // --- BACKEND INTEGRATION ---
  // Determina a URL base dependendo do ambiente
  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/prosperus-mentor-diagnosis/api';

  const saveToBackend = async (module: string, data: any) => {
      try {
          // Fire and forget (não bloqueia UI)
          fetch(`${API_BASE_URL}/submit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  email: userEmail,
                  name: userName,
                  module: module,
                  data: data
              })
          }).catch(err => console.error("Erro ao salvar no backend:", err));
      } catch (e) {
          console.error(e);
      }
  };

  const handleUpdateMentor = (newData: MentorData) => {
      setMentorData(newData);
      // Debounce simples na UI, ou salvar no 'onSaveAndExit'
  };
  // Salvar efetivamente ao sair/completar
  useEffect(() => {
      if (mentorData !== INITIAL_MENTOR_DATA) saveToBackend('mentor', mentorData);
  }, [mentorData]); // Note: Na prática, use debounce, aqui simplificado

  useEffect(() => {
      if (menteeData !== INITIAL_MENTEE_DATA) saveToBackend('mentee', menteeData);
  }, [menteeData]);

  useEffect(() => {
      if (methodData !== INITIAL_METHOD_DATA) saveToBackend('method', methodData);
  }, [methodData]);

  useEffect(() => {
      if (deliveryData !== INITIAL_DELIVERY_DATA) saveToBackend('delivery', deliveryData);
  }, [deliveryData]);


  useEffect(() => {
    // Lógica de Redirecionamento ao Carregar
    if (initialModule && initialModule !== 'overview') {
        
        // Verifica se o módulo solicitado JÁ FOI INICIADO
        let isTargetStarted = false;

        if (initialModule === 'mentor') {
             // O Mentor é considerado iniciado se tiver status diferente de todo ou algum dado preenchido
             isTargetStarted = mentorStatus !== 'todo' || mentorData.step1.field4 !== '';
        } else if (initialModule === 'mentorado') {
             isTargetStarted = menteeStatus !== 'todo' || menteeData.hasClients !== null;
        } else if (initialModule === 'metodo') {
             isTargetStarted = methodStatus !== 'todo' || methodData.stage !== null;
        } else if (initialModule === 'entrega_fundacao') {
             isTargetStarted = deliveryStatus !== 'todo' || deliveryData.groupName !== '';
        }

        if (isTargetStarted) {
            // Se já começou, vai direto para o módulo
            const parentSection = menuStructure.find(section => 
                section.items.some(item => item.id === initialModule)
            );
            if (parentSection) {
                setOpenSections(prev => [...new Set([...prev, parentSection.id])]);
            }
            setActiveItem(initialModule);
        } else {
            // Se NÃO começou, vai para o Dashboard (Overview) para forçar o início pelo card correto
            setActiveItem('overview');
        }
    } else {
        setActiveItem('overview');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialModule]); 

  // Sync state when props change
  useEffect(() => {
    setEditName(userName);
    setEditDescription(userDescription);
  }, [userName, userDescription]);

  // Fecha o menu mobile ao clicar em um item
  const handleMenuItemClick = (itemId: string) => {
    if (itemId === 'overview') {
        setActiveItem('overview');
        setIsMobileMenuOpen(false);
        return;
    }

    const isMentorStarted = mentorStatus !== 'todo' || mentorData.step1.field4 !== '';
    if (itemId !== 'mentor' && !isMentorStarted) {
        alert("Por favor, inicie o módulo 'O Mentor' antes de avançar para as próximas etapas.");
        return;
    }

    setActiveItem(itemId);
    setIsMobileMenuOpen(false);
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId) 
        : [...prev, sectionId]
    );
  };

  const getActiveLabel = () => {
    for (const section of menuStructure) {
      const found = section.items.find(i => i.id === activeItem);
      if (found) return found.label;
    }
    return 'Dashboard';
  };

  const handleSaveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      onUpdateProfile({ name: editName, description: editDescription });
      setIsProfileModalOpen(false);
  };

  // Funções de Ação
  const handleSaveAndExit = () => {
      setActiveItem('overview');
  };

  const handleSendToEvaluation = () => {
      setMentorStatus('under_review');
      saveToBackend('mentor', mentorData); // Ensure save
      setActiveItem('overview');
  };

  const handleMenteeSendToEvaluation = () => {
      setMenteeStatus('under_review');
      saveToBackend('mentee', menteeData);
      setActiveItem('overview');
  };

  const handleMethodSendToEvaluation = () => {
      setMethodStatus('under_review');
      saveToBackend('method', methodData);
      setActiveItem('overview');
  }

  const handleDeliverySendToEvaluation = () => {
      setDeliveryStatus('under_review');
      saveToBackend('delivery', deliveryData);
      setActiveItem('overview');
  }

  // Helper para verificar se começou
  const isStarted = (status: ModuleStatus, check: boolean) => status !== 'todo' || check;

  const isMentorStarted = isStarted(mentorStatus, mentorData.step1.field4 !== '');
  const isMenteeStarted = isStarted(menteeStatus, menteeData.hasClients !== null);
  const isMethodStarted = isStarted(methodStatus, methodData.stage !== null);
  const isDeliveryStarted = isStarted(deliveryStatus, deliveryData.groupName !== '');

  const hasStartedAny = React.useMemo(() => {
    return isMentorStarted || isMenteeStarted || isMethodStarted || isDeliveryStarted;
  }, [isMentorStarted, isMenteeStarted, isMethodStarted, isDeliveryStarted]);


  // Renderização do Grid da Visão Geral (Transformado em função para evitar recriação de componente)
  const renderModulesGrid = () => (
      <div className="max-w-6xl mx-auto">
          {/* Welcome Text Section */}
          <div className="text-center mb-16 space-y-8 animate-fadeIn">
             <h2 className="font-serif text-4xl md:text-5xl text-white">Bem-vindo ao Diagnóstico de Mentoria</h2>
             <div className="max-w-3xl mx-auto text-gray-400 space-y-4 font-sans text-base md:text-lg leading-relaxed">
                 <p>Muitos especialistas possuem o conhecimento, mas travam na hora de empacotá-lo.</p>
                 <p>Este sistema foi desenhado para extrair a sua verdade e transformá-la em uma Oferta de Mentoria com Alto Valor.</p>
                 <p>Aqui, deixamos a subjetividade de lado. Vamos guiá-lo por um processo estruturado para transformar sua experiência de campo em um modelo de negócios escalável e lucrativo.</p>
                 {!hasStartedAny && (
                    <div className="pt-6">
                        <p className="text-[#CA9A43] font-bold text-xl">O próximo nível do seu negócio começa com clareza. Clique no cartão "O Mentor" para iniciar.</p>
                    </div>
                 )}
             </div>
          </div>

          {!hasStartedAny ? (
              // Estado Inicial: Mostra apenas o botão de iniciar jornada
              <div className="flex justify-center mt-8 animate-fadeIn delay-200">
                   <button 
                        onClick={() => setActiveItem('mentor')}
                        className="group relative bg-[#081e30] border border-[#CA9A43] p-10 rounded-2xl hover:bg-[#0a253a] transition-all shadow-[0_0_30px_rgba(202,154,67,0.1)] hover:shadow-[0_0_50px_rgba(202,154,67,0.3)] text-center max-w-sm w-full"
                   >
                        <div className="w-20 h-20 bg-[#CA9A43]/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform border border-[#CA9A43]/30">
                            <span className="font-serif text-4xl text-[#CA9A43] font-bold">1</span>
                        </div>
                        <h3 className="font-serif text-3xl text-white mb-2">O Mentor</h3>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">Comece sua jornada definindo sua autoridade e posicionamento único.</p>
                        
                        <div className="inline-flex items-center gap-2 bg-[#CA9A43] text-[#031A2B] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs group-hover:bg-[#FFE39B] transition-colors">
                            Iniciar Diagnóstico <i className="bi bi-arrow-right"></i>
                        </div>
                   </button>
              </div>
          ) : (
              // Estado Ativo: Mostra o Grid completo
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
                  {/* Card: O Mentor */}
                  <div className="bg-[#081e30] border border-white/5 rounded-lg p-6 hover:border-[#CA9A43]/30 transition-all group relative overflow-hidden flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded bg-[#CA9A43]/10 flex items-center justify-center text-[#CA9A43] font-serif font-bold text-xl">
                              1
                          </div>
                          {mentorStatus === 'todo' && !isMentorStarted && <span className="text-xs font-bold text-gray-500 uppercase bg-white/5 px-2 py-1 rounded">A Fazer</span>}
                          {mentorStatus === 'todo' && isMentorStarted && <span className="text-xs font-bold text-[#CA9A43] uppercase bg-[#CA9A43]/10 px-2 py-1 rounded border border-[#CA9A43]/20">Iniciado</span>}
                          {mentorStatus === 'completed' && <span className="text-xs font-bold text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded border border-green-500/20">Concluído</span>}
                          {mentorStatus === 'under_review' && <span className="text-xs font-bold text-blue-400 uppercase bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">Em Análise</span>}
                      </div>
                      
                      <h3 className="font-serif text-2xl text-white mb-2 group-hover:text-[#CA9A43] transition-colors">O Mentor</h3>
                      <p className="text-sm text-gray-400 mb-6 line-clamp-2">Definição de autoridade, história e pilares de cultura.</p>
                      
                      <div className="mt-auto">
                          <div className="flex gap-2">
                            {mentorStatus === 'under_review' ? (
                                <button 
                                    onClick={() => setActiveItem('mentor')}
                                    className="w-full py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest rounded hover:bg-blue-500/20 transition-colors"
                                >
                                    <i className="bi bi-eye"></i> Ver Respostas
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setActiveItem('mentor')}
                                    className="flex-1 py-2 bg-[#CA9A43] text-[#031A2B] text-xs font-bold uppercase tracking-widest rounded hover:bg-[#FFE39B] transition-colors"
                                >
                                    {isMentorStarted ? 'Editar' : 'Iniciar'}
                                </button>
                            )}
                          </div>
                      </div>
                  </div>

                  {/* Card: O Mentorado */}
                  <div className="bg-[#081e30] border border-white/5 rounded-lg p-6 hover:border-[#CA9A43]/30 transition-all group relative overflow-hidden flex flex-col">
                       <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded bg-[#CA9A43]/10 flex items-center justify-center text-[#CA9A43] font-serif font-bold text-xl">2</div>
                          {menteeStatus === 'todo' && !isMenteeStarted && <span className="text-xs font-bold text-gray-500 uppercase bg-white/5 px-2 py-1 rounded">A Fazer</span>}
                          {menteeStatus === 'todo' && isMenteeStarted && <span className="text-xs font-bold text-[#CA9A43] uppercase bg-[#CA9A43]/10 px-2 py-1 rounded border border-[#CA9A43]/20">Iniciado</span>}
                          {menteeStatus === 'completed' && <span className="text-xs font-bold text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded border border-green-500/20">Concluído</span>}
                          {menteeStatus === 'under_review' && <span className="text-xs font-bold text-blue-400 uppercase bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">Em Análise</span>}
                      </div>
                      <h3 className="font-serif text-2xl text-white mb-2 group-hover:text-[#CA9A43] transition-colors">O Mentorado</h3>
                      <p className="text-sm text-gray-400 mb-6 line-clamp-2">Definição de ICP e validação de público alvo.</p>
                      <div className="mt-auto">
                           <div className="flex gap-2">
                               {menteeStatus === 'under_review' ? (
                                   <button 
                                      onClick={() => setActiveItem('mentorado')}
                                      className="w-full py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest rounded hover:bg-blue-500/20 transition-colors"
                                  >
                                      <i className="bi bi-eye"></i> Ver Respostas
                                  </button>
                               ) : (
                                    <button 
                                        onClick={() => setActiveItem('mentorado')}
                                        className="flex-1 py-2 bg-[#CA9A43] text-[#031A2B] text-xs font-bold uppercase tracking-widest rounded hover:bg-[#FFE39B] transition-colors"
                                    >
                                        {isMenteeStarted ? 'Editar' : 'Iniciar'}
                                    </button>
                               )}
                           </div>
                      </div>
                  </div>

                  {/* Card: O Método */}
                  <div className="bg-[#081e30] border border-white/5 rounded-lg p-6 hover:border-[#CA9A43]/30 transition-all group relative overflow-hidden flex flex-col">
                       <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded bg-[#CA9A43]/10 flex items-center justify-center text-[#CA9A43] font-serif font-bold text-xl">3</div>
                          {methodStatus === 'todo' && !isMethodStarted && <span className="text-xs font-bold text-gray-500 uppercase bg-white/5 px-2 py-1 rounded">A Fazer</span>}
                          {methodStatus === 'todo' && isMethodStarted && <span className="text-xs font-bold text-[#CA9A43] uppercase bg-[#CA9A43]/10 px-2 py-1 rounded border border-[#CA9A43]/20">Iniciado</span>}
                          {methodStatus === 'completed' && <span className="text-xs font-bold text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded border border-green-500/20">Concluído</span>}
                          {methodStatus === 'under_review' && <span className="text-xs font-bold text-blue-400 uppercase bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">Em Análise</span>}
                      </div>
                      <h3 className="font-serif text-2xl text-white mb-2 group-hover:text-[#CA9A43] transition-colors">O Método</h3>
                      <p className="text-sm text-gray-400 mb-6 line-clamp-2">Estruturação do processo de entrega e transformação.</p>
                      
                      <div className="mt-auto">
                           <div className="flex gap-2">
                               {methodStatus === 'under_review' ? (
                                   <button 
                                      onClick={() => setActiveItem('metodo')}
                                      className="w-full py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest rounded hover:bg-blue-500/20 transition-colors"
                                  >
                                      <i className="bi bi-eye"></i> Ver Respostas
                                  </button>
                               ) : (
                                    <button 
                                        onClick={() => setActiveItem('metodo')}
                                        className="flex-1 py-2 bg-[#CA9A43] text-[#031A2B] text-xs font-bold uppercase tracking-widest rounded hover:bg-[#FFE39B] transition-colors"
                                    >
                                        {isMethodStarted ? 'Editar' : 'Iniciar'}
                                    </button>
                               )}
                           </div>
                      </div>
                  </div>

                  {/* Card: A Oferta */}
                  <div className="bg-[#081e30] border border-white/5 rounded-lg p-6 hover:border-[#CA9A43]/30 transition-all group relative overflow-hidden flex flex-col">
                       <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded bg-[#CA9A43]/10 flex items-center justify-center text-[#CA9A43] font-serif font-bold text-xl">4</div>
                          {deliveryStatus === 'todo' && !isDeliveryStarted && <span className="text-xs font-bold text-gray-500 uppercase bg-white/5 px-2 py-1 rounded">A Fazer</span>}
                          {deliveryStatus === 'todo' && isDeliveryStarted && <span className="text-xs font-bold text-[#CA9A43] uppercase bg-[#CA9A43]/10 px-2 py-1 rounded border border-[#CA9A43]/20">Iniciado</span>}
                          {deliveryStatus === 'completed' && <span className="text-xs font-bold text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded border border-green-500/20">Concluído</span>}
                          {deliveryStatus === 'under_review' && <span className="text-xs font-bold text-blue-400 uppercase bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">Em Análise</span>}
                      </div>
                      <h3 className="font-serif text-2xl text-white mb-2 group-hover:text-[#CA9A43] transition-colors">A Oferta</h3>
                      <p className="text-sm text-gray-400 mb-6 line-clamp-2">Formatação do produto, entregáveis e overdelivery.</p>
                      
                      <div className="mt-auto">
                           <div className="flex gap-2">
                               {deliveryStatus === 'under_review' ? (
                                   <button 
                                      onClick={() => setActiveItem('entrega_fundacao')}
                                      className="w-full py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest rounded hover:bg-blue-500/20 transition-colors"
                                  >
                                      <i className="bi bi-eye"></i> Ver Respostas
                                  </button>
                               ) : (
                                    <button 
                                        onClick={() => setActiveItem('entrega_fundacao')}
                                        className="flex-1 py-2 bg-[#CA9A43] text-[#031A2B] text-xs font-bold uppercase tracking-widest rounded hover:bg-[#FFE39B] transition-colors"
                                    >
                                        {isDeliveryStarted ? 'Editar' : 'Iniciar'}
                                    </button>
                               )}
                           </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );

  const renderContent = () => {
      if (activeItem === 'overview') {
          return renderModulesGrid();
      }

      if (activeItem === 'mentor') {
          return (
            <MentorModule 
                data={mentorData}
                onUpdate={handleUpdateMentor}
                onSaveAndExit={handleSaveAndExit}
                onComplete={handleSendToEvaluation}
                isReadOnly={mentorStatus === 'under_review'}
            />
          );
      }

      if (activeItem === 'mentorado') {
          return (
            <MenteeModule
                data={menteeData}
                onUpdate={(newData) => setMenteeData(newData)}
                onSaveAndExit={handleSaveAndExit}
                onComplete={handleMenteeSendToEvaluation}
                isReadOnly={menteeStatus === 'under_review'}
            />
          );
      }

      if (activeItem === 'metodo') {
          return (
            <MethodModule 
              data={methodData}
              onUpdate={(newData) => setMethodData(newData)}
              onSaveAndExit={handleSaveAndExit}
              onComplete={handleMethodSendToEvaluation}
              isReadOnly={methodStatus === 'under_review'}
            />
          );
      }

      if (activeItem === 'entrega_fundacao') {
          return (
              <DeliveryModule
                  data={deliveryData}
                  onUpdate={(newData) => setDeliveryData(newData)}
                  onSaveAndExit={handleSaveAndExit}
                  onComplete={handleDeliverySendToEvaluation}
                  isReadOnly={deliveryStatus === 'under_review'}
              />
          )
      }

      // Placeholder Genérico
      return (
        <div className="bg-[#051522] border border-white/5 rounded-lg p-1 min-h-[600px] shadow-2xl relative overflow-hidden flex items-center justify-center">
             <div className="text-center">
                <i className="bi bi-cone-striped text-4xl text-[#CA9A43] mb-4 block"></i>
                <h3 className="font-serif text-2xl text-white mb-2">Em Construção</h3>
                <p className="text-gray-500">O módulo {getActiveLabel()} estará disponível em breve.</p>
                <button onClick={() => setActiveItem('overview')} className="mt-6 text-[#CA9A43] text-sm hover:underline">
                    Voltar para Visão Geral
                </button>
             </div>
        </div>
      );
  };

  return (
    <div className="min-h-screen bg-[#031A2B] flex text-white font-sans overflow-hidden relative">
      
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Drawer on Mobile, Fixed on Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#020f19] border-r border-white/5 flex flex-col shadow-xl 
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-24 flex items-center justify-center border-b border-white/5 px-6 bg-[#020f19] relative">
          <Logo className="w-28" variant="footer" />
          {/* Close button mobile only */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute right-4 text-gray-500 hover:text-white lg:hidden"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="flex-1 py-8 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {menuStructure.map((section) => (
              <div key={section.id} className="px-4">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-2 py-2 mb-1 group"
                >
                  <span className="text-[10px] text-[#CA9A43] group-hover:text-[#FFE39B] uppercase tracking-widest font-bold transition-colors">
                    {section.title}
                  </span>
                  <i className={`bi bi-chevron-down text-[#CA9A43] text-[10px] transition-transform duration-300 ${openSections.includes(section.id) ? 'rotate-180' : ''}`}></i>
                </button>

                <AnimatePresence initial={false}>
                  {openSections.includes(section.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <ul className="pl-2 space-y-1 pb-4 border-l border-white/5 ml-2">
                        {section.items.map((item) => (
                          <li key={item.id}>
                            <button
                              onClick={() => handleMenuItemClick(item.id)}
                              className={`w-full text-left px-4 py-2 text-sm transition-all duration-300 rounded-r-sm flex items-center gap-3 relative
                                ${activeItem === item.id 
                                  ? 'text-white bg-white/5' 
                                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                              {activeItem === item.id && (
                                <motion.div layoutId="activeIndicator" className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#CA9A43]" />
                              )}
                              {item.label}
                              {/* Status Indicators */}
                              {item.id === 'mentor' && mentorStatus === 'under_review' && <i className="bi bi-lock-fill text-[10px] ml-auto text-blue-500"></i>}
                              {item.id === 'mentor' && mentorStatus === 'completed' && <i className="bi bi-check-circle-fill text-[10px] ml-auto text-green-500"></i>}
                              {item.id === 'metodo' && methodStatus === 'under_review' && <i className="bi bi-lock-fill text-[10px] ml-auto text-blue-500"></i>}
                              {item.id === 'metodo' && isMethodStarted && methodStatus !== 'under_review' && <i className="bi bi-circle-fill text-[8px] ml-auto text-[#CA9A43]"></i>}
                              {item.id === 'mentorado' && isMenteeStarted && menteeStatus !== 'under_review' && <i className="bi bi-circle-fill text-[8px] ml-auto text-[#CA9A43]"></i>}
                              {item.id === 'mentorado' && menteeStatus === 'under_review' && <i className="bi bi-lock-fill text-[10px] ml-auto text-blue-500"></i>}
                              {item.id === 'entrega_fundacao' && isDeliveryStarted && deliveryStatus !== 'under_review' && <i className="bi bi-circle-fill text-[8px] ml-auto text-[#CA9A43]"></i>}
                              {item.id === 'entrega_fundacao' && deliveryStatus === 'under_review' && <i className="bi bi-lock-fill text-[10px] ml-auto text-blue-500"></i>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
                {section.id !== 'acao' && <div className="h-[1px] w-full bg-white/5 my-2 mx-auto"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-white/5 bg-[#010a12]">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full flex items-center gap-3 mb-3 p-2 rounded-lg hover:bg-white/5 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFE39B] to-[#CA9A43] flex items-center justify-center text-[#031A2B] font-bold text-lg shadow-lg shadow-[#CA9A43]/20 shrink-0 group-hover:scale-105 transition-transform">
              {/* Usando a primeira letra do Nome */}
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-white truncate group-hover:text-[#CA9A43] transition-colors">
                  {userName !== 'Membro' ? userName : 'Editar Perfil'}
              </p>
              <p className="text-xs text-gray-500 truncate" title={userEmail}>{userEmail}</p>
            </div>
            <i className="bi bi-pencil-square text-gray-600 group-hover:text-[#CA9A43] transition-colors"></i>
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full group flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors px-3 py-2"
          >
            <i className="bi bi-box-arrow-left text-lg"></i>
            <span className="uppercase tracking-wider">Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#031A2B] relative custom-scrollbar w-full">
        <div className="h-24 border-b border-white/5 flex items-center justify-between px-6 lg:px-10 bg-[#0B1426] backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {/* Mobile Hamburger Trigger */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-white hover:text-[#CA9A43] transition-colors"
            >
              <i className="bi bi-list text-2xl"></i>
            </button>
            <h1 className="font-serif text-2xl md:text-3xl text-white truncate max-w-[200px] md:max-w-none">{getActiveLabel()}</h1>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Status Badges no Header */}
             {activeItem === 'mentor' && (
                <div className="text-xs text-[#CA9A43] border border-[#CA9A43]/30 px-3 py-1 rounded-full bg-[#CA9A43]/5 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${mentorStatus === 'under_review' ? 'bg-blue-500' : 'bg-[#CA9A43] animate-pulse'}`}></span>
                    <span className="hidden md:inline">{mentorStatus === 'under_review' ? 'Em Análise' : 'Em Progresso'}</span>
                    <span className="md:hidden">{mentorStatus === 'under_review' ? 'Análise' : 'Ativo'}</span>
                </div>
             )}
             {activeItem === 'metodo' && (
                <div className="text-xs text-[#CA9A43] border border-[#CA9A43]/30 px-3 py-1 rounded-full bg-[#CA9A43]/5 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${methodStatus === 'under_review' ? 'bg-blue-500' : 'bg-[#CA9A43] animate-pulse'}`}></span>
                    <span className="hidden md:inline">{methodStatus === 'under_review' ? 'Em Análise' : 'Em Progresso'}</span>
                    <span className="md:hidden">{methodStatus === 'under_review' ? 'Análise' : 'Ativo'}</span>
                </div>
             )}
             {activeItem === 'mentorado' && (
                <div className="text-xs text-[#CA9A43] border border-[#CA9A43]/30 px-3 py-1 rounded-full bg-[#CA9A43]/5 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${menteeStatus === 'under_review' ? 'bg-blue-500' : 'bg-[#CA9A43] animate-pulse'}`}></span>
                    <span className="hidden md:inline">{menteeStatus === 'under_review' ? 'Em Análise' : 'Em Progresso'}</span>
                    <span className="md:hidden">{menteeStatus === 'under_review' ? 'Análise' : 'Ativo'}</span>
                </div>
             )}
              {activeItem === 'entrega_fundacao' && (
                <div className="text-xs text-[#CA9A43] border border-[#CA9A43]/30 px-3 py-1 rounded-full bg-[#CA9A43]/5 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${deliveryStatus === 'under_review' ? 'bg-blue-500' : 'bg-[#CA9A43] animate-pulse'}`}></span>
                    <span className="hidden md:inline">{deliveryStatus === 'under_review' ? 'Em Análise' : 'Em Progresso'}</span>
                    <span className="md:hidden">{deliveryStatus === 'under_review' ? 'Análise' : 'Ativo'}</span>
                </div>
             )}
          </div>
        </div>

        <div className="p-4 md:p-10 max-w-6xl mx-auto">
          <motion.div
            key={activeItem}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
             {renderContent()}
          </motion.div>
        </div>
      </main>

      {/* Profile Edit Modal */}
      <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)}>
        <div className="text-center">
            <h2 className="font-serif text-3xl text-white mb-2">Seu Perfil</h2>
            <p className="font-sans text-prosperus-neutral-grey/60 mb-8 text-sm">
                Mantenha seus dados atualizados para uma melhor experiência.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-6 text-left">
                {/* Email Read-only */}
                <div>
                    <label className="block font-sans text-xs uppercase tracking-widest text-gray-500 mb-2">
                        Email Cadastrado
                    </label>
                    <div className="w-full bg-[#031A2B] border border-white/5 p-4 text-gray-400 font-sans rounded-sm cursor-not-allowed flex items-center gap-3">
                        <i className="bi bi-lock-fill text-xs"></i>
                        {userEmail}
                    </div>
                </div>

                {/* Name Edit */}
                <div>
                    <label className="block font-sans text-xs uppercase tracking-widest text-[#CA9A43] mb-2">
                        Seu Nome Completo
                    </label>
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Como você quer ser chamado?"
                        className="w-full bg-[#051522] border border-white/10 p-4 text-white font-sans focus:border-[#CA9A43] outline-none rounded-sm transition-colors"
                    />
                </div>

                {/* Description Edit */}
                <div>
                    <label className="block font-sans text-xs uppercase tracking-widest text-[#CA9A43] mb-2">
                        Bio / Descrição Curta
                    </label>
                    <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Ex: Fundador da Agência X, Especialista em Vendas..."
                        className="w-full bg-[#051522] border border-white/10 p-4 text-white font-sans focus:border-[#CA9A43] outline-none rounded-sm transition-colors h-24 resize-none"
                    />
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/5">
                    <button 
                        type="button" 
                        onClick={() => setIsProfileModalOpen(false)}
                        className="flex-1 py-3 border border-white/10 text-gray-400 hover:text-white text-sm font-bold uppercase tracking-wider rounded-sm transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        className="flex-1 py-3 bg-[#CA9A43] text-[#031A2B] hover:bg-[#FFE39B] text-sm font-bold uppercase tracking-wider rounded-sm transition-colors shadow-lg shadow-[#CA9A43]/20"
                    >
                        Salvar Alterações
                    </button>
                </div>
            </form>
        </div>
      </Modal>

    </div>
  );
};