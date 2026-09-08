import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CommonResolutions,
  useFrameOutput,
  type CameraFrameOutput,
  type Frame,
} from "react-native-vision-camera";
import { runOnJS } from "react-native-worklets";
import { useSharedValue } from "react-native-reanimated";

export interface LiveLumaOptions {
  isActive: boolean;
  /** Minimum milliseconds between forwarded samples (~2/s at 500). */
  sampleIntervalMs?: number;
  onError?: (error: unknown) => void;
}

export interface LiveLumaState {
  luma: number | null;
  sampling: boolean;
  frameOutput: CameraFrameOutput;
}

/**
 * Live luminance gate backed by the camera's Frame Output.
 *
 * The luma value is derived inside the frame worklet by subsampling the Y
 * plane of a low-resolution YUV frame (throttled to ~2 samples/sec), then
 * bridged to the JS thread via `runOnJS`. No photo capture, JPEG encoding or
 * temp file is involved — the light gate no longer competes with the photo
 * pipeline, which keeps the preview smooth and the exposure stable.
 *
 * `luma` is `null` while unknown (before the first sample, while inactive, or
 * after a sampling failure) — callers must treat `null` as a non-blocking
 * "unknown" light gate rather than hard-failing the capture.
 *
 * @note Requires `react-native-vision-camera-worklets` (native) to be built
 * into the running app.
 */
export function useLiveLuma({
  isActive,
  sampleIntervalMs = 500,
  onError,
}: LiveLumaOptions): LiveLumaState {
  const setLumaRef = useRef<(value: number) => void>(() => {});
  const setSamplingRef = useRef<(value: boolean) => void>(() => {});
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [luma, setLuma] = useState<number | null>(null);
  const [sampling, setSampling] = useState(false);

  const internalOnLuma = useCallback((value: number) => {
    if (Number.isFinite(value)) {
      setLumaRef.current(value);
      setSamplingRef.current(true);
    }
  }, []);

  const forward = useMemo(() => runOnJS(internalOnLuma), [internalOnLuma]);

  const lastSampleAt = useSharedValue(0);
  const onFrame = useCallback(
    (frame: Frame) => {
      "worklet";
      try {
        const now = Date.now();
        if (now - lastSampleAt.value < sampleIntervalMs) return;
        const planes = frame.getPlanes();
        const plane = planes.length > 0 ? planes[0] : null;
        if (!plane || plane.width <= 0 || plane.height <= 0) return;

        const bytes = new Uint8Array(plane.getPixelBuffer());
        const w = plane.width;
        const h = plane.height;
        const bytesPerRow = plane.bytesPerRow > 0 ? plane.bytesPerRow : w;
        const stride = Math.max(1, Math.floor((w * h) / 4096));

        let sum = 0;
        let count = 0;
        for (let y = 0; y < h; y++) {
          const row = y * bytesPerRow;
          for (let x = 0; x < w; x += stride) {
            sum += bytes[row + x];
            count += 1;
          }
        }
        if (count === 0) return;

        let mean = sum / count;
        const pf = frame.pixelFormat ?? "";
        if (pf.includes("video") && !pf.includes("full")) {
          // Limited-range YUV (16..235) -> 0..255 to match the existing gate.
          mean = (mean - 16) * (255 / 219);
        }
        if (mean < 0) mean = 0;
        else if (mean > 255) mean = 255;

        lastSampleAt.value = now;
        forward(mean);
      } catch (e) {
        if (__DEV__) console.log("[live-luma] worklet sample error:", e);
      } finally {
        frame.dispose();
      }
    },
    [forward, sampleIntervalMs],
  );

  const frameOutput = useFrameOutput({
    targetResolution: CommonResolutions.VGA_4_3,
    pixelFormat: "yuv",
    dropFramesWhileBusy: true,
    onFrame,
    onFrameDropped: (reason) => {
      if (__DEV__) console.log(`[live-luma] frame dropped: ${reason}`);
    },
  });

  useEffect(() => {
    if (!isActive) {
      setLuma(null);
      setSampling(false);
      return;
    }
    setLumaRef.current = setLuma;
    setSamplingRef.current = setSampling;
  }, [isActive]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  return useMemo(
    () => ({ luma, sampling, frameOutput }),
    [luma, sampling, frameOutput],
  );
}