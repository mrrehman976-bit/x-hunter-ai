import { useMemo, useState } from 'react';
import { Search, Filter, Send, MessageSquareText, ChevronDown, ExternalLink, Inbox, Download } from 'lucide-react';
import type { Lead, LeadStatus } from '@/types/lead';
import StatusBadge from './StatusBadge';
import { exportLeadsCSV } from '@/utils/exportCsv';

interface LeadTableProps {
  leads: Lead[];
}

type StatusFilter = 'all' | LeadStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
];

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default function LeadTable({ leads }: LeadTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        lead.handle.toLowerCase().includes(q) ||
        lead.bio.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [leads, search, statusFilter]);

  const activeFilterLabel = statusFilters.find((f) => f.value === statusFilter)?.label ?? 'All';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-800/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by handle or bio…"
              className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 transition-colors focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            type="button"
            onClick={() => exportLeadsCSV(leads)}
            disabled={leads.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Status filter dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
            >
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">{activeFilterLabel}</span>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>
            {filterOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setFilterOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 py-1 shadow-xl animate-fade-in">
                  {statusFilters.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(f.value);
                        setFilterOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                        statusFilter === f.value
                          ? 'bg-brand-500/10 text-brand-400'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {f.label}
                      {statusFilter === f.value && <span className="h-2 w-2 rounded-full bg-brand-400" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800/80 text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-semibold">Username / Handle</th>
              <th className="px-4 py-3 font-semibold">Followers</th>
              <th className="px-4 py-3 font-semibold">Bio</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Sent DM</th>
              <th className="px-4 py-3 font-semibold">Reply Text</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Inbox className="h-8 w-8" />
                    <p className="text-sm font-medium">No leads match your filters</p>
                    <p className="text-xs text-slate-600">Try adjusting the search or status filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr
                  key={lead.id}
                  className="group transition-colors hover:bg-slate-800/40"
                >
                  {/* Handle */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-xs font-bold text-slate-300">
                        {lead.displayName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-200">{lead.displayName}</p>
                        <a
                          href={`https://x.com/${lead.handle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-0.5 text-xs text-brand-400 hover:text-brand-300"
                        >
                          {lead.handle}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  </td>

                  {/* Followers */}
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-slate-300">{formatFollowers(lead.followers)}</span>
                  </td>

                  {/* Bio */}
                  <td className="max-w-[240px] px-4 py-3.5">
                    <p className="text-slate-400">{truncate(lead.bio, 70)}</p>
                  </td>

                  {/* Status + Intent */}
                  <td className="px-4 py-3.5">
                    <StatusBadge status={lead.status} intent={lead.replyIntent} />
                  </td>

                  {/* Sent DM */}
                  <td className="max-w-[200px] px-4 py-3.5">
                    {lead.sentDm ? (
                      <div className="flex items-start gap-1.5 text-slate-400">
                        <MessageSquareText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-sky-400" />
                        <span className="text-xs leading-relaxed">{truncate(lead.sentDm, 60)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">— Not sent —</span>
                    )}
                  </td>

                  {/* Reply Text */}
                  <td className="max-w-[200px] px-4 py-3.5">
                    {lead.replyText ? (
                      <div className="flex items-start gap-1.5 text-slate-400">
                        <MessageSquareText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                        <span className="text-xs leading-relaxed">{truncate(lead.replyText, 60)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">— No reply —</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {lead.status === 'pending' ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-500"
                        >
                          <Send className="h-3 w-3" />
                          Send DM
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div className="border-t border-slate-800/80 px-4 py-3 text-xs text-slate-500">
        Showing <span className="font-medium text-slate-400">{filtered.length}</span> of{' '}
        <span className="font-medium text-slate-400">{leads.length}</span> leads
      </div>
    </div>
  );
}
