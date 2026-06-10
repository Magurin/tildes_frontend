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
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

export const ChatIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z" />
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

export const RepeatIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M17 2.5 21 6.5l-4 4" />
    <path d="M3 11V9a3 3 0 0 1 3-3h15" />
    <path d="M7 21.5 3 17.5l4-4" />
    <path d="M21 13v2a3 3 0 0 1-3 3H3" />
  </svg>
);
