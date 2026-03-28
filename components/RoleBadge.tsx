'use client';

import { Shield, Zap, Crown, Clock, Building2 } from 'lucide-react';

export type UserRole = 'user' | 'power_user' | 'agency' | 'admin' | 'trial';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const roleConfig = {
  user: {
    icon: Shield,
    color: 'blue',
    label: 'User',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
    iconColor: 'text-blue-600'
  },
  power_user: {
    icon: Zap,
    color: 'purple',
    label: 'Power User',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300',
    iconColor: 'text-purple-600'
  },
  agency: {
    icon: Building2,
    color: 'indigo',
    label: 'Agency',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-300',
    iconColor: 'text-indigo-600'
  },
  admin: {
    icon: Crown,
    color: 'gold',
    label: 'Admin',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
    iconColor: 'text-yellow-600'
  },
  trial: {
    icon: Clock,
    color: 'green',
    label: 'Trial',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
    iconColor: 'text-green-600'
  }
};

const sizeConfig = {
  sm: {
    container: 'px-2 py-0.5 text-xs',
    icon: 'h-3 w-3',
    gap: 'gap-1'
  },
  md: {
    container: 'px-3 py-1 text-sm',
    icon: 'h-4 w-4',
    gap: 'gap-1.5'
  },
  lg: {
    container: 'px-4 py-1.5 text-base',
    icon: 'h-5 w-5',
    gap: 'gap-2'
  }
};

export function RoleBadge({
  role,
  size = 'md',
  showLabel = true,
  className = ''
}: RoleBadgeProps) {
  const config = roleConfig[role] || roleConfig.user;
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center ${sizes.gap} ${sizes.container}
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        border rounded-full font-medium
        ${className}
      `}
      title={config.label}
    >
      <Icon className={`${sizes.icon} ${config.iconColor}`} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

/**
 * Compact role indicator (icon only)
 */
export function RoleIcon({ role, size = 'md' }: { role: UserRole; size?: 'sm' | 'md' | 'lg' }) {
  return <RoleBadge role={role} size={size} showLabel={false} />;
}

/**
 * Role badge with custom label
 */
export function CustomRoleBadge({
  role,
  label,
  size = 'md',
  className = ''
}: {
  role: UserRole;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const config = roleConfig[role] || roleConfig.user;
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center ${sizes.gap} ${sizes.container}
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        border rounded-full font-medium
        ${className}
      `}
      title={config.label}
    >
      <Icon className={`${sizes.icon} ${config.iconColor}`} />
      <span>{label}</span>
    </span>
  );
}

/**
 * Get role display information
 */
export function getRoleInfo(role: UserRole) {
  return roleConfig[role];
}
