import type { LucideIcon } from "lucide-react";

interface PageHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function PageHeading({ eyebrow, title, description, icon: Icon }: PageHeadingProps) {
  return (
    <header className="mb-6 flex items-center gap-4">
      <div className="grid size-[54px] shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Icon size={24} />
      </div>
      <div>
        <span className="text-xs font-extrabold text-primary">{eyebrow}</span>
        <h1 className="my-0.5 text-3xl leading-tight tracking-tight">{title}</h1>
        <p className="mt-1 text-muted">{description}</p>
      </div>
    </header>
  );
}
