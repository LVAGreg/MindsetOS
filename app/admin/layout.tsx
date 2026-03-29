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
} from 'lucide-react';
import MindsetOSLogo from '@/components/MindsetOSLogo';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavGroup {
  label: string;
  icon: any;
  items: { href: string; label: string; icon: any }[];
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
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Admin access required</p>
            <a
              href={`/login?redirect=${encodeURIComponent(pathname || '/admin')}`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      );
    }
    // Still hydrating — show loading
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <Link href="/admin" className="flex items-center gap-2">
                <MindsetOSLogo size="sm" />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">Admin</h1>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1" ref={dropdownRef}>
              {/* Dashboard - Standalone */}
              <Link
                href="/admin"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/admin'
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
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
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        groupActive
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{group.label}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          const itemActive = isActive(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setOpenDropdown(null)}
                              className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                itemActive
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
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
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>App</span>
              </Link>

              {/* User Info */}
              <div className="hidden lg:flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {currentUser.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <nav className="px-4 py-3 space-y-1">
              {/* Dashboard */}
              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/admin'
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>

              {/* Grouped Items */}
              {navGroups.map((group) => (
                <div key={group.label} className="pt-2">
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
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
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          itemActive
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <ItemIcon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}

              {/* Back to App */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
