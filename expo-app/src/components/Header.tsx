import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../theme';

export function Header({
  title,
  subtitle,
  onBack,
  right,
  transparent,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  transparent?: boolean;
}) {
  return (
    <View style={[styles.header, transparent && styles.headerTransparent]}>
      <View style={styles.inner}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </Pressable>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}
        <View style={styles.titles}>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightSlot}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: palette.background },
  headerTransparent: { backgroundColor: 'transparent' },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0B12200D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: { width: 40 },
  titles: { flex: 1, paddingHorizontal: 8 },
  title: { fontSize: 17, fontWeight: '800', color: palette.text, textAlign: 'center' },
  subtitle: { fontSize: 12, color: palette.textMuted, textAlign: 'center', marginTop: 1 },
  rightSlot: { minWidth: 40, alignItems: 'flex-end' },
});