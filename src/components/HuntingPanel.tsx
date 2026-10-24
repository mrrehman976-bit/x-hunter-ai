import { useState } from 'react';
import { Search, Send, Inbox, Play, Pause, Loader2, Tag, Hash, Users, Clock, FlaskConical, Radio, AlertTriangle } from 'lucide-react';
import type { HuntingTab, XCredentials, LogLevel, Lead } from '@/types';
import type { SequenceStep } from '@/hooks/useTerminal';
import {
  scrapeTwitterLeads,
  sendTwitterDm,
  scanTwitterInbox,
  extractTwitterTokens,
  detectReplyIntent,
} from '@/lib/twitterApi';

interface HuntingPanelProps {
  credentials: XCredentials;
  isRunning: boolean;
  pendingLeads: Lead[];
  contactedLeads: Lead[];
  onRunSequence: (steps: SequenceStep[]) => void;
  onStop: () => void;
  onPushLog: (level: LogLevel, message: string) => void;
  onAddLead: (lead: Lead) => void;
  onContactLead: (leadId: string, dmText: string) => void;
  onReplyLead: (leadId: string, replyText: string, intent: NonNullable<Lead['replyIntent']>) => void;
  onMissingSettings: (message: string) => void;
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: typeof Search;
  label: string;
  accent: string;
  badge?: number;
}

function TabButton({ active, onClick, icon: Icon, label, accent, badge }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? `border-current ${accent} bg-white/[0.02]`
          : 'border-transparent text-slate-500 hover:text-slate-300'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-0.5 inline-flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-slate-700 px-1 text-[10px] font-bold text-slate-200">
          {badge}
        </span>
      )}
    </button>
  );
}

function ActionButton({
  onClick,
  disabled,
  running,
  icon: Icon,
  label,
  color,
}: {
  onClick: () => void;
  disabled: boolean;
  running: boolean;
  icon: typeof Play;
  label: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${color}`}
    >
      {running ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Running…
        </>
      ) : (
        <>
          <Icon className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon: Icon,
  min,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: typeof Hash;
  min?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />}
        <input
          type={type}
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2.5 ${Icon ? 'pl-9' : 'pl-3'} pr-3 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/30`}
        />
      </div>
    </div>
  );
}

let idCounter = 1000;
function nextId(): string {
  idCounter++;
  return `live-${Date.now()}-${idCounter}`;
}

