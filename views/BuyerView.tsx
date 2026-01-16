
import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, MapPin, Star, Plus, Trash2, Copy, AlertCircle, CreditCard, ShieldCheck, ChevronRight, ArrowLeft, Wallet, RotateCcw, Info, X, Check, User, Bell, Settings, History, LayoutDashboard, Mail, Phone, Home, LogOut } from 'lucide-react';
import { Button, Card, Badge, Modal } from '../components/UI';
import { Order, OrderStatus } from '../types';

interface BuyerViewProps {
  orders: Order[];
  onUpdateOrder: (orderId: string, updates: Partial<Order>) => void;
}

const LOCATIONS = [
    { label: 'North Las Vegas Warehouse', address: '4031 Market Center Dr, NLV 89030' },
    { label: 'Nellis Outlet (Meadows Mall)', address: '4300 Meadows Ln, LV 89107' },
    { label: 'Dean Martin Warehouse', address: '3850 S. Valley View Blvd, LV 89103' },
    { label: 'Legacy Bids', address: '10890 S. Eastern Ave, Henderson 89052' },
    { label: 'Wild Finds (Henderson)', address: '1481 W. Warm Springs Rd, Henderson 89014' },
];

const BuyerView: React.FC<BuyerViewProps> = ({ orders, onUpdateOrder }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'profile'>('dashboard');
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  
  // Profile State (Mock)
  const [userProfile, setUserProfile] = useState({
      name: 'Alice Reseller',
      email: 'alice@example.com',
      phone: '(702) 555-0123',
      address: '123 Main St, Las Vegas, NV 89101',
      notifications: {
          sms: true,
          email: true,
          marketing: false
      }
  });
  
  // Wizard State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [newOrderId, setNewOrderId] = useState<string | null>(null);
  
  // Booking Data Form State
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeBlock, setSelectedTimeBlock] = useState(''); // "AM" or "PM"
  const [hasReturns, setHasReturns] = useState(false);
  
  // Item Entry State
  const [savedItems, setSavedItems] = useState<Array<{
      locationIdx: number;
      description: string;
      quantity: number;
      isOversized: boolean;
  }>>([]);
  
  const [currentItem, setCurrentItem] = useState({
      locationIdx: null as number | null,
      description: '',
      quantity: 1,
      isOversized: false
  });

  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Tip State
  const [tipAmount, setTipAmount] = useState(3);
  const [isCustomTipOpen, setIsCustomTipOpen] = useState(false);
  const [customTipInput, setCustomTipInput] = useState('');

  // Return Details
  const [returnDescription, setReturnDescription] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnConfirmed, setReturnConfirmed] = useState(false);

  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'new'>('wallet');

  // Rating State
  const [rating, setRating] = useState(5);
  const [tip, setTip] = useState(5);

  // Timer Logic
  useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (isBookingModalOpen && isTimerRunning && timeLeft > 0 && !bookingSuccess) {
          interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
      }
      return () => clearInterval(interval);
  }, [isBookingModalOpen, isTimerRunning, timeLeft, bookingSuccess]);

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getTotalSteps = () => hasReturns ? 6 : 5;

  const getAllItems = () => {
      const items = [...savedItems];
      if (currentItem.locationIdx !== null && currentItem.description) {
          items.push({
              locationIdx: currentItem.locationIdx,
              description: currentItem.description,
              quantity: currentItem.quantity,
              isOversized: currentItem.isOversized
          });
      }
      return items;
  };

  // Pricing Logic
  const BASE_FEE = 20.00;
  const OVERSIZED_FEE = 25.00;
  const MULTI_LOC_FEE = 10.00;
  const NV_TAX_RATE = 0.0838; // 8.38% Clark County Sales Tax
  
  const calculateTotal = () => {
      const allItems = getAllItems();
      const oversizedCount = allItems.filter(i => i.isOversized).length;
      const oversizedCost = oversizedCount * OVERSIZED_FEE;
      
      // Determine multi-location fee
      const uniqueLocations = new Set(allItems.map(i => i.locationIdx));
      const isMulti = uniqueLocations.size > 1;
      const multiLocCost = isMulti ? MULTI_LOC_FEE : 0;

      const subtotal = BASE_FEE + oversizedCost + multiLocCost;
      const tax = subtotal * NV_TAX_RATE;

      const finalTip = isNaN(tipAmount) ? 0 : tipAmount;

      return {
          base: BASE_FEE,
          oversized: oversizedCost,
          multiLoc: multiLocCost,
          subtotal: subtotal,
          tax: tax,
          tip: finalTip,
          total: subtotal + tax + finalTip
      };
  };

  const handleStartBooking = () => {
      setBookingStep(1);
      setIsTimerRunning(false);
      setTimeLeft(30 * 60);
      setBookingSuccess(false);
      setNewOrderId(null);
      
      // Reset Form
      setSavedItems([]);
      setCurrentItem({ locationIdx: null, description: '', quantity: 1, isOversized: false });
      setSelectedDate('');
      setSelectedTimeBlock('');
      setHasReturns(false);
      setSpecialInstructions('');
      setTipAmount(3);
      setIsCustomTipOpen(false);
      setCustomTipInput('');
      setReturnDescription('');
      setReturnNotes('');
      setReturnConfirmed(false);
      
      setIsBookingModalOpen(true);
  };

  const handleStep1Complete = () => {
      setIsTimerRunning(true); 
      setBookingStep(2);
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setBookingSuccess(false);
    setNewOrderId(null);
    // If successful, switch to dashboard to see new order
    if (bookingSuccess) setActiveTab('dashboard');
  };

  const handleAddAnotherPickup = () => {
      if (currentItem.locationIdx === null || !currentItem.description) return;
      
      setSavedItems([...savedItems, {
          locationIdx: currentItem.locationIdx,
          description: currentItem.description,
          quantity: currentItem.quantity,
          isOversized: currentItem.isOversized
      }]);
      
      setCurrentItem({
          locationIdx: null,
          description: '',
          quantity: 1,
          isOversized: false
      });
  };

  const handleRemoveSavedItem = (index: number) => {
      const newItems = [...savedItems];
      newItems.splice(index, 1);
      setSavedItems(newItems);
  };

  const handleSaveCustomTip = () => {
      const val = parseFloat(customTipInput);
      if (!isNaN(val) && val >= 0) {
          setTipAmount(val);
          setIsCustomTipOpen(false);
      }
  };

  const handleCompleteBooking = () => {
      setIsPaymentProcessing(true);
      setTimeout(() => {
          setIsPaymentProcessing(false);
          
          const allItems = getAllItems();
          const totals = calculateTotal();
          const newOrder: Order = {
              id: `INV-${Math.floor(Math.random() * 10000)}`,
              customerName: userProfile.name,
              auctionHouse: 'Multiple Locations',
              pickupLocation: LOCATIONS[allItems[0]?.locationIdx]?.label || 'Multiple',
              pickupLocations: Array.from(new Set(allItems.map(i => LOCATIONS[i.locationIdx].label))),
              dropoffAddress: userProfile.address,
              items: allItems.map((i, idx) => ({
                  id: `item-${idx}`,
                  title: i.description,
                  lotNumber: 'N/A',
                  dimensions: i.isOversized ? 'Oversized' : 'Standard',
                  quantity: i.quantity,
                  location: LOCATIONS[i.locationIdx].label
              })),
              status: OrderStatus.SCHEDULED,
              scheduledDate: `${selectedDate}, ${selectedTimeBlock}`,
              cost: totals.total,
              specialInstructions: specialInstructions,
              tip: totals.tip,
              isMultiLocation: totals.multiLoc > 0,
              returnDetails: hasReturns ? {
                  hasReturn: true,
                  description: returnDescription,
                  notes: returnNotes,
                  isInitiated: returnConfirmed
              } : undefined
          };
          orders.push(newOrder); 
          
          setNewOrderId(newOrder.id);
          setBookingSuccess(true);
      }, 2000);
  };

  const activeOrders = orders.filter(o => [OrderStatus.SCHEDULED, OrderStatus.READY_FOR_PICKUP, OrderStatus.IN_TRANSIT].includes(o.status));
  const historyOrders = orders.filter(o => o.status === OrderStatus.DELIVERED || o.status === OrderStatus.EXCEPTION);

  // -- Wizard Steps Renderers --
  const renderStep1 = () => (
      <div className="space-y-6 py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4 items-start">
              <AlertCircle className="text-amber-600 shrink-0 mt-1" />
              <div>
                  <h4 className="font-bold text-amber-900">Important: Payment Required</h4>
                  <p className="text-sm text-amber-800">You must pay the auction house directly before we can pick up your items.</p>
              </div>
          </div>

          <ol className="space-y-6 relative border-l-2 border-slate-200 ml-3 pl-8 py-2">
              <li className="relative">
                  <span className="absolute -left-[41px] top-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold">1</span>
                  <p className="font-medium text-slate-900">Log in to the Auction Portal</p>
                  <a href="#" className="text-blue-600 text-sm hover:underline">Go to Nellis Auction Login &rarr;</a>
              </li>
              <li className="relative">
                  <span className="absolute -left-[41px] top-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold">2</span>
                  <p className="font-medium text-slate-900 mb-2">Set Pickup Contact to "AbSo Delivery"</p>
                  <div className="flex gap-2">
                      <code className="bg-slate-100 px-3 py-2 rounded border border-slate-300 font-mono text-sm">AbSo Delivery Service</code>
                      <button className="p-2 text-slate-500 hover:text-slate-700 bg-slate-50 rounded border border-slate-200" title="Copy">
                          <Copy size={16} />
                      </button>
                  </div>
              </li>
              <li className="relative">
                  <span className="absolute -left-[41px] top-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold">3</span>
                  <p className="font-medium text-slate-900">Complete Payment for Items</p>
                  <p className="text-sm text-slate-500">Ensure all invoices are paid in full.</p>
              </li>
          </ol>

          <Button size="lg" className="w-full" onClick={handleStep1Complete}>
              I've Paid at Nellis – Continue <ChevronRight size={20} />
          </Button>
      </div>
  );

  const renderStep2 = () => (
      <div className="space-y-6">
          <div>
              <h3 className="text-lg font-semibold mb-4">When should we deliver?</h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                  {['Tomorrow', 'Sunday', 'Monday'].map(day => (
                      <button 
                        key={day}
                        onClick={() => setSelectedDate(day)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${selectedDate === day ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                          <span className="block">{day}</span>
                      </button>
                  ))}
              </div>
              
              {selectedDate && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in mb-8">
                      <button 
                        onClick={() => setSelectedTimeBlock('AM')}
                        className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${selectedTimeBlock === 'AM' ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                          <div className="text-left">
                              <span className={`block font-bold ${selectedTimeBlock === 'AM' ? 'text-blue-900' : 'text-slate-900'}`}>Morning Block</span>
                              <span className={`text-sm ${selectedTimeBlock === 'AM' ? 'text-blue-700' : 'text-slate-500'}`}>8:00 AM – 1:00 PM</span>
                          </div>
                          {selectedTimeBlock === 'AM' && <CheckCircle className="text-blue-600" />}
                      </button>
                      <button 
                        onClick={() => setSelectedTimeBlock('PM')}
                        className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${selectedTimeBlock === 'PM' ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                          <div className="text-left">
                              <span className={`block font-bold ${selectedTimeBlock === 'PM' ? 'text-blue-900' : 'text-slate-900'}`}>Afternoon Block</span>
                              <span className={`text-sm ${selectedTimeBlock === 'PM' ? 'text-blue-700' : 'text-slate-500'}`}>1:00 PM – 7:00 PM</span>
                          </div>
                          {selectedTimeBlock === 'PM' && <CheckCircle className="text-blue-600" />}
                      </button>
                  </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${hasReturns ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
                         {hasReturns && <RotateCcw size={16} />}
                         <input type="checkbox" className="hidden" checked={hasReturns} onChange={(e) => setHasReturns(e.target.checked)} />
                    </div>
                    <div>
                        <span className="font-medium text-slate-900">I have items to Return</span>
                        <p className="text-xs text-slate-500">We'll pick them up from you during delivery.</p>
                    </div>
                 </label>
              </div>

          </div>
          <div className="flex justify-between pt-4">
               <Button variant="outline" onClick={() => setBookingStep(1)}><ArrowLeft size={18} /> Back</Button>
               <Button disabled={!selectedDate || !selectedTimeBlock} onClick={() => setBookingStep(3)}>
                   Next: Items <ChevronRight size={18} />
               </Button>
          </div>
      </div>
  );

  const renderStep3 = () => {
      const isCurrentValid = currentItem.locationIdx !== null && currentItem.description.length > 0;
      const canProceed = savedItems.length > 0 || isCurrentValid;

      return (
        <div className="space-y-6">
           <div className="flex items-center justify-between">
               <h3 className="text-lg font-semibold">Add Items to Pickup</h3>
               <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                   Invoice #{Math.floor(Math.random() * 1000) + 9000}
               </span>
           </div>

           {savedItems.length > 0 && (
               <div className="space-y-2 mb-4">
                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Items to Pickup</h4>
                   {savedItems.map((item, idx) => (
                       <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                           <div>
                               <div className="flex items-center gap-2">
                                   <span className="font-bold text-blue-900">{item.quantity}x {item.description}</span>
                                   {item.isOversized && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">Oversized</span>}
                               </div>
                               <p className="text-xs text-blue-700 flex items-center gap-1 mt-1">
                                   <MapPin size={12} /> {LOCATIONS[item.locationIdx].label}
                               </p>
                           </div>
                           <button onClick={() => handleRemoveSavedItem(idx)} className="text-blue-400 hover:text-red-500 p-2">
                               <Trash2 size={16} />
                           </button>
                       </div>
                   ))}
               </div>
           )}

           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-5">
               {savedItems.length > 0 && (
                   <h4 className="font-semibold text-slate-900">Add Another Item</h4>
               )}
               
               <div>
                   <label className="block text-sm font-medium text-slate-700 mb-3">Pickup Location</label>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {LOCATIONS.map((loc, idx) => (
                           <label 
                                key={idx} 
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${currentItem.locationIdx === idx ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                               <input 
                                    type="radio" 
                                    name="location" 
                                    className="hidden"
                                    checked={currentItem.locationIdx === idx}
                                    onChange={() => setCurrentItem({...currentItem, locationIdx: idx})}
                               />
                               <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${currentItem.locationIdx === idx ? 'border-white' : 'border-slate-300'}`}>
                                   {currentItem.locationIdx === idx && <div className="w-2 h-2 bg-white rounded-full" />}
                               </div>
                               <span className="text-sm font-medium truncate">{loc.label}</span>
                           </label>
                       ))}
                   </div>
               </div>

               <div className="flex gap-3 items-end">
                   <div className="flex-1">
                       <label className="block text-xs font-medium text-slate-500 mb-1">Item Description</label>
                       <input 
                            type="text" 
                            className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                            placeholder="e.g. Grey Sofa, Box of Books"
                            value={currentItem.description}
                            onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})}
                       />
                   </div>
                   <div className="w-20">
                       <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
                       <input 
                            type="number" 
                            min="1"
                            className="w-full p-2.5 rounded-lg border border-slate-300 text-sm text-center focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                            value={currentItem.quantity}
                            onChange={(e) => setCurrentItem({...currentItem, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
                       />
                   </div>
               </div>

               <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${currentItem.isOversized ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
                            {currentItem.isOversized && <CheckCircle size={14} />}
                        </div>
                        <input type="checkbox" className="hidden" checked={currentItem.isOversized} onChange={(e) => setCurrentItem({...currentItem, isOversized: e.target.checked})} />
                        <span className="text-sm text-slate-700">Oversized Item? (+$25)</span>
                    </label>

                    <button 
                        onClick={handleAddAnotherPickup}
                        disabled={!isCurrentValid}
                        className={`text-sm font-medium flex items-center gap-1 transition-colors ${isCurrentValid ? 'text-blue-600 hover:text-blue-800' : 'text-slate-300 cursor-not-allowed'}`}
                    >
                        <Plus size={16} /> Add another pickup
                    </button>
               </div>
           </div>

           <div className="flex justify-between pt-4">
               <Button variant="outline" onClick={() => setBookingStep(2)}><ArrowLeft size={18} /> Back</Button>
               <Button disabled={!canProceed} onClick={() => setBookingStep(4)}>
                   Next: {hasReturns ? 'Return Details' : 'Review'} <ChevronRight size={18} />
               </Button>
           </div>
        </div>
      );
  };

  const renderStepReturns = () => (
      <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
               <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                   <RotateCcw className="text-blue-600" size={20} />
                   Return Details
               </h3>
               
               <div className="space-y-4">
                   <div>
                       <label className="block text-xs font-medium text-slate-700 mb-1">What are you returning?</label>
                       <input 
                            type="text" 
                            className="w-full p-2 rounded-lg border border-slate-300 text-sm"
                            placeholder="e.g. Damaged Coffee Table"
                            value={returnDescription}
                            onChange={(e) => setReturnDescription(e.target.value)}
                       />
                   </div>
                   <div>
                       <label className="block text-xs font-medium text-slate-700 mb-1">Notes for Driver</label>
                       <textarea 
                            className="w-full p-2 rounded-lg border border-slate-300 text-sm"
                            placeholder="e.g. Item is boxed and ready on porch"
                            rows={3}
                            value={returnNotes}
                            onChange={(e) => setReturnNotes(e.target.value)}
                       />
                   </div>
                   
                   <label className="flex items-start gap-3 cursor-pointer pt-2">
                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${returnConfirmed ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300'}`}>
                             {returnConfirmed && <CheckCircle size={14} />}
                             <input type="checkbox" className="hidden" checked={returnConfirmed} onChange={(e) => setReturnConfirmed(e.target.checked)} />
                        </div>
                        <span className="text-sm text-slate-600">
                            I confirm I have already initiated this return with Nellis Auction and have approval.
                        </span>
                   </label>
               </div>
          </div>

          <div className="flex justify-between pt-4">
               <Button variant="outline" onClick={() => setBookingStep(3)}><ArrowLeft size={18} /> Back</Button>
               <Button disabled={!returnDescription || !returnConfirmed} onClick={() => setBookingStep(hasReturns ? 5 : 6)}>
                   Next: Review <ChevronRight size={18} />
               </Button>
          </div>
      </div>
  );

  const renderStepReview = () => {
      const totals = calculateTotal();
      const prevStep = hasReturns ? 4 : 3;
      const nextStep = hasReturns ? 6 : 5;
      
      return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review & Final Details</h3>
            
            <Card className="bg-slate-50 border-slate-200">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-sm text-slate-500">Delivery Time</p>
                        <p className="font-bold text-slate-900">{selectedDate}, {selectedTimeBlock === 'AM' ? 'Morning (8-1)' : 'Afternoon (1-7)'}</p>
                    </div>
                    <Button variant="outline" className="text-xs h-8 px-2" onClick={() => setBookingStep(2)}>Change</Button>
                </div>
                
                <div className="border-t border-slate-200 pt-4">
                     <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-medium text-slate-500 uppercase">Delivery Address</label>
                        <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-medium">Default Profile</span>
                     </div>
                     <div className="p-2 bg-slate-100 border border-slate-200 rounded text-sm text-slate-600">
                         {userProfile.address}
                     </div>
                </div>

                <div className="mt-4">
                     <label className="block text-xs font-medium text-slate-700 mb-1">Special Instructions (Gate codes, etc.)</label>
                     <textarea 
                        className="w-full p-2 rounded border border-slate-300 text-sm bg-white"
                        placeholder="Enter gate code or parking instructions..."
                        rows={2}
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                     />
                </div>
            </Card>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                     <p className="font-medium text-sm text-slate-900">Add a Tip for the Driver</p>
                     {isCustomTipOpen && (
                         <button onClick={() => setIsCustomTipOpen(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                     )}
                </div>
                
                {isCustomTipOpen ? (
                    <div className="flex gap-2 items-center animate-fade-in">
                        <div className="relative flex-1">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
                             <input 
                                type="number"
                                autoFocus
                                placeholder="Enter amount"
                                className="w-full pl-7 pr-3 py-2 rounded-lg border border-blue-500 ring-1 ring-blue-500 text-sm font-medium focus:outline-none"
                                value={customTipInput}
                                onChange={(e) => setCustomTipInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomTip()}
                             />
                        </div>
                        <Button size="sm" className="bg-blue-600" onClick={handleSaveCustomTip}>
                            <Check size={16} /> Save
                        </Button>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setTipAmount(3)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${tipAmount === 3 ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                        >
                            $3
                        </button>
                        <button 
                            onClick={() => setTipAmount(5)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${tipAmount === 5 ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                        >
                            $5
                        </button>
                        <button 
                            onClick={() => { setIsCustomTipOpen(true); setCustomTipInput(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${tipAmount !== 3 && tipAmount !== 5 && tipAmount !== 0 ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                        >
                            {tipAmount !== 3 && tipAmount !== 5 && tipAmount !== 0 ? `$${tipAmount}` : 'Custom'}
                        </button>
                        <button 
                            onClick={() => setTipAmount(0)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${tipAmount === 0 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'}`}
                        >
                            No Tip
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                    <span>Base Delivery</span>
                    <span>${totals.base.toFixed(2)}</span>
                </div>
                {totals.oversized > 0 && (
                    <div className="flex justify-between text-slate-600">
                        <span>Oversized Items</span>
                        <span>${totals.oversized.toFixed(2)}</span>
                    </div>
                )}
                {totals.multiLoc > 0 && (
                    <div className="flex justify-between text-slate-600">
                        <span>Multi-Location Pickup</span>
                        <span>${totals.multiLoc.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                    <span>Subtotal</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                    <span>Nevada Sales Tax (8.38%)</span>
                    <span>${totals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                    <span>Driver Tip</span>
                    <span>${totals.tip.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-slate-900 border-t border-slate-200 pt-2 mt-2">
                    <span>Total</span>
                    <span>${totals.total.toFixed(2)}</span>
                </div>
            </div>

            <div className="flex justify-between pt-4">
               <Button variant="outline" onClick={() => setBookingStep(prevStep)}><ArrowLeft size={18} /> Back</Button>
               <Button onClick={() => setBookingStep(nextStep)}>
                   Proceed to Payment <ChevronRight size={18} />
               </Button>
            </div>
        </div>
      );
  };

  const renderStepPayment = () => {
     const totals = calculateTotal();
     const stepIndex = hasReturns ? 5 : 4;
     
     return (
      <div className="space-y-8">
          <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Secure Checkout</h3>
              <p className="text-slate-500">Complete your booking for <span className="font-bold text-slate-900">${totals.total.toFixed(2)}</span></p>
          </div>

          <div className="space-y-4">
               <label 
                 className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'wallet' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                 onClick={() => setPaymentMethod('wallet')}
               >
                   <div className="flex items-center gap-4">
                       <div className={`p-2 rounded-lg ${paymentMethod === 'wallet' ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                           <Wallet size={24} />
                       </div>
                       <div>
                           <span className="block font-bold text-slate-900">Saved Wallet</span>
                           <span className="text-sm text-slate-500">Visa ending in 4242</span>
                       </div>
                   </div>
                   <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'wallet' ? 'border-blue-600' : 'border-slate-300'}`}>
                       {paymentMethod === 'wallet' && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                   </div>
               </label>

               <label 
                 className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'new' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                 onClick={() => setPaymentMethod('new')}
               >
                   <div className="flex items-center gap-4">
                       <div className={`p-2 rounded-lg ${paymentMethod === 'new' ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                           <CreditCard size={24} />
                       </div>
                       <div>
                           <span className="block font-bold text-slate-900">New Payment Method</span>
                           <span className="text-sm text-slate-500">Credit/Debit Card</span>
                       </div>
                   </div>
                   <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'new' ? 'border-blue-600' : 'border-slate-300'}`}>
                       {paymentMethod === 'new' && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                   </div>
               </label>
          </div>
          
          {paymentMethod === 'new' && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center text-slate-500 text-sm">
                  [New Card Form Would Appear Here]
              </div>
          )}

          <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
              <ShieldCheck size={14} />
              Payments processed securely
          </div>

          <div className="flex justify-between pt-2">
             <Button variant="outline" onClick={() => setBookingStep(stepIndex)} disabled={isPaymentProcessing}>Back</Button>
             <Button 
                className="w-full ml-4" 
                onClick={handleCompleteBooking} 
                disabled={isPaymentProcessing}
             >
                 {isPaymentProcessing ? 'Processing...' : `Pay $${totals.total.toFixed(2)}`}
             </Button>
          </div>
      </div>
     );
  };

  const renderSuccessStep = () => (
      <div className="text-center py-12 space-y-6 animate-scale-in">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={48} />
          </div>
          <div>
              <h3 className="text-2xl font-bold text-slate-900">Booking Confirmed!</h3>
              <p className="text-slate-500 mt-2">
                  Your order <span className="font-mono font-bold text-slate-900">#{newOrderId}</span> has been scheduled.
              </p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl max-w-sm mx-auto text-sm text-slate-600 border border-slate-200">
              <p>Thank you for using AbSo! A driver will be assigned shortly. You can track the status in your dashboard.</p>
          </div>

          <Button size="lg" onClick={handleCloseBookingModal} className="w-full max-w-xs mx-auto">
              Done & Track Order
          </Button>
      </div>
  );

  // --- Tab Views ---

  const renderDashboard = () => (
      <div className="space-y-8 animate-fade-in">
          <section>
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Truck size={20} className="text-blue-500" />
                  Active Deliveries
                </h2>
             </div>
             
             <div className="grid gap-6">
                {activeOrders.map(order => (
                     <Card key={order.id} className="overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                    <Truck size={24} />
                                </div>
                                <div>
                                     <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900">{order.auctionHouse}</h3>
                                        <Badge status={order.status} />
                                     </div>
                                     <p className="text-sm text-slate-500 mt-0.5">
                                         {order.scheduledDate || 'Scheduled'} • {order.items.length} Item{order.items.length !== 1 && 's'}
                                         {order.isMultiLocation && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Multi-Stop</span>}
                                     </p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Status Stepper (No Map) */}
                        <div className="relative flex items-center justify-between mb-6 px-2">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10"></div>
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 -z-10 transition-all duration-500`} 
                                 style={{ width: order.status === OrderStatus.IN_TRANSIT ? '75%' : order.status === OrderStatus.READY_FOR_PICKUP ? '50%' : '25%' }}></div>
                            
                            {['Scheduled', 'Picked Up', 'On Way', 'Arriving'].map((step, i) => (
                                <div key={step} className="flex flex-col items-center gap-2 bg-white px-2">
                                    <div className={`w-3 h-3 rounded-full ${i <= (order.status === OrderStatus.IN_TRANSIT ? 2 : 1) ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                    <span className="text-xs text-slate-500 hidden md:block">{step}</span>
                                </div>
                            ))}
                        </div>

                        {/* Tracking Info Box */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
                             <div className="bg-blue-100 text-blue-600 p-2 rounded-full shrink-0">
                                 <Phone size={16} />
                             </div>
                             <div>
                                 <h4 className="text-sm font-bold text-slate-900">Tracking Updates Active</h4>
                                 <p className="text-xs text-slate-500 mt-1">
                                     Status notifications will be sent to <span className="font-medium text-slate-700">{userProfile.phone}</span> and <span className="font-medium text-slate-700">{userProfile.email}</span>.
                                 </p>
                                 <p className="text-xs text-slate-400 mt-2">
                                    Check your Profile settings to manage notification preferences.
                                 </p>
                             </div>
                        </div>
                     </Card>
                ))}
                {activeOrders.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500">No active deliveries. Schedule one to get started!</p>
                        <Button className="mt-4" onClick={handleStartBooking}>Schedule Now</Button>
                    </div>
                )}
             </div>
          </section>
      </div>
  );

  const renderHistory = () => (
     <div className="space-y-6 animate-fade-in">
         <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <History size={20} className="text-slate-500" />
            Delivery History
         </h2>
         
         {historyOrders.length === 0 ? (
             <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                 No past orders found.
             </div>
         ) : (
             <div className="space-y-4">
                {historyOrders.map(order => (
                    <Card key={order.id} className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">{order.items.length} Items from {order.auctionHouse}</h4>
                                <p className="text-xs text-slate-500">Delivered on {order.scheduledDate || 'Recent'}</p>
                                <p className="text-xs text-slate-400 mt-1">ID: {order.id}</p>
                            </div>
                        </div>
                        <div>
                            {!order.rating ? (
                                <Button variant="outline" className="text-xs py-1" onClick={() => setRatingOrder(order)}>
                                    Rate & Tip
                                </Button>
                            ) : (
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1 text-yellow-500">
                                        {[...Array(order.rating)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                                    </div>
                                    <span className="text-xs text-slate-400 mt-1">Tip: ${order.tip}</span>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
             </div>
         )}
     </div>
  );

  const renderProfile = () => (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <Card>
              <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-6">
                  <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                      <User size={40} />
                  </div>
                  <div>
                      <h2 className="text-xl font-bold text-slate-900">{userProfile.name}</h2>
                      <p className="text-slate-500">Member since 2024</p>
                  </div>
              </div>

              <div className="space-y-6">
                  <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase mb-3 flex items-center gap-2">
                          <Home size={16} /> Default Address
                      </h3>
                      <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 p-2 border border-slate-300 rounded-lg text-sm text-slate-600"
                            value={userProfile.address}
                            readOnly
                          />
                          <Button variant="outline" size="sm">Edit</Button>
                      </div>
                  </div>

                  <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase mb-3 flex items-center gap-2">
                          <Bell size={16} /> Notification Settings
                      </h3>
                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <label className="flex items-center justify-between cursor-pointer">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded shadow-sm text-blue-600"><Phone size={16} /></div>
                                  <span className="text-sm font-medium text-slate-700">SMS Updates</span>
                              </div>
                              <div className={`w-11 h-6 rounded-full transition-colors relative ${userProfile.notifications.sms ? 'bg-blue-600' : 'bg-slate-300'}`} 
                                   onClick={() => setUserProfile({...userProfile, notifications: {...userProfile.notifications, sms: !userProfile.notifications.sms}})}>
                                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${userProfile.notifications.sms ? 'translate-x-5' : ''}`} />
                              </div>
                          </label>
                          
                          <label className="flex items-center justify-between cursor-pointer">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded shadow-sm text-blue-600"><Mail size={16} /></div>
                                  <span className="text-sm font-medium text-slate-700">Email Updates</span>
                              </div>
                              <div className={`w-11 h-6 rounded-full transition-colors relative ${userProfile.notifications.email ? 'bg-blue-600' : 'bg-slate-300'}`}
                                   onClick={() => setUserProfile({...userProfile, notifications: {...userProfile.notifications, email: !userProfile.notifications.email}})}>
                                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${userProfile.notifications.email ? 'translate-x-5' : ''}`} />
                              </div>
                          </label>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 ml-1">
                          We will send tracking links and delivery confirmation photos to these channels.
                      </p>
                  </div>
                  
                  <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase mb-3 flex items-center gap-2">
                          <Wallet size={16} /> Payment Methods
                      </h3>
                      <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-6 bg-slate-800 rounded text-white text-[10px] flex items-center justify-center font-bold">VISA</div>
                              <span className="text-sm font-medium text-slate-700">•••• 4242</span>
                          </div>
                          <button className="text-xs text-red-500 hover:underline">Remove</button>
                      </div>
                      <Button variant="outline" size="sm" className="mt-2 w-full border-dashed">
                          + Add New Card
                      </Button>
                  </div>
              </div>
          </Card>
      </div>
  );

  // -- Main Render --
  return (
    <div className="max-w-5xl mx-auto pb-20">
      
      {/* Dashboard Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
          <p className="text-slate-500">Welcome back, {userProfile.name}</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={handleStartBooking} className="shadow-lg shadow-blue-200">
                <Plus size={18} /> Schedule Delivery
            </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'dashboard' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
          >
              <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'history' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
          >
              <History size={18} /> History
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'profile' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
          >
              <Settings size={18} /> Profile & Settings
          </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'profile' && renderProfile()}
      </div>

      {/* Modals */}
      <Modal isOpen={!!ratingOrder} onClose={() => setRatingOrder(null)} title="Rate Your Delivery">
          <div className="text-center space-y-6">
               <p className="text-slate-600">How was your delivery from {ratingOrder?.auctionHouse}?</p>
               <div className="flex justify-center gap-2">
                   {[1, 2, 3, 4, 5].map(star => (
                       <button key={star} onClick={() => setRating(star)} className="text-yellow-400 hover:scale-110 transition-transform">
                           <Star size={32} fill={star <= rating ? "currentColor" : "none"} />
                       </button>
                   ))}
               </div>
               
               <div className="bg-slate-50 p-4 rounded-lg text-left">
                   <label className="block text-sm font-medium text-slate-700 mb-2">Add a Tip (100% goes to driver)</label>
                   <div className="flex gap-2">
                       {[2, 5, 10].map(amt => (
                           <button 
                             key={amt} 
                             onClick={() => setTip(amt)}
                             className={`flex-1 py-2 rounded-lg text-sm font-medium border ${tip === amt ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300'}`}
                           >
                               ${amt}
                           </button>
                       ))}
                   </div>
               </div>

               <Button onClick={() => {
                    if(ratingOrder) {
                        onUpdateOrder(ratingOrder.id, { rating, tip });
                        setRatingOrder(null);
                        alert(`Thank you! A $${tip} tip has been sent to your driver.`);
                    }
               }} className="w-full">Submit Feedback</Button>
          </div>
      </Modal>

      <Modal isOpen={isBookingModalOpen} onClose={handleCloseBookingModal} title={bookingSuccess ? 'Success' : `Schedule Delivery (Step ${bookingStep}/${getTotalSteps()})`} maxWidth="max-w-3xl">
          {!bookingSuccess && (
              <div className="mb-6">
                 <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(bookingStep / getTotalSteps()) * 100}%` }}></div>
                 </div>
                 {bookingStep > 1 && (
                     <div className="flex justify-end mt-2">
                         <span className={`text-xs font-mono font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                            Time Remaining: {formatTime(timeLeft)}
                         </span>
                     </div>
                 )}
              </div>
          )}

          {!bookingSuccess ? (
            <>
              {bookingStep === 1 && renderStep1()}
              {bookingStep === 2 && renderStep2()}
              {bookingStep === 3 && renderStep3()}
              {bookingStep === 4 && (hasReturns ? renderStepReturns() : renderStepReview())}
              {bookingStep === 5 && (hasReturns ? renderStepReview() : renderStepPayment())}
              {bookingStep === 6 && hasReturns && renderStepPayment()}
            </>
          ) : (
              renderSuccessStep()
          )}
      </Modal>

    </div>
  );
};

export default BuyerView;
