import type { LeadStatus, ReplyIntent } from '@/types/lead';

const statusConfig: Record<LeadStatus, { label: string; classes: string; dot: string }> = {
  pending: {
    label: 'Pending',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-400',
  },
  contacted: {
    label: 'Contacted',
    classes: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    dot: 'bg-sky-400',
  },
  replied: {
    label: 'Replied',
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
};

const intentConfig: Record<NonNullable<ReplyIntent>, { label: string; icon: string; classes: string }> = {
  interested: { label: 'Interested', icon: '+', classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
  query: { label: 'Query', icon: '?', classes: 'bg-sky-500/15 text-sky-300 border-sky-500/25' },
  pricing: { label: 'Pricing', icon: '$', classes: 'bg-violet-500/15 text-violet-300 border-violet-500/25' },
  objection: { label: 'Objection', icon: '!', classes: 'bg-red-500/15 text-red-300 border-red-500/25' },
};

export default function StatusBadge({ status, intent }: { status: LeadStatus; intent?: ReplyIntent }) {
  const config = statusConfig[status];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        key={status}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium animate-fade-in ${config.classes}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
      {intent && (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold animate-fade-in ${intentConfig[intent].classes}`}
        >
          <span className="font-bold">{intentConfig[intent].icon}</span>
          {intentConfig[intent].label}
        </span>
      )}
    </div>
  );
}
