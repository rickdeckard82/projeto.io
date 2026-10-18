import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../lib/theme';

interface Layer {
  path: string;
  /** Altura da camada em px (ancorada no rodapé do contêiner). */
  height: number;
  color: string;
  opacity: number;
  /** Duração de um ciclo completo, em ms. */
  duration: number;
  reverse?: boolean;
}

// Mesmos desenhos de `frontend/src/components/common/AuthWaves.tsx` (viewBox 2880x320): o traçado
// se repete na metade, então deslizar 50% da largura e recomeçar fica contínuo.
const AUTH_LAYERS: Layer[] = [
  {
    path: 'M0,160 C240,220 480,100 720,160 C960,220 1200,100 1440,160 C1680,220 1920,100 2160,160 C2400,220 2640,100 2880,160 L2880,320 L0,320 Z',
    height: 224,
    color: colors.wave1,
    opacity: 0.12,
    duration: 26_000,
  },
  {
    path: 'M0,180 C240,120 480,240 720,180 C960,120 1200,240 1440,180 C1680,120 1920,240 2160,180 C2400,120 2640,240 2880,180 L2880,320 L0,320 Z',
    height: 160,
    color: colors.wave2,
    opacity: 0.08,
    duration: 38_000,
    reverse: true,
  },
  {
    path: 'M0,140 C240,200 480,80 720,140 C960,200 1200,80 1440,140 C1680,200 1920,80 2160,140 C2400,200 2640,80 2880,140 L2880,320 L0,320 Z',
    height: 288,
    color: colors.wave3,
    opacity: 0.06,
    duration: 32_000,
  },
];

// Versão achatada para barras (`BarWaves.tsx` do web, viewBox 2880x120).
const BAR_LAYERS: Layer[] = [
  {
    path: 'M0,55 C240,75 480,35 720,55 C960,75 1200,35 1440,55 C1680,75 1920,35 2160,55 C2400,75 2640,35 2880,55 L2880,120 L0,120 Z',
    height: 64,
    color: colors.wave1,
    opacity: 0.12,
    duration: 26_000,
  },
  {
    path: 'M0,62 C240,42 480,82 720,62 C960,42 1200,82 1440,62 C1680,42 1920,82 2160,62 C2400,42 2640,82 2880,62 L2880,120 L0,120 Z',
    height: 48,
    color: colors.wave2,
    opacity: 0.08,
    duration: 38_000,
    reverse: true,
  },
];

function WaveLayer({ layer, width, viewBoxHeight, animate }: { layer: Layer; width: number; viewBoxHeight: number; animate: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: layer.duration, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, layer.duration, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: layer.reverse ? [-width, 0] : [0, -width],
  });

  return (
    <Animated.View style={[styles.layer, { height: layer.height, width: width * 2, transform: [{ translateX }] }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 2880 ${viewBoxHeight}`} preserveAspectRatio="none">
        <Path d={layer.path} fill={layer.color} fillOpacity={layer.opacity} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Ondas decorativas em indigo, iguais às do web: `variant="auth"` no fundo do login, `"bar"` no
 * cabeçalho. Ocupa o contêiner pai inteiro (absolute), sem receber toques; respeita "reduzir
 * movimento" do sistema (fica parada).
 */
export function Waves({ variant = 'auth' }: { variant?: 'auth' | 'bar' }) {
  const { width } = useWindowDimensions();
  // `null` até a leitura assíncrona da preferência terminar — só anima quando sabe que pode.
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const layers = variant === 'auth' ? AUTH_LAYERS : BAR_LAYERS;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {layers.map((layer, i) => (
        <WaveLayer
          key={i}
          layer={layer}
          width={width}
          viewBoxHeight={variant === 'auth' ? 320 : 120}
          animate={reduceMotion === false}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', bottom: 0, left: 0 },
});
