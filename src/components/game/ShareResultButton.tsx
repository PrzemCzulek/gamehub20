import { useMemo, useState } from 'react';
import { pushFeedback } from '../feedback/feedbackQueue';
import { playNormalClickSound } from '../../services/audio';
import { buildShareText, copyShareText, shareResult, type ShareResultPayload } from '../../utils/shareResult';

type ShareResultButtonProps = ShareResultPayload & {
  className?: string;
};

export function ShareResultButton({ className = '', ...payload }: ShareResultButtonProps) {
  const [open, setOpen] = useState(false);
  const [manualText, setManualText] = useState('');
  const challengeText = useMemo(() => buildShareText(payload), [payload.gameId, payload.modeLabel, payload.scoreLabel, payload.url]);
  const canUseNativeShare = typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function';

  async function handleSystemShare() {
    playNormalClickSound();
    const outcome = await shareResult(payload);

    if (!outcome.ok) {
      setManualText(outcome.text);
    }
  }

  async function handleCopyChallenge() {
    playNormalClickSound();
    const outcome = await copyShareText(payload);

    if (outcome.ok) {
      pushFeedback({
        type: 'reward',
        priority: 'medium',
        title: 'WYZWANIE SKOPIOWANE',
        message: 'Wklej znajomemu',
      });
      setManualText('');
      setOpen(false);
      return;
    }

    setManualText(outcome.text);
  }

  return (
    <div className={`relative inline-flex flex-col items-center gap-2 ${className}`}>
      <button
        aria-expanded={open}
        className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-black uppercase tracking-wide text-cyan-100 transition hover:border-cyan-200/55 hover:bg-cyan-300/18 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
        onClick={() => {
          playNormalClickSound();
          setOpen((value) => !value);
          setManualText('');
        }}
        type="button"
      >
        Udostępnij
      </button>

      {open && (
        <div className="z-20 w-64 rounded-xl border border-cyan-300/18 bg-slate-950/95 p-2 text-left shadow-[0_0_28px_rgba(34,211,238,0.14)] backdrop-blur">
          <button
            className="w-full rounded-lg px-3 py-2 text-left text-xs font-black uppercase tracking-wide text-slate-200 transition hover:bg-cyan-300/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canUseNativeShare}
            onClick={handleSystemShare}
            type="button"
          >
            Udostępnij systemowo
          </button>
          <button
            className="mt-1 w-full rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-left text-xs font-black uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-300/18 hover:text-white"
            onClick={handleCopyChallenge}
            type="button"
          >
            Kopiuj wyzwanie
          </button>
          <p className="mt-2 rounded-lg border border-white/10 bg-black/25 p-2 text-[0.68rem] leading-4 text-slate-400">{challengeText}</p>
        </div>
      )}

      {manualText && (
        <div className="z-20 w-full max-w-sm rounded-xl border border-white/10 bg-slate-950/95 p-3 text-left shadow-[0_0_24px_rgba(34,211,238,0.10)]">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-cyan-200">Skopiuj ręcznie</p>
          <textarea
            className="mt-2 h-24 w-full resize-none rounded-lg border border-white/10 bg-black/35 p-2 text-xs leading-5 text-slate-100 outline-none focus:border-cyan-300/45"
            readOnly
            value={manualText}
          />
        </div>
      )}
    </div>
  );
}

