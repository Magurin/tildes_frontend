/** Lightweight inline Lucide-style icons (stroke 2, 24px), consistent set. */
type P = React.SVGProps<SVGSVGElement>;
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const HomeIcon = (p: P) => (
  <svg {...base} {...p}>
    {/* Yurt: wide conical roof, crown (toono), barrel wall with bands, door */}
    <path d="M3 12C4.5 8 9 6 12 6s7.5 2 9 6" />
    <ellipse cx="12" cy="5" rx="2.3" ry="1.2" />
    <path d="M12 3.9V6.1" />
    <path d="M3.6 12C3.2 15 3.4 17.6 4.6 19" />
    <path d="M20.4 12C20.8 15 20.6 17.6 19.4 19" />
    <path d="M4.6 19C9 20.4 15 20.4 19.4 19" />
    <path d="M3.5 14.4C8 15.3 16 15.3 20.5 14.4" />
    <path d="M3.8 16.9C8 17.7 16 17.7 20.2 16.9" />
    <path d="M9.5 19.1V13.6h5V19.1" />
    <path d="M12 13.6V19.1" />
  </svg>
);

export const UserIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

export const ChatIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" />
  </svg>
);

export const TranslateIcon = (p: P) => (
  <svg {...base} {...p}>
    {/* Othala rune (left): a diamond standing on two splayed legs */}
    <path d="M6 3.2 2.4 7" />
    <path d="M6 3.2 9.6 7" />
    <path d="M2.4 7 8.8 16" />
    <path d="M9.6 7 3.2 16" />
    {/* Ö (right): capital O with a diaeresis */}
    <circle cx="17" cy="13.6" r="4.1" />
    <circle cx="15.1" cy="6.8" r="0.95" fill="currentColor" stroke="none" />
    <circle cx="18.9" cy="6.8" r="0.95" fill="currentColor" stroke="none" />
  </svg>
);

export const FeatherIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
    <path d="M16 8 2 22" />
    <path d="M17.5 15H9" />
  </svg>
);

export const UploadIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 15V3" />
    <path d="m7 8 5-5 5 5" />
    <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
  </svg>
);

export const GlobeIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
  </svg>
);

export const MicIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </svg>
);

export const StopIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

export const SendIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m4 12 16-8-6 16-3-7-7-1Z" />
  </svg>
);

export const ChevronRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const BookIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </svg>
);

export const PencilIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 3 21l.5-4.5L17 3Z" />
  </svg>
);

export const TrashIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
  </svg>
);

export const DownloadIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const XIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m6 6 12 12" />
    <path d="m18 6-12 12" />
  </svg>
);

export const SwapIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 8h15" />
    <path d="m15 4 4 4-4 4" />
    <path d="M20 16H5" />
    <path d="m9 12-4 4 4 4" />
  </svg>
);

export const CopyIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </svg>
);

export const SpeakerIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    <path d="M16 9a4 4 0 0 1 0 6" />
  </svg>
);

export const RepeatIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M17 2.5 21 6.5l-4 4" />
    <path d="M3 11V9a3 3 0 0 1 3-3h15" />
    <path d="M7 21.5 3 17.5l4-4" />
    <path d="M21 13v2a3 3 0 0 1-3 3H3" />
  </svg>
);

export const SparklesIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 7c.6 2.8 2.2 4.4 5 5-2.8.6-4.4 2.2-5 5-.6-2.8-2.2-4.4-5-5 2.8-.6 4.4-2.2 5-5Z" />
  </svg>
);

export const WaveIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M2 12h2M7 12h2M12 12h2M17 12h2M22 12h0" />
    <path d="M4 8v8M9 5v14M14 7v10M19 9v6" />
  </svg>
);

export const HeartIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 20s-7-4.3-9.3-8.6C1.2 8.6 2.6 5.5 5.7 5.1 7.8 4.8 9.4 6 12 8.5c2.6-2.5 4.2-3.7 6.3-3.4 3.1.4 4.5 3.5 3 6.3C19 15.7 12 20 12 20Z" />
  </svg>
);

export const ArrowRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12h14" />
    <path d="m13 5 7 7-7 7" />
  </svg>
);
