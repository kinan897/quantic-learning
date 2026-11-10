import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G } from 'react-native-svg';

import { Brand } from '@/constants/theme';

type Props = { size: number; opacity?: number; style?: StyleProp<ViewStyle> };

/** The website's decorative orbit rings (from the logo), drawn behind headers. */
export function OrbitDecoration({ size, opacity = 0.5, style }: Props) {
  return (
    <View pointerEvents="none" style={[styles.wrap, { width: size, height: size, opacity }, style]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <G fill="none" stroke={Brand.sky} strokeWidth={1.2}>
          <Ellipse cx={100} cy={100} rx={92} ry={32} transform="rotate(28 100 100)" />
          <Ellipse cx={100} cy={100} rx={92} ry={32} transform="rotate(-28 100 100)" />
          <Ellipse cx={100} cy={100} rx={30} ry={96} />
        </G>
        <Circle cx={44} cy={70} r={4} fill={Brand.electric} />
        <Circle cx={160} cy={138} r={4} fill={Brand.electric} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
});
