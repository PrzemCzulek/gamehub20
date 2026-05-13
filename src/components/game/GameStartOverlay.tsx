type GameStartOverlayProps = {
  title: string;
  description?: string;
  buttonLabel?: string;
  hint?: string;
  disabled?: boolean;
  onStart: () => void;
};

export function GameStartOverlay({
  title,
  description,
  buttonLabel = 'Start',
  hint,
  disabled = false,
  onStart,
}: GameStartOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-slate-950/70 p-4 backdrop-blur-[3px] transition duration-200">
      <div className="feedback-toast w-full max-w-md rounded-2xl border border-cyan-300/25 bg-slate-950/90 p-5 text-center shadow-[0_0_45px_rgba(34,211,238,0.16)]">
        <p className="text-[0.7rem] font-black uppercase tracking-[0.28em] text-cyan-200">Ready</p>
        <h3 className="mt-2 text-2xl font-black text-white">{title}</h3>
        {description && <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>}
        {hint && <p className="mt-3 text-xs font-semibold text-slate-400">{hint}</p>}
        <button
          className="mt-5 rounded-xl bg-cyan-300 px-7 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.28)] transition hover:scale-[1.03] hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          disabled={disabled}
          onClick={onStart}
          type="button"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
