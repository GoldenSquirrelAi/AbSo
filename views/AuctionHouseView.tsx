import React, { useState } from 'react';
import { Package, Search, CheckCircle, AlertTriangle, Clock, User } from 'lucide-react';
import { Card, Badge, Button } from '../components/UI';
import { Order, OrderStatus } from '../types';

interface AuctionHouseViewProps {
  orders: Order[];
  onUpdateOrder: (orderId: string, updates: Partial<Order>) => void;
}

const AuctionHouseView: React.FC<AuctionHouseViewProps> = ({ orders, onUpdateOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<'pickups' | 'inventory'>('pickups');

  // Filter for orders relevant to this "Location" (Mocked as generic)
  const pickupsToday = orders.filter(o => 
    (o.status === OrderStatus.SCHEDULED || o.status === OrderStatus.IN_TRANSIT || o.status === OrderStatus.READY_FOR_PICKUP) 
  );

  const filteredPickups = pickupsToday.filter(o => 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
       <header className="flex justify-between items-center py-4 border-b border-slate-200">
           <div>
               <h1 className="text-2xl font-bold text-slate-900">Nellis Auction (Henderson)</h1>
               <p className="text-slate-500">Partner Portal • Today's Pickups</p>
           </div>
           <div className="flex gap-2">
               <Button variant="outline">Export Manifest</Button>
               <Button variant="primary">Report Issue</Button>
           </div>
       </header>

       {/* KPI Cards */}
       <div className="grid grid-cols-4 gap-4">
           <Card className="bg-blue-50 border-blue-100">
               <span className="text-blue-600 text-sm font-bold uppercase">Scheduled Today</span>
               <div className="text-3xl font-bold text-slate-900 mt-1">{pickupsToday.length}</div>
           </Card>
           <Card className="bg-amber-50 border-amber-100">
               <span className="text-amber-600 text-sm font-bold uppercase">Pending Handoff</span>
               <div className="text-3xl font-bold text-slate-900 mt-1">{pickupsToday.filter(o => o.status !== OrderStatus.IN_TRANSIT).length}</div>
           </Card>
           <Card className="bg-green-50 border-green-100">
               <span className="text-green-600 text-sm font-bold uppercase">Drivers En Route</span>
               <div className="text-3xl font-bold text-slate-900 mt-1">{pickupsToday.filter(o => o.status === OrderStatus.IN_TRANSIT).length}</div>
           </Card>
           <Card className="bg-slate-50 border-slate-100">
               <span className="text-slate-500 text-sm font-bold uppercase">Items Cleared</span>
               <div className="text-3xl font-bold text-slate-900 mt-1">142</div>
           </Card>
       </div>

       {/* Search & Filter */}
       <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
               <input 
                  type="text" 
                  placeholder="Search Invoice # or Buyer Name..." 
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
           </div>
           <div className="flex gap-2">
               <button className="px-4 py-2 rounded-lg bg-slate-100 font-medium text-slate-600 hover:bg-slate-200">All</button>
               <button className="px-4 py-2 rounded-lg bg-transparent font-medium text-slate-500 hover:bg-slate-50">En Route</button>
               <button className="px-4 py-2 rounded-lg bg-transparent font-medium text-slate-500 hover:bg-slate-50">Ready</button>
           </div>
       </div>

       {/* Pickup List */}
       <div className="space-y-4">
           {filteredPickups.length === 0 ? (
               <div className="text-center py-12 text-slate-400">No pickups matching your search.</div>
           ) : (
               filteredPickups.map(order => (
                   <Card key={order.id} className="flex items-center justify-between hover:shadow-md transition-shadow">
                       <div className="flex items-center gap-6">
                           <div className={`p-3 rounded-xl ${order.status === OrderStatus.IN_TRANSIT ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                               <Package size={24} />
                           </div>
                           <div>
                               <div className="flex items-center gap-3 mb-1">
                                   <h3 className="font-bold text-lg text-slate-900">{order.id}</h3>
                                   <Badge status={order.status} />
                                   {order.status === OrderStatus.IN_TRANSIT && (
                                       <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                                           <Clock size={12} /> Driver 5 min away
                                       </span>
                                   )}
                               </div>
                               <div className="flex gap-4 text-sm text-slate-500">
                                   <span className="flex items-center gap-1"><User size={14} /> {order.customerName}</span>
                                   <span>•</span>
                                   <span>{order.items.length} Items (Lot: {order.items.map(i => i.lotNumber).join(', ')})</span>
                               </div>
                           </div>
                       </div>

                       <div className="flex items-center gap-3">
                           {order.status === OrderStatus.SCHEDULED && (
                               <Button onClick={() => onUpdateOrder(order.id, { status: OrderStatus.READY_FOR_PICKUP })}>
                                   Mark Ready
                               </Button>
                           )}
                           {order.status === OrderStatus.READY_FOR_PICKUP && (
                               <div className="text-amber-600 font-medium text-sm flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-lg">
                                   <CheckCircle size={16} /> Staged in Zone B
                               </div>
                           )}
                           {order.status === OrderStatus.IN_TRANSIT && (
                               <Button variant="success" onClick={() => onUpdateOrder(order.id, { status: OrderStatus.DELIVERED })}>
                                   Confirm Handoff
                               </Button>
                           )}
                           <button className="p-2 text-slate-400 hover:text-slate-600">
                               <AlertTriangle size={20} />
                           </button>
                       </div>
                   </Card>
               ))
           )}
       </div>
    </div>
  );
};

export default AuctionHouseView;