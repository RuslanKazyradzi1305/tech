/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, FileSpreadsheet, FileText, Search, Download, Settings,
  Globe, Box, Upload, FileDown, PieChart as PieChartIcon, History, LogOut, LogIn,
  Network, ChevronRight, ChevronDown, User, Home, Building2, Users,
  Trash2, AlertTriangle, Archive, RefreshCw, XCircle, Save, Moon, Sun, BookOpen, Briefcase, WifiOff, HelpCircle, Send, MessageSquare, List
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import { collection, onSnapshot, writeBatch, doc, serverTimestamp, query, orderBy, where, getDocs, deleteDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns';

import { mockPlan, t, ProcurementPlanItem } from './data';
import { auth, db, loginWithGoogle, logout } from './firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plan' | 'spec' | 'history' | 'structure' | 'initiators' | 'cabinet' | 'wiki' | 'trash'>('dashboard');
  const [selectedSpecIndex, setSelectedSpecIndex] = useState<number>(0);
  const [lang, setLang] = useState<'ru' | 'kz'>('ru');
  const [planData, setPlanData] = useState<ProcurementPlanItem[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [trashData, setTrashData] = useState<{ plan: any[], history: any[] }>({ plan: [], history: [] });
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loadingText, setLoadingText] = useState<string | null>('Загрузка приложения...');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [darkMode, setDarkMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    
    if (!localStorage.getItem('tutorialSeen_v2')) {
      setTimeout(() => setShowTutorial(true), 1500);
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', String(next));
    document.documentElement.classList.toggle('dark', next);
  };
  
  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('tutorialSeen_v2', 'true');
  };

  // Define super admin
  const isAdmin = user?.email === 'kazyyev.chiefengineer@gmail.com';

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoadingText('Синхронизация данных...');
        const qPlan = query(collection(db, 'planItems'), where('companyId', '==', 'default'));
        const unsubPlan = onSnapshot(qPlan, (snap) => {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
          // Сортировка по номеру п/п для сохранения оригинального порядка как в Excel
          items.sort((a, b) => {
             const rowA = String(a.rowNum || '');
             const rowB = String(b.rowNum || '');
             return rowA.localeCompare(rowB, undefined, { numeric: true, sensitivity: 'base' });
          });
          // If no items in DB, fallback to mock data
          setPlanData(items.length ? items : mockPlan);
          setLoadingText(null);
        }, (error) => {
          console.error("Ошибка загрузки плана:", error);
          setPlanData(mockPlan);
          setLoadingText(null);
        });
        
        const qHistory = query(collection(db, 'planHistory'), where('companyId', '==', 'default'));
        const unsubHist = onSnapshot(qHistory, (snap) => {
           const historyRecords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
           historyRecords.sort((a: any, b: any) => {
              const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
              const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
              return timeB - timeA;
           });
           setHistoryData(historyRecords);
        }, (error) => {
           console.error("Ошибка загрузки истории:", error);
        });

        const unsubStats = onSnapshot(doc(db, 'dashboardStats', 'current'), (snap) => {
           if (snap.exists()) {
             setDashboardStats(snap.data());
           } else {
             setDashboardStats({
                totalBudget: 0,
                savings: 0,
                executionStatus: 0,
                methodTender: 400,
                methodZCP: 300,
                methodOI: 300,
                q1Plan: 4000, q1Fact: 2400,
                q2Plan: 3000, q2Fact: 1398,
                q3Plan: 2000, q3Fact: 9800,
                q4Plan: 5000, q4Fact: 4500,
             });
           }
        });

        // Listen to Trash
        const unsubTrashPlan = onSnapshot(collection(db, 'planTrash'), (snap) => {
           setTrashData(prev => ({ ...prev, plan: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
        });
        const unsubTrashHistory = onSnapshot(collection(db, 'historyTrash'), (snap) => {
           setTrashData(prev => ({ ...prev, history: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
        });

        return () => { unsubPlan(); unsubHist(); unsubStats(); unsubTrashPlan(); unsubTrashHistory(); };
      } else {
        // Fallback for visual data when offline/testing without auth, but we will show login screen instead.
        setPlanData(mockPlan); 
        setHistoryData([]);
        setLoadingText(null);
      }
    });
    return () => unsubAuth();
  }, []);

  const handleLogin = async () => {
    try {
      setLoginError(null);
      await loginWithGoogle();
    } catch (error: any) {
      console.error("Ошибка входа Google:", error);
      // Translate common Firebase errors for Vercel
      if (error?.code === 'auth/unauthorized-domain') {
         setLoginError(`Домен не авторизован в Firebase. Добавьте ваш домен Vercel в список 'Authorized domains' в настройках Firebase Authentication.`);
      } else if (error?.message) {
         setLoginError(error.message);
      } else {
         setLoginError('Не удалось выполнить вход через Google.');
      }
    }
  };

  const txt = t[lang];

  if (loadingText) {
    return <div className="flex h-screen items-center justify-center font-bold text-slate-500 bg-slate-50">{loadingText}</div>;
  }

  // Guard the app behind the Login Screen
  if (!user) {
    return (
      <div className="flex h-screen w-full relative isolate overflow-hidden bg-slate-50">
        <div className="glow-orb bg-indigo-300 w-[600px] h-[600px] top-[-200px] left-[-200px]"></div>
        <div className="glow-orb bg-emerald-200 w-[500px] h-[500px] bottom-[-100px] right-[-100px]"></div>
        
        <div className="w-full h-full flex flex-col items-center justify-center relative z-10 p-4">
          <div className="glass-card flex flex-col items-center p-10 max-w-[420px] w-full shadow-2xl relative bg-white/70 backdrop-blur-xl">
             <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-sm border border-blue-200">
               <Box className="w-8 h-8" />
             </div>
             
             <h1 className="text-2xl font-bold text-slate-800 tracking-tight text-center mb-3">
               Tech Spec System
             </h1>
             <p className="text-slate-500 text-[13px] text-center mb-8 font-medium px-4">
               Для доступа к графику закупок, истории и панелям аналитики, пожалуйста, авторизуйтесь в корпоративной сети
             </p>

             {loginError && (
                 <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-[13px] font-semibold mb-6 w-full text-center leading-relaxed">
                     {loginError}
                 </div>
             )}

             <button 
               onClick={handleLogin} 
               className="glass-btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-[15px] shadow-[0_4px_16px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
             >
                 <LogIn className="w-5 h-5" />
                 Войти через Google
             </button>
             
             <div className="mt-8 pt-6 border-t border-slate-200/50 w-full flex justify-center">
                 <div className="flex items-center gap-2 px-3 py-1 bg-white/50 border border-slate-200 rounded-lg text-xs font-medium text-slate-500">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Язык интерфейса:</span>
                    <button onClick={() => setLang('ru')} className={`font-bold transition-colors ${lang === 'ru' ? 'text-blue-600' : 'hover:text-slate-800'}`}>RU</button>
                    <span className="opacity-30">|</span>
                    <button onClick={() => setLang('kz')} className={`font-bold transition-colors ${lang === 'kz' ? 'text-blue-600' : 'hover:text-slate-800'}`}>KZ</button>
                 </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full relative isolate">
      {/* Decorative Background Orbs */}
      <div className="glow-orb bg-indigo-300 w-[600px] h-[600px] top-[-200px] left-[-200px]"></div>
      <div className="glow-orb bg-emerald-200 w-[500px] h-[500px] bottom-[-100px] right-[-100px]"></div>
      <div className="glow-orb bg-blue-300 w-[400px] h-[400px] top-[20%] right-[10%]"></div>

      {/* Sidebar */}
      <aside className="w-64 glass-card m-4 flex flex-col gap-6 shrink-0 overflow-y-auto p-5 z-10 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
        <div className="font-extrabold text-xl tracking-tight mb-4 flex items-center gap-3 text-slate-800">
           <Box className="w-6 h-6 text-blue-500" />
           Tech Spec
        </div>
        
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'dashboard' ? 'glass-btn-active' : 'hover:bg-white/40 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'}`}
          >
            <LayoutDashboard className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">{txt.dashboard}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('cabinet')}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'cabinet' ? 'glass-btn-active' : 'hover:bg-white/40 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'}`}
          >
            <User className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">Кабинет Инициатора</span>
          </button>

          <button 
            onClick={() => setActiveTab('plan')}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'plan' ? 'glass-btn-active' : 'hover:bg-white/40 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'}`}
          >
            <FileSpreadsheet className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">{txt.plan}</span>
          </button>
          <button 
            onClick={() => setActiveTab('spec')}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'spec' ? 'glass-btn-active' : 'hover:bg-white/40 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'}`}
          >
            <FileText className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">{txt.spec}</span>
          </button>
          <button 
            onClick={() => setActiveTab('structure')}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'structure' ? 'glass-btn-active' : 'hover:bg-white/40 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'}`}
          >
            <Network className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">{txt.structure || 'Структура'}</span>
          </button>
          <button 
            onClick={() => setActiveTab('initiators')}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'initiators' ? 'glass-btn-active' : 'hover:bg-white/40 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'}`}
          >
            <Users className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">{txt.initiators || 'Администраторы'}</span>
          </button>
          
          <div className="my-1 border-t border-slate-300/30 dark:border-slate-600/30"></div>

          <button 
            onClick={() => setActiveTab('wiki')}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'wiki' ? 'glass-btn-active' : 'hover:bg-white/40 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'}`}
          >
            <BookOpen className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">База Знаний (Вики)</span>
          </button>

          <div className="my-1 border-t border-slate-300/30 dark:border-slate-600/30"></div>

          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'history' ? 'glass-btn-active' : 'hover:bg-white/40 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'}`}
          >
            <History className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">{txt.history || 'История'}</span>
          </button>
          {isAdmin && (
            <>
              <button 
                onClick={() => setActiveTab('trash')}
                className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'trash' ? 'glass-btn-active' : 'hover:bg-white/40 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'}`}
              >
                <Archive className="w-5 h-5 opacity-70 shrink-0" /> 
                <span className="leading-tight">{txt.trash || 'Корзина/Архив'}</span>
              </button>
              <button 
                onClick={() => setActiveTab('admin' as any)}
                className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'admin' as any ? 'glass-btn-active' : 'hover:bg-white/40 dark:hover:bg-slate-700/40 text-slate-700 dark:text-slate-300'}`}
              >
                <Settings className="w-5 h-5 opacity-70 shrink-0" /> 
                <span className="leading-tight">{txt.admin || 'Админ (API & ERP)'}</span>
              </button>
            </>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-400/20 flex flex-col gap-4">
          {user && (
            <div className="flex flex-col gap-2 relative">
               <div className="text-xs font-semibold px-2 truncate text-slate-600" title={user.email}>{user.email}</div>
               <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/20 transition-colors">
                  <LogOut className="w-3 h-3" /> Выйти
               </button>
            </div>
          )}

          <div className="flex items-center justify-between px-2 gap-2">
            <button
               onClick={toggleDarkMode}
               className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
               title={darkMode ? "Светлая тема" : "Темная тема"}
            >
               {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="flex bg-white/30 dark:bg-slate-800/30 rounded-lg p-1 border border-white/50 dark:border-slate-700/50 flex-1 justify-center">
              <button 
                onClick={() => setLang('ru')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${lang === 'ru' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'opacity-50 dark:text-slate-400'}`}
              >
                RU
              </button>
              <button 
                onClick={() => setLang('kz')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${lang === 'kz' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'opacity-50 dark:text-slate-400'}`}
              >
                KZ
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 pl-0 overflow-hidden relative z-10 flex">
        <div className="glass-card flex-1 w-full h-full relative overflow-y-auto no-scrollbar shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
           <AnimatePresence mode="wait">
             {activeTab === 'dashboard' && <DashboardView key="dashboard" txt={txt} planData={planData} stats={dashboardStats} />}
             {activeTab === 'plan' && <PlanView key="plan" txt={txt} planData={planData} user={user} setPlanData={setPlanData} onSelectSpec={(idx) => { setSelectedSpecIndex(idx); setActiveTab('spec'); }} />}
             {activeTab === 'spec' && <SpecView key="spec" txt={txt} lang={lang} planData={planData} selectedSpecIndex={selectedSpecIndex} setSelectedSpecIndex={setSelectedSpecIndex} />}
             {activeTab === 'history' && <HistoryView key="history" historyData={historyData} txt={txt} isAdmin={isAdmin} user={user} />}
             {activeTab === 'structure' && <StructureView key="structure" txt={txt} />}
             {activeTab === 'initiators' && <InitiatorsView key="initiators" txt={txt} planData={planData} />}
             {activeTab === 'cabinet' && <CabinetView key="cabinet" user={user} />}
             {activeTab === 'wiki' && <WikiView key="wiki" />}
             {activeTab === 'trash' && <TrashView key="trash" trashData={trashData} txt={txt} isAdmin={isAdmin} />}
             {activeTab === ('admin' as any) && <AdminView key="admin" txt={txt} stats={dashboardStats} planData={planData} user={user} isAdmin={isAdmin} />}
           </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function DashboardView({ txt, planData, stats }: { txt: any, planData: ProcurementPlanItem[], stats: any, key?: string }) {
  const methodData = React.useMemo(() => {
    let tender = 0; let zcp = 0; let oi = 0;
    planData.forEach(item => {
      const method = String(item.procurementMethod || '').toLowerCase();
      if (method.includes('тендер')) tender++;
      else if (method.includes('зцп') || method.includes('запрос цен')) zcp++;
      else if (method.includes('иои') || method.includes('один источ') || method.match(/\bои\b/)) oi++;
    });
    return [
      { name: 'Тендер', value: tender },
      { name: 'ЗЦП', value: zcp },
      { name: 'Один источник', value: oi },
    ];
  }, [planData]);

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6'];
  const CATEGORY_COLORS = ['#f59e0b', '#ec4899', '#06b6d4'];

  const quarterData = [
    { name: txt.q1, plan: stats?.q1Plan || 0, fact: stats?.q1Fact || 0 },
    { name: txt.q2, plan: stats?.q2Plan || 0, fact: stats?.q2Fact || 0 },
    { name: txt.q3, plan: stats?.q3Plan || 0, fact: stats?.q3Fact || 0 },
    { name: txt.q4, plan: stats?.q4Plan || 0, fact: stats?.q4Fact || 0 },
  ];

  const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val).replace(/\s/g, '').replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
    return parseFloat(clean) || 0;
  };

  const totalBudgetFromPlan = planData.reduce((acc, curr) => acc + parseNum(curr.totalSumApproB), 0);
  const totalBudget = stats?.totalBudget !== undefined ? stats.totalBudget : totalBudgetFromPlan;

  const itemKindData = React.useMemo(() => {
    let goods = 0; let works = 0; let services = 0;
    planData.forEach(item => {
      const type = String(item.itemKind || '').toLowerCase();
      const sum = parseNum(item.totalSumApproB);
      if (type.includes('товар')) goods += sum;
      else if (type.includes('работ')) works += sum;
      else if (type.includes('услуг')) services += sum;
    });
    return [
      { name: 'Товары', value: goods },
      { name: 'Работы', value: works },
      { name: 'Услуги', value: services },
    ];
  }, [planData]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 h-full flex flex-col gap-6"
    >
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold tracking-tight">{txt.dashboard}</h1>
      </header>

      <div className="grid grid-cols-4 gap-6">
        <div className="glass-card p-6 flex flex-col justify-center">
          <h3 className="text-sm font-semibold opacity-70 uppercase tracking-widest">{txt.totalBudget}</h3>
          <p className="text-4xl font-light mt-2 tracking-tight">{(totalBudget / 1000000).toFixed(1)}M</p>
        </div>
        <div className="glass-card p-6 flex flex-col justify-center">
          <h3 className="text-sm font-semibold opacity-70 uppercase tracking-widest">{txt.savings}</h3>
          <p className="text-4xl font-light mt-2 tracking-tight text-emerald-600">{(Number(stats?.savings || 0) / 1000000).toFixed(1)}M</p>
        </div>
        <div className="glass-card p-6 flex flex-col justify-center">
          <h3 className="text-sm font-semibold opacity-70 uppercase tracking-widest">{txt.totalItems}</h3>
          <p className="text-4xl font-light mt-2 tracking-tight">{planData.length}</p>
        </div>
        <div className="glass-card p-6 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <PieChartIcon className="w-24 h-24" />
          </div>
          <h3 className="text-sm font-semibold opacity-70 uppercase tracking-widest">{txt.executionStatus}</h3>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-4xl font-light tracking-tight text-indigo-600">{stats?.executionStatus || 0}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 flex-1 min-h-0">
        <div className="col-span-2 glass-card p-6 flex flex-col min-h-[300px]">
          <h3 className="font-semibold text-lg mb-6">Исполнение закупок по кварталам</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="name" stroke="#64748b" opacity={0.5} />
                <YAxis stroke="#64748b" opacity={0.5} width={80} tickFormatter={(val) => (val / 1000000).toFixed(0) + 'M'} />
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.8)', borderRadius: '1rem', border: 'none', backdropFilter: 'blur(10px)' }}/>
                <Legend />
                <Bar dataKey="plan" fill="#94a3b8" radius={[4,4,0,0]} name="План" />
                <Bar dataKey="fact" fill="#3b82f6" radius={[4,4,0,0]} name="Факт" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-1 flex flex-col gap-6">
          <div className="glass-card p-6 flex-1 flex flex-col min-h-[250px]">
            <h3 className="font-semibold mb-2">{txt.byMethod} (Кол-во: шт)</h3>
            <div className="flex-1 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={methodData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {methodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.8)', borderRadius: '1rem', border: 'none' }} formatter={(value: number) => value + ' шт.'} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-[10px] font-medium flex-wrap">
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div> {txt.methodTender || 'Тендер'}</div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#10b981]"></div> {txt.methodZCP || 'ЗЦП'}</div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#8b5cf6]"></div> {txt.methodOI || 'ОИ'}</div>
            </div>
          </div>
        </div>
        
        <div className="col-span-1 flex flex-col gap-6">
          <div className="glass-card p-6 flex-1 flex flex-col min-h-[250px]">
            <h3 className="font-semibold mb-2">Объем по категориям</h3>
            <div className="flex-1 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={itemKindData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {itemKindData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.8)', borderRadius: '1rem', border: 'none' }} formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₸'} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-[10px] font-medium flex-wrap">
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div> Товары</div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ec4899]"></div> Работы</div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#06b6d4]"></div> Услуги</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function InitiatorsView({ txt, planData }: { txt: any, planData: ProcurementPlanItem[], key?: string }) {
  const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Remove spaces, currency symbols, and handle Kazakh/Russian grouping
    const clean = String(val).replace(/\s/g, '').replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
    return parseFloat(clean) || 0;
  };

  const initiatorStatsData = React.useMemo(() => {
    const statsObj: Record<string, { count: number, sum: number }> = {};
    planData.forEach(item => {
        const init = item.initiator?.trim() || 'Не указано';
        if (!statsObj[init]) statsObj[init] = { count: 0, sum: 0 };
        statsObj[init].count += 1;
        statsObj[init].sum += parseNum(item.totalSumApproB);
    });
    return Object.entries(statsObj).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count);
  }, [planData]);

  const top5Initiators = React.useMemo(() => {
    return initiatorStatsData.slice(0, 5).map(item => ({
       name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
       fullName: item.name,
       budget: item.sum
    }));
  }, [initiatorStatsData]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 h-full flex flex-col gap-6 overflow-hidden"
    >
      <header className="flex justify-between items-center mb-0 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">{txt.initiators || 'Администраторы'}</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[300px] shrink-0">
        <div className="glass-card flex-1 p-6 flex flex-col min-h-[300px]">
          <h3 className="font-semibold text-lg mb-4">Топ-5 инициаторов по затратам (Бюджет)</h3>
          <div className="flex-1">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={top5Initiators} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.1)" />
                 <XAxis type="number" stroke="#64748b" opacity={0.5} tickFormatter={(val) => (val / 1000000).toFixed(0) + 'M'} />
                 <YAxis dataKey="name" type="category" width={100} stroke="#64748b" opacity={0.8} tick={{fontSize: 10}} />
                 <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{ background: 'rgba(255,255,255,0.9)', borderRadius: '1rem', border: 'none', backdropFilter: 'blur(10px)' }} formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₸'} />
                 <Bar dataKey="budget" fill="#6366f1" radius={[0,4,4,0]} name="Бюджет" barSize={24}>
                   {top5Initiators.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'][index % 5]} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card flex-1 p-6 flex flex-col min-h-[300px]">
          <h3 className="font-semibold text-lg mb-4">Полный реестр</h3>
          <div className="overflow-x-auto flex-1 h-[250px] relative no-scrollbar">
          <table className="w-full text-sm text-left relative">
            <thead className="sticky top-0 bg-white/90 backdrop-blur z-10 shadow-sm">
              <tr className="border-b border-slate-200 uppercase opacity-60">
                <th className="py-3 px-4">Инициатор (Администратор)</th>
                <th className="py-3 px-4">Кол-во пунктов (Шт)</th>
                <th className="py-3 px-4">Общий бюджет (Тенге)</th>
              </tr>
            </thead>
            <tbody>
              {initiatorStatsData.map((init, i) => (
                 <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium max-w-sm truncate" title={init.name}>{init.name}</td>
                    <td className="py-3 px-4 font-bold text-slate-700">{init.count}</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold tracking-tight bg-emerald-50/30">
                       {init.sum.toLocaleString('ru-RU')} ₸
                    </td>
                 </tr>
              ))}
            </tbody>
          </table>
          {initiatorStatsData.length === 0 && (
             <div className="p-4 text-center text-slate-500 opacity-60 font-medium">Нет данных об инициаторах</div>
          )}
        </div>
      </div>
     </div>
    </motion.div>
  )
}

