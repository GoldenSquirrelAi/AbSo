import React from 'react';
import { X } from 'lucide-react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  children, 
  className = '', 
  variant = 'primary', 
  size = 'md',
  ...props 
}) => {
  const baseStyle = "rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
    secondary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
    danger: "bg-red-500 text-white hover:bg-red-600",
    success: "bg-green-600 text-white hover:bg-green-700"
  };

  return (
    <button className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white border border-slate-200 rounded-xl shadow-sm p-6 ${className} ${onClick ? 'cursor-pointer' : ''}`}>
    {children}
  </div>
);

export const Badge: React.FC<{ status: string }> = ({ status }) => {
  const getColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ready for pickup': return 'bg-amber-100 text-amber-800';
      case 'in transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'claimed': return 'bg-indigo-100 text-indigo-800';
      case 'open': return 'bg-slate-100 text-slate-600';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'exception': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${getColor(status)}`}>
      {status}
    </span>
  );
};

export const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; trend?: string }> = ({ title, value, icon, trend }) => (
    <Card className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm font-medium">{title}</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">{icon}</div>
        </div>
        <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            {trend && <span className="text-green-600 text-sm font-medium">{trend}</span>}
        </div>
    </Card>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }> = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} overflow-hidden animate-scale-in relative my-8`}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const MapPlaceholder: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-100 rounded-xl relative overflow-hidden border border-slate-200 ${className}`}>
    <div className="absolute inset-0 opacity-30" style={{ 
        backgroundImage: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px), radial-gradient(#94a3b8 1.5px, transparent 1.5px)', 
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 10px 10px'
    }}></div>
    
    {/* Simulated Route Path */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.6 }}>
       <path d="M 50 50 Q 150 50 150 150 T 300 200" stroke="#3b82f6" strokeWidth="4" fill="none" strokeDasharray="8 4" />
       <circle cx="50" cy="50" r="6" fill="#3b82f6" />
       <circle cx="300" cy="200" r="6" fill="#ef4444" />
    </svg>
    
    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded shadow text-xs font-medium text-slate-600">
      Map Preview (Simulated)
    </div>
  </div>
);