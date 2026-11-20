import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bell,
  FileText,
  Globe2,
  Layers,
  LogIn,
  LogOut,
  Map as MapIcon,
  Menu,
  Satellite,
  ShieldAlert,
  TrendingUp,
  User as UserIcon,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MUNICIPALITY_OPTIONS, useAppContext } from '../context/AppContext';
import { fetchAnomalies } from '../lib/api';
import type { DetectedAnomaly, MunicipalityId } from '../shared/types';

const NAV_ITEMS = [
  { path: '/', label: 'Command Center', icon: MapIcon },
  { path: '/satellite', label: 'Satellite Explorer', icon: Satellite },
  { path: '/analytics', label: 'Environmental Analytics', icon: BarChart3 },
  { path: '/anomalies', label: 'AI Anomaly Detection', icon: ShieldAlert },
  { path: '/forecasting', label: 'Forecasting Engine', icon: TrendingUp },
  { path: '/segmentation', label: 'Land Cover UNet', icon: Layers },
  { path: '/action-plan', label: 'Action Plan', icon: FileText },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const {
    municipality,
    setMunicipality,
    user,
    signInWithGoogle,
    logout,
    toasts,
    dismissToast,
    setSelectedAnomalyId,
  } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [alerts, setAlerts] = useState<DetectedAnomaly[]>([]);

  useEffect(() => {
    let active = true;
    fetchAnomalies(municipality)
      .then((res) => {
        if (active) setAlerts(res.anomalies);
      })
      .catch(() => {
        if (active) setAlerts([]);
      });
    return () => {
      active = false;
    };
  }, [municipality]);

  const currentNav =
    NAV_ITEMS.find((n) => n.path === location.pathname) ?? NAV_ITEMS[0];
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <div className="min-h-screen bg-[#080D18] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-[#0D1524] border-r border-slate-800/80 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center shrink-0">
              <Globe2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-wider text-slate-100 whitespace-nowrap">
                PRATYAKSHA
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Environmental Command
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#111D2E] text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#111D2E]/60 border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Telemetry Mode</span>
            <span className="font-mono text-amber-400 font-medium">DEMO MODE</span>
          </div>
          <div className="text-[11px] text-slate-500 leading-relaxed">
            Deterministic synthetic fallback active. Earth Engine credentials optional.
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.18 }}
              className="w-64 h-full bg-[#0D1524] border-r border-slate-800 p-4 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold tracking-wider">PRATYAKSHA</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-100"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="mt-4 space-y-1 flex-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${
                          isActive
                            ? 'bg-[#111D2E] text-cyan-300 border border-cyan-500/30'
                            : 'text-slate-400 hover:text-slate-100'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Header */}
        <header className="sticky top-0 z-30 h-14 bg-[#0D1524]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 text-slate-400 hover:text-slate-100 rounded-md"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="font-semibold text-slate-100 whitespace-nowrap">
                {currentNav.label}
              </span>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap font-mono">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Intelligence Active</span>
                <span aria-hidden="true">·</span>
                <span>Sync 2026-11-19 08:15 UTC</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Global Municipality Selector */}
            <label className="sr-only" htmlFor="global-municipality-select">
              Select Municipal Region
            </label>
            <select
              id="global-municipality-select"
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value as MunicipalityId)}
              className="h-9 bg-[#111D2E] border border-slate-700/80 rounded-md px-3 text-xs font-medium text-slate-100 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {MUNICIPALITY_OPTIONS.map((city) => (
                <option key={city.id} value={city.id} className="bg-[#0D1524] text-slate-100">
                  {city.name} ({city.shortCorp})
                </option>
              ))}
            </select>

            {/* Notification Center */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                }}
                className="relative h-9 w-9 flex items-center justify-center rounded-md bg-[#111D2E] border border-slate-700/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
                aria-label="Notification Center"
              >
                <Bell className="w-4 h-4" />
                {criticalCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded bg-red-500 text-[10px] font-mono font-bold text-white flex items-center justify-center">
                    {criticalCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#111D2E] border border-slate-700/90 rounded-lg shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-100">
                      Active Anomaly Alerts ({alerts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/80">
                    {alerts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedAnomalyId(a.id);
                          setNotifOpen(false);
                          navigate('/anomalies');
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#0D1524] transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span
                            className={
                              a.severity === 'critical'
                                ? 'text-red-400 font-semibold'
                                : 'text-amber-400 font-semibold'
                            }
                          >
                            {a.severity.toUpperCase()} · {a.id}
                          </span>
                          <span className="text-slate-400 tabular-nums">
                            Risk {a.consensusRiskScore}/100
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-100">
                          {a.wardName}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {a.indicator}: {a.observedValue} {a.unit} (baseline {a.baselineValue})
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Officer Profile / Auth */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="h-9 px-3 flex items-center gap-2 rounded-md bg-[#111D2E] border border-slate-700/80 text-xs font-medium text-slate-200 hover:border-cyan-500/40 transition-colors whitespace-nowrap"
              >
                <UserIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {user ? user.displayName || 'Officer' : 'Officer Sign In'}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#111D2E] border border-slate-700/90 rounded-lg shadow-2xl z-50 p-4 space-y-3">
                  {user ? (
                    <>
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-100 truncate">
                          {user.displayName || 'Municipal Officer'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          {user.email}
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          Cloud Persistence Enabled
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          void logout();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-100">
                          Observer Demo Session
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Sign in with Google to save Environment Action Plans, anomaly reviews,
                          and harmonization runs to Firestore.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          void signInWithGoogle();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-cyan-500/15 border border-cyan-400/40 hover:bg-cyan-500/25 text-xs font-medium text-cyan-200 transition-colors"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        Sign In with Google
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Toast Stack */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.16 }}
              className="pointer-events-auto bg-[#111D2E] border border-slate-700 rounded-md px-4 py-3 shadow-xl flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div
                  className={`text-xs font-semibold ${
                    t.variant === 'success'
                      ? 'text-emerald-400'
                      : t.variant === 'warning'
                      ? 'text-amber-400'
                      : t.variant === 'error'
                      ? 'text-red-400'
                      : 'text-cyan-300'
                  }`}
                >
                  {t.title}
                </div>
                {t.description && (
                  <div className="mt-0.5 text-[11px] text-slate-400 leading-snug">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-500 hover:text-slate-300 shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