function StructureView({ txt }: { txt: any, key?: string }) {
  const structureData = [
    {
      id: 'root',
      name: '00 - AO «Dosjan temir joly»',
      type: 'company',
      expanded: true,
      children: [
        {
          id: 'dept1',
          name: '1 - Центральный аппарат',
          type: 'department',
          children: [
            { id: 'emp1', name: 'Сак Н.И. (Председатель Правления)', type: 'person' },
            { id: 'emp2', name: 'Бейсембаев С. Б. (Первый заместитель председателя правления)', type: 'person' },
            { id: 'emp3', name: 'Бадан А.Ж. (Заместитель Председателя Правления по экономике и финансам)', type: 'person' },
            { id: 'emp4', name: 'Адильбаев Н.С. (Заместитель Председателя Правления по производству)', type: 'person' },
            {
              id: 'dept1-2',
              name: '2 - Департаменты и службы',
              type: 'department',
              children: [
                {
                  id: 'dept1-2-1',
                  name: '1 - Административный персонал',
                  type: 'department',
                  children: [
                    { id: 'emp1-2-1-1', name: 'Исинаманов Б.А. (Советник Председателя Правления)', type: 'person' },
                    { id: 'emp1-2-1-2', name: 'Мамырбаев Р.Н. (Советник Председателя Правления)', type: 'person' },
                    { id: 'emp1-2-1-3', name: 'Петрищева О.В. (Корпоративный секретарь)', type: 'person' },
                    { id: 'emp1-2-1-4', name: 'Ахметов Т.Б. (Советник Председателя Правления)', type: 'person' },
                  ]
                },
                {
                  id: 'dept1-2-2',
                  name: '2 - Департамент стратегии и корпоративного развития',
                  type: 'department',
                  children: [
                    { id: 'emp1-2-2-1', name: 'Адамов А.У. (Директор Департамента)', type: 'person' },
                    { id: 'emp1-2-2-2', name: 'Толеугалиев Ж.А. (Главный менеджер по корпоративному развитию и политике)', type: 'person' },
                    { id: 'emp1-2-2-3', name: 'Сартаев С.М. (Главный менеджер по СМК и рискам)', type: 'person' },
                  ]
                },
                {
                  id: 'dept1-2-3',
                  name: '3 - Ревизорский аппарат',
                  type: 'department',
                  children: [
                    { id: 'emp1-2-3-1', name: 'Жарылгапов Р. Т. (Главный ревизор)', type: 'person' },
                    { id: 'emp1-2-3-2', name: 'Кожамбердинов Р.К. (Ревизор по безопасности движения)', type: 'person' },
                  ]
                },
                { id: 'dept1-2-4', name: '4 - Служба внутренней безопасности', type: 'department' },
                { id: 'dept1-2-5', name: '5 - Департамент инфраструктуры и технической политики:', type: 'department' },
                { id: 'dept1-2-6', name: '6 - Департамент экономики и финансов', type: 'department' },
                { id: 'dept1-2-7', name: '7 - Департамент правового обеспечения', type: 'department' },
                { id: 'dept1-2-8', name: '8 - Департамент административно-хозяйственной деятельности и закупок', type: 'department' },
                { id: 'dept1-2-9', name: '9 - Департамент бухгалтерского учета', type: 'department' },
                { id: 'dept1-2-10', name: '10 - Департамент HR и делопроизводства', type: 'department' },
                { id: 'dept1-2-12', name: '12 - Digital office', type: 'department' },
                { id: 'dept1-2-11', name: '11 - Сектор коммерции', type: 'department' },
              ]
            }
          ]
        },
        {
          id: 'dept2',
          name: '2 - Восточно-Казахстанский филиал АО "Dosjan temir joly"',
          type: 'department',
          children: [
            { id: 'emp2-1', name: 'Рахимов А.И. (Директор Восточно-Казахстанского филиала)', type: 'person' },
            { id: 'dept2-1', name: '1 - Административный персонал', type: 'department' },
            { id: 'dept2-2', name: '2 - Управление по организации строительства и ремонта', type: 'department' },
            { id: 'dept2-3', name: '3 - Отдел IT', type: 'department' },
            { id: 'dept2-4', name: '4 - Производственно-техническое управление', type: 'department' },
          ]
        },
        { id: 'sub1', name: '001 - ТОО «DTJ Service»', type: 'company' },
        { id: 'sub2', name: '002 - ТОО «DTJ Commerce»', type: 'company' },
        { id: 'sub3', name: '003 - ТОО «LexPRO»', type: 'company' },
        { id: 'sub4', name: '004 - ТОО «Smart Kinetics Qazaqstan»', type: 'company' },
        { id: 'sub5', name: '_ - Служба поддержки ТОО Documentolog', type: 'company' },
        { id: 'sub6', name: '1337 - Уволенные', type: 'company' },
      ]
    }
  ];

  const TreeNode = ({ node, level = 0 }: { node: any, level?: number, key?: any }) => {
    const [isExpanded, setIsExpanded] = useState(node.expanded || false);
    const hasChildren = node.children && node.children.length > 0;

    const Icon = node.type === 'company' ? Building2 : (node.type === 'person' ? User : Home);

    return (
      <div className="flex flex-col">
        <div 
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
          className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors cursor-pointer hover:bg-white/40 ${level === 0 ? 'font-bold text-slate-800' : 'text-slate-600 text-sm'}`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />
            ) : null}
          </div>
          <Icon className={`w-4 h-4 shrink-0 ${node.type === 'person' ? 'text-blue-500' : 'text-slate-500'}`} />
          <span className="truncate">{node.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div className="flex flex-col">
            {node.children.map((child: any) => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 h-full flex flex-col"
    >
      <header className="mb-8 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">{txt.structure || 'Структура компании'}</h1>
      </header>
      <div className="flex-1 overflow-auto glass-card p-6 bg-white/30">
        {structureData.map(node => (
          <TreeNode key={node.id} node={node} />
        ))}
      </div>
    </motion.div>
  );
}

function AdminView({ txt, stats, planData, user, isAdmin }: { txt: any, stats: any, planData: any[], user: any, isAdmin: boolean, key?: string }) {
  const [formData, setFormData] = useState<any>(stats || {});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (stats) setFormData(stats);
  }, [stats]);

  const handleSave = async () => {
    if (!user || !isAdmin) return alert("Ограничено для администратора");
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const ref = doc(db, 'dashboardStats', 'current');
      batch.set(ref, { 
        ...formData, 
        companyId: 'default',
        updatedAt: serverTimestamp(),
        updatedBy: user.uid 
      }, { merge: true });
      await batch.commit();
      alert(txt.statsUpdated || "Данные обновлены");
    } catch (e) {
      console.error(e);
      alert("Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!isAdmin) return;
    if (!confirm("Переместить всю историю корректировок в корзину?")) return;
    
    setIsDeleting(true);
    try {
      const snap = await getDocs(collection(db, 'planHistory'));
      
      const CHUNK_SIZE = 450;
      for (let i = 0; i < snap.docs.length; i += CHUNK_SIZE) {
        const chunk = snap.docs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(d => {
          const trashRef = doc(collection(db, 'historyTrash'));
          batch.set(trashRef, { ...d.data(), originalId: d.id, deletedAt: serverTimestamp(), deletedBy: user.email });
          batch.delete(d.ref);
        });
        await batch.commit();
      }
      
      alert("История перемещена в корзину");
    } catch (e) {
      console.error(e);
      alert("Ошибка при очистке истории");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearPlan = async () => {
    if (!isAdmin) return;
    if (!confirm("ВНИМАНИЕ! Переместить ВЕСЬ ПЛАН ЗАКУПОК в корзину? (Вы сможете восстановить его позже)")) return;
    
    setIsDeleting(true);
    try {
      const snap = await getDocs(collection(db, 'planItems'));
      
      const CHUNK_SIZE = 450;
      for (let i = 0; i < snap.docs.length; i += CHUNK_SIZE) {
        const chunk = snap.docs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(d => {
          const trashRef = doc(collection(db, 'planTrash'));
          batch.set(trashRef, { ...d.data(), originalId: d.id, deletedAt: serverTimestamp(), deletedBy: user.email });
          batch.delete(d.ref);
        });
        await batch.commit();
      }

      alert("План закупок перемещен в корзину");
    } catch (e) {
      console.error(e);
      alert("Ошибка при удалении плана");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (field: string, val: any) => {
    const clean = String(val).replace(/\s/g, '').replace(/,/g, '.');
    const num = parseFloat(clean);
    setFormData((prev: any) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8 h-full overflow-auto"
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{txt.admin || 'Админ-панель'}</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="flex flex-col gap-6 glass-card p-6 border-blue-100 bg-blue-50/10">
          <h3 className="font-bold text-lg text-blue-800 border-b pb-2">Основные показатели</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold opacity-60 mb-1 block">{txt.totalBudget}</label>
              <input type="number" className="glass-input w-full p-2" value={formData.totalBudget ?? ''} onChange={e => handleChange('totalBudget', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold opacity-60 mb-1 block">{txt.savings}</label>
              <input type="number" className="glass-input w-full p-2" value={formData.savings ?? ''} onChange={e => handleChange('savings', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold opacity-60 mb-1 block">{txt.executionStatus}</label>
              <input type="number" className="glass-input w-full p-2" value={formData.executionStatus ?? ''} onChange={e => handleChange('executionStatus', e.target.value)} />
            </div>
          </div>
          
          <h3 className="font-bold text-lg text-emerald-800 border-b pb-2 mt-4">Способы закупок</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
               <label className="text-xs font-bold opacity-60 mb-1 block">Тендер</label>
               <input type="number" className="glass-input w-full p-2" value={formData.methodTender ?? ''} onChange={e => handleChange('methodTender', e.target.value)} />
            </div>
            <div>
               <label className="text-xs font-bold opacity-60 mb-1 block">ЗЦП</label>
               <input type="number" className="glass-input w-full p-2" value={formData.methodZCP ?? ''} onChange={e => handleChange('methodZCP', e.target.value)} />
            </div>
            <div>
               <label className="text-xs font-bold opacity-60 mb-1 block">Один источник</label>
               <input type="number" className="glass-input w-full p-2" value={formData.methodOI ?? ''} onChange={e => handleChange('methodOI', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 glass-card p-6 border-indigo-100 bg-indigo-50/10">
          <h3 className="font-bold text-lg text-indigo-800 border-b pb-2">Исполнение по кварталам (План/Факт)</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(q => (
              <div key={q} className="flex gap-4 items-end">
                <div className="w-16 font-bold text-sm mb-2">{q}-й кв.</div>
                <div className="flex-1">
                   <label className="text-[10px] font-bold opacity-50 uppercase">План</label>
                   <input type="number" className="glass-input w-full p-2" value={formData[`q${q}Plan`] ?? ''} onChange={e => handleChange(`q${q}Plan`, e.target.value)} />
                </div>
                <div className="flex-1">
                   <label className="text-[10px] font-bold opacity-50 uppercase">Факт</label>
                   <input type="number" className="glass-input w-full p-2" value={formData[`q${q}Fact`] ?? ''} onChange={e => handleChange(`q${q}Fact`, e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-12">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="glass-btn-primary px-12 py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 disabled:opacity-50"
        >
          {isSaving ? '...' : txt.save}
        </button>
      </div>

      <div className="glass-card p-8 border-rose-100 bg-rose-50/10">
        <h3 className="font-bold text-xl text-rose-800 mb-6 flex items-center gap-3">
            <Archive className="w-6 h-6" /> Управление данными (Архивация)
        </h3>
        <p className="text-sm text-slate-500 mb-8 italic">Данные будут перемещены в корзину, где вы сможете просмотреть их или восстановить.</p>
        
        <div className="flex flex-wrap gap-6">
            <button 
              onClick={handleClearHistory}
              disabled={isDeleting}
              className="flex items-center gap-3 px-6 py-4 bg-white border border-rose-200 text-rose-600 rounded-xl font-bold hover:bg-rose-50 transition-all shadow-sm"
            >
                <History className="w-5 h-5" /> Архивировать историю
            </button>
            <button 
              onClick={async () => {
                if (!confirm("ВНИМАНИЕ! ВСЯ ИСТОРИЯ БУДЕТ УДАЛЕНА НАВСЕГДА БЕЗ ВОЗМОЖНОСТИ ВОССТАНОВЛЕНИЯ. Продолжить?")) return;
                setIsDeleting(true);
                try {
                  const snap = await getDocs(collection(db, 'planHistory'));
                  const CHUNK_SIZE = 450;
                  for (let i = 0; i < snap.docs.length; i += CHUNK_SIZE) {
                    const b = writeBatch(db);
                    snap.docs.slice(i, i + CHUNK_SIZE).forEach(d => b.delete(d.ref));
                    await b.commit();
                  }
                  alert("История полностью удалена");
                } catch (e) { console.error(e); } finally { setIsDeleting(false); }
              }}
              disabled={isDeleting}
              className="flex items-center gap-3 px-6 py-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl font-bold hover:bg-rose-100 transition-all shadow-sm"
              title="Удалить навсегда без архивации"
            >
                <XCircle className="w-5 h-5" /> Удалить историю навсегда
            </button>
            <button 
              onClick={handleClearPlan}
              disabled={isDeleting}
              className="flex items-center gap-3 px-6 py-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
            >
                <Archive className="w-5 h-5" /> Переместить план в архив
            </button>
        </div>
      </div>
    </motion.div>
  );
}

function HistoryView({ historyData, txt, isAdmin, user, key }: { historyData: any[], txt: any, isAdmin: boolean, user: any, key?: string }) {
  const handleDeleteItem = async (record: any) => {
    if (!isAdmin) return;
    if (!confirm("Переместить эту запись в корзину?")) return;
    try {
      const batch = writeBatch(db);
      const trashRef = doc(collection(db, 'historyTrash'));
      batch.set(trashRef, { ...record, originalId: record.id, deletedAt: serverTimestamp(), deletedBy: user.email });
      batch.delete(doc(db, 'planHistory', record.id));
      await batch.commit();
    } catch (e) {
      console.error(e);
      alert("Ошибка при архивации");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 h-full flex flex-col"
    >
       <header className="flex justify-between items-center mb-8 shrink-0">
          <h1 className="text-3xl font-bold tracking-tight">{txt.history || 'История корректировок'}</h1>
       </header>
       <div className="flex-1 overflow-auto rounded-2xl glass-card relative p-2 shadow-inner">
         {historyData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-400 font-medium">Нет записей в истории</div>
         ) : (
           <div className="flex flex-col gap-4 p-4">
             {historyData.map((record) => (
                <div key={record.id} className="glass-card p-6 border-l-4 border-l-blue-500 hover:bg-white/60 transition-colors relative group">
                  {isAdmin && (
                    <button 
                      onClick={() => handleDeleteItem(record)}
                      className="absolute top-4 right-4 p-2 text-rose-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                      title="В архив"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex justify-between items-start mb-3 pr-10">
                     <div>
                       <h3 className="font-bold text-slate-800 text-lg">Загрузка плана</h3>
                       <p className="text-xs font-semibold opacity-60">
                         {record.createdAt?.toDate ? format(record.createdAt.toDate(), 'dd.MM.yyyy HH:mm:ss') : 'Неизвестно'}
                       </p>
                     </div>
                     <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                       {record.createdByName || record.createdBy}
                     </span>
                  </div>
                  <div className="flex gap-4">
                     <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 text-sm font-semibold">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Добавлено: {record.addedCount || 0}
                     </div>
                     <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100 text-sm font-semibold">
                       <span className="w-2 h-2 rounded-full bg-amber-500"></span> Обновлено: {record.updatedCount || 0}
                     </div>
                     <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg border border-rose-100 text-sm font-semibold">
                       <span className="w-2 h-2 rounded-full bg-rose-500"></span> Удалено: {record.removedCount || 0}
                     </div>
                  </div>
                </div>
             ))}
           </div>
         )}
       </div>
    </motion.div>
  );
}

function TrashView({ trashData, txt, isAdmin }: { trashData: { plan: any[], history: any[] }, txt: any, isAdmin: boolean, key?: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'plan' | 'history'>('plan');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRestorePlan = async (item: any) => {
     if (!isAdmin) return;
     setIsProcessing(true);
     try {
        const batch = writeBatch(db);
        const restoreData = { ...item };
        delete restoreData.id;
        delete restoreData.originalId;
        delete restoreData.deletedAt;
        delete restoreData.deletedBy;
        
        batch.set(doc(db, 'planItems', item.originalId || doc(collection(db, 'planItems')).id), restoreData);
        batch.delete(doc(db, 'planTrash', item.id));
        await batch.commit();
     } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handleRestoreHistory = async (item: any) => {
     if (!isAdmin) return;
     setIsProcessing(true);
     try {
        const batch = writeBatch(db);
        const restoreData = { ...item };
        delete restoreData.id;
        delete restoreData.originalId;
        delete restoreData.deletedAt;
        delete restoreData.deletedBy;
        
        batch.set(doc(db, 'planHistory', item.originalId || doc(collection(db, 'planHistory')).id), restoreData);
        batch.delete(doc(db, 'historyTrash', item.id));
        await batch.commit();
     } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handlePersistentDelete = async (id: string, type: 'plan' | 'history') => {
     if (!isAdmin) return;
     if (!confirm("Удалить навсегда? Это действие невозможно отменить.")) return;
     setIsProcessing(true);
     try {
        await deleteDoc(doc(db, type === 'plan' ? 'planTrash' : 'historyTrash', id));
     } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const handleEmptyTrash = async () => {
    if (!isAdmin) return;
    if (!confirm(`Очистить всю корзину (${activeSubTab === 'plan' ? 'планы' : 'историю'}) навсегда?`)) return;
    setIsProcessing(true);
    try {
      const coll = activeSubTab === 'plan' ? 'planTrash' : 'historyTrash';
      const snap = await getDocs(collection(db, coll));
      const CHUNK = 450;
      for (let i = 0; i < snap.docs.length; i += CHUNK) {
        const b = writeBatch(db);
        snap.docs.slice(i, i + CHUNK).forEach(d => b.delete(d.ref));
        await b.commit();
      }
      alert("Корзина очищена");
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-8 h-full flex flex-col gap-6"
    >
      <header className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
             <Archive className="w-8 h-8 text-rose-500" /> {txt.trash || 'Корзина / Архив'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium italic">Место для временного хранения удаленных данных</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleEmptyTrash}
            disabled={isProcessing || (activeSubTab === 'plan' ? trashData.plan.length === 0 : trashData.history.length === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all border border-rose-200 disabled:opacity-30"
          >
            <XCircle className="w-4 h-4" /> Очистить всё
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
             <button 
               onClick={() => setActiveSubTab('plan')}
               className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'plan' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                План закупок ({trashData.plan.length})
             </button>
             <button 
               onClick={() => setActiveSubTab('history')}
               className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'history' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                История ({trashData.history.length})
             </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto glass-card border border-rose-100 bg-rose-50/5 p-2">
         {activeSubTab === 'plan' ? (
            <div className="flex flex-col gap-3 p-4">
               {trashData.plan.map((item) => (
                 <div key={item.id} className="bg-white border border-slate-200 p-4 rounded-xl flex justify-between items-center group hover:border-rose-300 transition-all shadow-sm">
                    <div className="flex flex-col gap-1 overflow-hidden pr-4">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Удалено {item.deletedAt?.toDate ? format(item.deletedAt.toDate(), 'dd.MM.yyyy HH:mm') : '-'}</span>
                       <h4 className="font-bold text-slate-800 truncate" title={item.nameRu}>{item.nameRu}</h4>
                       <span className="text-xs text-slate-500 font-medium">№ п/п: {item.rowNum} | Бюджет: {item.totalSumApproB?.toLocaleString('ru-RU')} ₸</span>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         disabled={isProcessing}
                         onClick={() => handleRestorePlan(item)}
                         className="p-3 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 hover:scale-105 active:scale-95 transition-all shadow-sm border border-emerald-100"
                         title="Восстановить"
                       >
                          <RefreshCw className="w-5 h-5" />
                       </button>
                       <button 
                         disabled={isProcessing}
                         onClick={() => handlePersistentDelete(item.id, 'plan')}
                         className="p-3 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all shadow-sm border border-rose-100"
                         title="Удалить навсегда"
                       >
                          <XCircle className="w-5 h-5" />
                       </button>
                    </div>
                 </div>
               ))}
               {trashData.plan.length === 0 && <div className="text-center p-12 text-slate-400 font-medium italic">Корзина планов пуста</div>}
            </div>
         ) : (
            <div className="flex flex-col gap-3 p-4">
               {trashData.history.map((record) => (
                 <div key={record.id} className="bg-white border border-slate-200 p-4 rounded-xl flex justify-between items-center group hover:border-rose-300 transition-all shadow-sm">
                    <div className="flex flex-col gap-1 overflow-hidden pr-4">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Удалено {record.deletedAt?.toDate ? format(record.deletedAt.toDate(), 'dd.MM.yyyy HH:mm') : '-'}</span>
                       <h4 className="font-bold text-slate-800">Загрузка плана от {record.createdAt?.toDate ? format(record.createdAt.toDate(), 'dd.MM.yyyy') : '-'}</h4>
                       <span className="text-xs text-slate-500 font-medium">{record.changesSummary}</span>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         disabled={isProcessing}
                         onClick={() => handleRestoreHistory(record)}
                         className="p-3 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 hover:scale-105 active:scale-95 transition-all shadow-sm border border-emerald-100"
                         title="Восстановить"
                       >
                          <RefreshCw className="w-5 h-5" />
                       </button>
                       <button 
                         disabled={isProcessing}
                         onClick={() => handlePersistentDelete(record.id, 'history')}
                         className="p-3 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all shadow-sm border border-rose-100"
                         title="Удалить навсегда"
                       >
                          <XCircle className="w-5 h-5" />
                       </button>
                    </div>
                 </div>
               ))}
               {trashData.history.length === 0 && <div className="text-center p-12 text-slate-400 font-medium italic">Корзина истории пуста</div>}
            </div>
         )}
      </div>
    </motion.div>
  );
}

function PlanView({ txt, planData, user, setPlanData, onSelectSpec }: { txt: any, planData: ProcurementPlanItem[], user: any, setPlanData: any, onSelectSpec: (idx: number) => void, key?: string }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'товар' | 'работа' | 'услуга'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDiff, setPreviewDiff] = useState<{ added: number, updated: number, removed: number, parsed: any[] } | null>(null);
  const [discussItem, setDiscussItem] = useState<ProcurementPlanItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val).replace(/\s/g, '').replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
    return parseFloat(clean) || 0;
  };

  const menuCategories = [
    { id: 'all', name: 'Все' },
    { id: 'товар', name: 'Товары' },
    { id: 'работа', name: 'Работы' },
    { id: 'услуга', name: 'Услуги' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      let headerRowIndex = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i][0] && String(data[i][0]).toLowerCase().includes('п/п')) {
           headerRowIndex = i;
           break;
        }
      }
      
      const rows = data.slice(headerRowIndex + 1);
      const parsed = rows.filter(r => r.length >= 24 && r[0]).map(r => ({
        rowNum: r[0] || '',
        type: String(r[1] || ''),
        itemKind: String(r[2] || ''),
        code: String(r[3] || ''),
        nameKz: String(r[4] || ''),
        nameRu: String(r[5] || ''),
        descKz: String(r[6] || ''),
        descRu: String(r[7] || ''),
        extraDescKz: String(r[8] || ''),
        extraDescRu: String(r[9] || ''),
        budgetRuName: String(r[10] || ''),
        procurementMethod: String(r[11] || ''),
        unit: String(r[12] || ''),
        quantity: parseNum(r[13]),
        unitPrice: parseNum(r[14]),
        totalSumApproB: parseNum(r[15]),
        sum2026: parseNum(r[16]),
        month: String(r[17] || ''),
        deliveryPeriodKz: String(r[18] || ''),
        deliveryPeriodRu: String(r[19] || ''),
        kato: String(r[20] || ''),
        deliveryPlaceKz: String(r[21] || ''),
        deliveryPlaceRu: String(r[22] || ''),
        advancePercent: parseNum(r[23]),
        initiator: String(r[24] || ''),
        companyId: 'default'
      }));

      if (parsed.length > 0) {
        if (!user) {
          alert('Необходима авторизация для загрузки плана.');
          setPlanData(parsed);
          setIsProcessing(false);
          return;
        }

        const oldMap = new Map(planData.map(p => [(p.code || '') + (p.nameRu || ''), p]));
        const newMap = new Map(parsed.map(p => [(p.code || '') + (p.nameRu || ''), p]));

        let added = 0;
        let updated = 0;
        let removed = 0;

        for (const key of oldMap.keys()) {
          if (!newMap.has(key)) removed++;
        }
        for (const [key, newItem] of newMap.entries()) {
          if (!oldMap.has(key)) added++;
          else updated++;
        }

        setPreviewDiff({ added, updated, removed, parsed });
        setIsProcessing(false);
        return;
      } else {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const confirmAndSyncPlan = async () => {
    if (!previewDiff) return;
    setIsProcessing(true);
    const { parsed, added, updated, removed } = previewDiff;

    try {
      const oldItems = await getDocs(collection(db, 'planItems'));
      const CHUNK = 450;
      for (let i = 0; i < oldItems.docs.length; i += CHUNK) {
        const b = writeBatch(db);
        oldItems.docs.slice(i, i + CHUNK).forEach(d => b.delete(d.ref));
        await b.commit();
      }

      for (let i = 0; i < parsed.length; i += CHUNK) {
        const b = writeBatch(db);
        parsed.slice(i, i + CHUNK).forEach(item => {
          const ref = doc(collection(db, 'planItems'));
          b.set(ref, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        });
        await b.commit();
      }

      const histRef = doc(collection(db, 'planHistory'));
      await setDoc(histRef, {
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByName: user.email || 'Неизвестно',
        companyId: 'default',
        addedCount: added,
        updatedCount: updated,
        removedCount: removed,
        changesSummary: `Обновлен план. Добавлено: ${added}, Обновлено: ${updated}, Удалено: ${removed} (всего: ${parsed.length})`
      });

      setIsProcessing(false);
      setPreviewDiff(null);
      alert(`План успешно загружен и сохранен!\n\nРезультат:\n+ Добавлено: ${added}\n~ Обновлено: ${updated}\n- Удалено: ${removed}`);
    } catch (e) {
      console.error("Firebase Sync Error:", e);
      alert('Ошибка синхронизации');
      setIsProcessing(false);
    }
  };

  const filteredPlan = planData
    .filter(p => {
      if (activeCategory !== 'all' && String(p.itemKind).toLowerCase() !== activeCategory) return false;
      if (!search.trim()) return true;
      const terms = search.toLowerCase().split(' ').filter(Boolean);
      return terms.every(term => 
        String(p.nameRu).toLowerCase().includes(term) || 
        String(p.code).toLowerCase().includes(term) ||
        String(p.nameKz).toLowerCase().includes(term) ||
        String(p.rowNum).toLowerCase().includes(term) ||
        String(p.initiator).toLowerCase().includes(term) ||
        String(p.budgetRuName).toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      // Numerical sort for row numbers
      const numA = parseInt(String(a.rowNum)) || 0;
      const numB = parseInt(String(b.rowNum)) || 0;
      if (numA !== numB) return numA - numB;
      return String(a.rowNum).localeCompare(String(b.rowNum));
    });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full flex flex-col relative"
    >
      {previewDiff && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 flex flex-col gap-6">
            <h3 className="text-2xl font-bold text-slate-800">Предпросмотр загрузки</h3>
            <p className="text-slate-600 text-sm">
              В новом плане <strong>{previewDiff.parsed.length}</strong> позиций. Вот что изменится в базе:
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center p-3 bg-emerald-50 text-emerald-700 rounded-lg">
                 <span className="font-medium">Новых позиций:</span>
                 <span className="font-bold text-lg">+{previewDiff.added}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 text-blue-700 rounded-lg">
                 <span className="font-medium">Совпадений (Обновлено):</span>
                 <span className="font-bold text-lg">~{previewDiff.updated}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-rose-50 text-rose-700 rounded-lg">
                 <span className="font-medium">Удалено позиций:</span>
                 <span className="font-bold text-lg">-{previewDiff.removed}</span>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button 
                disabled={isProcessing}
                onClick={() => setPreviewDiff(null)}
                className="px-5 py-2.5 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Отмена
              </button>
              <button 
                disabled={isProcessing}
                onClick={confirmAndSyncPlan}
                className="px-5 py-2.5 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Применить и сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-8 pb-4 flex justify-between items-center shrink-0 flex-wrap gap-4">
         <div className="flex items-center gap-6">
           <h1 className="text-3xl font-bold tracking-tight">{txt.plan}</h1>
           <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
             {menuCategories.map(cat => (
               <button 
                 key={cat.id}
                 onClick={() => setActiveCategory(cat.id as any)}
                 className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeCategory === cat.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 {cat.name}
               </button>
             ))}
           </div>
         </div>
         <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input 
                type="text" 
                placeholder={txt.searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="glass-input pl-10 pr-4 py-2 w-[280px] text-sm"
              />
            </div>
            <div>
              <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={(e) => { setIsProcessing(true); handleFileUpload(e); }} />
              <button disabled={isProcessing} onClick={() => fileInputRef.current?.click()} className="glass-btn-primary flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-transform active:scale-95">
                 <Upload className={`w-4 h-4 ${isProcessing ? 'animate-bounce' : ''}`} /> {isProcessing ? '...' : txt.uploadPlan}
              </button>
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-auto p-8 pt-0">
         <div className="inline-block min-w-max border border-white/40 rounded-2xl overflow-hidden glass-card shadow-2xl shadow-blue-900/5">
           <table className="w-full text-xs text-left whitespace-nowrap">
             <thead>
               <tr className="uppercase tracking-wider">
                 <th className="p-3 bg-indigo-50 text-indigo-900 font-bold sticky left-0 z-10 text-center">Создать</th>
                 <th className="p-3">№ п/п</th>
                 <th className="p-3 bg-blue-50/20">Тип пункта плана</th>
                 <th className="p-3">Вид предмета</th>
                 <th className="p-3 bg-blue-50/20">Код товара (СТРУ)</th>
                 <th className="p-3">Наименование (KZ)</th>
                 <th className="p-3 bg-blue-50/20">Наименование (RU)</th>
                 <th className="p-3">Краткая хар-ка (KZ)</th>
                 <th className="p-3 bg-blue-50/20">Краткая хар-ка (RU)</th>
                 <th className="p-3">Доп. хар-ка (KZ)</th>
                 <th className="p-3 bg-blue-50/20">Доп. хар-ка (RU)</th>
                 <th className="p-3">Наименование (Бюджет)</th>
                 <th className="p-3 bg-blue-50/20">Способ закупок</th>
                 <th className="p-3">Ед. изм</th>
                 <th className="p-3 bg-blue-50/20">Кол-во</th>
                 <th className="p-3">Цена за ед (без НДС)</th>
                 <th className="p-3 bg-blue-50/20">Общая сумма</th>
                 <th className="p-3">Сумма 2026</th>
                 <th className="p-3 bg-blue-50/20">Срок закупок(мес)</th>
                 <th className="p-3">Срок поставки (KZ)</th>
                 <th className="p-3 bg-blue-50/20">Срок поставки (RU)</th>
                 <th className="p-3">КАТО</th>
                 <th className="p-3 bg-blue-50/20">Место поставки (KZ)</th>
                 <th className="p-3">Место поставки (RU)</th>
                 <th className="p-3 bg-blue-50/20">Аванс %</th>
                 <th className="p-3">Инициатор</th>
               </tr>
             </thead>
             <tbody>
               {filteredPlan.map((item, idx) => (
                 <tr key={idx} className="hover:bg-white/50 transition-colors group">
                   <td className="p-2 border-r border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/20 text-center sticky left-0 z-10 group-hover:bg-indigo-100/80 dark:group-hover:bg-indigo-800/40 transition-colors">
                     <div className="flex items-center justify-center gap-1.5 min-w-[70px]">
                       <button 
                         onClick={() => onSelectSpec(planData.indexOf(item))} 
                         className="glass-btn-primary px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider tooltip-trigger"
                         title="Создать Техспецификацию"
                       >
                         {txt.createSpecBtn || 'ТЗ'}
                       </button>
                       <button
                         onClick={() => setDiscussItem(item)}
                         className="p-1.5 rounded-lg bg-white/60 hover:bg-white text-indigo-500 shadow-sm transition-all"
                         title="Обсуждение и комментарии"
                       >
                          <MessageSquare className="w-4 h-4" />
                       </button>
                     </div>
                   </td>
                   <td className="p-3 font-mono font-medium pl-4">{item.rowNum}</td>
                   <td className="p-3 max-w-[200px] truncate bg-blue-50/20" title={item.type}>{item.type}</td>
                   <td className="p-3 max-w-[100px] truncate" title={item.itemKind}>{item.itemKind}</td>
                   <td className="p-3 font-mono text-blue-600 bg-blue-50/20">{item.code}</td>
                   <td className="p-3 max-w-[200px] truncate" title={item.nameKz}>{item.nameKz}</td>
                   <td className="p-3 max-w-[200px] truncate bg-blue-50/20" title={item.nameRu}>{item.nameRu}</td>
                   <td className="p-3 max-w-[200px] truncate" title={item.descKz}>{item.descKz}</td>
                   <td className="p-3 max-w-[200px] truncate bg-blue-50/20" title={item.descRu}>{item.descRu}</td>
                   <td className="p-3 max-w-[250px] truncate" title={item.extraDescKz}>{item.extraDescKz}</td>
                   <td className="p-3 max-w-[250px] truncate bg-blue-50/20" title={item.extraDescRu}>{item.extraDescRu}</td>
                   <td className="p-3 max-w-[200px] truncate" title={item.budgetRuName}>{item.budgetRuName}</td>
                   <td className="p-3 font-semibold bg-blue-50/20">{item.procurementMethod}</td>
                   <td className="p-3">{item.unit}</td>
                   <td className="p-3 text-right font-mono bg-blue-50/20">{Number(item.quantity).toLocaleString()}</td>
                   <td className="p-3 text-right font-mono">{Number(item.unitPrice).toLocaleString()}</td>
                   <td className="p-3 text-right font-mono font-semibold bg-blue-50/20">{Number(item.totalSumApproB).toLocaleString()}</td>
                   <td className="p-3 text-right font-mono">{Number(item.sum2026).toLocaleString()}</td>
                   <td className="p-3 bg-blue-50/20">{item.month}</td>
                   <td className="p-3 max-w-[150px] truncate" title={item.deliveryPeriodKz}>{item.deliveryPeriodKz}</td>
                   <td className="p-3 max-w-[150px] truncate bg-blue-50/20" title={item.deliveryPeriodRu}>{item.deliveryPeriodRu}</td>
                   <td className="p-3 font-mono">{item.kato}</td>
                   <td className="p-3 max-w-[200px] truncate bg-blue-50/20" title={item.deliveryPlaceKz}>{item.deliveryPlaceKz}</td>
                   <td className="p-3 max-w-[200px] truncate" title={item.deliveryPlaceRu}>{item.deliveryPlaceRu}</td>
                   <td className="p-3 text-center bg-blue-50/20">{item.advancePercent}</td>
                   <td className="p-3 max-w-[150px] truncate" title={item.initiator}>{item.initiator}</td>
                 </tr>
               ))}
               {filteredPlan.length === 0 && (
                 <tr>
                   <td colSpan={25} className="p-8 text-center text-slate-500 font-medium">
                      Нет данных или не найдено совпадений
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </div>
      
      {/* Item Discussion Modal */}
      <AnimatePresence>
        {discussItem && (
          <ItemDiscussionModal item={discussItem} user={user} planData={planData} onClose={() => setDiscussItem(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function SpecView({ txt, lang, planData, selectedSpecIndex, setSelectedSpecIndex }: { txt: any, lang: 'ru'|'kz', planData: ProcurementPlanItem[], selectedSpecIndex: number, setSelectedSpecIndex: (idx: number) => void, key?: string }) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'товар' | 'работа' | 'услуга'>('all');
  const specData = planData[selectedSpecIndex] || null;

  const loadSavedTemplate = () => {
    try {
      const saved = localStorage.getItem('techSpecTemplate');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  };
  const tpl = loadSavedTemplate();

  const [approverPosition, setApproverPosition] = useState(tpl.approverPosition || '');
  const [approverFIO, setApproverFIO] = useState(tpl.approverFIO || '');
  
  const [developerPosition, setDeveloperPosition] = useState(tpl.developerPosition || '');
  const [developerFIO, setDeveloperFIO] = useState(tpl.developerFIO || '');
  
  const [paymentTerms, setPaymentTerms] = useState(tpl.paymentTerms || '');
  const [warranty, setWarranty] = useState(tpl.warranty || '');
  const [reqDescStr, setReqDescStr] = useState('');

  // Auto-save templates when they change
  React.useEffect(() => {
    localStorage.setItem('techSpecTemplate', JSON.stringify({
      approverPosition, approverFIO, developerPosition, developerFIO, paymentTerms, warranty
    }));
  }, [approverPosition, approverFIO, developerPosition, developerFIO, paymentTerms, warranty]);

  const menuCategories = [
    { id: 'all', name: 'Все' },
    { id: 'товар', name: 'Товары' },
    { id: 'работа', name: 'Работы' },
    { id: 'услуга', name: 'Услуги' },
  ];

  const filteredOptions = React.useMemo(() => {
    return planData.filter(p => {
      if (activeCategory === 'all') return true;
      const kind = String(p.itemKind || '').toLowerCase();
      if (activeCategory === 'товар') return kind.includes('товар');
      if (activeCategory === 'работа') return kind.includes('работ');
      if (activeCategory === 'услуга') return kind.includes('услуг');
      return false;
    });
  }, [planData, activeCategory]);

  // Auto-select first item when category changes if current item is not in category
  React.useEffect(() => {
    if (activeCategory !== 'all') {
      const currentItem = planData[selectedSpecIndex];
      const kind = String(currentItem?.itemKind || '').toLowerCase();
      let isCurrentInCategory = false;
      if (activeCategory === 'товар') isCurrentInCategory = kind.includes('товар');
      if (activeCategory === 'работа') isCurrentInCategory = kind.includes('работ');
      if (activeCategory === 'услуга') isCurrentInCategory = kind.includes('услуг');
      
      if (!isCurrentInCategory && filteredOptions.length > 0) {
        setSelectedSpecIndex(planData.indexOf(filteredOptions[0]));
      }
    }
  }, [activeCategory, filteredOptions, planData, selectedSpecIndex, setSelectedSpecIndex]);

  const handleExportWord = () => {
    const specDoc = document.getElementById('spec-document-content');
    if (!specDoc) return;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Tech Spec</title>
      <style>
        body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; padding: 20pt; }
        h2 { text-align: center; font-size: 14pt; margin-top: 24pt; margin-bottom: 24pt; font-weight: bold; text-transform: uppercase; }
        .header-top { text-align: right; margin-bottom: 30pt; }
        .header-top div { line-height: 1.5; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 30pt; table-layout: fixed; }
        th, td { border: 1px solid black; padding: 6pt; text-align: left; vertical-align: top; word-wrap: break-word; }
        .footer-block { display: block; margin-top: 40pt; }
      </style>
      </head><body>
        <div class="header-top">
          <div style="font-weight:bold">${txt.approvedBy}</div>
          <div>${approverPosition}</div>
          <div>АО «Dosjan temir joly»</div>
          <div>____________________ ${approverFIO}</div>
          <div>«__» ________________ 2026 г.</div>
        </div>
        <h2>${txt.specTitle}</h2>
        ${specDoc.querySelector('table')?.outerHTML || ''}
        <div class="footer-block" style="margin-top: 40pt; line-height: 1.5;">
          <div>${txt.developedBy}</div>
          <div>
            ${developerPosition} 
            <span style="display:inline-block; width:150px; border-bottom:1px solid #000; margin:0 10px;"></span> 
            ${developerFIO}
          </div>
        </div>
      </body></html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Spec_${specData?.rowNum || 'Doc'}_${lang.toUpperCase()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isRu = lang === 'ru';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 h-full flex flex-col"
    >
      <header className="flex flex-col gap-6 mb-8 shrink-0">
        <div className="flex justify-between items-center">
           <h1 className="text-3xl font-bold tracking-tight">{txt.spec}</h1>
           <div className="flex gap-4">
             <button onClick={handleExportWord} className="glass-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-blue-600 hover:bg-blue-50/50">
               <Download className="w-5 h-5" /> {txt.exportWord}
             </button>
           </div>
        </div>

        {/* Settings for generating document */}
        <div className="glass-card p-6 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border-blue-200/50 relative overflow-hidden shadow-sm">
           <div className="absolute right-0 bottom-0 opacity-5 mix-blend-overlay pointer-events-none">
             <Settings className="w-64 h-64 translate-x-12 translate-y-12" />
           </div>
           
           <div className="flex max-w-5xl items-center gap-4 mb-6 relative z-10 w-full flex-wrap lg:flex-nowrap">
             <label className="text-sm font-bold opacity-80 whitespace-nowrap shrink-0">{txt.enterRowNum}</label>
             
             <div className="flex bg-white/40 p-1 rounded-xl border border-white/60 shadow-inner shrink-0">
               {menuCategories.map(cat => (
                 <button 
                   key={cat.id}
                   onClick={() => setActiveCategory(cat.id as any)}
                   className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${activeCategory === cat.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   {cat.name}
                 </button>
               ))}
             </div>

             <select 
               value={selectedSpecIndex} 
               onChange={e => setSelectedSpecIndex(Number(e.target.value))}
               className="glass-input px-3 py-2 text-sm font-medium w-full text-slate-800 bg-white/70 cursor-pointer outline-none hover:bg-white/90 transition-colors" 
             >
               <option value={-1} disabled>-- Выберите из категории {activeCategory === 'all' ? 'Все' : menuCategories.find(c => c.id === activeCategory)?.name} --</option>
               {filteredOptions.length === 0 ? (
                 <option value={-1} disabled>Нет данных в этой категории</option>
               ) : filteredOptions.map((item, idx) => (
                 <option key={`opt-${item.rowNum}-${planData.indexOf(item)}-${idx}`} value={planData.indexOf(item)}>
                   №{item.rowNum} | [{item.itemKind}] — {lang === 'ru' ? item.nameRu : item.nameKz}
                 </option>
               ))}
             </select>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
              <div className="flex flex-col gap-2">
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">{txt.approverFields}</h3>
                 <input type="text" className="glass-input w-full text-sm p-2.5 font-medium" value={approverPosition} onChange={e => setApproverPosition(e.target.value)} placeholder={txt.position} />
                 <input type="text" className="glass-input w-full text-sm p-2.5 font-medium" value={approverFIO} onChange={e => setApproverFIO(e.target.value)} placeholder={txt.fio} />
              </div>
              <div className="flex flex-col gap-2">
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">{txt.developerFields}</h3>
                 <input type="text" className="glass-input w-full text-sm p-2.5 font-medium" value={developerPosition} onChange={e => setDeveloperPosition(e.target.value)} placeholder={txt.position} />
                 <input type="text" className="glass-input w-full text-sm p-2.5 font-medium" value={developerFIO} onChange={e => setDeveloperFIO(e.target.value)} placeholder={txt.fio} />
              </div>
              <div className="flex flex-col gap-2">
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">{txt.extraFields}</h3>
                 <input type="text" className="glass-input w-full text-sm p-2.5 font-medium" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder={txt.paymentTermsPlaceholder} />
                 <input type="text" className="glass-input w-full text-sm p-2.5 font-medium" value={warranty} onChange={e => setWarranty(e.target.value)} placeholder={txt.warrantyPlaceholder} />
                 <textarea className="glass-input w-full text-sm p-2.5 font-medium resize-none" value={reqDescStr} onChange={e => setReqDescStr(e.target.value)} placeholder={txt.reqDescPlaceholder} rows={2} />
              </div>
           </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto w-full max-w-4xl mx-auto pb-10">
        {!specData ? (
           <div className="h-48 glass-card border-dashed border-2 flex items-center justify-center text-slate-400 font-medium">
             {txt.notFound}
           </div>
        ) : (
           <div className="glass-card p-12 bg-white/90 shadow-2xl shadow-blue-900/10 text-black">
             {/* Wraps content for export */}
             <div id="spec-document-content" className="font-serif">
               <div className="flex justify-end mb-8 text-[11pt] leading-relaxed">
                 <div className="text-right">
                   <div className="font-bold">{txt.approvedBy}</div>
                   <div>{approverPosition || txt.position}</div>
                   <div>АО «Dosjan temir joly»</div>
                   <div>____________________ {approverFIO || txt.fio}</div>
                   <div>«__» ________________ 2026 г.</div>
                 </div>
               </div>
               
               <h2 className="text-center font-bold text-[14pt] mb-8 uppercase tracking-wide">
                 {txt.specTitle}
               </h2>

               <table className="w-full text-[11pt] border-collapse border border-black table-fixed">
                 <colgroup>
                   <col style={{ width: '40%' }} />
                   <col style={{ width: '60%' }} />
                 </colgroup>
                 <tbody>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.customer}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">АО «Dosjan temir joly»</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.itemKind}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">{specData.itemKind}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.code}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">{specData.code}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.itemName}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">{isRu ? specData.nameRu : specData.nameKz}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.itemDesc}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">{isRu ? specData.descRu : specData.descKz}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.extraDesc}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">{isRu ? specData.extraDescRu : specData.extraDescKz}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.planTerm}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">{specData.month}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.deliveryPlace}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">{isRu ? specData.deliveryPlaceRu : specData.deliveryPlaceKz}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.deliveryPeriod}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">{isRu ? specData.deliveryPeriodRu : specData.deliveryPeriodKz}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.unit}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">{specData.unit}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.quantity}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">{Number(specData.quantity).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.paymentTerms}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">{paymentTerms}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.warranty}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words">{warranty}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold whitespace-pre-wrap break-words">{txt.reqDesc}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap break-words min-h-[60px]">{reqDescStr}</td>
                    </tr>
                 </tbody>
               </table>

               <div className="mt-12 text-[11pt] leading-relaxed">
                  <div className="mb-2">{txt.developedBy}</div>
                  <div>
                     {developerPosition || txt.position} 
                     <span className="inline-block w-48 border-b border-black mx-4"></span> 
                     {developerFIO || txt.fio}
                  </div>
               </div>
             </div>
           </div>
        )}
      </div>
    </motion.div>
  )
}

function CabinetView({ user }: { user: any, key?: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOnline = navigator.onLine;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'initiatorRequests'), (snap) => {
       let docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
       docs.sort((a:any, b:any) => (b.createdAt?.toMillis() || Date.now()) - (a.createdAt?.toMillis() || Date.now()));
       
       const isAdmin = user?.email === 'kazyyev.chiefengineer@gmail.com';
       if (!isAdmin) {
           docs = docs.filter((d:any) => d.author === user?.email);
       }
       setRequests(docs);
    });
    return () => unsub();
  }, [user]);

  const handleSubmit = async () => {
    if (!name.trim() || !qty.trim()) return;
    setIsSubmitting(true);
    try {
       await setDoc(doc(collection(db, 'initiatorRequests')), {
         name, 
         quantity: qty, 
         unit, 
         price,
         author: user?.email || 'Аноним',
         status: 'В обработке',
         createdAt: serverTimestamp()
       });
       setName(''); setQty(''); setUnit(''); setPrice('');
    } catch(e) {
       console.error(e);
       alert('Ошибка при отправке');
    }
    setIsSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 h-full flex flex-col pt-12 overflow-y-auto w-full">
       <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200 dark:border-emerald-800">
             <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold dark:text-white">Панель Инициатора (Мои заявки)</h2>
            <p className="text-slate-500 font-medium">Подача заявок на включение в план напрямую</p>
          </div>
       </div>

       {!isOnline && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 p-4 rounded-xl flex items-center gap-3 mb-6 animate-pulse font-medium max-w-2xl">
             <WifiOff className="w-5 h-5 shrink-0" />
             Нет интернета. Офлайн-режим активен (PWA). Заявки не будут доставлены до появления сети.
          </div>
       )}

       <div className="glass-card max-w-2xl p-8 flex flex-col gap-4">
          <h3 className="font-bold text-lg border-b border-slate-200 dark:border-slate-700 pb-2 dark:text-white">Сформировать потребность (Zero Paper)</h3>
          <p className="text-sm opacity-70 mb-4 dark:text-slate-300">Укажите наименование, количество, цену и отправьте в обработку. Данные поступят экономистам напрямую.</p>
          
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Наименование (например, Реле РЭЛ-1М)" className="glass-input p-3" />
          <div className="flex gap-4">
            <input type="text" value={qty} onChange={e => setQty(e.target.value)} placeholder="Количество" className="glass-input p-3 w-1/3" />
            <input type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="Ед. изм. (шт, кг)" className="glass-input p-3 w-1/3" />
            <input type="text" value={price} onChange={e => setPrice(e.target.value)} placeholder="Примерная цена" className="glass-input p-3 w-1/3" />
          </div>
          
          <button 
             disabled={isSubmitting || !name.trim() || !qty.trim()} 
             onClick={handleSubmit} 
             className="glass-btn-primary py-3 rounded-xl font-bold mt-4 shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Отправка...' : 'Отправить в обработку'}
          </button>
       </div>
       
       <div className="mt-12 max-w-2xl">
          <h4 className="font-bold mb-4 opacity-70 dark:text-slate-300 flex items-center gap-2">
             <List className="w-5 h-5" /> 
             История моих заявок
          </h4>
          <div className="flex flex-col gap-3">
             {requests.length === 0 ? (
                <div className="text-slate-500">Заявок пока нет.</div>
             ) : (
                requests.map(r => (
                  <div key={r.id} className="bg-white/40 dark:bg-slate-800/40 p-5 rounded-xl border border-white/30 dark:border-slate-700/50 flex flex-col gap-2 dark:text-slate-200">
                     <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">{r.name}</span>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${r.status === 'В обработке' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                           {r.status}
                        </span>
                     </div>
                     <div className="text-sm opacity-70 flex gap-4">
                        <span>Кол-во: {r.quantity} {r.unit}</span>
                        {r.price && <span>Цена: {r.price}</span>}
                     </div>
                     <div className="text-xs font-mono opacity-50 mt-2">
                        Отправлено: {r.createdAt ? new Date(r.createdAt.toMillis()).toLocaleString() : 'Только что'}
                     </div>
                  </div>
                ))
             )}
          </div>
       </div>
    </motion.div>
  )
}

function WikiView() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 h-full flex flex-col pt-12 overflow-y-auto w-full">
       <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800">
             <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold dark:text-white">База Знаний (Вики)</h2>
            <p className="text-slate-500 font-medium">Регламенты, инструкции и FAQ для всех сотрудников DTJ</p>
          </div>
       </div>

       <div className="relative max-w-3xl mb-8">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 w-5 h-5 dark:text-slate-400" />
         <input type="text" placeholder="Найти инструкцию (например, 'Как заключить допник')" className="glass-input w-full p-4 pl-12 text-lg shadow-lg dark:text-slate-200" />
       </div>

       <div className="grid grid-cols-2 gap-6 max-w-5xl">
          {[
            { t: 'Аварийный закуп (Из одного источника)', d: 'Что делать, если сломалась стрелка и деталь нужна "еще вчера". Полный алгоритм согласований.' },
            { t: 'Требования к МСБ и ОТП в 2026 году', d: 'Список обязательных сертификатов качества (СТ-KZ) для защиты процента местного содержания.' },
            { t: 'Разделение бюджета OPEX и CAPEX', d: 'Как правильно классифицировать закупку: это ОС или расходники? Инструкция для инженеров.' },
            { t: 'Частые ошибки в Тех.Спецификациях', d: 'Почему юристы заворачивают документы: разбор ТОП-5 ошибок, чтобы не переделывать.' }
          ].map((w, i) => (
            <div key={i} className="glass-card p-6 flex flex-col gap-3 hover:translate-y-[-2px] hover:shadow-xl transition-all cursor-pointer border border-white/40 dark:border-slate-700/50">
               <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center rounded-xl text-indigo-500 mb-2">
                 <FileText className="w-5 h-5" />
               </div>
               <h3 className="font-bold text-lg dark:text-white leading-tight">{w.t}</h3>
               <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{w.d}</p>
            </div>
          ))}
       </div>
    </motion.div>
  )
}

function ItemDiscussionModal({ item, user, onClose, planData }: { item: ProcurementPlanItem, user: any, onClose: () => void, planData: ProcurementPlanItem[] }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const itemId = `${item.rowNum}_${item.code}`.replace(/[^a-zA-Z0-9_]/g, '');

  const mentionCandidates = useMemo(() => {
     const s = new Set<string>();
     s.add('kazyyev.chiefengineer@gmail.com');
     planData.forEach(p => {
        if (p.initiator) s.add(p.initiator.trim());
     });
     return Array.from(s).filter(Boolean);
  }, [planData]);

  useEffect(() => {
    if (!itemId) return;
    const q = query(collection(db, 'planComments'), where('itemId', '==', itemId), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => setMessages(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, [itemId]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const val = e.target.value;
     setText(val);
     
     const cursor = e.target.selectionStart || 0;
     const beforeCursor = val.slice(0, cursor);
     const match = beforeCursor.match(/@([a-zA-Zа-яА-Я0-9_.-]*)$/);
     if (match) {
        setMentionSearch(match[1]);
        setMentionIndex(match.index !== undefined ? match.index : -1);
     } else {
        setMentionSearch(null);
     }
  };

  const filteredMentions = mentionSearch !== null 
     ? mentionCandidates.filter(m => m.toLowerCase().includes(mentionSearch.toLowerCase())).slice(0, 8)
     : [];

  const insertMention = (u: string) => {
     const tag = u.replace(/\s+/g, '_');
     const before = text.slice(0, mentionIndex);
     const after = text.slice(mentionIndex + (mentionSearch?.length || 0) + 1);
     setText(before + '@' + tag + ' ' + after);
     setMentionSearch(null);
     inputRef.current?.focus();
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const txt = text;
    setText('');
    setMentionSearch(null);
    try {
      await setDoc(doc(collection(db, 'planComments')), {
        itemId,
        text: txt,
        userName: user?.email || 'Неизвестный',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
      setText(txt);
    }
  };

  const renderComment = (msg: string, isMe: boolean) => {
     if (!msg) return null;
     const parts = msg.split(/(@\S+)/g);
     return parts.map((part, i) => {
        if (part.startsWith('@')) {
           return (
             <span key={i} className={`font-bold px-1 rounded mx-[1px] ${isMe ? 'text-indigo-100 bg-indigo-600' : 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300'}`}>
                {part.replace(/_/g, ' ')}
             </span>
           );
        }
        return part;
     });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
       <motion.div 
         initial={{ x: 400, opacity: 0 }} 
         animate={{ x: 0, opacity: 1 }} 
         exit={{ x: 400, opacity: 0 }}
         transition={{ type: 'spring', damping: 25, stiffness: 200 }}
         className="w-[450px] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 relative"
       >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-800/50">
             <div>
                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><MessageSquare className="w-5 h-5 text-indigo-500" /> Обсуждение</h3>
                <p className="text-xs opacity-60 mt-1 max-w-[300px] truncate" title={item.nameRu}>{item.nameRu}</p>
                <div className="text-[10px] uppercase font-bold text-indigo-600 mt-2 bg-indigo-100 inline-block px-2 py-0.5 rounded">Лот № {item.rowNum}</div>
             </div>
             <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                <XCircle className="w-5 h-5 text-slate-500 dark:text-slate-300" />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/50">
             {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                   <MessageSquare className="w-12 h-12 mb-3 dark:text-slate-400" />
                   <p className="text-sm font-medium dark:text-slate-400">Пока нет комментариев.<br/>Задайте вопрос по этой закупке.</p>
                </div>
             ) : (
                messages.map(m => {
                  const isMe = m.userName === user?.email;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                       <span className="text-[10px] opacity-40 font-semibold mb-1 px-1 flex gap-2 dark:text-slate-400">
                         {m.userName}
                       </span>
                       <div className={`px-4 py-2.5 max-w-[85%] rounded-2xl text-sm leading-relaxed shadow-sm ${isMe ? 'bg-indigo-500 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm dark:text-slate-200'}`}>
                          {renderComment(m.text, isMe)}
                       </div>
                    </div>
                  )
                })
             )}
          </div>

          <div className="relative border-t border-slate-100 dark:border-slate-800">
             <AnimatePresence>
                {mentionSearch !== null && filteredMentions.length > 0 && (
                  <motion.div 
                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                     className="absolute bottom-full left-4 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl w-64 max-h-48 overflow-y-auto z-20"
                  >
                     {filteredMentions.map(m => (
                        <button
                           key={m}
                           type="button"
                           className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-sm transition-colors dark:text-white border-b border-slate-100 dark:border-slate-700/30 last:border-0 truncate"
                           onClick={() => insertMention(m)}
                        >
                           {m}
                        </button>
                     ))}
                  </motion.div>
                )}
             </AnimatePresence>

             <form onSubmit={send} className="p-4 bg-white dark:bg-slate-900 flex gap-3">
                <input 
                  ref={inputRef}
                  type="text" 
                  value={text}
                  onChange={handleTextChange}
                  placeholder="Напишите комментарий..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-colors dark:text-white"
                />
                <button type="submit" disabled={!text.trim()} className="bg-indigo-500 hover:bg-indigo-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-colors shrink-0">
                   <Send className="w-5 h-5 -ml-1" />
                </button>
             </form>
          </div>
       </motion.div>
    </div>
  )
}
