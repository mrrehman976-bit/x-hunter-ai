import type { Lead } from '@/types/lead';

function escapeCSV(value: string): string {
  const needsQuoting = value.includes(',') || value.includes('"') || value.includes('\n');
  if (needsQuoting) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportLeadsCSV(leads: Lead[], filename = 'xhunter-leads.csv'): void {
  const headers = [
    'Handle',
    'Display Name',
    'Followers',
    'Bio',
    'Status',
    'Sent DM',
    'Reply Text',
    'Reply Intent',
    'Created At',
  ];

  const rows = leads.map((lead) =>
    [
      lead.handle,
      lead.displayName,
      lead.followers.toString(),
      lead.bio,
      lead.status,
      lead.sentDm ?? '',
      lead.replyText ?? '',
      lead.replyIntent ?? '',
      lead.createdAt,
    ]
      .map(escapeCSV)
      .join(','),
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
