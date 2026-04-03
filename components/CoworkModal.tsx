'use client';

import { useState } from 'react';
import { X, Wand2, Download, Check, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

// ─── Design tokens ─────────────────────────────────────────────────────────
const T = {
  pageBg:       '#09090f',
  cardBg:       'rgba(18,18,31,0.97)',
  border:       '#1e1e30',
  borderHover:  '#2e2e48',
  textPrimary:  '#ededf5',
  textMuted:    '#9090a8',
  textDim:      '#5a5a72',
  blue:         '#4f6ef7',
  blueHover:    '#3d5ce5',
  amber:        '#fcc824',
  purple:       '#7c5bf6',
  inputBg:      'rgba(14,14,24,0.8)',
  previewBg:    'rgba(12,12,22,0.6)',
  selectedBg:   'rgba(79,110,247,0.12)',
  selectedBorder:'#4f6ef7',
  dangerText:   '#f87171',
} as const;

interface CoworkModalProps {
  onClose: () => void;
}

type Step = 1 | 2 | 3;

const WORK_STYLES = [
  'Outcome-focused — I give direction, need execution',
  'Collaborative — I like to think out loud together',
  'Structured — Follow the process exactly, no improvisation',
  'Flexible — Use judgment, surface surprises',
];

const COMM_PREFS = [
  'Async-first (Loom/Slack, avoid live calls)',
  'Short check-ins only (under 15 min)',
  'Daily standup style',
  'Weekly review cadence',
];

export function CoworkModal({ onClose }: CoworkModalProps) {
  const user = useAppStore(s => s.user);
  const [step, setStep] = useState<Step>(1);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: user?.name || user?.email?.split('@')[0] || '',
    coachingNiche: '',
    workStyle: '',
    commPref: '',
    priorities: '',
    doNotDo: '',
  });

  const updateForm = (key: keyof typeof form, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const prompt = `Generate a concise, professional "Working with ${form.name}" instruction guide for a VA or EA.

About this person:
- Name: ${form.name}
- Coaching niche: ${form.coachingNiche}
- Work style: ${form.workStyle}
- Communication preference: ${form.commPref}
- Top weekly priorities: ${form.priorities}
- What NOT to do / common mistakes: ${form.doNotDo}

Format the guide with these sections:
1. About [Name] — who they are and what they do (2-3 sentences)
2. How They Like to Work — decision-making style, delegation preferences
3. Communication Rules — response times, preferred channels, meeting cadence
4. Your Weekly Priorities — the 3-5 things that matter most each week
5. What Good Work Looks Like — specific examples of what success means
6. What to Avoid — common mistakes, pet peeves, hard no's
7. How to Handle Decisions — what to bring to them vs handle independently
8. Tools & Access — note any tools they should know about

Keep it practical, specific, and under 600 words. Write in second person ("You will..." "When [Name] asks...").`;

      const r = await fetch(`${API}/api/agent/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId: 'mindset-score',
          message: prompt,
          systemOverride: 'You are a professional business writer. Generate a clear, actionable working guide. No preamble. Start directly with "# Working with [Name]".',
        }),
      });

      if (r.ok) {
        const data = await r.json();
        setGenerated(data.response || data.content || data.text || '');
      } else {
        setGenerated(generateFallback());
      }
    } catch (err) {
      console.error('[CoworkModal] generate failed:', err);
      setGenerated(generateFallback());
    } finally {
      setGenerating(false);
      setStep(3);
    }
  };

  const generateFallback = () => `# Working with ${form.name}

## About ${form.name}
${form.name} is a ${form.coachingNiche} coach who helps clients transform their mindset and results. They work with entrepreneurs and high-performers who want to think more clearly and act more decisively.

## How They Like to Work
${form.workStyle}. They delegate with clear outcomes in mind and expect you to surface blockers early — don't wait until a deadline to flag a problem.

## Communication Rules
${form.commPref}. Match their energy: brief and direct. Use bullet points over paragraphs. Always lead with the most important thing.

## Your Weekly Priorities
${form.priorities}

## What to Avoid
${form.doNotDo}

## How to Handle Decisions
Bring decisions to ${form.name} when they involve: client relationships, money over $500, anything public-facing, or anything that would take more than 2 hours to undo. Handle everything else using your best judgment and log what you did.

---
*Generated by MindsetOS Cowork Generator*`;

  const downloadDocx = async () => {
    setDownloading(true);
    setError(null);
    try {
      const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx');
      const lines = generated.split('\n');
      const paragraphs: InstanceType<typeof Paragraph>[] = [];

      for (const line of lines) {
        if (line.startsWith('# ')) {
          paragraphs.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 }));
        } else if (line.startsWith('## ')) {
          paragraphs.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }));
        } else if (line.startsWith('- ')) {
          paragraphs.push(new Paragraph({ text: line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1'), bullet: { level: 0 } }));
        } else if (line.trim() === '') {
          paragraphs.push(new Paragraph({ text: '' }));
        } else {
          paragraphs.push(new Paragraph({ children: [new TextRun(line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'))] }));
        }
      }

      const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `working-with-${(form.name || 'me').toLowerCase().replace(/\s+/g, '-')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 3000);
    } catch (err) {
      console.error('[CoworkModal] DOCX export failed:', err);
      setError('Download failed — try Copy Text instead.');
    } finally {
      setDownloading(false);
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(generated).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err: unknown) => {
      console.error('[CoworkModal] Failed to copy to clipboard:', err);
      setError('Copy failed — please select and copy the text manually.');
    });
  };

  // ─── Shared input style ─────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '0.875rem',
    border: `1px solid ${T.border}`,
    borderRadius: '8px',
    background: T.inputBg,
    color: T.textPrimary,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    /* z-[9999]: highest-priority modal — sits above TrialExpiredPopup (z-[9999]) and all other overlays */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: T.cardBg, border: `1px solid ${T.border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${T.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(124,91,246,0.15)', border: `1px solid rgba(124,91,246,0.25)` }}
            >
              <Wand2 className="w-4 h-4" style={{ color: T.purple }} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: T.textPrimary }}>Cowork Instruction Generator</h2>
              <p className="text-xs" style={{ color: T.textMuted }}>Step {step} of 3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cowork generator"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: T.textMuted }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step progress */}
        <div className="flex gap-1 px-6 pt-4">
          {([1, 2, 3] as Step[]).map(s => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full transition-colors"
              style={{ background: s <= step ? T.blue : T.border }}
            />
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mx-6 mt-3 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: T.dangerText }}
          >
            {error}
          </div>
        )}

        {/* Step 1: About you */}
        {step === 1 && (
          <div className="px-6 py-5 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: T.textPrimary }}>Who are you?</p>
              <p className="text-xs mb-3" style={{ color: T.textMuted }}>This becomes the guide your VA follows.</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: T.textMuted }}>Your name</label>
              <input
                value={form.name}
                onChange={e => updateForm('name', e.target.value)}
                placeholder="Greg"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: T.textMuted }}>Your coaching niche</label>
              <input
                value={form.coachingNiche}
                onChange={e => updateForm('coachingNiche', e.target.value)}
                placeholder="Mindset coaching for entrepreneurs"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: T.textMuted }}>Top weekly priorities</label>
              <textarea
                value={form.priorities}
                onChange={e => updateForm('priorities', e.target.value)}
                rows={3}
                placeholder="Recording podcast content, client sessions, outreach to 5 new leads, newsletter..."
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!form.name || !form.coachingNiche}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
              style={{ background: T.blue, color: '#fff' }}
              onMouseEnter={e => { if (!(!form.name || !form.coachingNiche)) (e.currentTarget as HTMLElement).style.background = T.blueHover; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.blue; }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Working style */}
        {step === 2 && (
          <div className="px-6 py-5 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: T.textPrimary }}>How you like to work</p>
              <p className="text-xs mb-3" style={{ color: T.textMuted }}>This shapes how your VA should approach their work.</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: T.textMuted }}>Work style</label>
              <div className="space-y-2">
                {WORK_STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => updateForm('workStyle', s)}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors"
                    style={{
                      border: `1px solid ${form.workStyle === s ? T.selectedBorder : T.border}`,
                      background: form.workStyle === s ? T.selectedBg : 'transparent',
                      color: form.workStyle === s ? T.textPrimary : T.textMuted,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: T.textMuted }}>Communication preference</label>
              <div className="space-y-2">
                {COMM_PREFS.map(c => (
                  <button
                    key={c}
                    onClick={() => updateForm('commPref', c)}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors"
                    style={{
                      border: `1px solid ${form.commPref === c ? T.selectedBorder : T.border}`,
                      background: form.commPref === c ? T.selectedBg : 'transparent',
                      color: form.commPref === c ? T.textPrimary : T.textMuted,
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: T.textMuted }}>What NOT to do (pet peeves, hard no's)</label>
              <textarea
                value={form.doNotDo}
                onChange={e => updateForm('doNotDo', e.target.value)}
                rows={2}
                placeholder="Don't send emails without my review, don't reschedule clients without asking, don't use jargon..."
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
                style={{ border: `1px solid ${T.border}`, color: T.textMuted, background: 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                Back
              </button>
              <button
                onClick={generate}
                disabled={!form.workStyle || !form.commPref || generating}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
                style={{ background: T.blue, color: '#fff' }}
                onMouseEnter={e => { if (!(!form.workStyle || !form.commPref || generating)) (e.currentTarget as HTMLElement).style.background = T.blueHover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.blue; }}
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" aria-hidden="true" />
                    Generate Guide
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Generated result */}
        {step === 3 && (
          <div className="px-6 py-5 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: T.textPrimary }}>Your cowork guide is ready</p>
              <p className="text-xs" style={{ color: T.textMuted }}>Share this with your VA or EA. Edit as needed.</p>
            </div>
            <div
              className="max-h-64 overflow-y-auto rounded-lg p-4"
              style={{ border: `1px solid ${T.border}`, background: T.previewBg }}
            >
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed" style={{ color: T.textMuted }}>
                {generated}
              </pre>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyText}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors"
                style={{ border: `1px solid ${T.border}`, color: T.textMuted, background: 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {copied
                  ? <><Check className="w-4 h-4" style={{ color: T.amber }} aria-hidden="true" /><span>Copied</span></>
                  : <span>Copy Text</span>
                }
              </button>
              <button
                onClick={downloadDocx}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                style={{ background: T.blue, color: '#fff' }}
                onMouseEnter={e => { if (!downloading) (e.currentTarget as HTMLElement).style.background = T.blueHover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.blue; }}
              >
                {downloading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : downloadDone ? (
                  <><Check className="w-4 h-4" aria-hidden="true" /><span>Downloaded</span></>
                ) : (
                  <><Download className="w-4 h-4" aria-hidden="true" /><span>Download .docx</span></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
