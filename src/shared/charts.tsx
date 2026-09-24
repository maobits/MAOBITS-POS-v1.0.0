import React from 'react';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { View } from 'react-native';
import { useAppTheme } from '@/core/theme/useAppTheme';
export function BarChart({ data, height = 180 }: {
    data: {
        label: string;
        value: number;
    }[];
    height?: number;
}) { const th = useAppTheme(), w = 320, max = Math.max(1, ...data.map(d => d.value)), gap = 8, bw = Math.max(12, (w - 24 - (data.length - 1) * gap) / Math.max(1, data.length)); return <View style={{ alignItems: 'center' }}><Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>{data.map((d, i) => { const h = (height - 42) * d.value / max, x = 12 + i * (bw + gap), y = height - 26 - h; return <React.Fragment key={`${d.label}-${i}`}><Rect x={x} y={y} width={bw} height={h} rx={5} fill={th.colors.primary}/><SvgText x={x + bw / 2} y={height - 8} textAnchor="middle" fontSize="9" fill={th.colors.muted}>{d.label.slice(0, 8)}</SvgText></React.Fragment>; })}</Svg></View>; }
export function LineChart({ data, height = 180 }: {
    data: {
        label: string;
        value: number;
    }[];
    height?: number;
}) { const th = useAppTheme(), w = 320, max = Math.max(1, ...data.map(d => d.value)), pts = data.map((d, i) => ({ x: 16 + i * ((w - 32) / Math.max(1, data.length - 1)), y: height - 24 - (height - 44) * d.value / max })); const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '); return <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}><Line x1="12" y1={height - 24} x2={w - 12} y2={height - 24} stroke={th.colors.border}/><Path d={path} fill="none" stroke={th.colors.accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>{pts.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r="4" fill={th.colors.primary}/>)}</Svg>; }
export function DonutChart({ data, size = 180 }: {
    data: {
        label: string;
        value: number;
    }[];
    size?: number;
}) { const th = useAppTheme(), total = Math.max(1, data.reduce((s, d) => s + d.value, 0)), r = 56, c = 2 * Math.PI * r; let offset = 0; const colors = [th.colors.primary, th.colors.accent, th.colors.success, th.colors.warning, th.colors.danger]; return <Svg width={size} height={size} viewBox="0 0 180 180"><Circle cx="90" cy="90" r={r} fill="none" stroke={th.colors.border} strokeWidth="28"/>{data.map((d, i) => { const len = c * d.value / total; const node = <Circle key={i} cx="90" cy="90" r={r} fill="none" stroke={colors[i % colors.length]} strokeWidth="28" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} rotation="-90" origin="90,90"/>; offset += len; return node; })}<SvgText x="90" y="95" textAnchor="middle" fontSize="18" fontWeight="bold" fill={th.colors.text}>{total}</SvgText></Svg>; }

