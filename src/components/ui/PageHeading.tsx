import type { LucideIcon } from "lucide-react";

interface PageHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function PageHeading({ eyebrow, title, description, icon: Icon }: PageHeadingProps) {
  return (
    <header className="mb-8 flex items-start gap-4">
      <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-soft to-accent-soft text-primary-dark shadow-soft">
        <Icon size={24} />
      </div>
      <div className="min-w-0">
        <span className="text-xs font-bold tracking-wide text-primary">{eyebrow}</span>
        <h1 className="mt-1 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
    </header>
  );
}
