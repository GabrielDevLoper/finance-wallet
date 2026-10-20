import React, { useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TextInputProps, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './theme';
import { monthLabel, monthOffset } from '../domain/money';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 22, color }: { name: string; size?: number; color?: string }) {
  const theme = useTheme();
  return <Ionicons name={name as IconName} size={size} color={color ?? theme.text} />;
}
export function Label({ children, muted = false, style, ...props }: React.ComponentProps<typeof Text> & { muted?: boolean }) {
  const t = useTheme();
  return <Text {...props} style={[styles.text, { color: muted ? t.muted : t.text }, style]}>{children}</Text>;
}
export function Title({ children }: React.PropsWithChildren) {
  return <Label style={styles.title}>{children}</Label>;
}
export function SectionTitle({ children, action, onPress }: React.PropsWithChildren<{ action?: string; onPress?: () => void }>) {
  return <View style={styles.sectionHeading}><Label style={styles.sectionTitle}>{children}</Label>
    {action && <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10}><Label muted style={styles.action}>{action} →</Label></Pressable>}
  </View>;
}
export function Panel({ children, style }: React.PropsWithChildren<{ style?: React.ComponentProps<typeof View>['style'] }>) {
  const t = useTheme();
  return <View style={[styles.panel, { backgroundColor: t.surface, borderColor: t.border }, style]}>{children}</View>;
}
export function Button({ title, onPress, secondary, danger, icon, loading, disabled }: {
  title: string; onPress: () => void; secondary?: boolean; danger?: boolean; icon?: string; loading?: boolean; disabled?: boolean;
}) {
  const t = useTheme();
  const color = danger ? t.danger : secondary ? t.primary : t.onPrimary;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading }}
    disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor: secondary || danger ? t.soft : t.primary, opacity: disabled || loading ? 0.5 : pressed ? 0.8 : 1 }]}>
    {loading ? <ActivityIndicator color={color} /> : icon && <Icon name={icon} color={color} size={20} />}
    <Text style={[styles.buttonText, { color }]}>{title}</Text>
  </Pressable>;
}
export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const t = useTheme();
  return <View style={styles.field}><Label style={styles.fieldLabel}>{label}</Label>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor={t.muted}
      style={[styles.input, { backgroundColor: t.surface, borderColor: t.border, color: t.text }, props.style]} />
    {hint && <Label muted style={styles.small}>{hint}</Label>}
  </View>;
}
export interface Option { value: string; label: string }
export function Select({ label, value, options, onChange, compact }: {
  label: string; value: string; options: Option[]; onChange: (value: string) => void; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const t = useTheme();
  return <View style={compact ? styles.flex : styles.field}>
    {!compact && <Label style={styles.fieldLabel}>{label}</Label>}
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${options.find(o => o.value === value)?.label ?? 'Selecionar'}`}
      onPress={() => setOpen(true)} style={[styles.select, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Label numberOfLines={1} style={styles.flex}>{options.find(o => o.value === value)?.label ?? 'Selecionar'}</Label>
      <Icon name="chevron-down" size={15} color={t.muted} />
    </Pressable>
    <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Fechar opções" />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: t.surface }]}>
          <View style={styles.sectionHeading}><Label style={styles.sectionTitle}>{label}</Label>
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} hitSlop={16}><Icon name="close" /></Pressable></View>
          <FlatList data={options} keyExtractor={o => o.value} renderItem={({ item }) =>
            <Pressable accessibilityRole="button" onPress={() => { onChange(item.value); setOpen(false); }}
              style={[styles.option, { borderBottomColor: t.border }]}>
              <Label style={styles.flex}>{item.label}</Label>{item.value === value && <Icon name="checkmark" color={t.primary} />}
            </Pressable>} />
        </SafeAreaView>
      </View>
    </Modal>
  </View>;
}
export function Screen({ children, form = false }: React.PropsWithChildren<{ form?: boolean }>) {
  const t = useTheme();
  return <KeyboardAvoidingView style={[styles.flex, { backgroundColor: t.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={form ? 90 : 0}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
  </KeyboardAvoidingView>;
}
export function Empty({ title, description, icon = 'wallet-outline' }: { title: string; description: string; icon?: string }) {
  const t = useTheme();
  return <View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: t.soft }]}><Icon name={icon} size={30} color={t.primary} /></View>
    <Label style={styles.sectionTitle}>{title}</Label><Label muted style={styles.emptyText}>{description}</Label></View>;
}
export function Notice({ children, error }: React.PropsWithChildren<{ error?: boolean }>) {
  const t = useTheme();
  return <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: t.warningBg }]}>
    <Icon name={error ? 'alert-circle-outline' : 'information-circle-outline'} size={19} color={t.warning} />
    <Label style={[styles.flex, styles.small, { color: t.warning }]}>{children}</Label></View>;
}
export function MonthPicker({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const t = useTheme();
  return <View style={[styles.month, { backgroundColor: t.soft }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => onChange(monthOffset(month, -1))} style={styles.monthButton}><Icon name="chevron-back" size={17} /></Pressable>
    <Label style={styles.monthLabel}>{monthLabel(month)}</Label>
    <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => onChange(monthOffset(month, 1))} style={styles.monthButton}><Icon name="chevron-forward" size={17} /></Pressable>
  </View>;
}
export function ToggleRow({ title, description, value, onPress }: { title: string; description?: string; value: boolean; onPress: () => void }) {
  const t = useTheme();
  return <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={onPress} style={styles.toggleRow}>
    <View style={styles.flex}><Label style={styles.fieldLabel}>{title}</Label>{description && <Label muted style={styles.small}>{description}</Label>}</View>
    <View style={[styles.toggle, { backgroundColor: value ? t.primary : t.border, alignItems: value ? 'flex-end' : 'flex-start' }]}>
      <View style={styles.toggleDot} />
    </View>
  </Pressable>;
}
export const styles = StyleSheet.create({
  flex: { flex: 1 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  content: { padding: 22, gap: 20, paddingBottom: 40 },
  text: { fontSize: 15, lineHeight: 22 },
  title: { fontSize: 32, lineHeight: 39, fontWeight: '600', letterSpacing: -1.2 },
  panel: { borderRadius: 22, borderWidth: 1, padding: 18, gap: 14 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', letterSpacing: -0.4 },
  action: { fontSize: 13, fontWeight: '500' },
  button: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 18 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  field: { gap: 8 }, fieldLabel: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 14, minHeight: 52, padding: 14, fontSize: 16 },
  small: { fontSize: 12, lineHeight: 18 },
  select: { minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  scrim: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '75%', padding: 22, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  option: { paddingVertical: 17, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 15, gap: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyText: { textAlign: 'center', maxWidth: 290 },
  notice: { padding: 13, borderRadius: 14, flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  month: { borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { padding: 13 }, monthLabel: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 10 },
  toggle: { width: 46, height: 28, borderRadius: 20, padding: 3 }, toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
});
