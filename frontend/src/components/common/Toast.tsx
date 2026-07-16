import { useEffect } from 'react';

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200 shadow-xl">
      <div className="flex items-start gap-3">
        <p className="flex-1">{message}</p>
        <button onClick={onClose} className="text-red-400 hover:text-red-200">
          ✕
        </button>
      </div>
    </div>
  );
}
