import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';

const I = ({ children }: { children: React.ReactNode }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const IconHome  = () => <I><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></I>;
const IconRide  = () => <I><path d="M5 17h14l-1.5-5h-11L5 17Z" /><circle cx="7.5" cy="17" r="1.5" fill="currentColor" /><circle cx="16.5" cy="17" r="1.5" fill="currentColor" /><path d="M6 12l2-6h8l2 6" /></I>;
const IconDriver= () => <I><circle cx="12" cy="8" r="4" /><path d="M6 21v-1a6 6 0 0 1 12 0v1" /></I>;
const IconUsers = () => <I><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></I>;
const IconCard  = () => <I><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></I>;
const IconTag   = () => <I><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></I>;
const IconChart = () => <I><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></I>;
const IconMap   = () => <I><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></I>;
const IconCog   = () => <I><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></I>;
const IconLogout= () => <I><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></I>;
const IconFood  = () => <I><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></I>;
const IconPromo = () => <I><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></I>;
const IconShield= () => <I><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></I>;
const IconList  = () => <I><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></I>;
const IconDollar = () => <I><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></I>;
const IconBell   = () => <I><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></I>;

const navItems = [
  { to: '/', label: 'Dashboard', icon: <IconHome /> },
  { to: '/rides', label: 'Rides', icon: <IconRide /> },
  { to: '/drivers', label: 'Drivers', icon: <IconDriver /> },
  { to: '/users', label: 'Users', icon: <IconUsers /> },
  { to: '/payments', label: 'Payments', icon: <IconCard /> },
  { to: '/food', label: 'Food', icon: <IconFood /> },
  { to: '/pricing', label: 'Pricing', icon: <IconTag /> },
  { to: '/promo', label: 'Promo Codes', icon: <IconPromo /> },
  { to: '/reports', label: 'Reports', icon: <IconChart /> },
  { to: '/financial', label: 'Financial', icon: <IconDollar /> },
  { to: '/notifications', label: 'Notifications', icon: <IconBell /> },
  { to: '/compliance', label: 'Compliance', icon: <IconShield /> },
  { to: '/map', label: 'Live map', icon: <IconMap /> },
  { to: '/settings', label: 'Settings', icon: <IconCog /> },
  { to: '/audit', label: 'Audit Log', icon: <IconList /> },
];

interface SidebarProps {
  onLogout: () => void;
  userName: string;
}

export default function Sidebar({ onLogout, userName }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-ink-100 flex flex-col z-30">
      <div className="h-16 flex items-center px-5 border-b border-ink-100">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17h14l-1.5-5h-11L5 17Z" />
            <circle cx="7.5" cy="17" r="1.5" fill="white" />
            <circle cx="16.5" cy="17" r="1.5" fill="white" />
            <path d="M6 12l2-6h8l2 6" />
          </svg>
        </div>
        <span className="ml-2.5 text-base font-display font-bold text-ink-900">EasyRyde</span>
        <span className="ml-2 text-2xs bg-primary-50 text-primary-700 border border-primary-200 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 px-3 py-2 my-0.5 text-sm font-medium rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={clsx(
                  'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                  isActive ? 'bg-primary-100 text-primary-700' : 'bg-ink-100 text-ink-500 group-hover:bg-ink-200 group-hover:text-ink-700'
                )}>
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold shadow-glow-primary">
            {userName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-900 truncate">{userName}</p>
            <p className="text-2xs text-ink-500">Operator</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-1 w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink-600 hover:text-danger-700 hover:bg-danger-50 rounded-lg transition-colors"
        >
          <IconLogout />
          Sign out
        </button>
      </div>
    </aside>
  );
}
