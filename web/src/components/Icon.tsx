/** Small inline stroke icons (24×24 grid), so the site loads no icon font or library. */
const PATHS = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  camera: 'M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9zM12 16a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 12 16z',
  badge: 'M12 3l2.4 1.8 3 .2.9 2.8 2.2 2-1 2.8.3 3-2.6 1.5-1.4 2.6-3-.3L12 21l-2.8-1.6-3 .3-1.4-2.6L2.2 15.6l.3-3-1-2.8 2.2-2 .9-2.8 3-.2L12 3zM8.5 12l2.5 2.5 4.5-4.5',
  eyeOff: 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.2A9.7 9.7 0 0 1 12 5c5 0 8.5 4.5 9.5 7a13.4 13.4 0 0 1-2.9 3.9M6.5 6.6C4.3 8 2.9 10.1 2.5 12c1 2.5 4.5 7 9.5 7a9.3 9.3 0 0 0 4.4-1.1',
  tag: 'M3.5 12.6V5a1.5 1.5 0 0 1 1.5-1.5h7.6l8.2 8.2a1.5 1.5 0 0 1 0 2.1l-6.6 6.6a1.5 1.5 0 0 1-2.1 0L3.5 12.6zM8 8.5h.01',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5L20 20',
  report: 'M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5zM14 3.5V8h4M9 13h6M9 16.5h4',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 7.5h.01',
  box: 'M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5v-9zM3.5 7.5L12 12l8.5-4.5M12 12v9',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2',
  alert: 'M12 3.5l9.5 16.5h-19L12 3.5zM12 10v4.5M12 17.5h.01',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  logout: 'M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16l-4-4 4-4M6 12h10',
  chevron: 'M6 9l6 6 6-6',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
