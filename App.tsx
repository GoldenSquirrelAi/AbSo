
import React, { useState, useEffect } from 'react';
import { UserRole, Order, DriverBlock, User, OrderStatus } from './types';
import Landing from './views/Landing';
import BuyerView from './views/BuyerView';
import DriverView from './views/DriverView';
import AdminView from './views/AdminView';
import AuctionHouseView from './views/AuctionHouseView';
import { Package, LogOut, Menu, X, Loader2, WifiOff } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

// --- Client-Side Fallback Data (Last Resort if Server Down) ---
const FALLBACK_DATA = {
    orders: [
        {
            id: 'OFFLINE-DEMO',
            customerName: 'Demo Buyer',
            auctionHouse: 'Nellis Auction (Demo)',
            pickupLocation: 'Nellis Auction (NLV)',
            dropoffAddress: '123 Las Vegas Blvd S, Las Vegas, NV',
            items: [{ id: 'i1', title: 'Demo Sofa', lotNumber: '101', dimensions: 'Oversized', quantity: 1 }],
            status: 'Scheduled' as OrderStatus,
            cost: 45.00,
            coordinates: { lat: 36.1699, lng: -115.1398 },
            scheduledDate: 'Tomorrow, Morning Block'
        }
    ] as Order[],
    blocks: [
        {
            id: 'BLK-OFFLINE',
            startTime: '08:00 AM',
            endTime: '12:00 PM',
            region: 'Demo Region',
            totalPay: 85.00,
            status: 'open',
            orderIds: ['OFFLINE-DEMO'],
            routeEfficiency: 95
        }
    ] as DriverBlock[],
    users: [] as User[]
};

