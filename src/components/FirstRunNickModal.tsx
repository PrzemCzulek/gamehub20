import { useState } from 'react';
import type { FormEvent } from 'react';
import { playNormalClickSound } from '../services/audio';

type FirstRunNickModalProps = {
  onSubmit: (name: string) => void;
};

export function FirstRunNickModal({ onSubmit }: FirstRunNickModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();

    if (cleanName.length < 3) {
      setError('Nick musi mieć co najmniej 3 znaki.');
      return;
    }

    playNormalClickSound();
    onSubmit(cleanName.slice(0, 24));
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
      <form
        className="feedback-toast w-full max-w-md rounded-2xl border border-cyan-300/25 bg-slate-950/95 p-6 shadow-[0_0_55px_rgba(34,211,238,0.16)]"
        onSubmit={handleSubmit}
      >
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">GAME HUB 2.0</p>
          <h1 className="mt-2 text-2xl font-black text-white">Wybierz swój nick</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Ten nick będzie widoczny w lokalnych statystykach i rankingach online.
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nick gracza</span>
          <input
            autoFocus
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-base font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:shadow-[0_0_22px_rgba(34,211,238,0.16)]"
            maxLength={24}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            placeholder="Twój nick"
            value={name}
          />
        </label>

        {error && <p className="mt-3 rounded-md border border-red-300/25 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}

        <button
          className="mt-5 w-full rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.24)] transition hover:scale-[1.01] hover:bg-teal-200"
          type="submit"
        >
          Zaczynamy
        </button>
      </form>
    </div>
  );
}
