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
      {/* 1) Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="house.fill" color={color} size={28} />
          ),
        }}
      />

      {/* 2) Navigation */}
      <Tabs.Screen
        name="navigation"
        options={{
          title: "Navigation",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="paperplane.fill" color={color} size={28} />
          ),
        }}
      />

      {/* 3) Campus */}
      <Tabs.Screen
        name="campusmap"
        options={{
          title: "Campus",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="map.fill" color={color} size={28} />
          ),
        }}
      />

      {/* 4) Schedule */}
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="calendar" color={color} size={28} />
          ),
        }}
      />

      {/* 5) Settings */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="gearshape.fill" color={color} size={28} />
          ),
        }}
      />
    </Tabs>
  );
}
