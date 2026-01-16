
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Package, Truck, AlertCircle, Sparkles, Zap, Database, Map as MapIcon, Navigation, Upload, FlaskConical, X, Star, Phone, Mail } from 'lucide-react';
import { Card, StatCard, Badge, Button, Modal } from '../components/UI';
import { Order, DriverBlock, OrderStatus, User as AppUser } from '../types';
import { generateDailyOpsReport } from '../services/geminiService';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import * as L from 'leaflet';

interface AdminViewProps {
  orders: Order[];
  blocks: DriverBlock[];
  users?: AppUser[];
  onAddBlocks: (newBlocks: DriverBlock[]) => void;
  onAddOrders: (newOrders: Order[]) => void;
  onSeedDatabase?: () => void;
}

const data = [
  { name: 'Mon', pickups: 45, drivers: 12 },
  { name: 'Tue', pickups: 52, drivers: 15 },
  { name: 'Wed', pickups: 38, drivers: 10 },
  { name: 'Thu', pickups: 65, drivers: 18 },
  { name: 'Fri', pickups: 89, drivers: 24 },
  { name: 'Sat', pickups: 120, drivers: 30 },
  { name: 'Sun', pickups: 95, drivers: 25 },
];

// --- Geospatial Logic Helpers ---

const toRad = (val: number) => val * Math.PI / 180;

