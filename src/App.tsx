import { useState, useMemo, useCallback, useEffect } from 'react';
import Header from '@/components/Header';
import AnalyticsOverview from '@/components/AnalyticsOverview';
import LeadTable from '@/components/LeadTable';
import SettingsModal from '@/components/SettingsModal';
import HuntingPanel from '@/components/HuntingPanel';
import TerminalConsole from '@/components/TerminalConsole';
import NotificationModal from '@/components/NotificationModal';
import LoginModal from '@/components/LoginModal';
import { useSettings } from '@/hooks/useSettings';
import { useTerminal } from '@/hooks/useTerminal';
import { useAuth } from '@/hooks/useAuth';
import type { Lead, LeadStatus, ReplyIntent } from '@/types';
import {
  loadCredentials,
  saveCredentials,
  loadLeads,
  insertLead,
  updateLeadStatus,
  saveLeadsLocal,
} from '@/lib/dataSync';

function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-brand-500" />
      </div>
    );
  }

  if (!user) {
    return <LoginModal onSignIn={signIn} onSignUp={signUp} />;
  }

  return <Dashboard userId={user.id} userEmail={user.email ?? ''} onSignOut={signOut} />;
}

interface DashboardProps {
  userId: string;
  userEmail: string;
  onSignOut: () => void;
}

function Dashboard({ userId, userEmail, onSignOut }: DashboardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifState, setNotifState] = useState({ open: false, message: '' });
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const raw = localStorage.getItem(`xhunter_leads_${userId}`);
      if (raw) return JSON.parse(raw) as Lead[];
    } catch {
      // ignore parse errors
    }
    return [];
  });
  const [dataLoaded, setDataLoaded] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const { credentials, updateCredentials, saveCredentials: saveLocalCredentials, saved, setCredentials } = useSettings(userId);
  const { logs, isRunning, pushLog, runSequence, stop, clear } = useTerminal();

  // Load all user data on mount / login.
  // localStorage data is already loaded synchronously (see useState + useSettings
  // initializers above). Now we fetch from the cloud database — the source of truth —
  // and update state if the cloud has data. This is what makes data appear on a
  // new browser/device after logging in with the same email.
  useEffect(() => {
    (async () => {
      pushLog('INFO', `Syncing with cloud database for ${userEmail}…`);

      const [cloudCreds, cloudLeads] = await Promise.all([
        loadCredentials(userId),
        loadLeads(userId),
      ]);

      if (cloudCreds) {
        setCredentials(cloudCreds);
        pushLog('SUCCESS', 'Credentials synced from cloud.');
      } else {
        pushLog('INFO', 'No saved credentials found — configure Settings to get started.');
      }

      if (cloudLeads.length > 0) {
        setLeads(cloudLeads);
        saveLeadsLocal(userId, cloudLeads);
        pushLog('SUCCESS', `${cloudLeads.length} leads synced from cloud.`);
      } else {
        pushLog('INFO', 'No saved leads found — run a scrape to get started.');
      }

      pushLog('INFO', 'Cloud sync complete.');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const pendingDms = leads.filter((l) => l.status === 'pending').length;
    const contacted = leads.filter((l) => l.status === 'contacted' || l.status === 'replied').length;
    const replied = leads.filter((l) => l.status === 'replied').length;
    const conversionRate = contacted > 0 ? (replied / contacted) * 100 : 0;
    return { totalLeads, pendingDms, contacted, replied, conversionRate };
  }, [leads]);

  const pendingLeads = useMemo(() => leads.filter((l) => l.status === 'pending'), [leads]);
  const contactedLeads = useMemo(() => leads.filter((l) => l.status === 'contacted'), [leads]);

  const showNotification = useCallback((message: string) => {
    setNotifState({ open: true, message });
  }, []);

  // Save credentials to Supabase
  const handleSaveCredentials = useCallback(async () => {
    setSettingsSaving(true);
    try {
      await saveCredentials(userId, credentials);
      saveLocalCredentials();
      pushLog('SUCCESS', 'Credentials saved to cloud.');
    } catch (err) {
      pushLog('ERROR', `Failed to save credentials: ${(err as Error).message}`);
    } finally {
      setSettingsSaving(false);
    }
  }, [userId, credentials, saveLocalCredentials, pushLog]);

  // Live: add a scraped lead — insert to DB, add to local state, persist to localStorage
  const handleAddLead = useCallback(async (lead: Lead) => {
    const dbId = await insertLead(userId, lead);
    const leadWithId = dbId ? { ...lead, id: dbId } : lead;
    setLeads((prev) => {
      const next = [leadWithId, ...prev];
      saveLeadsLocal(userId, next);
      return next;
    });
  }, [userId]);

  // Live: update a lead from pending -> contacted
  const handleContactLead = useCallback(async (leadId: string, dmText: string) => {
    setLeads((prev) => {
      const next = prev.map((lead) =>
        lead.id === leadId
          ? { ...lead, status: 'contacted' as LeadStatus, sentDm: dmText }
          : lead,
      );
      saveLeadsLocal(userId, next);
      return next;
    });
    await updateLeadStatus(leadId, { status: 'contacted', sent_dm: dmText });
  }, [userId]);

  // Live: update a lead from contacted -> replied with intent
  const handleReplyLead = useCallback(async (leadId: string, replyText: string, intent: NonNullable<ReplyIntent>) => {
    setLeads((prev) => {
      const next = prev.map((lead) =>
        lead.id === leadId
          ? { ...lead, status: 'replied' as LeadStatus, replyText, replyIntent: intent }
          : lead,
      );
      saveLeadsLocal(userId, next);
      return next;
    });
    await updateLeadStatus(leadId, { status: 'replied', reply_text: replyText, reply_intent: intent });
  }, [userId]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Subtle radial background glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-brand-600/5 blur-[120px]" />
      </div>

      <div className="relative z-10">
        <Header
          onOpenSettings={() => setSettingsOpen(true)}
          userEmail={userEmail}
          onSignOut={onSignOut}
        />

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Page title */}
          <div>
            <h2 className="text-xl font-bold text-white">Dashboard</h2>
            <p className="mt-1 text-sm text-slate-400">
              Monitor your scraped leads, track outreach, and measure reply conversions.
            </p>
          </div>

          {/* Analytics */}
          <AnalyticsOverview {...stats} />

          {/* Hunting Panel */}
          <HuntingPanel
            credentials={credentials}
            isRunning={isRunning}
            pendingLeads={pendingLeads}
            contactedLeads={contactedLeads}
            onRunSequence={runSequence}
            onStop={stop}
            onPushLog={pushLog}
            onAddLead={handleAddLead}
            onContactLead={handleContactLead}
            onReplyLead={handleReplyLead}
            onMissingSettings={showNotification}
          />

          {/* Lead table */}
          {dataLoaded && <LeadTable leads={leads} />}

          {/* Terminal Console */}
          <TerminalConsole logs={logs} isRunning={isRunning} onClear={clear} onStop={stop} />
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        credentials={credentials}
        onSave={handleSaveCredentials}
        saved={saved}
        saving={settingsSaving}
        onChange={updateCredentials}
      />

      {/* Notification Modal */}
      <NotificationModal
        open={notifState.open}
        onClose={() => setNotifState({ open: false, message: '' })}
        onAction={() => setSettingsOpen(true)}
        title="Settings Required"
        message={notifState.message}
        actionLabel="Open Settings"
      />
    </div>
  );
}

export default App;
