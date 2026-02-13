import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

export default function IndoorNavigationScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <Text style={styles.title}>Indoor navigation coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f0d7",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    color: "#2b3ea0",
    fontWeight: "700",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
});
