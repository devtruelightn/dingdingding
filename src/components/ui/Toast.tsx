import { Check } from "lucide-react";

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[110] flex max-w-[min(560px,calc(100%-2rem))] -translate-x-1/2 items-center gap-3 rounded-full border border-ink bg-ink px-5 py-3 text-sm text-card shadow-lift [animation:toast-in_.2s_ease-out]"
    >
      <Check size={16} className="shrink-0" />
      {message}
    </div>
  );
}
