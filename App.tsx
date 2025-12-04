import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ModulesOverview } from './components/ModulesOverview';
import { ImportantInfo } from './components/ImportantInfo';
import { GoalSection } from './components/GoalSection';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';

interface UserData {
  name: string;
  email: string;
  description?: string;
}

function App() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  // Estado para lembrar qual módulo o usuário queria acessar
  const [targetModule, setTargetModule] = useState<string>('mentor');
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user came from Admin login url param (simple demo trick) or similar
    // For now, it is handled via Login Modal callback
  }, []);

  const handleLoginSuccess = (data: UserData) => {
    setUserData({ ...data, description: '' }); 
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
    setIsAdmin(false);
  };

  const handleAdminAccess = () => {
      setIsAuthenticated(true);
      setIsAdmin(true);
      setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserData(null);
    setIsAdmin(false);
    setTargetModule('mentor'); 
  };

  const handleUpdateProfile = (data: { name: string; description: string }) => {
    if (userData) {
      setUserData({
        ...userData,
        name: data.name,
        description: data.description
      });
    }
  };

  const openLoginForModule = (moduleId: string) => {
    setTargetModule(moduleId);
    setIsLoginModalOpen(true);
  };

  if (isAuthenticated && isAdmin) {
      return <AdminPanel onLogout={handleLogout} />;
  }

  if (isAuthenticated && userData) {
    return (
      <Dashboard 
        userEmail={userData.email} 
        userName={userData.name}
        userDescription={userData.description || ''}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
        initialModule={targetModule}
      />
    );
  }

  return (
    <div className="min-h-screen bg-prosperus-navy text-white selection:bg-prosperus-gold selection:text-prosperus-navy-dark" id="hero">
      {/* Área do Membro agora vai para 'overview' (Dashboard) */}
      <Header 
        onOpenLogin={() => openLoginForModule('overview')} 
        onOpenAdmin={handleAdminAccess}
      />
      <main>
        {/* Começar Diagnóstico agora vai para 'overview' (Dashboard) */}
        <Hero onStartDiagnosis={() => openLoginForModule('overview')} />
        <ImportantInfo />
        {/* Módulos individuais continuam enviando seus IDs, a lógica de redirecionamento fica no Dashboard */}
        <ModulesOverview onStartModule={openLoginForModule} />
        <GoalSection />
      </main>
      <Footer />
      
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLoginSuccess={handleLoginSuccess}
        onAdminAccess={handleAdminAccess}
      />
    </div>
  );
}

export default App;