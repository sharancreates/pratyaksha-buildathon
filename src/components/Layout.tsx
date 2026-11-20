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
    <div className="min-h-screen bg-white text-black flex font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 bg-white border-r-2 border-black sticky top-0 h-screen z-20">
        <div className="px-6 py-6 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black text-white flex items-center justify-center shrink-0">
              <Globe2 className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-black tracking-widest text-black uppercase leading-none">
                PRATYAKSHA
              </div>
              <div className="text-[10px] font-mono font-bold tracking-wider text-[#4B5563] uppercase mt-1">
                SATELLITE INTELLIGENCE
              </div>
            </div>
          </div>
        </div>

        <nav className="nav flex-1 px-4 py-6 space-y-1.5 overflow-y-auto" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-wider transition-none ${
                    isActive
                      ? 'bg-black text-white'
                      : 'text-black hover:text-black hover:bg-[#E5E7EB]'
                  }`
                }
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="text-[10px] font-mono opacity-50 tabular-nums" aria-hidden="true">
                  0{idx + 1}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-5 border-t-2 border-black space-y-2 text-xs">
          <div className="flex items-center justify-between text-black">
            <span className="font-bold uppercase tracking-wider text-[11px]">MODE</span>
            <span className="font-mono text-[11px] font-black px-1.5 py-0.5 border border-black bg-[#E5E7EB]">
              DEMO ENGINE
            </span>
          </div>
          <div className="text-[10px] font-mono text-[#4B5563] leading-relaxed">
            SYNTHETIC TELEMETRY FALLBACK ACTIVE. SATELLITE TILES EMULATED DETERMINISTICALLY.
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
            className="fixed inset-0 z-50 lg:hidden bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.1 }}
              className="w-72 h-full bg-white border-r-2 border-black p-5 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-5 border-b-2 border-black">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-black text-white flex items-center justify-center">
                    <Globe2 className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest">PRATYAKSHA</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 border border-black hover:bg-black hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="nav mt-5 space-y-1.5 flex-1" aria-label="Mobile Primary Navigation">
                {NAV_ITEMS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-3 text-xs font-black uppercase tracking-wider transition-none ${
                          isActive
                            ? 'bg-black text-white'
                            : 'text-black hover:bg-[#E5E7EB]'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-50">0{idx + 1}</span>
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
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b-2 border-black px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 border-2 border-black hover:bg-black hover:text-white"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="font-black uppercase tracking-widest text-black whitespace-nowrap">
                {currentNav.label}
              </span>
              <span className="text-[#4B5563] hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-[#4B5563] whitespace-nowrap font-mono font-medium">
                <Activity className="w-3.5 h-3.5 text-black" aria-hidden="true" />
                <span>INTELLIGENCE STREAM ACTIVE</span>
                <span aria-hidden="true">·</span>
                <span>SYNC 2026-11-19 08:15 UTC</span>
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
              className="h-10 bg-white border-2 border-black px-3 text-xs font-black uppercase tracking-wider text-black cursor-pointer hover:bg-black hover:text-white"
            >
              {MUNICIPALITY_OPTIONS.map((city) => (
                <option key={city.id} value={city.id} className="bg-white text-black">
                  {city.name} [{city.shortCorp}]
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
                className="relative h-10 w-10 flex items-center justify-center border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-none"
                aria-label={`Notification Center (${alerts.length} alerts)`}
              >
                <Bell className="w-4 h-4" />
                {criticalCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4 px-1 bg-[#FF0000] text-[10px] font-mono font-black text-white flex items-center justify-center border border-black">
                    {criticalCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white border-2 border-black shadow-[6px_6px_0px_#000] z-50 overflow-hidden">
                  <div className="px-5 py-4 border-b-2 border-black flex items-center justify-between bg-black text-white">
                    <span className="text-xs font-black uppercase tracking-wider">
                      ANOMALY ALERTS [{alerts.length}]
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-white hover:text-[#FF0000] p-1"
                      aria-label="Close alerts"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y-2 border-black">
                    {alerts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedAnomalyId(a.id);
                          setNotifOpen(false);
                          navigate('/anomalies');
                        }}
                        className="w-full text-left p-4 hover:bg-black hover:text-white transition-none group"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span
                            className={
                              a.severity === 'critical'
                                ? 'text-[#FF0000] font-black group-hover:text-[#FF0000]'
                                : 'font-bold'
                            }
                          >
                            [{a.severity.toUpperCase()}] {a.id}
                          </span>
                          <span className="text-[#4B5563] group-hover:text-[#D1D5DB] tabular-nums font-bold">
                            RISK {a.consensusRiskScore}/100
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-black uppercase tracking-tight">
                          {a.wardName}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#4B5563] group-hover:text-[#D1D5DB]">
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
                className="h-10 px-4 flex items-center gap-2 border-2 border-black bg-white text-xs font-black uppercase tracking-wider text-black hover:bg-black hover:text-white transition-none whitespace-nowrap"
                aria-label={user ? `Signed in as ${user.displayName || 'Officer'}` : 'Officer Sign In'}
              >
                <UserIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline max-w-[130px] truncate">
                  {user ? user.displayName || 'Officer' : 'OFFICER SIGN IN'}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border-2 border-black shadow-[6px_6px_0px_#000] z-50 p-5 space-y-4">
                  {user ? (
                    <>
                      <div className="space-y-1">
                        <div className="text-xs font-black uppercase tracking-wider text-black truncate">
                          {user.displayName || 'Municipal Officer'}
                        </div>
                        <div className="text-[11px] font-mono text-[#4B5563] truncate">
                          {user.email}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-black border border-black inline-block px-1.5 py-0.5 mt-1 bg-[#E5E7EB]">
                          PERSISTENCE ACTIVE
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          void logout();
                        }}
                        className="button-sm w-full"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
                        SIGN OUT
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <div className="text-xs font-black uppercase tracking-wider text-black">
                          OBSERVER DEMO
                        </div>
                        <p className="text-[11px] text-[#4B5563] leading-relaxed">
                          Authenticate with Google to enable Firestore cloud persistence for
                          Environment Action Plans and anomaly reviews.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          void signInWithGoogle();
                        }}
                        className="button-sm w-full"
                      >
                        <LogIn className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
                        SIGN IN
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 lg:p-8 max-w-[1600px] w-full mx-auto space-y-8">
          {children}
        </main>
      </div>

      {/* Toast Stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.1 }}
              className="pointer-events-auto bg-white border-2 border-black p-4 shadow-[5px_5px_0px_#000] flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div
                  className={`text-xs font-black uppercase tracking-wider ${
                    t.variant === 'error'
                      ? 'text-[#FF0000]'
                      : 'text-black'
                  }`}
                >
                  {t.title}
                </div>
                {t.description && (
                  <div className="mt-1 text-[11px] text-[#4B5563] font-mono leading-snug">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-black hover:text-[#FF0000] shrink-0 p-1"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
