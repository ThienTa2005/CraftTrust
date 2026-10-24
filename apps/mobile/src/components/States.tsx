import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <View style={styles.state}><ActivityIndicator color="#8a3f22" /><Text style={styles.copy}>{label}</Text></View>;
}
export function MessageState({ title, message, actionLabel, onAction }: { title: string; message: string; actionLabel?: string; onAction?: () => void }) {
  return <View style={styles.card}><Text style={styles.title}>{title}</Text><Text style={styles.copy}>{message}</Text>{actionLabel && onAction ? <Pressable accessibilityRole="button" style={styles.button} onPress={onAction}><Text style={styles.buttonText}>{actionLabel}</Text></Pressable> : null}</View>;
}
export function SetupState({ missing }: { missing: string[] }) {
  return <MessageState title="Connection setup required" message={`Add ${missing.join(", ")} to apps/mobile/.env. No sample commerce or verification result is shown without a real backend.`} />;
}
const styles = StyleSheet.create({ state: { padding: 32, alignItems: "center", gap: 12 }, card: { margin: 16, padding: 18, borderRadius: 16, backgroundColor: "#fff7eb", gap: 9, borderWidth: 1, borderColor: "#ead8bd" }, title: { fontSize: 18, fontWeight: "700", color: "#321f16" }, copy: { color: "#66554b", lineHeight: 21 }, button: { backgroundColor: "#8a3f22", padding: 12, borderRadius: 10, alignSelf: "flex-start" }, buttonText: { color: "white", fontWeight: "700" } });
