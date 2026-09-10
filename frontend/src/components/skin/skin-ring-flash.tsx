import { useEffect, useRef } from "react";
import { Animated, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

interface SkinRingFlashProps {
  active: boolean;
}

// How far the glow reaches in from each edge, in px.
const GLOW_DEPTH = 140;
// Crisp bright line right at the very edge, before the glow starts.
const RIM_WIDTH = 3;

/**
 * Screen-flash for front-facing captures. Front cameras rarely have a
 * hardware flash, so we light the scene from the screen itself: a thin
 * bright rim around the edge with a soft glow that fades continuously
 * inward toward the subject, rather than a stack of hard-edged bands.
 */
export default function SkinRingFlash({ active }: SkinRingFlashProps) {
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    Animated.timing(ringOpacity, {
      toValue: active ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [active, ringOpacity]);

  const d = GLOW_DEPTH;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, { opacity: ringOpacity }]}
      pointerEvents="none"
    >
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          {/* Edge gradients: bright at the screen edge, fading to nothing
              over GLOW_DEPTH px. The middle stop gives the falloff a
              softer, more light-like curve than a straight linear fade. */}
          <LinearGradient
            id="edgeTop"
            x1="0"
            y1="0"
            x2="0"
            y2={d}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#fff" stopOpacity={1} />
            <Stop offset="0.35" stopColor="#fff" stopOpacity={0.4} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient
            id="edgeBottom"
            x1="0"
            y1={height}
            x2="0"
            y2={height - d}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#fff" stopOpacity={1} />
            <Stop offset="0.35" stopColor="#fff" stopOpacity={0.4} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient
            id="edgeLeft"
            x1="0"
            y1="0"
            x2={d}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#fff" stopOpacity={1} />
            <Stop offset="0.35" stopColor="#fff" stopOpacity={0.4} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient
            id="edgeRight"
            x1={width}
            y1="0"
            x2={width - d}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#fff" stopOpacity={1} />
            <Stop offset="0.35" stopColor="#fff" stopOpacity={0.4} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </LinearGradient>

          {/* Corner glows: same falloff as the edges, but radiating from
              each corner point so the two adjoining edges blend into a
              single smooth curve instead of overlapping squares. */}
          <RadialGradient
            id="cornerTL"
            cx="0"
            cy="0"
            r={d}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#fff" stopOpacity={1} />
            <Stop offset="0.35" stopColor="#fff" stopOpacity={0.4} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id="cornerTR"
            cx={width}
            cy="0"
            r={d}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#fff" stopOpacity={1} />
            <Stop offset="0.35" stopColor="#fff" stopOpacity={0.4} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id="cornerBL"
            cx="0"
            cy={height}
            r={d}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#fff" stopOpacity={1} />
            <Stop offset="0.35" stopColor="#fff" stopOpacity={0.4} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id="cornerBR"
            cx={width}
            cy={height}
            r={d}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#fff" stopOpacity={1} />
            <Stop offset="0.35" stopColor="#fff" stopOpacity={0.4} />
            <Stop offset="1" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Edge strips */}
        <Rect x={0} y={0} width={width} height={d} fill="url(#edgeTop)" />
        <Rect
          x={0}
          y={height - d}
          width={width}
          height={d}
          fill="url(#edgeBottom)"
        />
        <Rect x={0} y={0} width={d} height={height} fill="url(#edgeLeft)" />
        <Rect
          x={width - d}
          y={0}
          width={d}
          height={height}
          fill="url(#edgeRight)"
        />

        {/* Corner patches, laid on top so the two edges blend radially */}
        <Rect x={0} y={0} width={d} height={d} fill="url(#cornerTL)" />
        <Rect x={width - d} y={0} width={d} height={d} fill="url(#cornerTR)" />
        <Rect x={0} y={height - d} width={d} height={d} fill="url(#cornerBL)" />
        <Rect
          x={width - d}
          y={height - d}
          width={d}
          height={d}
          fill="url(#cornerBR)"
        />

        {/* Thin, crisp rim right at the edge for a defined light source */}
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="none"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth={RIM_WIDTH * 2}
        />
      </Svg>
    </Animated.View>
  );
}
