export function CraftDoodle({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`craft-doodle ${className}`}
      viewBox="0 0 260 130"
      fill="none"
      aria-hidden="true"
    >
      <path
        pathLength="1"
        d="M74 18h42c-10 13-11 22-4 34 11 18 17 34 11 50-8 18-50 18-58 0-7-16 0-32 11-50 7-12 7-21-2-34Z"
      />
      <path pathLength="1" d="M76 18c0 7 38 7 40 0M70 107c9-5 39-5 49 0" />
      <path pathLength="1" d="M78 68c11-8 23-6 33 2M75 81c12-7 28-5 40 4" />
      <path
        pathLength="1"
        d="M39 115c30-7 92-8 125 0 13 3 13 8 0 11-36 7-96 5-127-1-11-2-10-7 2-10Z"
      />
      <path
        pathLength="1"
        d="M158 31c16-9 40-4 49 12 8 15-1 31-17 31-17 0-23-20-10-29 12-8 29 2 40 14 9 10 17 18 29 21"
      />
      <path pathLength="1" d="m194 87-7 8 8 8-9 11M210 88l8 7-7 9 8 10" />
    </svg>
  );
}
