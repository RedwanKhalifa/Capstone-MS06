import { Tabs } from "expo-router";
import { IconSymbol } from "../../components/ui/icon-symbol";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1f2d86",
        tabBarInactiveTintColor: "#0b0b0b",
        tabBarStyle: {
          backgroundColor: "#2f3fa3",
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="house.fill" color={color} size={28} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Saved",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="bookmark.fill" color={color} size={28} />
          ),
        }}
      />

      <Tabs.Screen
        name="navigation"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="calendar" color={color} size={28} />
          ),
        }}
      />
    </Tabs>
  );
}
