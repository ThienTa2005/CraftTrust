import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Page({ title, intro, children }: PropsWithChildren<{ title: string; intro?: string }>) {
  return <SafeAreaView edges={["bottom"]} style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.heading}><Text style={styles.title}>{title}</Text>{intro ? <Text style={styles.intro}>{intro}</Text> : null}</View>{children}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1 }, content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 16, paddingBottom: 36 }, heading: { marginBottom: 18, gap: 5 }, title: { fontFamily: "serif", fontSize: 30, fontWeight: "800", color: "#352219" }, intro: { color: "#6c5b52", lineHeight: 21 } });
