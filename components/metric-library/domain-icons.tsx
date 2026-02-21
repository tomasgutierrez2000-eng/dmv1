'use client';

import {
  BarChart3,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Building2,
  Tag,
  Target,
  Bell,
  Folder,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Lucide icon keys used for metric domains (no emojis; professional only). */
export const DOMAIN_ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Building2,
  Tag,
  Target,
  Bell,
};

const DEFAULT_ICON = Folder;

export function DomainIcon({
  iconKey,
  className = 'w-5 h-5',
  ariaHidden = true,
}: {
  iconKey?: string | null;
  className?: string;
  ariaHidden?: boolean;
}) {
  const Icon = (iconKey && DOMAIN_ICON_MAP[iconKey]) || DEFAULT_ICON;
  return <Icon className={className} aria-hidden={ariaHidden} />;
}
