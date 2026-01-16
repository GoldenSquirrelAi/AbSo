
import React from 'react';
import { Package, ArrowRight, ShieldCheck, Zap, Truck } from 'lucide-react';
import { UserRole } from '../types';

interface LandingProps {
  onLogin: (role: UserRole) => void;
}

const Landing: React.FC<LandingProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-slate-900 py-24 sm:py-32">
         <div className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center"></div>
         <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
            <div className="mx-auto max-w-2xl">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                    Auction Delivery, <span className="text-blue-400">Simplified.</span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-300">
                    AbSo is the Uber for auction pickups. We orchestrate block-scheduled, AI-optimized deliveries for buyers, drivers, and auction houses.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <button onClick={() => onLogin('buyer')} className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                        I'm a Buyer
                    </button>
                    <button onClick={() => onLogin('driver')} className="text-sm font-semibold leading-6 text-white hover:text-blue-300">
                        Drive for AbSo <span aria-hidden="true">→</span>
                    </button>
                </div>
            </div>
         </div>
      </div>

      {/* Features Grid */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
             <div className="flex flex-col items-start">
                 <div className="rounded-lg bg-blue-50 p-3 text-blue-600 mb-4">
                     <Package size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900">Batch Scheduling</h3>
                 <p className="mt-2 text-slate-600">No more individual courier calls. Import your auction invoice and schedule all items in one click.</p>
             </div>
             <div className="flex flex-col items-start">
                 <div className="rounded-lg bg-blue-50 p-3 text-blue-600 mb-4">
                     <Zap size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900">Smart Routing</h3>
                 <p className="mt-2 text-slate-600">Our AI builds efficient "blocks" for drivers, ensuring reliability and speed for your delivery.</p>
             </div>
             <div className="flex flex-col items-start">
                 <div className="rounded-lg bg-blue-50 p-3 text-blue-600 mb-4">
                     <ShieldCheck size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900">Verified Ops</h3>
                 <p className="mt-2 text-slate-600">Real-time tracking, photo proof of delivery, and direct integration with major auction houses.</p>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Landing;
