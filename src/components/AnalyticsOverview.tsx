import { Users, MessageSquare, Send, TrendingUp } from 'lucide-react';
import StatCard from './StatCard';

interface AnalyticsOverviewProps {
  totalLeads: number;
  pendingDms: number;
  contacted: number;
  replied: number;
  conversionRate: number;
}

export default function AnalyticsOverview({
  totalLeads,
  pendingDms,
  contacted,
  replied,
  conversionRate,
}: AnalyticsOverviewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total Scraped Leads"
        value={totalLeads.toLocaleString()}
        icon={Users}
        accent="brand"
        subtext="Across all campaigns"
      />
      <StatCard
        label="Pending DMs"
        value={pendingDms.toLocaleString()}
        icon={MessageSquare}
        accent="amber"
        subtext="Awaiting outreach"
      />
      <StatCard
        label="Contacted"
        value={contacted.toLocaleString()}
        icon={Send}
        accent="sky"
        subtext="DMs sent"
      />
      <StatCard
        label="Replied & Conversion"
        value={`${replied.toLocaleString()} · ${conversionRate.toFixed(1)}%`}
        icon={TrendingUp}
        accent="emerald"
        subtext="Reply-to-contact rate"
      />
    </div>
  );
}
