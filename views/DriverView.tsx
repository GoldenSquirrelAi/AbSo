import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, DollarSign, Navigation, CheckSquare, ChevronRight, ArrowRight, HelpCircle, Camera } from 'lucide-react';
import { Button, Card, Badge, MapPlaceholder, Modal } from '../components/UI';
import { DriverBlock, OrderStatus } from '../types';
import { analyzeBlockEfficiency, generateSupportSuggestion } from '../services/geminiService';
import { Order } from '../types';

interface DriverViewProps {
  blocks: DriverBlock[];
  orders: Order[];
  onClaimBlock: (blockId: string) => void;
  onUpdateOrder: (orderId: string, updates: Partial<Order>) => void;
  onUpdateBlock: (blockId: string, updates: Partial<DriverBlock>) => void;
}

const DriverView: React.FC<DriverViewProps> = ({ blocks, orders, onClaimBlock, onUpdateOrder, onUpdateBlock }) => {
  const [activeTab, setActiveTab] = useState<'available' | 'my_blocks'>('available');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  
  // Support Modal
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportIssue, setSupportIssue] = useState('');
  const [aiSupportResponse, setAiSupportResponse] = useState('');

  const availableBlocks = blocks.filter(b => b.status === 'open');
  const myBlocks = blocks.filter(b => b.status === 'claimed' || b.status === 'active');

  const activeBlock = myBlocks.find(b => b.id === activeBlockId);

  // Simulate getting AI insight when a block is selected
  useEffect(() => {
    if (selectedBlockId) {
        const block = blocks.find(b => b.id === selectedBlockId);
        if (block) {
            setAiInsight("Analyzing route efficiency...");
            analyzeBlockEfficiency(block, orders).then(insight => {
                setAiInsight(insight || "Route optimized for density.");
            });
        }
    } else {
        setAiInsight(null);
    }
  }, [selectedBlockId, blocks, orders]);

  const handleStartBlock = (blockId: string) => {
      setActiveBlockId(blockId);
      onUpdateBlock(blockId, { status: 'active', currentStepIndex: 0 });
  };

  const handleSupportSubmit = async () => {
      if (!supportIssue) return;
      const resolution = await generateSupportSuggestion(supportIssue, 'driver');
      setAiSupportResponse(resolution);
  };

  // --- Active Block Execution Render ---
  if (activeBlockId && activeBlock) {
      const blockOrders = orders.filter(o => activeBlock.orderIds.includes(o.id));
      
      return (
          <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-xl">
                  <div>
                      <h2 className="font-bold text-lg">Active Route: {activeBlock.region}</h2>
                      <p className="text-slate-400 text-sm">Estimated Earnings: ${activeBlock.totalPay}</p>
                  </div>
                  <Button variant="danger" className="text-xs py-1" onClick={() => setActiveBlockId(null)}>Exit Route Mode</Button>
              </div>

              <div className="grid gap-4">
                  {blockOrders.map((order, index) => (
                      <Card key={order.id} className={`border-l-4 ${order.status === OrderStatus.DELIVERED ? 'border-l-green-500 opacity-60' : 'border-l-blue-500'}`}>
                          <div className="flex justify-between items-start">
                              <div>
                                  <Badge status={order.status} />
                                  <h3 className="font-bold text-lg mt-2">{order.dropoffAddress}</h3>
                                  <p className="text-slate-500 text-sm">Customer: {order.customerName}</p>
                                  <p className="text-slate-500 text-sm mt-1">{order.items.length} Items (Invoice #{order.id.slice(-4)})</p>
                              </div>
                              <div className="text-right space-y-2">
                                  {order.status === OrderStatus.SCHEDULED && (
                                      <Button variant="primary" className="w-full text-sm" onClick={() => onUpdateOrder(order.id, { status: OrderStatus.IN_TRANSIT })}>
                                          <Navigation size={16} /> Start Delivery
                                      </Button>
                                  )}
                                  {order.status === OrderStatus.IN_TRANSIT && (
                                      <Button variant="success" className="w-full text-sm" onClick={() => onUpdateOrder(order.id, { status: OrderStatus.DELIVERED })}>
                                          <Camera size={16} /> Complete (Photo)
                                      </Button>
                                  )}
                              </div>
                          </div>
                      </Card>
                  ))}
              </div>
              
              <MapPlaceholder className="h-64 w-full shadow-md" />
              
              <Button variant="outline" className="w-full" onClick={() => setSupportModalOpen(true)}>
                  <HelpCircle size={18} /> Report Issue / Support
              </Button>

              {/* Support Modal */}
              <Modal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} title="Driver Support">
                  <div className="space-y-4">
                      <textarea 
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm"
                        rows={4}
                        placeholder="Describe the issue (e.g., Gate code incorrect, Item damaged)..."
                        value={supportIssue}
                        onChange={(e) => setSupportIssue(e.target.value)}
                      ></textarea>
                      {aiSupportResponse && (
                          <div className="bg-blue-50 p-3 rounded-lg text-blue-800 text-sm border border-blue-100">
                              <strong>Suggested Action:</strong> {aiSupportResponse}
                          </div>
                      )}
                      <div className="flex gap-2">
                          <Button className="flex-1" onClick={handleSupportSubmit}>Submit Ticket</Button>
                          <Button variant="outline" className="flex-1" onClick={() => setSupportModalOpen(false)}>Close</Button>
                      </div>
                  </div>
              </Modal>
          </div>
      );
  }

  // --- Standard Dashboard Render ---
  return (
    <div className="max-w-md mx-auto md:max-w-5xl space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 text-white p-4 rounded-xl">
              <span className="text-slate-400 text-xs uppercase font-bold">Today's Earnings</span>
              <div className="text-2xl font-bold mt-1">$145.00</div>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl">
              <span className="text-slate-500 text-xs uppercase font-bold">Driver Score</span>
              <div className="text-2xl font-bold mt-1 text-green-600">4.9 ⭐</div>
          </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-3 font-medium text-sm ${activeTab === 'available' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
          >
              Available Blocks
          </button>
          <button 
            onClick={() => setActiveTab('my_blocks')}
            className={`flex-1 py-3 font-medium text-sm ${activeTab === 'my_blocks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
          >
              My Schedule
          </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
         {activeTab === 'available' && (
             availableBlocks.map(block => (
                 <Card key={block.id} className="border-l-4 border-l-blue-500">
                     <div className="flex justify-between items-start mb-3">
                         <div>
                            <h3 className="font-bold text-slate-900 text-lg">{block.region} Route</h3>
                            <div className="flex items-center text-slate-500 text-sm mt-1">
                                <Calendar size={14} className="mr-1" />
                                {block.startTime} - {block.endTime}
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="text-xl font-bold text-slate-900">${block.totalPay}</div>
                            <span className="text-xs text-slate-400">Est. Pay</span>
                         </div>
                     </div>
                     
                     <div className="bg-slate-50 p-3 rounded-lg mb-4">
                         <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                             <MapPin size={16} className="text-slate-400" />
                             <span className="font-semibold">{block.orderIds.length} Pickups</span>
                             <span className="text-slate-400">•</span>
                             <span>Nellis Auction, Henderson</span>
                         </div>
                         <div className="flex items-center gap-2 text-sm text-slate-700">
                             <Navigation size={16} className="text-slate-400" />
                             <span className="font-semibold">Est. Distance</span>
                             <span className="text-slate-400">•</span>
                             <span>24 miles</span>
                         </div>
                     </div>

                     {selectedBlockId === block.id ? (
                        <div className="mb-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                             <p className="text-xs text-indigo-800 italic">
                                ✨ {aiInsight || "Loading AI insights..."}
                             </p>
                        </div>
                     ) : null}

                     <div className="flex gap-3">
                        <Button 
                            variant="outline" 
                            className="flex-1 text-sm"
                            onClick={() => setSelectedBlockId(selectedBlockId === block.id ? null : block.id)}
                        >
                            {selectedBlockId === block.id ? 'Hide Details' : 'View Route'}
                        </Button>
                        <Button 
                            className="flex-1 text-sm"
                            onClick={() => onClaimBlock(block.id)}
                        >
                            Claim Block
                        </Button>
                     </div>
                 </Card>
             ))
         )}

         {activeTab === 'my_blocks' && (
             myBlocks.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    <p>You haven't claimed any blocks yet.</p>
                </div>
             ) : (
                 myBlocks.map(block => (
                    <Card key={block.id} className="relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                             <div>
                                 <h3 className="font-bold text-slate-900">{block.region}</h3>
                                 <p className="text-sm text-slate-600">{block.startTime} - {block.endTime}</p>
                             </div>
                             <Badge status={block.status} />
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            {orders.filter(o => block.orderIds.includes(o.id)).map((order, idx) => (
                                <div key={order.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                    <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-900">{order.dropoffAddress}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {block.status === 'claimed' && (
                             <Button className="w-full" onClick={() => handleStartBlock(block.id)}>
                                 Start Route <ArrowRight size={16} />
                             </Button>
                        )}
                         {block.status === 'active' && (
                             <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleStartBlock(block.id)}>
                                 Continue Route <Navigation size={16} />
                             </Button>
                        )}
                    </Card>
                 ))
             )
         )}
      </div>
    </div>
  );
};

export default DriverView;