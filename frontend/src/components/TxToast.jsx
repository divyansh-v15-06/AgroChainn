import { useEffect } from "react";

/**
 * TxToast — Brutalist Editorial Notification
 * A high-contrast, tactile alert system.
 */
export default function TxToast({ message, kind = "info", onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  // Solid, high-contrast theme mapping
  const themes = {
    success: "bg-[#1A1A1A] text-[#FDFCFB] border-[#1A1A1A] status-label-success",
    error:   "bg-[#FF5733] text-[#FDFCFB] border-[#1A1A1A] status-label-error",
    info:    "bg-[#FDFCFB] text-[#1A1A1A] border-[#1A1A1A] status-label-info",
  };

  const labels = {
    success: "✓_CONFIRMED",
    error:   "✕_REJECTED",
    info:    "ℹ_STATUS_UPDATE",
  };

  return (
    <div
      className={`fixed bottom-8 right-8 z-[9999] max-w-sm w-full border-2 p-0 
        shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] transition-all duration-300 ease-in-out
        ${themes[kind] ?? themes.info}`}
    >
      <div className="flex flex-col">
        {/* Status Header Label */}
        <div className={`px-3 py-1 text-[9px] font-black tracking-[0.2em] border-b-2 border-[#1A1A1A] 
          ${kind === 'info' ? 'bg-[#1A1A1A] text-[#FDFCFB]' : 'bg-white/20 text-current'}`}>
          {labels[kind]}
        </div>
        
        <div className="flex items-start justify-between p-4 gap-4">
          <span className="text-xs font-bold leading-relaxed uppercase tracking-tight flex-1">
            {message}
          </span>
          <button 
            onClick={onClose} 
            className="border-2 border-current px-1.5 py-0.5 text-[10px] font-black hover:bg-[#FF5733] hover:text-[#FDFCFB] hover:border-[#1A1A1A] transition-colors leading-none"
          >
            DISMISS
          </button>
        </div>
      </div>
      
      {/* Decorative Progress bar - No gradients, just a solid countdown */}
      <div className="h-1 bg-[#1A1A1A]/10 w-full overflow-hidden">
        <div 
          className="h-full bg-current transition-all duration-[5000ms] linear"
          style={{ width: '0%', animation: 'toast-timer 5s linear forwards' }}
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toast-timer {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}} />
    </div>
  );
}