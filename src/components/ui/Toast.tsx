import { Check } from "lucide-react";

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-[#262139] px-4 py-3 text-white shadow-lg [animation:toast-in_.2s_ease-out]"
    >
      <Check size={17} />
      {message}
    </div>
  );
}
