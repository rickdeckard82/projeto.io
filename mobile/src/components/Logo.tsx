import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Símbolo do Projeto.io — mesma geometria de `frontend/src/assets/projeto-io-icon.svg`. */
export function LogoMark({ height = 40 }: { height?: number }) {
  return (
    <Svg width={(height * 102) / 140} height={height} viewBox="10 20 102 140">
      <Defs>
        <LinearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#7C6CF6" />
          <Stop offset="100%" stopColor="#4C3ED9" />
        </LinearGradient>
        <LinearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#A78BFA" />
          <Stop offset="100%" stopColor="#6D5EF0" />
        </LinearGradient>
      </Defs>
      <Rect x="10" y="20" width="46" height="140" rx="14" fill="url(#g1)" />
      <Rect x="66" y="20" width="46" height="70" rx="14" fill="url(#g2)" />
      <Rect x="66" y="98" width="46" height="34" rx="12" fill="#2A2440" />
      <Circle cx="89" cy="55" r="9" fill="#0E0B1A" />
    </Svg>
  );
}

/**
 * Logo completo (símbolo + "Projeto.io"), como `projeto-io-logo.svg` do web. O nome é texto nativo
 * em vez de `<Text>` do SVG para usar a fonte do sistema com a mesma nitidez do resto da UI.
 */
export function Logo({ height = 40 }: { height?: number }) {
  return (
    <View style={styles.row}>
      <LogoMark height={height} />
      <Text style={[styles.word, { fontSize: height * 0.6 }]}>
        Projeto<Text style={styles.io}>.io</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { fontWeight: '700', color: '#EDEBFB' },
  io: { color: '#8B7CF6' },
});
