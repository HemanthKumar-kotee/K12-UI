export function AgentMark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={small ? "agent-mark agent-mark-small" : "agent-mark"}
      aria-label="K12 Intelligence"
    >
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="m3 12 13-7 13 7-13 7L3 12Z" fill="currentColor" />
        <path d="M8 17v7c5 4 11 4 16 0v-7l-8 4-8-4Z" fill="currentColor" />
        <path d="M28 13v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
