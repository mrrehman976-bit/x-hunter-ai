import { supabase } from '@/lib/supabase';
import type { XCredentials } from '@/types/settings';
import type { Lead } from '@/types/lead';

// ─── LocalStorage helpers (instant cache for same-browser reloads) ───────────

function settingsKey(userId: string): string {
  return `xhunter_settings_${userId}`;
}

function leadsKey(userId: string): string {
  return `xhunter_leads_${userId}`;
}

function loadLocalSettings(userId: string): XCredentials | null {
  try {
    const raw = localStorage.getItem(settingsKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as XCredentials;
  } catch {
    return null;
  }
}

function saveLocalSettings(userId: string, creds: XCredentials): void {
  try {
    localStorage.setItem(settingsKey(userId), JSON.stringify(creds));
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e);
  }
}

function loadLocalLeads(userId: string): Lead[] {
  try {
    const raw = localStorage.getItem(leadsKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as Lead[];
  } catch {
    return [];
  }
}

export function saveLocalLeads(userId: string, leads: Lead[]): void {
  try {
    localStorage.setItem(leadsKey(userId), JSON.stringify(leads));
  } catch (e) {
    console.error('Failed to save leads to localStorage:', e);
  }
}

// ─── Credentials: Cloud DB is the source of truth ───────────────────────────

export async function loadCredentials(userId: string): Promise<XCredentials | null> {
  // Always try the cloud database first — it's the source of truth.
  const dbCreds = await loadDbCredentials(userId);
  if (dbCreds) {
    saveLocalSettings(userId, dbCreds);
    return dbCreds;
  }

  // If DB has nothing (first visit, or DB unreachable), fall back to localStorage.
  return loadLocalSettings(userId);
}

async function loadDbCredentials(userId: string): Promise<XCredentials | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error loading credentials from DB:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    handle: data.x_handle ?? '',
    authMethod: data.auth_method ?? 'api',
    apiKey: data.api_key ?? '',
    apiSecret: data.api_secret ?? '',
    accessToken: data.access_token ?? '',
    accessTokenSecret: data.access_token_secret ?? '',
    cookieToken: data.cookie_token ?? '',
    ct0Token: data.ct0_token ?? '',
    aiProvider: data.ai_provider ?? 'openai',
    aiApiKey: data.ai_api_key ?? '',
  };
}

const settingsRow = (userId: string, creds: XCredentials) => ({
  user_id: userId,
  x_handle: creds.handle,
  auth_method: creds.authMethod,
  api_key: creds.apiKey,
  api_secret: creds.apiSecret,
  access_token: creds.accessToken,
  access_token_secret: creds.accessTokenSecret,
  cookie_token: creds.cookieToken,
  ct0_token: creds.ct0Token,
  ai_provider: creds.aiProvider,
  ai_api_key: creds.aiApiKey,
});

export async function saveCredentials(userId: string, creds: XCredentials): Promise<void> {
  // 1. Save to localStorage immediately
  saveLocalSettings(userId, creds);

  // 2. Save to cloud database via upsert
  const { error } = await supabase
    .from('user_settings')
    .upsert(settingsRow(userId, creds), { onConflict: 'user_id' });

  if (!error) return;

  // 3. Fallback: select-then-update-or-insert if upsert fails
  console.warn('Upsert failed, trying select+update/insert fallback:', error.message);

  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('user_settings')
      .update(settingsRow(userId, creds))
      .eq('id', existing.id);

    if (updateError) {
      console.error('Error updating credentials in DB:', updateError.message);
      throw new Error(updateError.message);
    }
  } else {
    const { error: insertError } = await supabase
      .from('user_settings')
      .insert(settingsRow(userId, creds));

    if (insertError) {
      console.error('Error inserting credentials to DB:', insertError.message);
      throw new Error(insertError.message);
    }
  }
}

// ─── Leads: Cloud DB is the source of truth ─────────────────────────────────

export async function loadLeads(userId: string): Promise<Lead[]> {
  // Always try the cloud database first.
  const dbLeads = await loadDbLeads(userId);
  if (dbLeads.length > 0) {
    saveLocalLeads(userId, dbLeads);
    return dbLeads;
  }

  // Fall back to localStorage (same-browser reload where DB wasn't written yet)
  return loadLocalLeads(userId);
}

async function loadDbLeads(userId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading leads from DB:', error.message);
    return [];
  }
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    followers: row.followers ?? 0,
    bio: row.bio ?? '',
    status: row.status,
    sentDm: row.sent_dm ?? null,
    replyText: row.reply_text ?? null,
    replyIntent: row.reply_intent ?? null,
    createdAt: row.created_at,
  }));
}

export async function insertLead(userId: string, lead: Lead): Promise<string | null> {
  const { data, error } = await supabase.from('leads').insert({
    user_id: userId,
    handle: lead.handle,
    display_name: lead.displayName,
    followers: lead.followers,
    bio: lead.bio,
    status: lead.status,
    sent_dm: lead.sentDm,
    reply_text: lead.replyText,
    reply_intent: lead.replyIntent,
  }).select('id').single();

  if (error) {
    console.error('Error inserting lead to DB:', error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function updateLeadStatus(
  leadId: string,
  updates: {
    status?: string;
    sent_dm?: string | null;
    reply_text?: string | null;
    reply_intent?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('leads').update(updates).eq('id', leadId);
  if (error) {
    console.error('Error updating lead in DB:', error.message);
  }
}

// Alias used by App.tsx
export { saveLocalLeads as saveLeadsLocal };
