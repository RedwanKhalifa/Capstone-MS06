import { Tabs } from "expo-router";
import { IconSymbol } from "../../components/ui/icon-symbol";

export default function TabsLayout() {
  return (
    <Tabs>
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
          title: "Explore",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="paperplane.fill" color={color} size={28} />
          ),
        }}
      />

      <Tabs.Screen
        name="campusmap"
        options={{
          title: "Campus Map",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="map.fill" color={color} size={28} />
          ),
        }}
      />

      <Tabs.Screen
        name="navigation"
        options={{
          title: "Navigate",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="location.fill" color={color} size={28} />
          ),
        }}
      />
    </Tabs>
  );
}
