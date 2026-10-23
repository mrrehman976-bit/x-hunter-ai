export type LeadStatus = 'pending' | 'contacted' | 'replied';

export type ReplyIntent = 'interested' | 'query' | 'pricing' | 'objection' | null;

export interface Lead {
  id: string;
  handle: string;
  displayName: string;
  followers: number;
  bio: string;
  status: LeadStatus;
  sentDm: string | null;
  replyText: string | null;
  replyIntent: ReplyIntent;
  createdAt: string;
}

export function detectIntent(replyText: string): ReplyIntent {
  const lower = replyText.toLowerCase();
  if (lower.match(/pric(e|ing)|cost|how much|plan/)) return 'pricing';
  if (lower.match(/interested|love it|sounds great|tell me more|more detail/)) return 'interested';
  if (lower.match(/\?|how does|what is|can you|could you/)) return 'query';
  if (lower.match(/not now|too busy|already use|not interested|maybe later/)) return 'objection';
  return 'query';
}
