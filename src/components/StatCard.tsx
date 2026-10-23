import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: 'brand' | 'amber' | 'sky' | 'emerald';
  subtext?: string;
}

const accentMap = {
  brand: {
    iconBg: 'bg-brand-500/10',
    iconText: 'text-brand-400',
    glow: 'shadow-brand-500/10',
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-400',
    glow: 'shadow-amber-500/10',
  },
  sky: {
    iconBg: 'bg-sky-500/10',
    iconText: 'text-sky-400',
    glow: 'shadow-sky-500/10',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
  },
};

export default function StatCard({ label, value, icon: Icon, accent, subtext }: StatCardProps) {
  const styles = accentMap[accent];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
          {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
        </div>
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${styles.iconBg} shadow-lg ${styles.glow} transition-transform duration-200 group-hover:scale-110`}
        >
          <Icon className={`h-5 w-5 ${styles.iconText}`} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
