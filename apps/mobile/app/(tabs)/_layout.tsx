import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useApp } from "../../src/providers/AppProvider";

export default function TabsLayout() {
  const { t } = useApp();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#fbf7f1" },
        tabBarActiveTintColor: "#8a3f22",
        tabBarStyle: { backgroundColor: "#fffdf9" }
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: t.tabs.discover,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-radius" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: t.tabs.catalog,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="shopping-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="passport"
        options={{
          title: t.tabs.passport,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="qrcode-scan" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t.tabs.cart,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cart-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t.tabs.orders,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="receipt-text-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t.tabs.account,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-outline" color={color} size={size} />
          )
        }}
      />
    </Tabs>
  );
}
