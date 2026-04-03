'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Settings,
  FileText,
  ChevronRight,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Megaphone,
  DollarSign,
  Mail,
  Ticket,
  MessageSquare,
  Database,
  BarChart3,
  Coins,
  Terminal,
  Shield,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import MindsetOSLogo from '@/components/MindsetOSLogo';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: { href: string; label: string; icon: LucideIcon }[];
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useAppStore((state) => state.user);
  const theme = useAppStore((state) => state.theme);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Wait for Zustand store hydration before checking auth
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Apply theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Redirect if not admin (only after hydration)
  useEffect(() => {
    if (hasHydrated && currentUser && currentUser.role !== 'admin' && currentUser.role !== 'power_user') {
      router.push('/dashboard');
    }
  }, [hasHydrated, currentUser, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    useAppStore.getState().setUser(null);
    router.push('/login');
  };

  // Grouped navigation
  const navGroups: NavGroup[] = [
    {
      label: 'Content',
      icon: Database,
      items: [
        { href: '/admin/agents', label: 'Agents', icon: Sparkles },
        { href: '/admin/knowledge', label: 'Knowledge Base', icon: FileText },
        { href: '/admin/prompts', label: 'System Prompts', icon: Terminal },
      ],
    },
    {
      label: 'Users',
      icon: Users,
      items: [
        { href: '/admin/users', label: 'All Users', icon: Users },
        { href: '/admin/invite-codes', label: 'Invite Codes', icon: Ticket },
      ],
    },
    {
      label: 'Communications',
      icon: MessageSquare,
      items: [
        { href: '/admin/broadcasts', label: 'Broadcasts', icon: Megaphone },
        { href: '/admin/emails', label: 'Email Templates', icon: Mail },
        { href: '/admin/feedback', label: 'Feedback Management', icon: MessageSquare },
      ],
    },
    {
      label: 'Sales',
      icon: TrendingUp,
      items: [
        { href: '/admin/pipeline', label: 'Pipeline', icon: Target },
        { href: '/admin/claps', label: 'CLAPS Tracker', icon: TrendingUp },
        { href: '/admin/cohorts', label: 'Cohorts', icon: Users },
      ],
    },
    {
      label: 'System',
      icon: Settings,
      items: [
        { href: '/admin/usage', label: 'Usage & Costs', icon: DollarSign },
        { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/admin/credits', label: 'Credits', icon: Coins },
        { href: '/admin/security', label: 'Security', icon: Shield },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(href);
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => isActive(item.href));
  };

  // Show loading spinner while Zustand store hydrates
  if (!hasHydrated || !currentUser) {
    // If hydration is complete and still no user, show sign-in prompt
    if (hasHydrated && !currentUser) {
      return (
        <div className="flex items-center justify-center min-h-screen" style={{ background: '#09090f' }}>
          <div className="text-center">
            <p className="mb-4" style={{ color: '#9090a8' }}>Admin access required</p>
            <a
              href={`/login?redirect=${encodeURIComponent(pathname || '/admin')}`}
              className="px-4 py-2 rounded-lg transition-colors text-white"
              style={{ background: '#4f6ef7' }}
            >
              Sign In
            </a>
          </div>
        </div>
      );
    }
    // Still hydrating — show loading
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#09090f' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4" style={{ borderColor: '#4f6ef7' }}></div>
          <p style={{ color: '#9090a8' }}>Loading admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      {/* Admin Header */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(18,18,31,0.95)', borderBottom: '1px solid #1e1e30', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <Link href="/admin" className="flex items-center gap-2">
                <MindsetOSLogo size="sm" />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold" style={{ color: '#ededf5' }}>Admin</h1>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1" ref={dropdownRef}>
              {/* Dashboard - Standalone */}
              <Link
                href="/admin"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={pathname === '/admin'
                  ? { background: 'rgba(79,110,247,0.15)', color: '#7b8ff8' }
                  : { color: '#9090a8' }}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>

              {/* Grouped Dropdowns */}
              {navGroups.map((group) => {
                const Icon = group.icon;
                const isOpen = openDropdown === group.label;
                const groupActive = isGroupActive(group);

                return (
                  <div key={group.label} className="relative">
                    <button
                      onClick={() => setOpenDropdown(isOpen ? null : group.label)}
                      aria-label={`${group.label} menu`}
                      aria-expanded={isOpen}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={groupActive
                        ? { background: 'rgba(79,110,247,0.15)', color: '#7b8ff8' }
                        : { color: '#9090a8' }}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{group.label}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 rounded-lg shadow-lg py-1 z-50" style={{ background: '#12121f', border: '1px solid #1e1e30' }}>
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          const itemActive = isActive(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setOpenDropdown(null)}
                              className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                              style={itemActive
                                ? { background: 'rgba(79,110,247,0.12)', color: '#7b8ff8' }
                                : { color: '#9090a8' }}
                            >
                              <ItemIcon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* User Menu & Actions */}
            <div className="flex items-center gap-3">
              {/* Back to Dashboard */}
              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>App</span>
              </Link>

              {/* User Info */}
              <div className="hidden lg:flex items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fcc824, #7c5bf6)' }}>
                  <span className="text-sm font-bold text-white">
                    {currentUser.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                aria-label="Logout"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ color: '#f87171' }}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
                className="md:hidden p-2 rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden" style={{ borderTop: '1px solid #1e1e30', background: '#12121f' }}>
            <nav className="px-4 py-3 space-y-1">
              {/* Dashboard */}
              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={pathname === '/admin'
                  ? { background: 'rgba(79,110,247,0.15)', color: '#7b8ff8' }
                  : { color: '#9090a8' }}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>

              {/* Grouped Items */}
              {navGroups.map((group) => (
                <div key={group.label} className="pt-2">
                  <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: '#5a5a72' }}>
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const itemActive = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={itemActive
                          ? { background: 'rgba(79,110,247,0.15)', color: '#7b8ff8' }
                          : { color: '#9090a8' }}
                      >
                        <ItemIcon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}

              {/* Back to App */}
              <div className="pt-2 mt-2" style={{ borderTop: '1px solid #1e1e30' }}>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: '#9090a8' }}
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                  <span>Back to App</span>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
