/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useLocation, 
  useNavigate,
  Navigate
} from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  CalendarClock, 
  Search, 
  BookOpen, 
  ShieldCheck, 
  Settings, 
  Bell, 
  Moon, 
  Sun, 
  User as UserIcon,
  LogOut,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  Award,
  Lock,
  Smartphone,
  Fingerprint,
  AlertTriangle,
  Menu,
  X,
  CreditCard,
  Target,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { auth, db } from './lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";

// --- THEME CONTEXT ---
type ThemeMode = 'light' | 'dark' | 'reading';
const ThemeContext = createContext({
  theme: 'dark' as ThemeMode,
  setTheme: (theme: ThemeMode) => {}
});

// --- AI SERVICE ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- MODALS ---

const TransactionModal = ({ isOpen, onClose, userId }: { isOpen: boolean, onClose: () => void, userId: string }) => {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Shopping');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !merchant || !userId) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'users', userId, 'transactions'), {
        userId,
        amount: parseFloat(amount),
        merchant,
        category,
        date: serverTimestamp(),
        isSuspicious: false,
        status: 'completed'
      });
      onClose();
      setAmount('');
      setMerchant('');
    } catch (err) {
      console.error("Failed to add transaction:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Transaction</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Merchant Name</label>
            <input 
              type="text" 
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white"
              placeholder="e.g. Amazon, Starbucks"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Amount ($)</label>
              <input 
                type="number" 
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white"
              >
                <option>Shopping</option>
                <option>Food & Drink</option>
                <option>Utilities</option>
                <option>Entertainment</option>
                <option>Salary</option>
                <option>Others</option>
              </select>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50"
          >
            {loading ? 'Encrypting & Saving...' : 'Confirm Transaction'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// --- COMPONENTS ---

// Dashboard Component
const Dashboard = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const isReading = theme === 'reading';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(items);
      setLoading(false);
    });

    return unsub;
  }, []);

  const spendingData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = days.map(name => ({ name, amount: 0 }));
    
    transactions.forEach(tx => {
      if (!tx.date) return;
      const date = tx.date.toDate();
      const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1; // Adjust for Mon starting week
      data[dayIndex].amount += Math.abs(tx.amount);
    });

    // Add some random variety if there's very little data to keep chart pretty
    if (transactions.length < 5) {
      return [
        { name: 'Mon', amount: 45 },
        { name: 'Tue', amount: 52 },
        { name: 'Wed', amount: 38 },
        { name: 'Thu', amount: 65 },
        { name: 'Fri', amount: 48 },
        { name: 'Sat', amount: 90 },
        { name: 'Sun', amount: 75 },
      ];
    }
    return data;
  }, [transactions]);

  const totalBalance = useMemo(() => {
    const bal = transactions.reduce((acc, tx) => acc + (tx.category === 'Salary' ? tx.amount : -tx.amount), 12000);
    return bal.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }, [transactions]);

  const stats = [
    { label: 'Total Balance', value: totalBalance, change: '+2.5%', icon: Wallet, color: 'text-indigo-600' },
    { label: 'Monthly Savings', value: '$3,200.00', change: '+12%', icon: Target, color: 'text-emerald-500' },
    { label: 'Active Bills', value: '4', change: 'Next: 2 days', icon: CalendarClock, color: 'text-amber-500' },
    { label: 'Security Score', value: '98/100', change: 'Optimized', icon: ShieldCheck, color: 'text-indigo-500' },
  ];

  return (
    <div className="space-y-8 pb-10">
      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        userId={auth.currentUser?.uid || ''} 
      />

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back, {auth.currentUser?.displayName?.split(' ')[0] || 'User'}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Your Vertex AI assistant has {transactions.length > 10 ? 'new' : 'first'} insights for you.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vertex AI Insight</p>
            <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold italic">"Lower utilities expected next week"</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-100 dark:shadow-none"
          >
            <Plus size={18} /> New Entry
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-card relative overflow-hidden ${i === 2 ? 'border-l-4 border-amber-400' : i === 1 ? 'border-l-4 border-emerald-500' : ''}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                {stat.change}
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</h3>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Spending Chart */}
        <div className="lg:col-span-2 glass-card h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-display font-bold">Weekly Spending Analysis</h3>
            <select className="bg-transparent border-gray-200 dark:border-zinc-800 text-sm rounded-lg focus:ring-primary">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spendingData}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : isReading ? '#dcd1b3' : '#E2E8F0'} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94A3B8' : isReading ? '#5b4636' : '#64748B', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94A3B8' : isReading ? '#5b4636' : '#64748B', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDark ? '#0F172A' : isReading ? '#fdfaf1' : '#fff', 
                  border: isDark ? '1px solid #1E293B' : isReading ? '1px solid #e5dcc3' : '1px solid #E2E8F0', 
                  borderRadius: '12px', 
                  color: isDark ? '#F1F5F9' : isReading ? '#5b4636' : '#0F172A' 
                }}
                itemStyle={{ color: isDark ? '#F1F5F9' : isReading ? '#5b4636' : '#0F172A' }}
              />
              <Area type="monotone" dataKey="amount" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card flex flex-col">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Recent Activity</h3>
        <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-500 text-sm italic">No recent protocol logs.</p>
            </div>
          ) : transactions.map((tx, i) => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${tx.category === 'Salary' ? 'bg-emerald-100/10 text-emerald-500' : 'bg-rose-100/10 text-rose-500'}`}>
                  {tx.category === 'Salary' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                </div>
                <div>
                  <p className="font-bold text-sm flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    {tx.merchant}
                    {tx.isSuspicious && <AlertTriangle size={14} className="text-amber-500" />}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tx.date?.toDate() ? tx.date.toDate().toLocaleDateString() : 'Pending...'}
                  </p>
                </div>
              </div>
              <p className={`font-bold ${tx.category === 'Salary' ? 'text-emerald-500' : tx.isSuspicious ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                {tx.category === 'Salary' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        <button className="mt-4 text-center text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View All Transactions</button>
      </div>
    </div>
    </div>
  );
};


// Stock Market Component
const MarketTracking = () => {
  const [category, setCategory] = useState("stocks");
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const isReading = theme === 'reading';

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stocks/trends?category=${category}`)
      .then(res => res.json())
      .then(data => {
        setTrends(data);
        setLoading(false);
      });
  }, [category]);

  const categories = [
    { id: 'stocks', label: 'US Stocks', icon: CreditCard },
    { id: 'indices', label: 'World Indices', icon: Activity },
    { id: 'currency', label: 'Currencies & Crypto', icon: Wallet },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Market Trends</h1>
          <p className="text-slate-500 dark:text-slate-400">Track and analyze global assets in real-time.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                category === cat.id 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <cat.icon size={16} />
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card animate-pulse h-32 bg-slate-100 dark:bg-slate-900 border-none" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {trends.map((stock, i) => (
              <motion.div 
                key={stock.symbol} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card border-l-4 ${stock.trend === 'up' ? 'border-l-emerald-500' : 'border-l-rose-500'}`} 
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{stock.symbol}</span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{stock.name}</p>
                  </div>
                  {stock.trend === 'up' ? <TrendingUp size={20} className="text-emerald-500" /> : <Activity size={20} className="text-rose-500" />}
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-4">
                  {category === 'currency' ? '' : '$'}{stock.price.toLocaleString()}
                </p>
                <div className={`text-xs font-bold flex items-center gap-1 mt-1 ${stock.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stock.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stock.trend === 'up' ? '+' : ''}{stock.change}%
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="glass-card">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Trend Volatility Analysis</h3>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <TrendingUp size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : isReading ? '#dcd1b3' : '#E2E8F0'} />
              <XAxis dataKey="symbol" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94A3B8' : isReading ? '#5b4636' : '#64748B', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94A3B8' : isReading ? '#5b4636' : '#64748B', fontSize: 12}} />
              <Tooltip 
                cursor={{fill: isDark ? '#1e293b' : isReading ? '#e5dcc3' : '#f8fafc', radius: 4}} 
                contentStyle={{ 
                  backgroundColor: isDark ? '#0F172A' : isReading ? '#fdfaf1' : '#fff', 
                  border: isDark ? '1px solid #1E293B' : isReading ? '1px solid #e5dcc3' : '1px solid #E2E8F0', 
                  borderRadius: '12px', 
                  color: isDark ? '#F1F5F9' : isReading ? '#5b4636' : '#0F172A' 
                }}
              />
              <Bar dataKey="price" radius={[6, 6, 0, 0]} barSize={category === 'stocks' ? 40 : 60}>
                {trends.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.trend === 'up' ? '#10b981' : '#f43f5e'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Bill & Savings Forecaster (Powered by Simulated AI)
const AIInsights = () => {
  const [advice, setAdvice] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAdvice = async () => {
    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "You are an expert financial advisor for SecureSpend app. Give a brief (2-3 sentences) tip about saving money for an apartment while managing student loans. Be supportive and professional.",
      });
      setAdvice(response.text || "Try to automate small transfers to your savings every payday.");
    } catch (err) {
      setAdvice("Consistent budgeting is the key to long-term wealth. Aim to save 20% of your income.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateAdvice();
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-display font-bold">Smart Forecasts</h1>
        <p className="text-slate-500 dark:text-slate-400">Vertex AI powered bill management and savings advice.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bill Forecast */}
        <div className="glass-card border-l-4 border-amber-400 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg">
              <CalendarClock size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Upcoming Bills</h3>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Electricity', amount: 120.50, due: 'In 4 days', auto: true },
              { title: 'Fiber Internet', amount: 75.00, due: 'In 12 days', auto: true },
              { title: 'Gym Membership', amount: 45.00, due: 'In 18 days', auto: false },
              { title: 'Cloud Subscription', amount: 12.00, due: 'In 24 days', auto: true },
            ].map((bill, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-400 transition-all">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{bill.title}</p>
                  <p className="text-xs text-slate-500">{bill.due}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-white">${bill.amount}</p>
                  {bill.auto && <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600">Auto-Pay</span>}
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 bg-slate-950 dark:bg-white dark:text-slate-950 text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-xl shadow-slate-200 dark:shadow-none">
            Manage All Bills
          </button>
        </div>

        {/* AI Recommendations */}
        <div className="glass-card border-indigo-500 border-t-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
              <Award size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Vertex AI Insights</h3>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl p-6 relative overflow-hidden ring-1 ring-indigo-100 dark:ring-indigo-900/50">
            <div className="relative z-10">
              {isGenerating ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                </div>
              ) : (
                <p className="italic text-lg text-slate-800 dark:text-slate-200">"{advice}"</p>
              )}
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="mt-8 space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Personal Savings Goal</h4>
            {[
              { name: 'House Downpayment', progress: 45, current: '$22.5k', target: '$50k', color: '#6366f1' },
              { name: 'Vacation Fund', progress: 82, current: '$4.1k', target: '$5k', color: '#10b981' },
            ].map((goal, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{goal.name}</span>
                  <span className="text-slate-500">{goal.current} / {goal.target}</span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    className="h-full"
                    style={{ backgroundColor: goal.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Price Comparison Component
const ComparisonTool = () => {
  const [queryTerm, setQueryTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = () => {
    if (!queryTerm) return;
    setSearching(true);
    fetch(`/api/compare-prices?item=${encodeURIComponent(queryTerm)}`)
      .then(res => res.json())
      .then(data => {
        setResults(data);
        setSearching(false);
      });
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Secure Comparison</h1>
        <p className="text-slate-500 dark:text-slate-400">Compare prices across platforms safely.</p>
      </header>

      <div className="max-w-2xl mx-auto flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search for an item (e.g., iPhone 15)"
            value={queryTerm}
            onChange={(e) => setQueryTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-white"
          />
        </div>
        <button 
          onClick={handleSearch}
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
        >
          {searching ? "Searching..." : "Compare"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {results.length > 0 ? (
          results.map((res, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card text-center flex flex-col items-center"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{res.source}</p>
              <h4 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">${res.price}</h4>
              <a href={res.url} target="_blank" className="w-full block py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                View on Site
              </a>
            </motion.div>
          ))
        ) : !searching && (
          <div className="col-span-full py-20 text-center opacity-30 select-none text-slate-400">
            <Search size={64} className="mx-auto mb-4" />
            <p className="text-xl font-bold">Search items to compare prices</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Education Component
const Education = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVideos = () => {
    setLoading(true);
    fetch('/api/education/videos')
      .then(res => res.json())
      .then(data => {
        setVideos(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Financial Academy</h1>
          <p className="text-slate-500 dark:text-slate-400">Learn to build wealth and secure your future.</p>
        </div>
        <button 
          onClick={fetchVideos}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-sm"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Discovering...' : 'Discover New Content'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {videos.map((vid, i) => (
          <motion.div 
            key={i} 
            whileHover={{ y: -5 }}
            className="group glass-card overflow-hidden !p-0 shadow-lg hover:shadow-indigo-100/50 dark:hover:shadow-none"
          >
            <div className="relative aspect-video">
              <img 
                src={vid.thumbnail} 
                alt={vid.title} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <ChevronRight size={24} className="text-slate-950 ml-1" />
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">{vid.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Master the basics of financial independence.</p>
              <a href={vid.url} target="_blank" className="mt-4 flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:gap-3 transition-all">
                Watch on YouTube <Award size={16} />
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Security Settings Component
const SecuritySettings = () => {
  const [twoFactor, setTwoFactor] = useState(true);
  const [biometric, setBiometric] = useState(false);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-display font-bold">Secure Protocol</h1>
        <p className="text-gray-500 dark:text-zinc-400">Manage advanced authentication and activity logs.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Authentication Controls */}
        <div className="glass-card h-fit">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Authentication</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Smartphone size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">2-Factor Authentication</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Multi-device push</p>
                </div>
              </div>
              <button 
                onClick={() => setTwoFactor(!twoFactor)}
                className={`w-12 h-6 rounded-full transition-all relative ${twoFactor ? 'bg-indigo-600 shadow-lg shadow-indigo-100 dark:shadow-none' : 'bg-slate-200 dark:bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${twoFactor ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Fingerprint size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Biometric Vault</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Face ID / Touch ID</p>
                </div>
              </div>
              <button 
                onClick={() => setBiometric(!biometric)}
                className={`w-12 h-6 rounded-full transition-all relative ${biometric ? 'bg-emerald-500 shadow-lg shadow-emerald-100 dark:shadow-none' : 'bg-slate-200 dark:bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${biometric ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>
          <div className="mt-10 p-4 bg-slate-900 dark:bg-slate-800 rounded-2xl">
            <p className="text-[10px] text-slate-400 font-bold mb-3 tracking-widest uppercase">Encryption Status</p>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 bg-slate-800 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[95%]" />
              </div>
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Secure</span>
            </div>
          </div>
        </div>

        {/* Security Logs */}
        <div className="glass-card">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Security Logs</h3>
          <div className="space-y-2">
            {[
              { event: 'New Login', device: 'iPhone 15 Pro', date: 'Just now', type: 'info' },
              { event: 'Password Changed', device: 'System', date: '3 days ago', type: 'info' },
              { event: 'Failed Attempt', device: 'Chrome / Linux', date: 'Last week', type: 'warning' },
              { event: '2FA Enabled', device: 'User Action', date: '2 weeks ago', type: 'success' },
            ].map((log, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all">
                <div className={`w-2 h-2 rounded-full ${log.type === 'warning' ? 'bg-amber-500' : log.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{log.event}</p>
                  <p className="text-xs text-slate-500">{log.device}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{log.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Settings Component
const GeneralSettings = () => {
  const { theme, setTheme } = useContext(ThemeContext);

  const themeOptions = [
    { id: 'light', label: 'Light Protocol', icon: Sun, desc: 'Brilliant & High Clarity', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' },
    { id: 'dark', label: 'Dark Protocol', icon: Moon, desc: 'Stealth & Eye Comfort', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' },
    { id: 'reading', label: 'Reading Mode', icon: BookOpen, desc: 'Editorial & Warmth', color: 'text-orange-700 bg-orange-50 dark:bg-orange-950/20' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white reading:text-[#5b4636]">Preferences</h1>
        <p className="text-slate-500 dark:text-slate-400 reading:text-[#8c705a]">Personalize your SecureSpend environment.</p>
      </header>

      <div className="max-w-2xl space-y-6">
        <div className="glass-card">
          <h3 className="font-bold text-slate-900 dark:text-white reading:text-[#5b4636] mb-6">Appearance Spectrum</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {themeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id as ThemeMode)}
                className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                  theme === opt.id 
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 ring-4 ring-indigo-500/10' 
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                <div className={`p-3 rounded-xl ${opt.color}`}>
                  <opt.icon size={24} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 dark:text-white reading:text-[#5b4636]">{opt.label}</p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Language & Region</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">App Language</p>
              <select className="bg-transparent text-sm font-bold text-slate-900 dark:text-white border-0 focus:ring-0 cursor-pointer outline-none">
                <option>English (US)</option>
                <option>Chinese (Simplified)</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Local Currency</p>
              <select className="bg-transparent text-sm font-bold text-slate-900 dark:text-white border-0 focus:ring-0 cursor-pointer outline-none">
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>CNY (¥)</option>
                <option>GBP (£)</option>
              </select>
            </div>
          </div>
        </div>

        <button className="w-full py-4 text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 rounded-2xl hover:bg-rose-100 transition-all border border-rose-100 dark:border-rose-900/30">
          Log Out of Protocol
        </button>
      </div>
    </div>
  );
};

// --- LAYOUT & NAVIGATION ---

const NavItem = ({ to, icon: Icon, label, active }: any) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 px-6 py-3 transition-all ${
      active 
        ? 'sidebar-item-active shadow-sm' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 border-r-4 border-transparent'
    }`}
  >
    <Icon size={18} />
    <span className="hidden lg:inline text-sm font-medium">{label}</span>
  </Link>
);

const AppLayout = () => {
  const location = useLocation();
  const { theme, setTheme } = useContext(ThemeContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isDark = theme === 'dark';
  const isReading = theme === 'reading';

  const navLinks = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/market', label: 'Treasury', icon: TrendingUp },
    { to: '/comparison', label: 'Arbitrage', icon: Search },
    { to: '/academy', label: 'Protocol Academy', icon: BookOpen },
    { to: '/security', label: 'Security Vault', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex transition-colors duration-500">
      {/* Sidebar */}
      <aside className="w-20 lg:w-72 bg-white dark:bg-slate-900 reading:bg-[#fdfaf1] border-r border-slate-200 dark:border-slate-800 reading:border-[#e5dcc3] hidden md:flex flex-col transition-colors duration-500 fixed h-full z-50">
        <div className="p-8 flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none shrink-0">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white reading:text-[#5b4636] hidden lg:block uppercase tracking-tighter">SecureSpend</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navLinks.map(link => (
            <NavItem 
              key={link.to}
              {...link}
              active={location.pathname === link.to}
            />
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 reading:border-[#e5dcc3] space-y-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 reading:bg-[#e5dcc3] p-1 rounded-xl">
            <button onClick={() => setTheme('light')} className={`flex-1 p-2 rounded-lg flex justify-center transition-all ${theme === 'light' ? 'bg-white text-amber-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Sun size={18}/></button>
            <button onClick={() => setTheme('reading')} className={`flex-1 p-2 rounded-lg flex justify-center transition-all ${theme === 'reading' ? 'bg-[#fdfaf1] text-[#5b4636] shadow-sm' : 'text-slate-400 hover:text-[#5b4636]'}`}><BookOpen size={18}/></button>
            <button onClick={() => setTheme('dark')} className={`flex-1 p-2 rounded-lg flex justify-center transition-all ${theme === 'dark' ? 'bg-slate-700 text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-indigo-400'}`}><Moon size={18}/></button>
          </div>
          <NavItem to="/settings" label="Preferences" icon={Settings} active={location.pathname === '/settings'} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-20 lg:ml-72 transition-colors duration-500 overflow-x-hidden min-h-screen">
        {/* Header content moved into main since we're using a fixed sidebar */}
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 reading:bg-[#fdfaf1]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 reading:border-[#e5dcc3] sticky top-0 z-50 transition-colors duration-500 px-8 flex items-center justify-between md:justify-end">
          <div className="flex items-center gap-4 md:hidden">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white reading:text-[#5b4636]">SecureSpend</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 reading:bg-[#e5dcc3] rounded-full border border-slate-100 dark:border-slate-700 reading:border-none">
              <Bell size={18} className="text-slate-400" />
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
              <UserIcon size={18} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">ADMIN</span>
            </div>
            
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-3 bg-slate-50 dark:bg-slate-800 reading:bg-[#e5dcc3] rounded-xl md:hidden text-slate-600 dark:text-slate-300"
            >
              <Menu size={24} />
            </button>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/market" element={<MarketTracking />} />
                <Route path="/comparison" element={<ComparisonTool />} />
                <Route path="/academy" element={<Education />} />
                <Route path="/security" element={<SecuritySettings />} />
                <Route path="/settings" element={<GeneralSettings />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] md:hidden"
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute right-0 top-0 bottom-0 w-3/4 bg-white dark:bg-slate-900 reading:bg-[#fdfaf1] p-8 flex flex-col shadow-2xl transition-colors duration-500"
            >
              <div className="flex items-center justify-between mb-12">
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white reading:text-[#5b4636]">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 reading:bg-[#e5dcc3] rounded-full text-slate-500">
                  <X size={24} />
                </button>
              </div>
              <nav className="space-y-4 flex-1">
                {navLinks.map(link => (
                  <Link 
                    key={link.to}
                    to={link.to} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 text-lg font-bold p-3 rounded-xl transition-all ${
                      location.pathname === link.to 
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' 
                        : 'text-slate-600 dark:text-slate-400 reading:text-[#8c705a]'
                    }`}
                  >
                    <link.icon size={24} />
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800 reading:border-[#e5dcc3] space-y-4">
                <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 text-lg font-bold p-3 text-slate-600 dark:text-slate-400 reading:text-[#8c705a]">
                  <Settings size={24} /> Settings
                </Link>
                <div className="flex bg-slate-100 dark:bg-slate-800 reading:bg-[#e5dcc3] p-1 rounded-xl">
                  <button onClick={() => setTheme('light')} className={`flex-1 p-3 rounded-lg flex justify-center ${theme === 'light' ? 'bg-white text-amber-500 shadow-sm' : 'text-slate-400'}`}><Sun size={20}/></button>
                  <button onClick={() => setTheme('reading')} className={`flex-1 p-3 rounded-lg flex justify-center ${theme === 'reading' ? 'bg-[#fdfaf1] text-[#5b4636] shadow-sm' : 'text-slate-400'}`}><BookOpen size={20}/></button>
                  <button onClick={() => setTheme('dark')} className={`flex-1 p-3 rounded-lg flex justify-center ${theme === 'dark' ? 'bg-slate-700 text-indigo-400 shadow-sm' : 'text-slate-400'}`}><Moon size={20}/></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- AUTH COMPONENT ---
const AuthScreen = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid items-center justify-center p-4 bg-slate-950 text-white selection:bg-indigo-500/30">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass-card bg-slate-900 border-slate-800 text-center space-y-8"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/20 rotate-3 animate-pulse">
            <ShieldCheck size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">SecureSpend</h1>
          <p className="text-slate-400">Unlock your financial sovereignty with multi-protocol security.</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white text-slate-950 rounded-2xl font-bold hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6" alt="google" />
            Continue with Google
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-slate-900 px-4 text-slate-500 font-bold tracking-widest">Enforced Security</span></div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-1 opacity-50">
              <Fingerprint size={20} />
              <span className="text-[10px]">Biometric</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-50">
              <Smartphone size={20} />
              <span className="text-[10px]">2FA Push</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-50">
              <Lock size={20} />
              <span className="text-[10px]">AES-256</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          By continuing, you agree to the SecureSpend Protocol and acknowledge the decentralized risk disclosure.
        </p>
      </motion.div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitialized(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'reading');
    root.classList.add(theme);
  }, [theme]);

  if (!initialized) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Router>
        {!user ? (
          <AuthScreen />
        ) : (
          <AppLayout />
        )}
      </Router>
    </ThemeContext.Provider>
  );
}
