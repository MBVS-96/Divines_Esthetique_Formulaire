import type { ReactNode } from "react";

/**
 * Anchor that scrolls without touching the URL.
 *
 * Plain `href="#services"` fights the router in the single-file demo build,
 * where the hash carries the route. Scrolling by hand works in both modes and
 * keeps the link keyboard-accessible.
 */
export function SectionLink({
  id,
  className,
  onNavigate,
  children,
}: {
  id: string;
  className?: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  return (
    <a
      href={`#${id}`}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        onNavigate?.();
      }}
    >
      {children}
    </a>
  );
}
