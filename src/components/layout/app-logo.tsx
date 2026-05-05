interface AppLogoProps {
  className?: string
}

export function AppLogo({ className }: AppLogoProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold text-indigo-600 ${className ?? ''}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        {/* Ticket icon */}
        <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4V9z" />
        <line x1="9" y1="7" x2="9" y2="17" strokeDasharray="2 2" />
      </svg>
      <span>EventApp</span>
    </span>
  )
}
