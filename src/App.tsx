/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, FileSpreadsheet, FileText, Search, Download, Settings,
  Globe, Box, Upload, FileDown, PieChart as PieChartIcon, History, LogOut, LogIn,
  Network, ChevronRight, ChevronDown, User, Home, Building2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import { collection, onSnapshot, writeBatch, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns';

import { mockPlan, t, ProcurementPlanItem } from './data';
import { auth, db, loginWithGoogle, logout } from './firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plan' | 'spec' | 'history' | 'structure'>('dashboard');
  const [selectedSpecIndex, setSelectedSpecIndex] = useState<number>(0);
  const [lang, setLang] = useState<'ru' | 'kz'>('ru');
  const [planData, setPlanData] = useState<ProcurementPlanItem[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loadingText, setLoadingText] = useState<string | null>('Загрузка приложения...');
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoadingText('Синхронизация данных...');
        const qPlan = query(collection(db, 'planItems'), where('companyId', '==', 'default'));
        const unsubPlan = onSnapshot(qPlan, (snap) => {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
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

        return () => { unsubPlan(); unsubHist(); unsubStats(); };
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
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'dashboard' ? 'glass-btn-active' : 'hover:bg-white/40'}`}
          >
            <LayoutDashboard className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">{txt.dashboard}</span>
          </button>
          <button 
            onClick={() => setActiveTab('plan')}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'plan' ? 'glass-btn-active' : 'hover:bg-white/40'}`}
          >
            <FileSpreadsheet className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">{txt.plan}</span>
          </button>
          <button 
            onClick={() => setActiveTab('spec')}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'spec' ? 'glass-btn-active' : 'hover:bg-white/40'}`}
          >
            <FileText className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">{txt.spec}</span>
          </button>
          <button 
            onClick={() => setActiveTab('structure')}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'structure' ? 'glass-btn-active' : 'hover:bg-white/40'}`}
          >
            <Network className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">{txt.structure || 'Структура'}</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'history' ? 'glass-btn-active' : 'hover:bg-white/40'}`}
          >
            <History className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">{txt.history || 'История'}</span>
          </button>
          <button 
            onClick={() => setActiveTab('admin' as any)}
            className={`flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl font-medium transition-all w-full ${activeTab === 'admin' as any ? 'glass-btn-active' : 'hover:bg-white/40'}`}
          >
            <Settings className="w-5 h-5 opacity-70 shrink-0" /> 
            <span className="leading-tight">{txt.admin || 'Админ'}</span>
          </button>
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

          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-medium opacity-70 flex items-center gap-2">
              <Globe className="w-4 h-4" /> {txt.lang}
            </span>
            <div className="flex bg-white/30 rounded-lg p-1 border border-white/50">
              <button 
                onClick={() => setLang('ru')}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${lang === 'ru' ? 'bg-white shadow-sm' : 'opacity-50'}`}
              >
                RU
              </button>
              <button 
                onClick={() => setLang('kz')}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${lang === 'kz' ? 'bg-white shadow-sm' : 'opacity-50'}`}
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
             {activeTab === 'history' && <HistoryView key="history" historyData={historyData} txt={txt} />}
             {activeTab === 'structure' && <StructureView key="structure" txt={txt} />}
             {activeTab === ('admin' as any) && <AdminView key="admin" txt={txt} stats={dashboardStats} planData={planData} user={user} />}
           </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function DashboardView({ txt, planData, stats }: { txt: any, planData: ProcurementPlanItem[], stats: any, key?: string }) {
  const methodData = [
    { name: 'Тендер', value: stats?.methodTender || 0 },
    { name: 'ЗЦП', value: stats?.methodZCP || 0 },
    { name: 'Один источник', value: stats?.methodOI || 0 },
  ];
  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6'];

  const quarterData = [
    { name: txt.q1, plan: stats?.q1Plan || 0, fact: stats?.q1Fact || 0 },
    { name: txt.q2, plan: stats?.q2Plan || 0, fact: stats?.q2Fact || 0 },
    { name: txt.q3, plan: stats?.q3Plan || 0, fact: stats?.q3Fact || 0 },
    { name: txt.q4, plan: stats?.q4Plan || 0, fact: stats?.q4Fact || 0 },
  ];

  const totalBudgetFromPlan = planData.reduce((acc, curr) => acc + (Number(curr.totalSumApproB) || 0), 0);
  const totalBudget = stats?.totalBudget !== undefined ? stats.totalBudget : totalBudgetFromPlan;

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

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="col-span-2 glass-card p-6 flex flex-col min-h-[300px]">
          <h3 className="font-semibold text-lg mb-6">Исполнение закупок по кварталам</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="name" stroke="#64748b" opacity={0.5} />
                <YAxis stroke="#64748b" opacity={0.5} />
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
            <h3 className="font-semibold mb-2">{txt.byMethod}</h3>
            <div className="flex-1 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={methodData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {methodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.8)', borderRadius: '1rem', border: 'none' }}/>
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

  const TreeNode = ({ node, level = 0 }: { node: any, level?: number }) => {
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

function AdminView({ txt, stats, planData, user }: { txt: any, stats: any, planData: any[], user: any, key?: string }) {
  const [formData, setFormData] = useState<any>(stats || {});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (stats) setFormData(stats);
  }, [stats]);

  const handleSave = async () => {
    if (!user) return alert("Нужна авторизация");
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
      alert(txt.statsUpdated);
    } catch (e) {
      console.error(e);
      alert("Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: Number(val) }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8 h-full overflow-auto"
    >
      <h1 className="text-3xl font-bold mb-8">{txt.admin || 'Админ-панель'}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

      <div className="mt-10 flex justify-end">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="glass-btn-primary px-12 py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 disabled:opacity-50"
        >
          {isSaving ? '...' : txt.save}
        </button>
      </div>
    </motion.div>
  );
}

function HistoryView({ historyData, txt, key }: { historyData: any[], txt: any, key?: string }) {
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
                <div key={record.id} className="glass-card p-6 border-l-4 border-l-blue-500 hover:bg-white/60 transition-colors">
                  <div className="flex justify-between items-start mb-3">
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

function PlanView({ txt, planData, user, setPlanData, onSelectSpec }: { txt: any, planData: ProcurementPlanItem[], user: any, setPlanData: any, onSelectSpec: (idx: number) => void, key?: string }) {
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (data[i] && data[i][0] && String(data[i][0]).includes('п/п')) {
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
        quantity: Number(r[13]) || 0,
        unitPrice: Number(r[14]) || 0,
        totalSumApproB: Number(r[15]) || 0,
        sum2026: Number(r[16]) || 0,
        month: String(r[17] || ''),
        deliveryPeriodKz: String(r[18] || ''),
        deliveryPeriodRu: String(r[19] || ''),
        kato: String(r[20] || ''),
        deliveryPlaceKz: String(r[21] || ''),
        deliveryPlaceRu: String(r[22] || ''),
        advancePercent: Number(r[23]) || 0,
        initiator: String(r[24] || ''),
        companyId: 'default'
      }));

      if (parsed.length > 0) {
        if (!user) {
          alert('Необходима авторизация для синхронизации плана.');
          setPlanData(parsed);
          setIsProcessing(false);
          return;
        }

        const syncWithFirebase = async () => {
          try {
             const batch = writeBatch(db);
             let addedCount = 0;
             let removedCount = 0;
             let updatedCount = 0;

             // Map by Code+NameRu as unique identifier to track changes safely
             const oldMap = new Map(planData.map(p => [p.code + p.nameRu, p]));
             const newMap = new Map(parsed.map(p => [p.code + p.nameRu, p]));

             // Find removed elements (exist in old, not in new)
             for (const [key, oldItem] of oldMap.entries()) {
               if (!newMap.has(key)) {
                  removedCount++;
                  if ((oldItem as any).id) {
                     batch.delete(doc(db, 'planItems', (oldItem as any).id));
                  }
               }
             }

             // Find added and updated
             for (const [key, newItem] of newMap.entries()) {
               if (!oldMap.has(key)) {
                  addedCount++;
                  const ref = doc(collection(db, 'planItems'));
                  batch.set(ref, { 
                     ...newItem, 
                     createdAt: serverTimestamp(),
                     updatedAt: serverTimestamp() 
                  });
               } else {
                  // Basically it exists, update it to refresh its data
                  updatedCount++;
                  const oldItem: any = oldMap.get(key);
                  if (oldItem && oldItem.id) {
                     const updateData: any = { ...newItem, updatedAt: serverTimestamp() };
                     delete updateData.createdAt; // Prevent rule violations by omitted immutable field
                     batch.set(doc(db, 'planItems', oldItem.id), updateData, { merge: true });
                  }
               }
             }

             // Create History record
             const histRef = doc(collection(db, 'planHistory'));
             batch.set(histRef, {
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                createdByName: user.email || 'Неизвестно',
                companyId: 'default',
                addedCount,
                removedCount,
                updatedCount,
                changesSummary: `План загружен. Добавлено: ${addedCount}, Удалено: ${removedCount}, Обновлено: ${updatedCount}`
             });

             await batch.commit();
             setIsProcessing(false);

          } catch (e) {
             console.error("Firebase Batch Error:", e);
             alert('Ошибка при сохранении в базу данных. Временная загрузка локально.');
             setPlanData(parsed);
             setIsProcessing(false);
          }
        };

        syncWithFirebase();
      } else {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const filteredPlan = planData.filter(p => {
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
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full flex flex-col"
    >
      <div className="p-8 pb-4 flex justify-between items-center shrink-0">
         <div className="flex items-center gap-4">
           <h1 className="text-3xl font-bold tracking-tight">{txt.plan}</h1>
           <div>
             <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={(e) => { setIsProcessing(true); handleFileUpload(e); }} />
             <button disabled={isProcessing} onClick={() => fileInputRef.current?.click()} className="glass-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-[0_4px_16px_rgba(59,130,246,0.4)] disabled:opacity-50">
                <Upload className={`w-4 h-4 ${isProcessing ? 'animate-bounce' : ''}`} /> {isProcessing ? 'Обработка...' : txt.uploadPlan}
             </button>
           </div>
         </div>
         <div className="relative">
           <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
           <input 
             type="text" 
             placeholder={txt.searchPlaceholder}
             value={search}
             onChange={e => setSearch(e.target.value)}
             className="glass-input pl-10 pr-4 py-2 w-[300px] text-sm"
           />
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
                   <td className="p-2 border-r border-indigo-100 bg-indigo-50/50 text-center sticky left-0 z-10 group-hover:bg-indigo-100/80 transition-colors">
                     <button 
                       onClick={() => onSelectSpec(planData.indexOf(item))} 
                       className="glass-btn-primary px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                     >
                       {txt.createSpecBtn || 'ТЗ'}
                     </button>
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
    </motion.div>
  )
}

function SpecView({ txt, lang, planData, selectedSpecIndex, setSelectedSpecIndex }: { txt: any, lang: 'ru'|'kz', planData: ProcurementPlanItem[], selectedSpecIndex: number, setSelectedSpecIndex: (idx: number) => void, key?: string }) {
  const specData = planData[selectedSpecIndex] || null;

  const [approverPosition, setApproverPosition] = useState('');
  const [approverFIO, setApproverFIO] = useState('');
  
  const [developerPosition, setDeveloperPosition] = useState('');
  const [developerFIO, setDeveloperFIO] = useState('');
  
  const [paymentTerms, setPaymentTerms] = useState('');
  const [warranty, setWarranty] = useState('');
  const [reqDescStr, setReqDescStr] = useState('');

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
           
           <div className="flex max-w-4xl items-center gap-4 mb-6 relative z-10 w-full">
             <label className="text-sm font-bold opacity-80 whitespace-nowrap shrink-0">{txt.enterRowNum}</label>
             <select 
               value={selectedSpecIndex} 
               onChange={e => setSelectedSpecIndex(Number(e.target.value))}
               className="glass-input px-3 py-2 text-sm font-medium w-full text-slate-800 bg-white/70 cursor-pointer outline-none hover:bg-white/90 transition-colors" 
             >
               {planData.map((item, idx) => (
                 <option key={idx} value={idx}>
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
