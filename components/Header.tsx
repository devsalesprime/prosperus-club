import React from 'react';
import { Logo } from './ui/Logo';
import { Button } from './ui/Button';

interface HeaderProps {
  onOpenLogin: () => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenLogin, onOpenAdmin }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B1426] backdrop-blur-md border-b border-white/5">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="w-32 h-32 md:w-40 md:h-40 mobile-logo" />
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          {onOpenAdmin && (
            <button 
                onClick={onOpenAdmin}
                className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-[#CA9A43] transition-colors"
            >
                Área do Admin
            </button>
          )}
          <Button 
            variant="outline" 
            className="!py-2 !px-4 md:!px-6 !text-[10px] md:!text-xs whitespace-nowrap" 
            onClick={onOpenLogin}
          >
            Área do Membro
          </Button>
        </div>
      </div>
    </header>
  );
};