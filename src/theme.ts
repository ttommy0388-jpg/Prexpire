export const colors = {
  bg: '#050D10',
  surface: '#0B161A',
  surfaceBorder: '#1A2A2E',
  text: '#F2F6F7',
  textMuted: '#9AA7AD',
  mint: '#2EE8B6',
  scan: '#41F8C5',
  scanInk: '#04241B',
  amber: '#FEC22D',
  amberText: '#F5B83D',
  green: '#2BD9A0',
  red: '#FF3B4E',
  navBg: '#081517',
  navBorder: '#15262A',
  iconTile: '#1C2C35',
};

export type Tint = 'food' | 'medicine' | 'household' | 'skincare' | 'pantry' | 'add';

export const tints: Record<Tint, { top: string; bottom: string; border: string }> = {
  food: { top: '#0E5734', bottom: '#081C17', border: '#1C5A3C' },
  medicine: { top: '#074164', bottom: '#051C2A', border: '#145273' },
  household: { top: '#382663', bottom: '#121729', border: '#46327A' },
  skincare: { top: '#5F2646', bottom: '#161419', border: '#6C2D51' },
  pantry: { top: '#4D3617', bottom: '#1B1A11', border: '#5E4420' },
  add: { top: '#222E46', bottom: '#0F1A25', border: '#2C3B57' },
};

export type Tone = 'amber' | 'green';

export const pills: Record<Tone, { bg: string; border: string; text: string }> = {
  amber: { bg: '#3D2B0E', border: '#7A5A12', text: '#F5B83D' },
  green: { bg: '#06352A', border: '#14674C', text: '#36E0A4' },
};

export const radius = { card: 13, row: 13, alert: 14, tile: 12, pill: 999 };

export const space = { gutter: 14, gridGap: 9 };

export const type = {
  title: { fontSize: 19, fontWeight: '700', letterSpacing: -0.3 },
  link: { fontSize: 14.5, fontWeight: '600' },
  alertTitle: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 13.5, fontWeight: '400' },
  tileName: { fontSize: 15, fontWeight: '600' },
  rowTitle: { fontSize: 15.5, fontWeight: '600' },
  rowSub: { fontSize: 13, fontWeight: '400' },
  pill: { fontSize: 14, fontWeight: '600' },
  tab: { fontSize: 11.5, fontWeight: '500' },
} as const;
