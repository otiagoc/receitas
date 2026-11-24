import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (d: React.ReactNode, p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{d}</svg>
);

export const IconBook = (p: P) => base(<><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15.5H5.5A1.5 1.5 0 0 1 4 18z" /><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15.5h5.5c.8 0 1.5-.7 1.5-1.5z" /><path d="M7 8h2M15 8h2" /></>, p);
export const IconBowl = (p: P) => base(<><path d="M3 11h18c0 4.5-4 8-9 8s-9-3.5-9-8z" /><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3" /></>, p);
export const IconCart = (p: P) => base(<><path d="M3 4h2l2.2 10.5c.1.6.7 1 1.3 1h8.8c.6 0 1.1-.4 1.3-1L20 8H6" /><circle cx="9.5" cy="19.5" r="1.2" /><circle cx="17" cy="19.5" r="1.2" /></>, p);
export const IconGear = (p: P) => base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>, p);
export const IconSearch = (p: P) => base(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>, p);
export const IconHeart = (p: P) => base(<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />, p);
export const IconClock = (p: P) => base(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, p);
export const IconUsers = (p: P) => base(<><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5" /><path d="M16 5.6a3 3 0 0 1 0 5.8M18 14.3c1.6.6 2.7 2.2 3 4.7" /></>, p);
export const IconChef = (p: P) => base(<><path d="M7 14v5.5h10V14" /><path d="M7 14a4 4 0 0 1-1-7.8 4.5 4.5 0 0 1 6-2.7 4.5 4.5 0 0 1 6 2.7A4 4 0 0 1 17 14" /><path d="M7 17h10" /></>, p);
export const IconPlus = (p: P) => base(<path d="M12 5v14M5 12h14" />, p);
export const IconMinus = (p: P) => base(<path d="M5 12h14" />, p);
export const IconX = (p: P) => base(<path d="M6 6l12 12M18 6 6 18" />, p);
export const IconCheck = (p: P) => base(<path d="m5 12.5 4.5 4.5L19 7.5" />, p);
export const IconLeft = (p: P) => base(<path d="M15 5l-7 7 7 7" />, p);
export const IconRight = (p: P) => base(<path d="M9 5l7 7-7 7" />, p);
export const IconShare = (p: P) => base(<><path d="M12 15V4M8 8l4-4 4 4" /><path d="M5 12v6.5c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5V12" /></>, p);
export const IconTrash = (p: P) => base(<><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.2c.1.8.7 1.3 1.5 1.3h6.4c.8 0 1.4-.5 1.5-1.3L17.5 7" /><path d="M10 11v6M14 11v6" /></>, p);
export const IconRefresh = (p: P) => base(<><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 20v-4h-4" /></>, p);
export const IconExternal = (p: P) => base(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v4.5c0 .8-.7 1.5-1.5 1.5h-11c-.8 0-1.5-.7-1.5-1.5v-11C4 6.7 4.7 6 5.5 6H10" /></>, p);
export const IconPlay = (p: P) => base(<path d="M8 5.5v13l10.5-6.5z" />, p);
export const IconPause = (p: P) => base(<path d="M9 5.5v13M15 5.5v13" />, p);
export const IconTimer = (p: P) => base(<><circle cx="12" cy="13.5" r="7" /><path d="M12 13.5V10M10 3h4M18.5 6.5l1.5-1.5" /></>, p);
export const IconSun = (p: P) => base(<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>, p);
export const IconMoon = (p: P) => base(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />, p);
export const IconCopy = (p: P) => base(<><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V6c0-.8-.7-1.5-1.5-1.5H6c-.8 0-1.5.7-1.5 1.5v8c0 .8.7 1.5 1.5 1.5h2.5" /></>, p);
export const IconEye = (p: P) => base(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>, p);
export const IconEyeOff = (p: P) => base(<><path d="M4 4l16 16M10 6c.6-.2 1.3-.3 2-.3 6 0 9.5 6.3 9.5 6.3a17 17 0 0 1-2.6 3.3M6.4 7.6A16 16 0 0 0 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.4 4.2-1" /><path d="M9.9 10a2.8 2.8 0 0 0 4 4" /></>, p);
export const IconSliders = (p: P) => base(<><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>, p);
export const IconPencil = (p: P) => base(<><path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z" /><path d="M13.5 7l3 3" /></>, p);
export const IconLink = (p: P) => base(<><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>, p);
export const IconList = (p: P) => base(<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />, p);
export const IconLogout = (p: P) => base(<><path d="M15 4h3.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H15" /><path d="M10 16l-4-4 4-4M6 12h10" /></>, p);
export const IconSparkle = (p: P) => base(<path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5zM19 16c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z" />, p);
export const IconPhoto = (p: P) => base(<><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" /></>, p);
