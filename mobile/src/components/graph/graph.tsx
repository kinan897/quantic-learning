/**
 * Draws a lesson graph: grid, axes, curves, line segments and labelled points.
 *
 * The server has already sampled each curve into points (see backend/app/content/graphs.py),
 * so this component only maps coordinates to pixels. It's drawn with SVG, so it's crisp at
 * any size and looks the same on iOS, Android and the web.
 */

import { useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import type { GraphColor, GraphData, XY } from '@/api/types';
import { RichText } from '@/components/math/rich-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Graph labels use the app's Manrope font (loaded in app/_layout.tsx) on every platform.
const FONT = Fonts.bodySemi;
const MAX_HEIGHT = 360;

type Props = {
  graph: GraphData;
  /** Small version for answer choices: no tick numbers, lighter grid. */
  compact?: boolean;
};

export function Graph({ graph, compact = false }: Props) {
  const theme = useTheme();
  const clipId = `clip${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [width, setWidth] = useState(0);
  const height = Math.min(
    Math.round(width * (compact ? Math.min(graph.aspect, 0.72) : graph.aspect)),
    compact ? 150 : MAX_HEIGHT,
  );

  const colorOf = (c: GraphColor) =>
    ({
      primary: theme.graphMain,
      accent: theme.graphAccent,
      success: theme.success,
      error: theme.error,
      warning: theme.xp,
      muted: theme.textSecondary,
    })[c];

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (prev === w ? prev : w));
  };

  const [x0, x1] = graph.x;
  const [y0, y1] = graph.y;
  const pad = compact ? { l: 6, r: 6, t: 6, b: 6 } : { l: 32, r: 16, t: 16, b: 26 };
  const plotW = Math.max(width - pad.l - pad.r, 1);
  const plotH = Math.max(height - pad.t - pad.b, 1);
  const sx = (x: number) => pad.l + ((x - x0) / (x1 - x0)) * plotW;
  const sy = (y: number) => pad.t + ((y1 - y) / (y1 - y0)) * plotH;

  const xTicks = ticks(x0, x1, niceStep(x1 - x0, compact ? 4 : 6));
  const yTicks = ticks(y0, y1, niceStep(y1 - y0, compact ? 3 : 5));
  const axisX = x0 <= 0 && 0 <= x1 ? sx(0) : sx(x0); // where the y-axis is drawn
  const axisY = y0 <= 0 && 0 <= y1 ? sy(0) : sy(y0); // where the x-axis is drawn

  const halo = theme.surface;
  const fontSize = compact ? 10 : 12;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={graph.caption ?? `Graph of ${graph.y_label} against ${graph.x_label}`}
      style={styles.wrap}>
      <View
        onLayout={onLayout}
        style={[styles.frame, { backgroundColor: theme.surface, borderColor: theme.border, height: height || undefined }]}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <ClipPath id={clipId}>
                <Rect x={pad.l} y={pad.t} width={plotW} height={plotH} />
              </ClipPath>
            </Defs>

            {/* Grid */}
            {graph.grid &&
              xTicks.map((t) => (
                <Line key={`gx${t}`} x1={sx(t)} x2={sx(t)} y1={pad.t} y2={pad.t + plotH} stroke={theme.border} strokeWidth={1} />
              ))}
            {graph.grid &&
              yTicks.map((t) => (
                <Line key={`gy${t}`} x1={pad.l} x2={pad.l + plotW} y1={sy(t)} y2={sy(t)} stroke={theme.border} strokeWidth={1} />
              ))}

            {/* Axes */}
            <Line x1={pad.l} x2={pad.l + plotW} y1={axisY} y2={axisY} stroke={theme.textSecondary} strokeWidth={1.5} />
            <Line x1={axisX} x2={axisX} y1={pad.t} y2={pad.t + plotH} stroke={theme.textSecondary} strokeWidth={1.5} />

            {/* Tick numbers */}
            {!compact &&
              xTicks
                .filter((t) => t !== 0 || axisX !== sx(0))
                .map((t) => (
                  <SvgText fontFamily={FONT} key={`tx${t}`} x={sx(t)} y={Math.min(axisY + 14, height - 4)} fontSize={10} fill={theme.textSecondary} textAnchor="middle">
                    {formatTick(t)}
                  </SvgText>
                ))}
            {!compact &&
              yTicks
                .filter((t) => t !== 0 || axisY !== sy(0))
                .map((t) => (
                  <SvgText fontFamily={FONT} key={`ty${t}`} x={Math.max(axisX - 5, 10)} y={sy(t) + 3.5} fontSize={10} fill={theme.textSecondary} textAnchor="end">
                    {formatTick(t)}
                  </SvgText>
                ))}

            {/* Axis names */}
            {!compact && (
              <>
                <SvgText fontFamily={FONT} x={pad.l + plotW} y={axisY - 6} fontSize={12} fontStyle="italic" fontWeight="600" fill={theme.textSecondary} textAnchor="end">
                  {graph.x_label}
                </SvgText>
                <SvgText fontFamily={FONT} x={axisX + 6} y={pad.t + 10} fontSize={12} fontStyle="italic" fontWeight="600" fill={theme.textSecondary}>
                  {graph.y_label}
                </SvgText>
              </>
            )}

            <G clipPath={`url(#${clipId})`}>
              {graph.curves.map((curve, i) => (
                <Path
                  key={`c${i}`}
                  d={curve.paths.map((p) => 'M' + p.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join('L')).join('')}
                  stroke={colorOf(curve.color)}
                  strokeWidth={compact ? 2.5 : 3}
                  strokeDasharray={curve.dashed ? '7 6' : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              {graph.segments.map((s, i) => (
                <G key={`s${i}`}>
                  <Line
                    x1={sx(s.start[0])}
                    y1={sy(s.start[1])}
                    x2={sx(s.end[0])}
                    y2={sy(s.end[1])}
                    stroke={colorOf(s.color)}
                    strokeWidth={2.5}
                    strokeDasharray={s.dashed ? '6 5' : undefined}
                    strokeLinecap="round"
                  />
                  {s.arrow && <Arrowhead from={[sx(s.start[0]), sy(s.start[1])]} to={[sx(s.end[0]), sy(s.end[1])]} color={colorOf(s.color)} />}
                </G>
              ))}
            </G>

            {/* Labels drawn last, with a halo so they stay readable over lines */}
            {!compact &&
              labelledCurves(graph).map(({ curve, index, point }) => {
                const [lx, ly] = clampLabel(sx(point[0]), sy(point[1]), width, height, pad);
                return (
                  <HaloText
                    key={`cl${index}`}
                    x={lx - 6}
                    y={ly - 9}
                    anchor="end"
                    color={colorOf(curve.color)}
                    halo={halo}
                    size={fontSize}
                    text={curve.label!}
                  />
                );
              })}
            {!compact &&
              graph.segments.map((s, i) => {
                if (!s.label) return null;
                const mx = (sx(s.start[0]) + sx(s.end[0])) / 2;
                const my = (sy(s.start[1]) + sy(s.end[1])) / 2;
                const horizontal = Math.abs(s.end[1] - s.start[1]) < Math.abs(s.end[0] - s.start[0]);
                return horizontal ? (
                  <HaloText key={`sl${i}`} x={mx} y={my + 16} anchor="middle" color={colorOf(s.color)} halo={halo} size={fontSize} text={s.label} />
                ) : (
                  <HaloText key={`sl${i}`} x={mx + 7} y={my + 4} anchor="start" color={colorOf(s.color)} halo={halo} size={fontSize} text={s.label} />
                );
              })}
            {graph.points.map((p, i) => {
              const cx = sx(p.at[0]);
              const cy = sy(p.at[1]);
              const color = colorOf(p.color);
              const nearRight = cx > width - 90;
              return (
                <G key={`p${i}`}>
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={compact ? 4 : 5.5}
                    fill={p.open ? theme.surface : color}
                    stroke={color}
                    strokeWidth={p.open ? 2.5 : 0}
                  />
                  {p.label && !compact && (
                    <HaloText
                      x={nearRight ? cx - 9 : cx + 9}
                      y={cy - 9}
                      anchor={nearRight ? 'end' : 'start'}
                      color={theme.text}
                      halo={halo}
                      size={fontSize}
                      text={p.label}
                    />
                  )}
                </G>
              );
            })}
          </Svg>
        )}
      </View>
      {graph.caption && !compact && <RichText source={graph.caption} size="small" color="textSecondary" />}
    </View>
  );
}

/**
 * Where to put each curve's label. Labels go at different spots along their curves
 * (the 1st near the end, the 2nd further back, ...) so they don't pile up in one corner.
 */
function labelledCurves(graph: GraphData) {
  return graph.curves
    .map((curve, index) => ({ curve, index }))
    .filter(({ curve }) => curve.label && curve.paths.length > 0)
    .map(({ curve, index }, k) => {
      const points = curve.paths.flat();
      const fraction = Math.max(0.3, 0.92 - 0.28 * k);
      return { curve, index, point: points[Math.floor((points.length - 1) * fraction)] };
    });
}

function HaloText(props: {
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  color: string;
  halo: string;
  size: number;
  text: string;
}) {
  const common = { x: props.x, y: props.y, fontSize: props.size, fontWeight: '700' as const, textAnchor: props.anchor };
  return (
    <G>
      <SvgText fontFamily={FONT} {...common} stroke={props.halo} strokeWidth={4} strokeLinejoin="round" fill={props.halo}>
        {props.text}
      </SvgText>
      <SvgText fontFamily={FONT} {...common} fill={props.color}>
        {props.text}
      </SvgText>
    </G>
  );
}

function Arrowhead({ from, to, color }: { from: XY; to: XY; color: string }) {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const size = 9;
  const left: XY = [to[0] - size * Math.cos(angle - 0.45), to[1] - size * Math.sin(angle - 0.45)];
  const right: XY = [to[0] - size * Math.cos(angle + 0.45), to[1] - size * Math.sin(angle + 0.45)];
  return <Polygon points={`${to[0]},${to[1]} ${left[0]},${left[1]} ${right[0]},${right[1]}`} fill={color} />;
}

/** A "nice" grid spacing (1, 2 or 5 × a power of ten) giving about `target` lines. */
export function niceStep(range: number, target: number): number {
  const raw = range / target;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const nice = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  return nice * magnitude;
}

export function ticks(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) {
    out.push(Number(v.toFixed(10)));
  }
  return out;
}

function formatTick(value: number): string {
  const text = String(Number(value.toFixed(6)));
  return text.startsWith('-') ? `−${text.slice(1)}` : text;
}

function clampLabel(
  x: number,
  y: number,
  width: number,
  height: number,
  pad: { l: number; r: number; t: number; b: number },
): XY {
  return [Math.min(Math.max(x, pad.l + 60), width - pad.r), Math.min(Math.max(y, pad.t + 18), height - pad.b)];
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two, alignSelf: 'stretch' },
  frame: { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden', minHeight: 40 },
});
