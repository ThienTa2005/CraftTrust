import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "../src/providers/AppProvider";

export default function RootLayout() {
  return <SafeAreaProvider><AppProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: "#fbf7f1" }, headerTintColor: "#432b20", contentStyle: { backgroundColor: "#fbf7f1" } }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /></Stack></AppProvider></SafeAreaProvider>;
}
