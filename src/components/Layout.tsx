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
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex font-sans">
      {/* Desktop Apple-style Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 bg-white/80 backdrop-blur-xl border-r border-black/[0.06] sticky top-0 h-screen z-20">
        <div className="px-6 py-5 border-b border-black/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#0055B3] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Globe2 className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight text-[var(--ink)]">
                PRATYAKSHA
              </div>
              <div className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase mt-0.5">
                SATELLITE INTELLIGENCE
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--ink)] text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--ink)] hover:bg-black/[0.04]'
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

        <div className="p-4 m-4 rounded-2xl bg-[var(--canvas)] border border-black/[0.05] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[11px] text-[var(--ink)]">ENGINE MODE</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[var(--blue)] border border-black/[0.06] shadow-xs">
              DEMO ENGINE
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            Deterministic synthetic telemetry fallback active. Multi-spectral satellite passes emulated.
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
            className="fixed inset-0 z-50 lg:hidden bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-72 h-full bg-white border-r border-black/[0.06] p-5 flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-5 border-b border-black/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#0055B3] text-white flex items-center justify-center">
                    <Globe2 className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-bold tracking-tight text-[var(--ink)]">PRATYAKSHA</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-full hover:bg-black/[0.05] text-[var(--ink)] transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="mt-5 space-y-1 flex-1" aria-label="Mobile Primary Navigation">
                {NAV_ITEMS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-[var(--ink)] text-white shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--ink)] hover:bg-black/[0.04]'
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
        {/* Top Apple Frosted Header */}
        <header className="sticky top-0 z-30 h-16 bg-[var(--canvas)]/85 backdrop-blur-xl border-b border-black/[0.06] px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white border border-black/[0.08] hover:bg-black/[0.05] text-[var(--ink)]"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="font-bold tracking-tight text-[var(--ink)] whitespace-nowrap">
                {currentNav.label}
              </span>
              <span className="text-[var(--text-muted)] opacity-40 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] whitespace-nowrap font-medium">
                <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" aria-hidden="true" />
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
              className="h-10 bg-white border border-black/[0.08] rounded-full px-4 text-xs font-semibold text-[var(--ink)] shadow-xs cursor-pointer hover:border-black/20 focus-visible:outline-[3px] focus-visible:outline-[var(--blue)] transition-colors"
            >
              {MUNICIPALITY_OPTIONS.map((city) => (
                <option key={city.id} value={city.id} className="bg-white text-[var(--ink)]">
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
                className="relative h-10 w-10 flex items-center justify-center rounded-full border border-black/[0.08] bg-white text-[var(--ink)] shadow-xs hover:scale-105 transition-all"
                aria-label={`Notification Center (${alerts.length} alerts)`}
              >
                <Bell className="w-4 h-4" />
                {criticalCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full bg-[var(--critical)] text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
                    {criticalCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-84 sm:w-96 bg-white rounded-3xl border border-black/[0.08] shadow-[0_12px_40px_rgb(0_0_0/0.12)] z-50 overflow-hidden">
                  <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between bg-[var(--canvas)] text-[var(--ink)]">
                    <span className="text-xs font-bold tracking-tight">
                      ANOMALY ALERTS ({alerts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-[var(--text-muted)] hover:text-[var(--ink)] p-1 rounded-full"
                      aria-label="Close alerts"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-black/[0.06]">
                    {alerts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedAnomalyId(a.id);
                          setNotifOpen(false);
                          navigate('/anomalies');
                        }}
                        className="w-full text-left p-4 hover:bg-[var(--canvas)] transition-colors group"
                      >
                        <div className="flex items-center justify-between text-[11px] font-medium">
                          <span
                            className={
                              a.severity === 'critical'
                                ? 'text-[var(--critical)] font-bold'
                                : 'text-[var(--ink)] font-semibold'
                            }
                          >
                            [{a.severity.toUpperCase()}] {a.id}
                          </span>
                          <span className="text-[var(--text-muted)] tabular-nums font-semibold">
                            Risk {a.consensusRiskScore}/100
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-[var(--ink)]">
                          {a.wardName}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
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
                className="h-10 px-4 flex items-center gap-2 rounded-full border border-black/[0.08] bg-white text-xs font-semibold text-[var(--ink)] shadow-xs hover:scale-105 transition-all whitespace-nowrap"
                aria-label={user ? `Signed in as ${user.displayName || 'Officer'}` : 'Officer Sign In'}
              >
                <UserIcon className="w-3.5 h-3.5 shrink-0 text-[var(--blue)]" aria-hidden="true" />
                <span className="hidden sm:inline max-w-[130px] truncate">
                  {user ? user.displayName || 'Officer' : 'OFFICER SIGN IN'}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl border border-black/[0.08] shadow-[0_12px_40px_rgb(0_0_0/0.12)] z-50 p-5 space-y-4">
                  {user ? (
                    <>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-[var(--ink)] truncate">
                          {user.displayName || 'Municipal Officer'}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate">
                          {user.email}
                        </div>
                        <div className="text-[10px] font-semibold text-[var(--green)] bg-[var(--green)]/10 rounded-full inline-block px-2 py-0.5 mt-1">
                          PERSISTENCE ACTIVE
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          void logout();
                        }}
                        className="button-sm w-full rounded-full"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
                        SIGN OUT
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-[var(--ink)]">
                          OBSERVER DEMO
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
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
                        className="button-signal w-full rounded-full"
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
        <main className="flex-1 p-4 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
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
              transition={{ duration: 0.15 }}
              className="pointer-events-auto bg-white/95 backdrop-blur-md border border-black/[0.08] p-4 rounded-2xl shadow-[0_10px_30px_rgb(0_0_0/0.1)] flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div
                  className={`text-xs font-bold ${
                    t.variant === 'error'
                      ? 'text-[var(--critical)]'
                      : 'text-[var(--ink)]'
                  }`}
                >
                  {t.title}
                </div>
                {t.description && (
                  <div className="mt-1 text-[11px] text-[var(--text-muted)] leading-snug">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-[var(--text-muted)] hover:text-[var(--ink)] shrink-0 p-1 rounded-full"
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
