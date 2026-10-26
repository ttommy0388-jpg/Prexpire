import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type ArtProps = { size?: number };

export function AppleArt({ size = 56 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="appleBody" x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#FF6F78" />
          <Stop offset="0.55" stopColor="#F2263D" />
          <Stop offset="1" stopColor="#C8102E" />
        </LinearGradient>
        <LinearGradient id="appleLeaf" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#1FA855" />
          <Stop offset="1" stopColor="#6BE98F" />
        </LinearGradient>
      </Defs>
      <Path d="M50 33 C40 24 16 25 14 49 C12 70 29 91 42 91 C46 91 48 89 50 89 C52 89 54 91 58 91 C71 91 88 70 86 49 C84 25 60 24 50 33 Z" fill="url(#appleBody)" />
      <Path d="M51 34 C51 26 49 21 46 17" stroke="#6B3B1E" strokeWidth={4.5} strokeLinecap="round" fill="none" />
      <Path d="M53 30 C55 15 67 8 82 9 C80 23 69 32 53 30 Z" fill="url(#appleLeaf)" />
      <Ellipse cx="31" cy="48" rx="7" ry="11" fill="#FFFFFF" opacity={0.35} transform="rotate(20 31 48)" />
    </Svg>
  );
}

export function CapsuleArt({ size = 56 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="capBlue" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5FC0FF" />
          <Stop offset="1" stopColor="#1A62E0" />
        </LinearGradient>
        <LinearGradient id="capWhite" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#BFD2EA" />
        </LinearGradient>
      </Defs>
      <G transform="rotate(-42 50 50)">
        <Path d="M50 32 H29 A18 18 0 0 0 29 68 H50 Z" fill="url(#capBlue)" />
        <Path d="M50 32 H71 A18 18 0 0 1 71 68 H50 Z" fill="url(#capWhite)" />
        <Rect x="22" y="37" width="24" height="6" rx="3" fill="#FFFFFF" opacity={0.45} />
        <Rect x="55" y="37" width="20" height="6" rx="3" fill="#FFFFFF" opacity={0.8} />
      </G>
    </Svg>
  );
}

export function HouseArt({ size = 56 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="house" x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor="#C9A0FF" />
          <Stop offset="1" stopColor="#7444E8" />
        </LinearGradient>
      </Defs>
      <Path d="M50 14 L86 45 V84 H61 V64 A11 11 0 0 0 39 64 V84 H14 V45 Z" fill="url(#house)" stroke="url(#house)" strokeWidth={8} strokeLinejoin="round" />
      <Path d="M50 22 L26 43" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={5} strokeLinecap="round" />
    </Svg>
  );
}

export function PumpBottleArt({ size = 56 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="pumpBody" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFD0E0" />
          <Stop offset="1" stopColor="#F07AA6" />
        </LinearGradient>
      </Defs>
      <Rect x="40" y="9" width="22" height="8" rx="3" fill="#FF8FB5" />
      <Path d="M58 11 H76 V17 H66" stroke="#FF8FB5" strokeWidth={6} strokeLinejoin="round" fill="none" />
      <Rect x="46" y="16" width="10" height="14" fill="#F7A3C0" />
      <Rect x="40" y="27" width="22" height="9" rx="3" fill="#FFB3CC" />
      <Rect x="28" y="34" width="46" height="58" rx="12" fill="url(#pumpBody)" />
      <Rect x="35" y="52" width="32" height="26" rx="6" fill="#FFFFFF" opacity={0.35} />
      <Rect x="33" y="40" width="6" height="40" rx="3" fill="#FFFFFF" opacity={0.4} />
    </Svg>
  );
}

export function JarArt({ size = 56 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="jarBody" x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor="#FFB84D" />
          <Stop offset="1" stopColor="#F07A0E" />
        </LinearGradient>
        <LinearGradient id="jarLid" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFA23A" />
          <Stop offset="1" stopColor="#E06A06" />
        </LinearGradient>
      </Defs>
      <Rect x="24" y="12" width="52" height="14" rx="5" fill="url(#jarLid)" />
      <Rect x="18" y="25" width="64" height="65" rx="14" fill="url(#jarBody)" />
      <Rect x="18" y="47" width="38" height="22" rx="4" fill="#FFE08A" opacity={0.85} />
      <Rect x="70" y="32" width="5" height="34" rx="2.5" fill="#FFFFFF" opacity={0.35} />
    </Svg>
  );
}

export function MilkArt({ size = 30 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="milk" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#CFE0F4" />
        </LinearGradient>
      </Defs>
      <Rect x="36" y="6" width="28" height="13" rx="4" fill="#3B82F6" />
      <Path d="M38 19 H62 V28 C72 34 74 40 74 48 V86 A8 8 0 0 1 66 94 H34 A8 8 0 0 1 26 86 V48 C26 40 28 34 38 28 Z" fill="url(#milk)" />
      <Rect x="26" y="52" width="48" height="22" fill="#BFD6F2" />
    </Svg>
  );
}

export function PillArt({ size = 30 }: ArtProps) {
  return <CapsuleArt size={size} />;
}

export function BreadArt({ size = 30 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="crust" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F7C46A" />
          <Stop offset="1" stopColor="#D98326" />
        </LinearGradient>
      </Defs>
      <Path d="M20 46 C10 45 8 28 22 22 C36 15 64 15 78 22 C92 28 90 45 80 46 V84 A7 7 0 0 1 73 91 H27 A7 7 0 0 1 20 84 Z" fill="url(#crust)" />
      <Path d="M28 46 C22 44 22 33 30 30 C40 25 60 25 70 30 C78 33 78 44 72 46 V80 A5 5 0 0 1 67 85 H33 A5 5 0 0 1 28 80 Z" fill="#FFE1A6" />
    </Svg>
  );
}

export function AddArt({ size = 56 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="44" fill="#2E3B52" stroke="#3F4F6B" strokeWidth={2} />
      <Path d="M50 30 V70 M30 50 H70" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" />
    </Svg>
  );
}

export function PrexpireMark({ size = 130 }: ArtProps) {
  const petal = (cx: number, cy: number, angle: number, key: string) => (
    <Rect key={key} x={cx - 20} y={cy - 14} width={40} height={28} rx={14} transform={`rotate(${angle} ${cx} ${cy})`} fill="url(#mark)" />
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8AF5D2" />
          <Stop offset="0.5" stopColor="#3FDDAF" />
          <Stop offset="1" stopColor="#10A882" />
        </LinearGradient>
      </Defs>
      {petal(30, 30, 45, 'a')}
      {petal(70, 30, -45, 'b')}
      {petal(30, 70, -45, 'c')}
      {petal(70, 70, 45, 'd')}
      <G stroke="#0B3B2E" strokeWidth={5.5} strokeLinecap="round">
        <Path d="M50 54 L40 44" />
        <Path d="M50 54 L62 42" />
      </G>
      <Circle cx="50" cy="54" r="6" fill="#0B3B2E" />
    </Svg>
  );
}
