import { useState } from 'react';
import { pushFeedback } from '../feedback/feedbackQueue';
import { playNormalClickSound } from '../../services/audio';
import { shareResult, type ShareResultPayload } from '../../utils/shareResult';

type ShareResultButtonProps = ShareResultPayload & {
  className?: string;
};

export function ShareResultButton({ className = '', ...payload }: ShareResultButtonProps) {
  const [manualText, setManualText] = useState('');

  async function handleShare() {
    playNormalClickSound();
    const outcome = await shareResult(payload);

    if (outcome.ok && outcome.method === 'clipboard') {
      pushFeedback({
        type: 'reward',
        priority: 'medium',
        title: 'LINK SKOPIOWANY',
        message: 'Wyślij znajomemu',
      });
      setManualText('');
      return;
    }

    if (outcome.ok) {
      setManualText('');
      return;
    }

    setManualText(outcome.text);
  }

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <button
        className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-black uppercase tracking-wide text-cyan-100 transition hover:border-cyan-200/55 hover:bg-cyan-300/18 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
        onClick={handleShare}
        type="button"
      >
        Udostępnij
      </button>

      {manualText && (
        <div className="w-full max-w-sm rounded-xl border border-white/10 bg-slate-950/92 p-3 text-left shadow-[0_0_24px_rgba(34,211,238,0.10)]">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-cyan-200">Skopiuj tekst</p>
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

