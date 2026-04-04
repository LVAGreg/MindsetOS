'use client';

import { useState, useEffect } from 'react';
import { Sun, Check, ArrowRight } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `morning_checkin_${yyyy}-${mm}-${dd}`;
}

function isWithinMorningWindow(): boolean {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 12;
}

interface StoredCheckin {
  intention: string;
  done: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MorningCheckin() {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const [intention, setIntention] = useState('');
  const [savedIntention, setSavedIntention] = useState('');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!isWithinMorningWindow()) return;

    const key = getTodayKey();
    const raw = localStorage.getItem(key);

    if (raw) {
      try {
        const stored: StoredCheckin = JSON.parse(raw);
        if (stored.done) {
          setSavedIntention(stored.intention);
          setDone(true);
          setVisible(true);
          return;
        }
      } catch {
        // malformed storage — treat as not done
      }
    }

    setVisible(true);
  }, []);

  function handleSubmit() {
    const text = inputValue.trim();
    if (!text) return;

    const key = getTodayKey();
    const stored: StoredCheckin = { intention: text, done: true };
    localStorage.setItem(key, JSON.stringify(stored));

    setSavedIntention(text);
    setIntention(text);
    setDone(true);
  }

  function handleSkip() {
    const key = getTodayKey();
    const stored: StoredCheckin = { intention: '', done: true };
    localStorage.setItem(key, JSON.stringify(stored));
    setVisible(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
  }

  if (!visible) return null;

  // ── Done state ──────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div
        className="rounded-xl mx-3 sm:mx-6 mt-3 sm:mt-4"
        style={{
          background: 'rgba(18,18,31,0.8)',
          border: '1px solid rgba(252,200,36,0.2)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(252,200,36,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Check style={{ width: 14, height: 14, color: '#fcc824' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#ededf5',
              margin: 0,
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Intention set:{' '}
            <span style={{ color: '#fcc824' }}>{savedIntention || intention}</span>
          </p>
          <p style={{ fontSize: 11, color: '#5a5a72', margin: 0, marginTop: 1 }}>
            Check back tonight to reflect.
          </p>
        </div>
      </div>
    );
  }

  // ── Prompt state ────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl mx-3 sm:mx-6 mt-3 sm:mt-4"
      style={{
        background: 'rgba(18,18,31,0.8)',
        border: '1px solid rgba(252,200,36,0.2)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
      }}
    >
      {/* Icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Sun style={{ width: 15, height: 15, color: '#fcc824', flexShrink: 0 }} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: '#9090a8',
            whiteSpace: 'nowrap',
          }}
        >
          Good morning — set your intention
        </span>
      </div>

      {/* Input row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flex: 1,
          minWidth: 200,
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's the one thing that matters most today?"
          style={{
            flex: 1,
            background: 'rgba(9,9,15,0.6)',
            border: '1px solid #1e1e30',
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 13,
            color: '#ededf5',
            outline: 'none',
            minWidth: 0,
          }}
        />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          style={{
            background: '#fcc824',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = '#e0b01f')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = '#fcc824')
          }
        >
          Set it
          <ArrowRight style={{ width: 12, height: 12 }} />
        </button>

        {/* Skip link */}
        <button
          onClick={handleSkip}
          style={{
            background: 'none',
            border: 'none',
            padding: '5px 4px',
            fontSize: 11,
            color: '#5a5a72',
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color = '#9090a8')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color = '#5a5a72')
          }
        >
          Skip for today
        </button>
      </div>
    </div>
  );
}
