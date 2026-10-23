import { useState } from 'react';
import { X, Eye, EyeOff, KeyRound, Cookie, Bot, Check, ShieldCheck, User, Loader2 } from 'lucide-react';
import type { XCredentials } from '@/types/settings';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  credentials: XCredentials;
  onSave: () => Promise<void>;
  saved: boolean;
  saving: boolean;
  onChange: (updates: Partial<XCredentials>) => void;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  icon?: typeof KeyRound;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2.5 ${Icon ? 'pl-9' : 'pl-3'} pr-3 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/30`}
        />
      </div>
    </div>
  );
}

export default function SettingsModal({
  open,
  onClose,
  credentials,
  onSave,
  saved,
  saving,
  onChange,
}: SettingsModalProps) {
  const [showSecrets, setShowSecrets] = useState(false);

  if (!open) return null;

  const toggleType = showSecrets ? 'text' : 'password';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-thin rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10">
              <ShieldCheck className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Settings & Credentials</h2>
              <p className="text-xs text-slate-500">Encrypted & synced to your cloud account</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-6 py-5">
          {/* X Account section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-slate-200">X / Twitter Account</h3>
            </div>

            <Field
              label="X Username / Handle"
              value={credentials.handle}
              onChange={(v) => onChange({ handle: v })}
              placeholder="@your_account"
              icon={User}
            />

            {/* Auth method toggle */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Authentication Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ authMethod: 'api' })}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    credentials.authMethod === 'api'
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <KeyRound className="h-4 w-4" />
                  API Keys
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ authMethod: 'cookie' })}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    credentials.authMethod === 'cookie'
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Cookie className="h-4 w-4" />
                  Cookie Token
                </button>
              </div>
            </div>

            {credentials.authMethod === 'api' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="API Key" value={credentials.apiKey} onChange={(v) => onChange({ apiKey: v })} placeholder="xxxxxxxxxxxxx" type={toggleType} icon={KeyRound} />
                <Field label="API Secret" value={credentials.apiSecret} onChange={(v) => onChange({ apiSecret: v })} placeholder="xxxxxxxxxxxxx" type={toggleType} icon={KeyRound} />
                <Field label="Access Token" value={credentials.accessToken} onChange={(v) => onChange({ accessToken: v })} placeholder="xxxxxxxxxxxxx" type={toggleType} icon={KeyRound} />
                <Field label="Access Token Secret" value={credentials.accessTokenSecret} onChange={(v) => onChange({ accessTokenSecret: v })} placeholder="xxxxxxxxxxxxx" type={toggleType} icon={KeyRound} />
              </div>
            ) : (
              <div className="space-y-4">
                <Field label="Auth Cookie Token" value={credentials.cookieToken} onChange={(v) => onChange({ cookieToken: v })} placeholder="auth_token=xxxxxxxxxxxxx" type={toggleType} icon={Cookie} />
                <Field label="ct0 (CSRF Token)" value={credentials.ct0Token} onChange={(v) => onChange({ ct0Token: v })} placeholder="ct0 token from x.com cookies" type={toggleType} icon={Cookie} />
                <p className="text-xs text-slate-500">
                  Find both tokens in your browser dev tools under Application &gt; Cookies &gt; x.com. Copy the <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">auth_token</code> and <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">ct0</code> values.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSecrets((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
            >
              {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showSecrets ? 'Hide secrets' : 'Show secrets'}
            </button>
          </section>

          {/* Divider */}
          <div className="border-t border-slate-800" />

          {/* AI Provider section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-slate-200">AI Provider (Message Personalization)</h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ aiProvider: 'openai' })}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  credentials.aiProvider === 'openai'
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                OpenAI (GPT-4o)
              </button>
              <button
                type="button"
                onClick={() => onChange({ aiProvider: 'claude' })}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  credentials.aiProvider === 'claude'
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Claude (Anthropic)
              </button>
            </div>

            <Field
              label={`${credentials.aiProvider === 'openai' ? 'OpenAI' : 'Claude'} API Key`}
              value={credentials.aiApiKey}
              onChange={(v) => onChange({ aiApiKey: v })}
              placeholder="sk-xxxxxxxxxxxxx"
              type={toggleType}
              icon={Bot}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/95 px-6 py-4 backdrop-blur">
          <p className="text-xs text-slate-500">
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />
            Credentials are stored securely in your cloud account.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                saved ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-brand-600 hover:bg-brand-500'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved!
                </>
              ) : (
                'Save Credentials'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
