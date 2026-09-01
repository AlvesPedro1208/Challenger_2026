import type { ColorValue } from 'react-native';
import { Circle, Path, Rect, Svg } from 'react-native-svg';

/** One glyph per tab, named after the question the tab answers. */
export type TabIconName = 'trip' | 'map' | 'ticket' | 'stats';

const SIZE = 24;
/** Stroke weight that still reads at 24pt without turning into a blob. */
const STROKE = 1.8;

type TabBarIconProps = {
  name: TabIconName;
  /** Comes from the navigator: the active/inactive tint of the tab. */
  color: ColorValue;
};

/**
 * Line icons for the tab bar, drawn with the SVG dependency the app already
 * carries (the QR code uses it). A whole icon library for four glyphs would be
 * a much bigger install than the four paths below.
 */
export function TabBarIcon({ name, color }: TabBarIconProps) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="none">
      {GLYPHS[name](color)}
    </Svg>
  );
}

const GLYPHS: Record<TabIconName, (color: ColorValue) => React.ReactNode> = {
  // Bus seen from the side: the trip itself.
  trip: (color) => (
    <>
      <Rect
        x={4}
        y={4}
        width={16}
        height={13}
        rx={3}
        stroke={color}
        strokeWidth={STROKE}
      />
      <Path d="M4 10.5h16" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Path d="M8 17v2M16 17v2" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Circle cx={8} cy={14} r={1} fill={color} />
      <Circle cx={16} cy={14} r={1} fill={color} />
    </>
  ),
  // Map pin: where the bus is right now.
  map: (color) => (
    <>
      <Path
        d="M12 21c4-4.4 6-7.6 6-10a6 6 0 1 0-12 0c0 2.4 2 5.6 6 10z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={11} r={2.2} stroke={color} strokeWidth={STROKE} />
    </>
  ),
  // Ticket with its tear line: the QR code to show at boarding.
  ticket: (color) => (
    <>
      <Path
        d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.2a2.8 2.8 0 0 0 0 5.6V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.2a2.8 2.8 0 0 0 0-5.6z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Path
        d="M13.5 8.5v1.8M13.5 13.7v1.8"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </>
  ),
  // Bars of the punctuality histogram.
  stats: (color) => (
    <>
      <Path
        d="M6 19v-5M12 19V7M18 19v-8"
        stroke={color}
        strokeWidth={STROKE + 0.4}
        strokeLinecap="round"
      />
      <Path d="M3.5 21h17" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </>
  ),
};