const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('guest');
  const [orders, setOrders] = useState<Order[]>([]);
  const [blocks, setBlocks] = useState<DriverBlock[]>([]);
  const [users, setUsers] = useState<User[]>([]); // Real users from CSV
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // --- Data Fetching ---
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        const [ordersRes, blocksRes, usersRes] = await Promise.all([
            fetch(`${API_URL}/orders`),
            fetch(`${API_URL}/blocks`),
            fetch(`${API_URL}/users`)
        ]);

        if (!ordersRes.ok || !blocksRes.ok) throw new Error("Backend connection unstable.");

        const ordersData = await ordersRes.json();
        const blocksData = await blocksRes.json();
        const usersData = await usersRes.json();

        setOrders(ordersData);
        setBlocks(blocksData);
        setUsers(usersData);
        setIsOffline(false);
    } catch (err) {
        console.error("API Error:", err);
        setError("Could not connect to backend server. Loaded Client-Side Demo Data.");
        setIsOffline(true);
        
        // Critical Fix: Load Fallback Data instead of showing blank screen
        setOrders(FALLBACK_DATA.orders);
        setBlocks(FALLBACK_DATA.blocks);
        setUsers(FALLBACK_DATA.users);
    } finally {
        setLoading(false);
    }
  };

  // Load data on mount and when role changes (to refresh)
  useEffect(() => {
      if (currentRole !== 'guest') {
          fetchData();
      }
  }, [currentRole]);

  // --- Actions ---

  const handleLogin = (role: UserRole) => {
    setCurrentRole(role);
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    setCurrentRole('guest');
    setMobileMenuOpen(false);
  };

  // Sync updates to backend
  const handleUpdateOrder = async (orderId: string, updates: Partial<Order>) => {
    // Optimistic UI Update
    const updatedOrder = orders.find(o => o.id === orderId);
    if (!updatedOrder) return;

    const newOrderState = { ...updatedOrder, ...updates };
    
    setOrders(prev => prev.map(o => o.id === orderId ? newOrderState : o));

    if (isOffline) return;

    try {
        await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrderState)
        });
    } catch (e) {
        console.error("Failed to sync update", e);
    }
  };

  const handleUpdateBlock = async (blockId: string, updates: Partial<DriverBlock>) => {
      const updatedBlock = blocks.find(b => b.id === blockId);
      if (!updatedBlock) return;

      const newBlockState = { ...updatedBlock, ...updates };

      setBlocks(prev => prev.map(b => b.id === blockId ? newBlockState : b));

      if (isOffline) return;

      try {
          await fetch(`${API_URL}/blocks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newBlockState)
          });
      } catch (e) {
          console.error("Failed to sync block update", e);
      }
  };

  const handleClaimBlock = (blockId: string) => {
    handleUpdateBlock(blockId, { status: 'claimed', driverId: 'CURRENT_USER' });
  };

  const handleAddBlocks = async (newBlocks: DriverBlock[]) => {
      setBlocks(prev => [...prev, ...newBlocks]);
      if (isOffline) return;
      
      // Sync all new blocks
      for (const block of newBlocks) {
          await fetch(`${API_URL}/blocks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(block)
          });
      }
  };

  const handleAddOrders = async (newOrders: Order[]) => {
      setOrders(prev => [...prev, ...newOrders]);
      if (isOffline) return;

      for (const order of newOrders) {
          await fetch(`${API_URL}/orders`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(order)
          });
      }
  };

  const handleSeedDatabase = async () => {
      setLoading(true);
      try {
          const res = await fetch(`${API_URL}/admin/seed-orders`, { method: 'POST' });
          const data = await res.json();
          alert(data.message || data.error);
          if (!data.error) fetchData(); // Refresh
      } catch (e) {
          alert("Seeding failed or offline.");
      } finally {
          setLoading(false);
      }
  };

  // --- Navigation Component ---
  const Navbar = () => (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <div className="flex items-center cursor-pointer shrink-0" onClick={() => handleLogin('guest')}>
            <div className="bg-slate-900 p-2 rounded-lg mr-2">
                <Package className="text-white h-5 w-5" />
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight hidden sm:block">AbSo</span>
            {isOffline && (
                <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                    <WifiOff size={10} /> <span className="hidden sm:inline">Offline</span>
                </span>
            )}
            {!isOffline && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full hidden sm:inline-block">Live Mode</span>}
          </div>
          
          {/* Persona Switcher (Desktop) */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg mx-4">
             {[
                 { id: 'buyer', label: 'Buyer' },
                 { id: 'driver', label: 'Driver' },
                 { id: 'admin', label: 'Admin' },
                 { id: 'auction_admin', label: 'Partner' }
             ].map(role => (
                 <button
                    key={role.id}
                    onClick={() => handleLogin(role.id as UserRole)}
                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${
                        currentRole === role.id 
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                 >
                    {role.label}
                 </button>
             ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
             {currentRole !== 'guest' && (
                <button 
                  onClick={handleLogout}
                  className="text-sm font-medium text-slate-500 hover:text-red-600 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline">Exit</span>
                </button>
             )}

             {/* Mobile Menu Toggle */}
             <div className="flex md:hidden items-center ml-2">
                  <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                      {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                  </button>
             </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-2 shadow-lg absolute w-full left-0 z-50">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Persona</p>
               {[
                   { id: 'buyer', label: 'Buyer Portal' },
                   { id: 'driver', label: 'Driver App' },
                   { id: 'admin', label: 'AbSo Admin' },
                   { id: 'auction_admin', label: 'Auction Partner' }
               ].map(role => (
                   <button
                       key={role.id}
                       onClick={() => handleLogin(role.id as UserRole)}
                       className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                           currentRole === role.id 
                           ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' 
                           : 'text-slate-700 hover:bg-slate-50'
                       }`}
                   >
                       {role.label}
                       {currentRole === role.id && <div className="w-2 h-2 rounded-full bg-blue-600"></div>}
                   </button>
               ))}
               
               {currentRole !== 'guest' && (
                   <div className="pt-2 mt-2 border-t border-slate-100">
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Exit Demo
                      </button>
                   </div>
               )}
          </div>
      )}
    </nav>
  );

  // --- Main Layout ---
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      
      <main className={`flex-grow ${currentRole !== 'guest' ? 'bg-slate-50 py-8 px-4' : ''}`}>
        {currentRole === 'guest' && <Landing onLogin={handleLogin} />}
        
        {loading && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Syncing with Logistics Core...</p>
            </div>
        )}

        {isOffline && currentRole !== 'guest' && (
             <div className="max-w-4xl mx-auto mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-center gap-3 text-sm">
                <WifiOff size={16} />
                <span><strong>Server Unreachable.</strong> Using Client-Side Demo Data. Changes will not be saved.</span>
            </div>
        )}
        
        {currentRole === 'buyer' && (
          <BuyerView orders={orders} onUpdateOrder={handleUpdateOrder} />
        )}
        
        {currentRole === 'driver' && (
          <DriverView 
            blocks={blocks} 
            orders={orders} 
            onClaimBlock={handleClaimBlock} 
            onUpdateOrder={handleUpdateOrder}
            onUpdateBlock={handleUpdateBlock}
          />
        )}
        
        {currentRole === 'admin' && (
          <AdminView 
            orders={orders} 
            blocks={blocks} 
            users={users}
            onAddBlocks={handleAddBlocks}
            onAddOrders={handleAddOrders}
            onSeedDatabase={handleSeedDatabase}
          />
        )}
        
        {currentRole === 'auction_admin' && (
            <AuctionHouseView orders={orders} onUpdateOrder={handleUpdateOrder} />
        )}
      </main>

      {currentRole !== 'guest' && (
        <footer className="bg-white border-t border-slate-200 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-slate-400 text-sm">© 2024 AbSo Logistics MVP. {isOffline ? 'Offline Mode' : 'Connected to Couchbase Capella'}.</p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
