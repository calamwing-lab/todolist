import { Trophy, Award, Star, Medal, Zap, Shield } from 'lucide-react'

export interface BadgeConfig {
  name: string
  malName: string
  colorClass: string
  bgClass: string
  borderClass: string
  icon: any
  glowClass: string
  description: string
  malDescription: string
  minPercentage: number
}

export const BADGE_LEVELS: BadgeConfig[] = [
  {
    name: 'Legend',
    malName: 'Elite Rank',
    colorClass: 'text-rose-400',
    bgClass: 'bg-rose-950/30',
    borderClass: 'border-rose-800/50',
    icon: Trophy,
    glowClass: 'shadow-[0_0_20px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/30',
    description: 'Outstanding daily tracking perfection!',
    malDescription: 'Exceptional dedication and flawless completion every day!',
    minPercentage: 95
  },
  {
    name: 'Platinum',
    malName: 'Top Tier',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-950/30',
    borderClass: 'border-blue-800/50',
    icon: Award,
    glowClass: 'shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-1 ring-blue-500/20',
    description: 'Exceptional performance and dedication!',
    malDescription: 'Remarkable effort and outstanding commitment to goals!',
    minPercentage: 80
  },
  {
    name: 'Gold',
    malName: 'High Achiever',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-950/30',
    borderClass: 'border-amber-800/50',
    icon: Star,
    glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20',
    description: 'Great daily tracking and commitment.',
    malDescription: 'Excellent tracking habits and strong dedication to tasks!',
    minPercentage: 60
  },
  {
    name: 'Silver',
    malName: 'Rising Star',
    colorClass: 'text-slate-300',
    bgClass: 'bg-slate-900/40',
    borderClass: 'border-slate-800/60',
    icon: Medal,
    glowClass: 'shadow-[0_0_15px_rgba(148,163,184,0.1)] ring-1 ring-slate-500/10',
    description: 'Good progress. Keep going higher!',
    malDescription: 'Solid progress being made — keep pushing forward!',
    minPercentage: 40
  },
  {
    name: 'Bronze',
    malName: 'Building Up',
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-950/20',
    borderClass: 'border-orange-850/40',
    icon: Zap,
    glowClass: 'shadow-none ring-1 ring-orange-500/5',
    description: 'Consistent starting efforts. Build momentum!',
    malDescription: 'Early efforts are showing — build on this momentum!',
    minPercentage: 20
  },
  {
    name: 'Beginner',
    malName: 'Getting Started',
    colorClass: 'text-slate-500',
    bgClass: 'bg-slate-950/60',
    borderClass: 'border-slate-900',
    icon: Shield,
    glowClass: 'shadow-none',
    description: 'Start tracking tasks to earn your first badge.',
    malDescription: 'Complete daily tasks to earn your first achievement badge!',
    minPercentage: 0
  }
]

export function getBadgeForPercentage(percentage: number): BadgeConfig {
  for (const badge of BADGE_LEVELS) {
    if (percentage >= badge.minPercentage) {
      return badge
    }
  }
  return BADGE_LEVELS[BADGE_LEVELS.length - 1]
}

export function getNextBadge(percentage: number): { badge: BadgeConfig; neededPct: number } | null {
  const currentBadge = getBadgeForPercentage(percentage)
  const currentIndex = BADGE_LEVELS.findIndex(b => b.name === currentBadge.name)
  
  if (currentIndex > 0) {
    const nextBadge = BADGE_LEVELS[currentIndex - 1]
    return {
      badge: nextBadge,
      neededPct: nextBadge.minPercentage - percentage
    }
  }
  
  return null
}