export default function HuntingPanel({
  credentials,
  isRunning,
  pendingLeads,
  contactedLeads,
  onRunSequence,
  onStop,
  onPushLog,
  onAddLead,
  onContactLead,
  onReplyLead,
  onMissingSettings,
}: HuntingPanelProps) {
  const [activeTab, setActiveTab] = useState<HuntingTab>('scrape');

  // Scrape state
  const [keywords, setKeywords] = useState('#web3, crypto, founder');
  const [maxLeads, setMaxLeads] = useState('25');

  // DM state
  const [dailyLimit, setDailyLimit] = useState('20');
  const [delaySeconds, setDelaySeconds] = useState('30');
  const [dryRun, setDryRun] = useState(true);

  const hasCredentials = credentials.handle.trim() !== '';
  const tokens = extractTwitterTokens(credentials);
  const hasTwitterTokens = tokens !== null;

  // ─── Real Scrape ──────────────────────────────────────────────

  const handleScrape = () => {
    if (!hasCredentials) {
      onMissingSettings('No X account configured. Add your X handle and auth cookie token in Settings to start scraping leads.');
      return;
    }
    if (!hasTwitterTokens) {
      onMissingSettings('Cookie auth required. Switch to Cookie Token auth method in Settings and paste your auth_token and ct0 cookies from x.com to enable live scraping.');
      return;
    }

    const count = parseInt(maxLeads) || 25;
    const kw = keywords.trim();
    const { authToken, ct0 } = tokens;

    const steps: SequenceStep[] = [
      { delay: 300, level: 'INFO', message: `[SCRAPE] Initializing live scrape as @${credentials.handle}…` },
      { delay: 200, level: 'INFO', message: `[SCRAPE] Auth method: Cookie Token` },
      { delay: 200, level: 'INFO', message: `[SCRAPE] auth_token present: ${authToken ? 'YES (' + authToken.slice(0, 8) + '…)' : 'MISSING'}` },
      { delay: 200, level: 'INFO', message: `[SCRAPE] ct0 CSRF token present: ${ct0 ? 'YES (' + ct0.slice(0, 8) + '…)' : 'MISSING'}` },
      { delay: 400, level: 'INFO', message: `[SCRAPE] Querying X search API for: "${kw}"` },
      { delay: 200, level: 'INFO', message: `[SCRAPE] Max leads requested: ${count}` },
      {
        delay: 100,
        level: 'INFO',
        message: `[SCRAPE] Sending GET request to REST API search/adaptive.json…`,
        callback: async () => {
          onPushLog('INFO', '[SCRAPE] Awaiting Twitter API response…');
          const result = await scrapeTwitterLeads(authToken, ct0, kw, count);

          if (result.error) {
            onPushLog('ERROR', `[SCRAPE] ❌ Twitter API rejected request: ${result.error}`);
            if (result.raw_response) {
              const raw = JSON.stringify(result.raw_response).slice(0, 300);
              onPushLog('ERROR', `[SCRAPE] Raw error detail: ${raw}`);
            }
            onPushLog('ERROR', `[SCRAPE] Scraping failed. Verify your auth_token and ct0 cookies are valid and not expired in Settings.`);
            return;
          }

          onPushLog('SUCCESS', `[SCRAPE] ✓ Twitter API returned HTTP 200 OK.`);

          if (result.leads.length === 0) {
            onPushLog('WARNING', `[SCRAPE] Twitter returned 0 profiles for "${kw}". Try different or broader keywords.`);
            return;
          }

          onPushLog('SUCCESS', `[SCRAPE] ✓ Scraped ${result.leads.length} real accounts from Twitter.`);

          for (let i = 0; i < result.leads.length; i++) {
            const profile = result.leads[i];
            const leadId = nextId();
            const lead: Lead = {
              id: leadId,
              handle: profile.handle,
              displayName: profile.displayName,
              followers: profile.followers,
              bio: profile.bio,
              status: 'pending',
              sentDm: null,
              replyText: null,
              replyIntent: null,
              createdAt: new Date().toISOString(),
            };

            onPushLog('INFO', `[SCRAPE] Found ${profile.handle} — ${profile.followers.toLocaleString()} followers, bio: "${profile.bio.slice(0, 50)}${profile.bio.length > 50 ? '…' : ''}"`);
            onPushLog('SUCCESS', `[SCRAPE] Saved ${profile.handle} to leads table (${i + 1}/${result.leads.length})`);
            onAddLead(lead);
          }

          onPushLog('SUCCESS', `[SCRAPE] ✓ Complete. ${result.leads.length} real leads added to pipeline.`);
        },
      },
    ];

    onRunSequence(steps);
  };

  // ─── Real DM ──────────────────────────────────────────────────

  const handleSendDms = () => {
    if (!hasCredentials) {
      onMissingSettings('No X account configured. Add your X handle and auth cookie token in Settings before sending DMs.');
      return;
    }
    if (!hasTwitterTokens) {
      onMissingSettings('Cookie auth required. Switch to Cookie Token auth method in Settings and paste your auth_token and ct0 cookies to send real DMs.');
      return;
    }
    if (!credentials.aiApiKey.trim()) {
      onMissingSettings('No AI API key configured. Add your OpenAI or Claude API key in Settings to enable AI-powered message personalization.');
      return;
    }

    const targets = pendingLeads.slice(0, parseInt(dailyLimit) || 20);
    if (targets.length === 0) {
      onPushLog('WARNING', '[DM] No pending leads found. Scrape leads first or check your filters.');
      return;
    }

    const delay = parseInt(delaySeconds) || 30;
    const provider = credentials.aiProvider === 'openai' ? 'GPT-4o' : 'Claude';
    const kw = keywords.split(',')[0].trim();
    const { authToken, ct0 } = tokens;

    const steps: SequenceStep[] = [
      { delay: 300, level: 'INFO', message: `[DM] ${dryRun ? 'DRY RUN mode — no real DMs will be sent.' : 'LIVE mode — sending real DMs to Twitter.'}` },
      { delay: 200, level: 'INFO', message: `[DM] Loaded ${targets.length} pending lead${targets.length !== 1 ? 's' : ''} from pipeline.` },
      { delay: 200, level: 'INFO', message: `[DM] auth_token present: ${authToken ? 'YES' : 'MISSING'}` },
      { delay: 200, level: 'INFO', message: `[DM] ct0 CSRF token present: ${ct0 ? 'YES' : 'MISSING'}` },
      { delay: 350, level: 'INFO', message: `[DM] Using ${provider} for message personalization…` },
    ];

    for (let i = 0; i < targets.length; i++) {
      const lead = targets[i];
      const firstName = lead.displayName.split(' ')[0];
      const dmText = `Hey ${firstName} — saw your work around ${kw}. We built an AI tool that finds warm B2B leads on X automatically and personalizes outreach. Open to a quick chat?`;
      const cleanHandle = lead.handle.replace('@', '');

      steps.push({
        delay: 300,
        level: 'INFO',
        message: `[AI] Generating personalized DM for ${lead.handle} via ${provider}…`,
      });
      steps.push({
        delay: 200,
        level: 'INFO',
        message: `[AI] Draft: "${dmText.slice(0, 70)}…"`,
      });

      if (dryRun) {
        steps.push({
          delay: 200,
          level: 'WARNING',
          message: `[DRY RUN] Would send DM to ${lead.handle} (not delivered)`,
          callback: () => onContactLead(lead.id, dmText),
        });
      } else {
        steps.push({
          delay: 100,
          level: 'INFO',
          message: `[DM] POST x.com/i/api/1.1/direct_messages/events/new.json → @${cleanHandle}`,
          callback: async () => {
            onPushLog('INFO', `[DM] Resolving @${cleanHandle} to Twitter user ID…`);
            const result = await sendTwitterDm(authToken, ct0, cleanHandle, dmText);

            if (result.error) {
              onPushLog('ERROR', `[DM] ❌ FAILED → @${cleanHandle}: ${result.error}`);
              if (result.raw_response) {
                const raw = JSON.stringify(result.raw_response).slice(0, 300);
                onPushLog('ERROR', `[DM] Raw error detail: ${raw}`);
              }
              onPushLog('ERROR', `[DM] Message was NOT delivered to @${cleanHandle}. Status badge will NOT change.`);
              return;
            }

            if (result.success) {
              onPushLog('SUCCESS', `[DM] ✓ Delivered to @${cleanHandle} — message_id: ${result.message_id ?? 'unknown'}`);
              onPushLog('SUCCESS', `[DM] Twitter returned HTTP 200 OK. Updating status to Contacted.`);
              onContactLead(lead.id, dmText);
            } else {
              onPushLog('ERROR', `[DM] ❌ Unexpected response for @${cleanHandle} — DM not sent. Status NOT updated.`);
            }
          },
        });
      }

      if (i < targets.length - 1) {
        steps.push({ delay: delay * 1000, level: 'INFO', message: `[DM] Waiting ${delay}s (rate-limit safety)…` });
      }
    }

    steps.push({
      delay: 200,
      level: 'SUCCESS',
      message: `[DM] Sequence complete. ${targets.length} leads processed ${dryRun ? '(dry run — no real DMs sent)' : `— check your X sent folder for delivery confirmation`}.`,
    });

    onRunSequence(steps);
  };

  // ─── Real Inbox Scan ──────────────────────────────────────────

  const handleInboxScan = () => {
    if (!hasCredentials) {
      onMissingSettings('No X account configured. Add your X handle and auth cookie token in Settings before scanning inbox.');
      return;
    }
    if (!hasTwitterTokens) {
      onMissingSettings('Cookie auth required. Switch to Cookie Token auth method in Settings to scan your live inbox.');
      return;
    }

    const targets = contactedLeads;
    if (targets.length === 0) {
      onPushLog('WARNING', '[INBOX] No contacted leads to scan. Send DMs first.');
      return;
    }

    const { authToken, ct0 } = tokens;
    const screenNames = targets.map((t) => t.handle);

    const steps: SequenceStep[] = [
      { delay: 300, level: 'INFO', message: `[INBOX] Connecting to X DM inbox via @${credentials.handle}…` },
      { delay: 200, level: 'INFO', message: `[INBOX] auth_token present: ${authToken ? 'YES' : 'MISSING'}` },
      { delay: 200, level: 'INFO', message: `[INBOX] ct0 CSRF token present: ${ct0 ? 'YES' : 'MISSING'}` },
      { delay: 500, level: 'INFO', message: `[INBOX] Fetching DM threads from x.com/i/api/graphql/ DMInbox…` },
      { delay: 200, level: 'INFO', message: `[INBOX] Scanning ${targets.length} contacted lead${targets.length !== 1 ? 's' : ''} for replies…` },
      {
        delay: 100,
        level: 'INFO',
        message: `[INBOX] Awaiting Twitter inbox response…`,
        callback: async () => {
          const result = await scanTwitterInbox(authToken, ct0, screenNames);

          if (result.error) {
            onPushLog('ERROR', `[INBOX] ❌ Twitter API rejected request: ${result.error}`);
            if (result.raw_response) {
              const raw = JSON.stringify(result.raw_response).slice(0, 300);
              onPushLog('ERROR', `[INBOX] Raw error detail: ${raw}`);
            }
            onPushLog('ERROR', `[INBOX] Inbox scan failed. Verify your auth_token and ct0 cookies are valid.`);
            return;
          }

          onPushLog('SUCCESS', `[INBOX] ✓ Twitter API returned HTTP 200 OK.`);

          if (result.replies.length === 0) {
            onPushLog('INFO', `[INBOX] No new replies found from ${targets.length} contacted lead${targets.length !== 1 ? 's' : ''}.`);
            return;
          }

          onPushLog('SUCCESS', `[INBOX] ✓ Found ${result.replies.length} new repl${result.replies.length !== 1 ? 'ies' : 'y'}.`);

          for (const reply of result.replies) {
            const intent = detectReplyIntent(reply.text);
            const lead = targets.find((t) => {
              const a = t.handle.replace('@', '').toLowerCase();
              const b = reply.screen_name.replace('@', '').toLowerCase();
              return a === b;
            });

            if (lead) {
              onPushLog('SUCCESS', `[REPLY] ${reply.screen_name} responded: "${reply.text.slice(0, 65)}${reply.text.length > 65 ? '…' : ''}"`);
              onPushLog('INFO', `[AI] Intent detected: ${intent.toUpperCase()}`);
              onReplyLead(lead.id, reply.text, intent);
            } else {
              onPushLog('INFO', `[INBOX] Reply from ${reply.screen_name} — not in pipeline, skipping.`);
            }
          }

          const noReplyCount = targets.length - result.replies.length;
          if (noReplyCount > 0) {
            onPushLog('INFO', `[INBOX] ${noReplyCount} lead${noReplyCount !== 1 ? 's' : ''} have not yet replied — will check again next scan.`);
          }
        },
      },
      {
        delay: 200,
        level: 'SUCCESS',
        message: `[INBOX] Scan complete. Check results above.`,
      },
    ];

    onRunSequence(steps);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50">
      {/* Tab bar */}
      <div className="flex border-b border-slate-800/80">
        <TabButton active={activeTab === 'scrape'} onClick={() => setActiveTab('scrape')} icon={Search} label="Scrape Leads" accent="text-brand-400" />
        <TabButton active={activeTab === 'dm'} onClick={() => setActiveTab('dm')} icon={Send} label="Send AI DMs" accent="text-sky-400" badge={pendingLeads.length} />
        <TabButton active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} icon={Inbox} label="Inbox Check" accent="text-emerald-400" badge={contactedLeads.length} />
      </div>

      <div className="p-5">
        {/* Credentials warning */}
        {!hasCredentials && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-400">
            <Radio className="h-4 w-4 flex-shrink-0" />
            No X account configured. Click the Settings icon to add credentials before running.
          </div>
        )}

        {/* Cookie auth warning */}
        {hasCredentials && !hasTwitterTokens && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Live API requires Cookie Token auth. Switch to Cookie Token mode in Settings and paste your auth_token and ct0 cookies from x.com to enable real Twitter requests.
          </div>
        )}

        {/* Tab 1: Scrape Leads */}
        {activeTab === 'scrape' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField
                label="Target Keywords (comma-separated)"
                value={keywords}
                onChange={setKeywords}
                placeholder="#web3, crypto, founder"
                icon={Tag}
              />
              <InputField
                label="Max Leads to Scrape"
                value={maxLeads}
                onChange={setMaxLeads}
                placeholder="25"
                type="number"
                icon={Users}
                min={1}
              />
            </div>

            <div className="flex items-center gap-3">
              {isRunning ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600/90 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
                >
                  <Pause className="h-4 w-4" />
                  Stop Execution
                </button>
              ) : (
                <ActionButton
                  onClick={handleScrape}
                  disabled={isRunning || !hasCredentials}
                  running={isRunning}
                  icon={Play}
                  label="Start Live Scraping"
                  color="bg-brand-600 hover:bg-brand-500"
                />
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Send AI DMs */}
        {activeTab === 'dm' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField
                label="Daily DM Limit"
                value={dailyLimit}
                onChange={setDailyLimit}
                placeholder="20"
                type="number"
                icon={Send}
                min={1}
              />
              <InputField
                label="Delay Between Messages (seconds)"
                value={delaySeconds}
                onChange={setDelaySeconds}
                placeholder="30"
                type="number"
                icon={Clock}
                min={1}
              />
            </div>

            {/* Dry run toggle */}
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <FlaskConical className="h-4 w-4 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Dry Run Mode</p>
                  <p className="text-xs text-slate-500">Simulate DMs without sending real messages to Twitter</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDryRun((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${dryRun ? 'bg-amber-500' : 'bg-slate-700'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${dryRun ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>

            {!dryRun && hasTwitterTokens && (
              <div className="flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2.5 text-xs text-sky-400">
                <Send className="h-4 w-4 flex-shrink-0" />
                LIVE mode: Real DMs will be sent to Twitter via x.com/i/api/1.1/direct_messages/events/new.json
              </div>
            )}

            {pendingLeads.length > 0 && (
              <div className="rounded-lg border border-sky-500/15 bg-sky-500/5 px-3 py-2 text-xs text-sky-400">
                {pendingLeads.length} pending lead{pendingLeads.length !== 1 ? 's' : ''} queued for outreach.
              </div>
            )}

            {isRunning ? (
              <button
                type="button"
                onClick={onStop}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600/90 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
              >
                <Pause className="h-4 w-4" />
                Stop Execution
              </button>
            ) : (
              <ActionButton
                onClick={handleSendDms}
                disabled={isRunning || !hasCredentials || !credentials.aiApiKey.trim() || pendingLeads.length === 0}
                running={isRunning}
                icon={Play}
                label={dryRun ? 'Launch AI Messaging (Dry Run)' : 'Launch AI Messaging (LIVE)'}
                color={dryRun ? 'bg-sky-600 hover:bg-sky-500' : 'bg-sky-600 hover:bg-sky-500'}
              />
            )}
          </div>
        )}

        {/* Tab 3: Inbox Check */}
        {activeTab === 'inbox' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex items-start gap-3">
                <Inbox className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Scan Live Inbox for Replies</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Fetches real DM replies from your X inbox. Marks leads as "replied" and uses AI to classify intent (Interested, Query, Pricing, Objection).
                  </p>
                </div>
              </div>
            </div>

            {contactedLeads.length > 0 && (
              <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
                {contactedLeads.length} contacted lead{contactedLeads.length !== 1 ? 's' : ''} awaiting reply scan.
              </div>
            )}

            {isRunning ? (
              <button
                type="button"
                onClick={onStop}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600/90 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
              >
                <Pause className="h-4 w-4" />
                Stop Execution
              </button>
            ) : (
              <ActionButton
                onClick={handleInboxScan}
                disabled={isRunning || !hasCredentials || contactedLeads.length === 0}
                running={isRunning}
                icon={Inbox}
                label="Scan Live Inbox"
                color="bg-emerald-600 hover:bg-emerald-500"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
