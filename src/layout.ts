import { useWindowDimensions } from 'react-native';
import { space } from './theme';

export type LayoutMode = 'phone' | 'tablet' | 'split';

export type Layout = {
  // phone: single column, full width. tablet: single column, centered with a max width.
  // split: landscape, categories + summary on the left, upcoming items on the right.
  mode: LayoutMode;
  width: number;
  height: number;
  landscape: boolean;
  gutter: number;
  // Max width of the centered content area (header and body share it).
  maxContentWidth: number;
  // Ratio of the left column in split mode.
  leftFraction: number;
  // Short screens (phone landscape) use the compact tile height.
  short: boolean;
};

// Shortest side of an iPad mini is 744pt; the largest iPhone is 440pt wide.
const TABLET_MIN_SIDE = 600;
const SPLIT_MIN_WIDTH = 640;

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const tabletClass = Math.min(width, height) >= TABLET_MIN_SIDE;
  const mode: LayoutMode = landscape && width >= SPLIT_MIN_WIDTH ? 'split' : width >= TABLET_MIN_SIDE ? 'tablet' : 'phone';
  const gutter = tabletClass ? 24 : space.gutter;

  return {
    mode,
    width,
    height,
    landscape,
    gutter,
    maxContentWidth: mode === 'split' ? 1240 : mode === 'tablet' ? 760 : 560,
    leftFraction: tabletClass ? 0.56 : 0.5,
    short: height < 500,
  };
}

// Category grids always hold six tiles, so the column count stays a divisor of six:
// three columns (two rows) or six columns (one row). Returns the tile width that
// fills `available` exactly so every tile in a layout is the same size.
export function gridFor(available: number, gap: number, minTile: number) {
  const columns = available >= 6 * minTile + 5 * gap ? 6 : 3;
  const tileWidth = Math.floor((available - (columns - 1) * gap) / columns);
  return { columns, tileWidth };
}