// Returns distance in Miles using Haversine formula
const getDistance = (c1: {lat: number, lng: number}, c2: {lat: number, lng: number}) => {
    const R = 3958.8; // Radius of Earth in miles
    const dLat = toRad(c2.lat - c1.lat);
    const dLon = toRad(c2.lng - c1.lng);
    const lat1 = toRad(c1.lat);
    const lat2 = toRad(c2.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const getRegionName = (lat: number, lng: number) => {
    if (lat > 36.23) return 'North Las Vegas';
    if (lat < 36.05) return 'Henderson / Anthem';
    if (lng < -115.25) return 'Summerlin / West';
    if (lng > -115.05) return 'Sunrise Manor';
    if (lat < 36.12 && lng > -115.15) return 'Paradise / Airport';
    return 'Central Las Vegas';
};

// --- Map Constants ---

const AUCTION_LOCATIONS = [
    { name: 'Nellis Auction (NLV)', lat: 36.2360, lng: -115.1350, address: '4031 Market Center Dr' },
    { name: 'Nellis Auction (Meadows)', lat: 36.1720, lng: -115.1950, address: '4300 Meadows Ln' },
    { name: 'Nellis Auction (Valley View)', lat: 36.1220, lng: -115.1950, address: '3850 S Valley View Blvd' },
    { name: 'Nellis Auction (Warm Springs)', lat: 36.0560, lng: -115.0500, address: '1481 W Warm Springs Rd' },
];

const MAP_CENTER: [number, number] = [36.1699, -115.1398];
const MAP_ZOOM = 10;

const fixLeafletIcons = () => {
    try {
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
    } catch (e) {
        console.error("Leaflet icon fix failed", e);
    }
};
fixLeafletIcons();

const iconHub = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const MapController = () => {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, [map]);
    return null;
};

const AdminView: React.FC<AdminViewProps> = ({ orders, blocks, users = [], onAddBlocks, onAddOrders, onSeedDatabase }) => {
  const [activeTab, setActiveTab] = useState<'ops' | 'drivers' | 'routing'>('ops');
  const [aiSummary, setAiSummary] = useState<string>("Generating daily operations report...");
  
  // Routing State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [proposedBlocks, setProposedBlocks] = useState<DriverBlock[]>([]);
  const [maxStops, setMaxStops] = useState(15);
  const [routingStats, setRoutingStats] = useState<{miles: number, driversNeeded: number} | null>(null);

  // Test Lab State
  const [isTestMode, setIsTestMode] = useState(false);
  const [testOrders, setTestOrders] = useState<Order[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const drivers = useMemo(() => users.filter(u => u.role === 'driver'), [users]);

  const assignedOrderIds = useMemo(() => {
      const ids = new Set<string>();
      blocks.forEach(b => b.orderIds.forEach(id => ids.add(id)));
      return ids;
  }, [blocks]);

  // If in Test Mode, we ONLY use testOrders. Otherwise, use database pending orders.
  const pendingOrders = useMemo(() => {
      if (isTestMode) return testOrders;
      return orders.filter(o => o.status === OrderStatus.PENDING && !assignedOrderIds.has(o.id));
  }, [orders, assignedOrderIds, isTestMode, testOrders]);

  useEffect(() => {
      if(activeTab === 'ops') {
        generateDailyOpsReport(blocks).then(setAiSummary);
      }
  }, [blocks, activeTab]);

  // --- File Upload Logic ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      
      const addresses: string[] = [];
      lines.forEach((line, index) => {
          if (index === 0 && line.toLowerCase().includes('address')) return; // Header
          const quotedMatch = line.match(/"([^"]+)"/);
          if (quotedMatch && quotedMatch[1]) {
              addresses.push(quotedMatch[1]);
          } else {
              const cols = line.split(',');
              if (cols.length >= 7) {
                  const street = cols[2];
                  const city = cols[4];
                  const state = cols[5];
                  const zip = cols[6];
                  if (street && city && state) addresses.push(`${street}, ${city} ${state} ${zip}`);
                  else if (cols.length > 7 && cols[7]) addresses.push(cols[7]);
              }
          }
      });

      if (addresses.length === 0) {
          alert("Could not parse addresses. Ensure CSV has 'Address City State Zip' column.");
          return;
      }
      if (addresses.length > 50) {
          alert(`Found ${addresses.length} addresses. Please limit batch tests to 50.`);
          return;
      }

      setIsGeocoding(true);
      try {
          const res = await fetch('http://localhost:3001/api/admin/geocode-batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ addresses })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          
          setTestOrders(data);
          setIsTestMode(true); // Auto enter test mode
      } catch (err) {
          console.error(err);
          alert("Failed to batch geocode. Ensure server is running.");
      } finally {
          setIsGeocoding(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  /**
   * CORE LOGIC: Nearest Neighbor Clustering
   */
  const runSmartRouting = () => {
      setIsOptimizing(true);
      setTimeout(() => {
          const newBlocks: DriverBlock[] = [];
          let pool = [...pendingOrders].filter(o => o.coordinates && o.coordinates.lat);
          let totalRouteMiles = 0;
          let blockCount = 1;

          while(pool.length > 0) {
              const currentBlockOrders: Order[] = [];
              let currentOrder = pool[0];
              pool = pool.filter(o => o.id !== currentOrder.id);
              currentBlockOrders.push(currentOrder);

              let blockMiles = 0;
              blockMiles += getDistance(
                  { lat: AUCTION_LOCATIONS[0].lat, lng: AUCTION_LOCATIONS[0].lng }, 
                  currentOrder.coordinates!
              );

              while (currentBlockOrders.length < maxStops && pool.length > 0) {
                  let closestIdx = -1;
                  let minDist = Infinity;
                  pool.forEach((candidate, idx) => {
                      const d = getDistance(currentOrder.coordinates!, candidate.coordinates!);
                      if (d < minDist) {
                          minDist = d;
                          closestIdx = idx;
                      }
                  });

                  if (closestIdx === -1 || minDist > 15) break;

                  const nextOrder = pool[closestIdx];
                  currentBlockOrders.push(nextOrder);
                  blockMiles += minDist;
                  totalRouteMiles += minDist;
                  currentOrder = nextOrder;
                  pool.splice(closestIdx, 1);
              }

              const totalPay = Math.ceil(15.00 + (currentBlockOrders.length * 4.00) + (blockMiles * 1.20));
              const avgLat = currentBlockOrders.reduce((sum, o) => sum + o.coordinates!.lat, 0) / currentBlockOrders.length;
              const avgLng = currentBlockOrders.reduce((sum, o) => sum + o.coordinates!.lng, 0) / currentBlockOrders.length;

              newBlocks.push({
                  id: `BLK-${isTestMode ? 'TEST' : 'REAL'}-${Date.now()}-${blockCount}`,
                  startTime: '08:00 AM',
                  endTime: '12:00 PM',
                  region: getRegionName(avgLat, avgLng),
                  totalPay: totalPay,
                  status: 'open',
                  orderIds: currentBlockOrders.map(o => o.id),
                  routeEfficiency: Math.min(100, Math.round(100 - (blockMiles / currentBlockOrders.length) * 2))
              });
              blockCount++;
          }

          setRoutingStats({
              miles: Math.round(totalRouteMiles),
              driversNeeded: newBlocks.length
          });
          setProposedBlocks(newBlocks);
          setIsOptimizing(false);
      }, 1000);
  };

  const handlePublishBlocks = () => {
      onAddBlocks(proposedBlocks);
      setProposedBlocks([]);
      setRoutingStats(null);
      setActiveTab('ops');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tabs */}
      <div className="border-b border-slate-200">
          <nav className="-mb-px flex gap-6 overflow-x-auto">
              <button onClick={() => setActiveTab('ops')} className={`pb-4 font-medium text-sm whitespace-nowrap ${activeTab === 'ops' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Operations Dashboard</button>
              <button onClick={() => setActiveTab('drivers')} className={`pb-4 font-medium text-sm whitespace-nowrap ${activeTab === 'drivers' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Driver Management</button>
              <button onClick={() => setActiveTab('routing')} className={`pb-4 font-medium text-sm whitespace-nowrap flex items-center gap-2 ${activeTab === 'routing' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><Zap size={16} /> Smart Routing Planner</button>
          </nav>
      </div>

      {activeTab === 'ops' && (
          <>
            <div className="bg-indigo-900 text-indigo-100 p-4 rounded-xl flex items-start md:items-center gap-4 shadow-lg">
                <div className="p-2 bg-indigo-800 rounded-lg shrink-0"><Sparkles size={20} className="text-yellow-400" /></div>
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-1">AbSo Intelligence</h4>
                    <p className="text-sm font-medium">{aiSummary}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Total Orders" value={orders.length.toString()} icon={<Package size={20} />} trend="Live Data" />
                <StatCard title="Registered Drivers" value={drivers.length.toString()} icon={<Users size={20} />} />
                <StatCard title="Block Coverage" value={`${blocks.length > 0 ? Math.round((blocks.filter(b => b.status !== 'open').length / blocks.length) * 100) : 0}%`} icon={<Truck size={20} />} />
                <StatCard title="Exceptions" value="0" icon={<AlertCircle size={20} className="text-red-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-80">
                    <h3 className="font-semibold text-slate-800 mb-6">Weekly Volume</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                            <Tooltip />
                            <Bar dataKey="pickups" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
                <Card className="h-80 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-slate-800">Live Block Status</h3>
                        <Badge status="Live" />
                    </div>
                    <div className="overflow-y-auto pr-2 space-y-3 flex-1">
                        {blocks.length === 0 && <p className="text-slate-400 text-sm text-center mt-10">No blocks generated yet.</p>}
                        {blocks.map(block => (
                            <div key={block.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{block.region}</p>
                                    <p className="text-xs text-slate-500">{block.startTime} - {block.endTime}</p>
                                </div>
                                <div className="text-right">
                                    <Badge status={block.status} />
                                    <p className="text-xs text-slate-400 mt-1">{block.orderIds.length} orders • ${block.totalPay}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
          </>
      )}

      {activeTab === 'drivers' && (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <div>
                      <h2 className="text-lg font-bold">Driver Roster</h2>
                      <p className="text-sm text-slate-500">{drivers.length} Active Drivers found in database.</p>
                  </div>
                  <Button variant="outline">Onboard New Driver</Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {drivers.length === 0 ? (
                      <div className="col-span-3 text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          No drivers found. Try re-seeding the database.
                      </div>
                  ) : (
                      drivers.map(driver => {
                          // Find active block for this driver
                          const activeBlock = blocks.find(b => b.driverId === driver.id && b.status === 'active');
                          
                          return (
                              <Card key={driver.id} className="relative overflow-hidden group hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-lg">
                                              {driver.name.charAt(0)}
                                          </div>
                                          <div>
                                              <h3 className="font-bold text-slate-900">{driver.name}</h3>
                                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                                  <span className="font-medium text-slate-700">{driver.stats?.rating || 'New'}</span>
                                                  <span>•</span>
                                                  <span>{driver.stats?.deliveries || 0} Trips</span>
                                              </div>
                                          </div>
                                      </div>
                                      {activeBlock && (
                                          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
                                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                              Active
                                          </span>
                                      )}
                                  </div>

                                  <div className="space-y-2 text-sm text-slate-600 mb-4">
                                      <div className="flex items-center gap-2">
                                          <Phone size={14} className="text-slate-400" />
                                          {driver.phone}
                                      </div>
                                      <div className="flex items-center gap-2 truncate" title={driver.email}>
                                          <Mail size={14} className="text-slate-400" />
                                          {driver.email}
                                      </div>
                                  </div>

                                  <div className="pt-4 border-t border-slate-100">
                                      {activeBlock ? (
                                          <div>
                                              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Current Route</p>
                                              <div className="flex justify-between items-center text-sm font-medium text-slate-900">
                                                  <span>{activeBlock.region}</span>
                                                  <span>{activeBlock.orderIds.length} stops</span>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="flex justify-between items-center">
                                              <span className="text-xs text-slate-400">Offline</span>
                                              <span className="text-xs font-bold text-slate-900">${driver.stats?.earnings || 0} earned</span>
                                          </div>
                                      )}
                                  </div>
                              </Card>
                          );
                      })
                  )}
              </div>
          </div>
      )}

      {activeTab === 'routing' && (
          <div className="flex flex-col lg:flex-row gap-6 lg:h-[700px]">
              <div className="w-full lg:w-1/3 flex flex-col gap-4">
                  <Card className="flex-1 flex flex-col overflow-y-auto">
                      <div className="mb-6">
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                              {isTestMode ? <FlaskConical className="text-purple-500" /> : <Zap size={20} className="text-yellow-500" />}
                              {isTestMode ? 'Test Lab Simulation' : 'Batch Optimizer'}
                          </h3>
                          <div className="flex justify-between items-center mt-2">
                             <p className="text-sm text-slate-500">
                                {isTestMode 
                                    ? `Simulating ${pendingOrders.length} test points.` 
                                    : `Found ${pendingOrders.length} unassigned orders.`}
                             </p>
                             {isTestMode && (
                                 <button onClick={() => { setIsTestMode(false); setTestOrders([]); setProposedBlocks([]); }} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded flex items-center gap-1 hover:bg-red-200">
                                     <X size={12} /> Exit Lab
                                 </button>
                             )}
                          </div>
                      </div>

                      {/* File Upload Section */}
                      {!isTestMode && pendingOrders.length === 0 && (
                          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 text-center mb-6">
                              <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                              <p className="text-sm font-medium text-slate-700">Batch Test from CSV</p>
                              <p className="text-xs text-slate-400 mb-3">Upload a list of addresses to simulate routing.</p>
                              <div className="relative">
                                  {isGeocoding ? (
                                      <span className="text-sm text-blue-600 animate-pulse">Geocoding addresses... please wait.</span>
                                  ) : (
                                      <>
                                        <input 
                                            type="file" 
                                            accept=".csv, .txt" 
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleFileUpload}
                                            ref={fileInputRef}
                                        />
                                        <Button variant="outline" size="sm">Select File</Button>
                                      </>
                                  )}
                              </div>
                          </div>
                      )}

                      <div className="space-y-6 flex-1">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Max Stops per Driver: {maxStops}</label>
                               <input type="range" min="3" max="20" step="1" value={maxStops} onChange={(e) => setMaxStops(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                               <div className="flex justify-between text-xs text-slate-400 mt-1">
                                   <span>Express (3)</span>
                                   <span>Standard (15)</span>
                                   <span>Heavy (20)</span>
                               </div>
                           </div>

                           {proposedBlocks.length > 0 && (
                               <div className={`${isTestMode ? 'bg-purple-50 border-purple-100' : 'bg-green-50 border-green-100'} p-4 rounded-xl border space-y-2 animate-fade-in`}>
                                   <div className="flex justify-between items-center">
                                       <span className={`text-sm font-medium ${isTestMode ? 'text-purple-800' : 'text-green-800'}`}>Proposed Blocks</span>
                                       <span className={`text-lg font-bold ${isTestMode ? 'text-purple-900' : 'text-green-900'}`}>{proposedBlocks.length}</span>
                                   </div>
                                   {routingStats && (
                                       <>
                                        <div className={`flex justify-between items-center text-xs ${isTestMode ? 'text-purple-700' : 'text-green-700'}`}>
                                            <span>Total Est. Miles</span>
                                            <span>{routingStats.miles} mi</span>
                                        </div>
                                        <div className={`flex justify-between items-center text-xs ${isTestMode ? 'text-purple-700' : 'text-green-700'}`}>
                                            <span>Drivers Needed</span>
                                            <span>{routingStats.driversNeeded}</span>
                                        </div>
                                       </>
                                   )}
                               </div>
                           )}
                      </div>

                      <div className="mt-6 space-y-3">
                          {!isTestMode && pendingOrders.length === 0 && users.length > 0 && (
                              <Button variant="outline" className="w-full border-dashed" onClick={onSeedDatabase}>
                                  <Database size={16} /> Seed Orders from CSV Users
                              </Button>
                          )}
                          
                          {!proposedBlocks.length ? (
                              <Button 
                                className={`w-full ${isTestMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                                onClick={runSmartRouting} 
                                disabled={isOptimizing || pendingOrders.length === 0}
                              >
                                  {isOptimizing ? 'Calculating Nearest Neighbors...' : isTestMode ? 'Run Test Simulation' : 'Run Smart Batching'}
                              </Button>
                          ) : (
                              <div className="flex gap-2">
                                  <Button variant="outline" className="flex-1" onClick={() => setProposedBlocks([])}>Reset</Button>
                                  {!isTestMode && <Button variant="success" className="flex-[2]" onClick={handlePublishBlocks}>Publish Routes</Button>}
                              </div>
                          )}
                      </div>
                  </Card>
              </div>

              <div className="w-full lg:w-2/3 h-[500px] lg:h-auto bg-slate-100 rounded-xl border border-slate-200 relative overflow-hidden shadow-inner z-0">
                  <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} style={{ height: '100%', width: '100%' }}>
                      <MapController />
                      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      
                      {/* Hubs */}
                      {AUCTION_LOCATIONS.map((loc, idx) => (
                          <Marker key={`loc-${idx}`} position={[loc.lat, loc.lng]} icon={iconHub}>
                              <Popup><strong>{loc.name}</strong><br/>{loc.address}</Popup>
                          </Marker>
                      ))}

                      {/* Unassigned Orders (Blue for Real, Purple for Test) */}
                      {!proposedBlocks.length && pendingOrders.map(order => (
                          order.coordinates && (
                              <CircleMarker 
                                key={order.id} 
                                center={[order.coordinates.lat, order.coordinates.lng]} 
                                radius={6} 
                                pathOptions={{ 
                                    color: isTestMode ? '#9333ea' : '#3b82f6', 
                                    fillColor: isTestMode ? '#a855f7' : '#60a5fa', 
                                    fillOpacity: 0.8 
                                }}
                              >
                                  <Popup>Order: {order.id}<br/>{order.dropoffAddress}</Popup>
                              </CircleMarker>
                          )
                      ))}

                      {/* Proposed Routes */}
                      {proposedBlocks.map((block, bIdx) => {
                          const blockOrders = block.orderIds
                            .map(id => pendingOrders.find(o => o.id === id))
                            .filter(o => o !== undefined && o.coordinates) as Order[];

                          if (!blockOrders.length) return null;
                          
                          // Different colors for Test Mode
                          const hue = isTestMode ? ((bIdx * 137.5) % 60) + 260 : (bIdx * 137.5) % 360; // Purples for test, Random for real
                          const color = `hsl(${hue}, 70%, 40%)`;
                          
                          const mainHub = AUCTION_LOCATIONS[0];
                          const positions: [number, number][] = [[mainHub.lat, mainHub.lng]];
                          
                          blockOrders.forEach(o => { if (o.coordinates) positions.push([o.coordinates.lat, o.coordinates.lng]); });

                          return (
                              <React.Fragment key={block.id}>
                                  <Polyline positions={positions} pathOptions={{ color, weight: 4, opacity: 0.8, dashArray: '10, 10' }} />
                                  {blockOrders.map((o, i) => (
                                      o.coordinates && (
                                          <CircleMarker key={`bm-${o.id}`} center={[o.coordinates.lat, o.coordinates.lng]} radius={6} pathOptions={{ color: '#fff', fillColor: color, fillOpacity: 1, weight: 2 }}>
                                              <Popup>
                                                  <strong>Stop #{i + 1}</strong><br/>
                                                  {o.dropoffAddress}<br/>
                                                  Block: {block.region}
                                              </Popup>
                                          </CircleMarker>
                                      )
                                  ))}
                              </React.Fragment>
                          );
                      })}
                  </MapContainer>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminView;
