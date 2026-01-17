// app/(tabs)/campusmap.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function CampusMapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Campus Map will display here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 18,
    fontWeight: "600",
  },
});
