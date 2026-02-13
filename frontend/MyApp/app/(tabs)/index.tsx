import React, { useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";

import { IconSymbol } from "../../components/ui/icon-symbol";
import { ENG_ROOMS, TMU_BUILDINGS, type BuildingEntry } from "../../constants/tmu-buildings";
import { useAppState } from "../../context/app-state";

const MAP_IMAGE = require("../../assets/images/CampusMapEng1stFloor.png");

const BUILDING_RESULTS = TMU_BUILDINGS.map((building) => `${building.code} - ${building.name}`);
const SEARCH_SUGGESTIONS = ["ENG", ...ENG_ROOMS];

export default function HomeScreen() {
  const router = useRouter();
  const { saved, accessibility, setAllAccessibility } = useAppState();
  const [searchQuery, setSearchQuery] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingEntry | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return recents;
    }
    const matches = SEARCH_SUGGESTIONS.filter((item) =>
      item.toLowerCase().includes(query)
    );
    const buildingMatches = BUILDING_RESULTS.filter((item) =>
      item.toLowerCase().includes(query)
    );
    return [...matches, ...buildingMatches];
  }, [recents, searchQuery]);

  const handleSelectSearch = (value: string) => {
    const cleanValue = value.replace(/\\s+-\\s+.*/, "");
    const roomSelected = ENG_ROOMS.includes(cleanValue) ? cleanValue : null;
    const buildingCode = roomSelected ? "ENG" : cleanValue;
    const building = TMU_BUILDINGS.find((entry) => entry.code === buildingCode) ?? null;

    if (building) {
      setSelectedBuilding(building);
      setSelectedRoom(roomSelected);
      setRecents((current) => {
        const next = [value, ...current.filter((item) => item !== value)];
        return next.slice(0, 5);
      });
    }
  };

  const isFavorite = (value: string) => saved.favorites.includes(value);
  const isStarred = (value: string) => saved.starred.includes(value);
  const isWanted = (value: string) => saved.wantToGo.includes(value);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>TMU SMART{"\\n"}CAMPUS NAVIGATION</Text>
        </View>
        <Pressable style={styles.profileButton} onPress={() => router.push("/settings")}>
          <IconSymbol name="person.circle" color="#0b0b0b" size={32} />
        </Pressable>
      </View>

      <ImageBackground source={MAP_IMAGE} style={styles.map}>
        <View style={styles.searchBar}>
          <IconSymbol name="magnifyingglass" color="#4a4a4a" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Buildings..."
            placeholderTextColor="#4a4a4a"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSelectedBuilding(null)}
          />
          <Pressable>
            <IconSymbol name="microphone" color="#4a4a4a" size={20} />
          </Pressable>
        </View>

        {!!selectedBuilding && (
          <View style={styles.detailCard}>
            <Pressable onPress={() => setSelectedBuilding(null)}>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <View style={styles.detailHeader}>
              <View style={styles.detailTitleRow}>
                <View style={styles.marker} />
                <Text style={styles.detailTitle}>
                  {selectedRoom ?? selectedBuilding.code}
                </Text>
              </View>
              {isStarred(selectedRoom ?? selectedBuilding.code) && (
                <IconSymbol name="star.fill" color="#2c3ea3" size={22} />
              )}
            </View>
            <Text style={styles.detailSubtitle}>{selectedBuilding.name}</Text>
            <Image source={{ uri: selectedBuilding.image }} style={styles.detailImage} />
            <View style={styles.detailButtons}>
              <Pressable
                style={styles.detailButton}
                onPress={() => Linking.openURL("https://www.google.com/maps/search/" + selectedBuilding.name)}
              >
                <Text style={styles.detailButtonText}>Outdoor</Text>
              </Pressable>
              {selectedRoom && (
                <Pressable style={styles.detailButtonSecondary} onPress={() => router.push("/indoor")}>
                  <Text style={styles.detailButtonText}>Indoor</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.detailDescription}>{selectedBuilding.description}</Text>
            <Text style={styles.detailSection}>Accessibility</Text>
            <Text style={styles.detailDescription}>{selectedBuilding.accessibility}</Text>
          </View>
        )}

        {!selectedBuilding && filteredResults.length > 0 && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>{searchQuery ? "Results" : "Recent"}</Text>
            <ScrollView style={styles.resultsList}>
              {filteredResults.map((item) => {
                const displayKey = item.includes(" - ") ? item.split(" - ")[0] : item;
                return (
                  <Pressable
                    key={item}
                    style={styles.resultItem}
                    onPress={() => handleSelectSearch(item)}
                  >
                    <View style={styles.resultTitleRow}>
                      <View style={styles.markerSmall} />
                      <Text style={styles.resultTitle}>{displayKey}</Text>
                      <View style={styles.resultIcons}>
                        {isStarred(displayKey) && (
                          <IconSymbol name="star.fill" color="#2c3ea3" size={18} />
                        )}
                        {isFavorite(displayKey) && (
                          <IconSymbol name="heart.fill" color="#2c3ea3" size={18} />
                        )}
                        {isWanted(displayKey) && (
                          <IconSymbol name="flag.fill" color="#2c3ea3" size={18} />
                        )}
                      </View>
                    </View>
                    {item.includes(" - ") && (
                      <Text style={styles.resultSubtitle}>{item.split(" - ")[1]}</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        <Pressable style={styles.accessibilityButton} onPress={() => setAllAccessibility(true)}>
          <IconSymbol name="person.circle" color="#1c2b85" size={26} />
        </Pressable>
      </ImageBackground>

      <View style={[styles.sheet, sheetOpen && styles.sheetOpen]}>
        <Pressable style={styles.sheetHandle} onPress={() => setSheetOpen((open) => !open)}>
          <View style={styles.sheetGrip} />
        </Pressable>
        <Pressable style={styles.sheetTitle} onPress={() => setSheetOpen(true)}>
          <Text style={styles.sheetTitleText}>
            List of all buildings at Toronto Metropolitan University
          </Text>
        </Pressable>
        {sheetOpen && (
          <ScrollView style={styles.sheetList}>
            {TMU_BUILDINGS.map((building) => (
              <Text key={building.code} style={styles.sheetItemText}>
                {building.name} ({building.code})
              </Text>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f0d7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "#f7f0d7",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0b0b0b",
  },
  profileButton: {
    backgroundColor: "#f3d400",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#b0b0b0",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "#2b2b2b",
  },
  accessibilityButton: {
    position: "absolute",
    right: 16,
    bottom: 90,
    backgroundColor: "#efe8ff",
    borderRadius: 26,
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsCard: {
    marginTop: 14,
    backgroundColor: "#d4d0df",
    borderRadius: 16,
    padding: 12,
    maxHeight: 280,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2b3ea0",
    marginBottom: 8,
  },
  resultsList: {
    gap: 10,
  },
  resultItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.5)",
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  resultSubtitle: {
    marginLeft: 24,
    color: "#2b2b2b",
  },
  resultIcons: {
    flexDirection: "row",
    gap: 6,
    marginLeft: "auto",
  },
  markerSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#f3d400",
  },
  marker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#f3d400",
  },
  detailCard: {
    marginTop: 14,
    backgroundColor: "#d4d0df",
    borderRadius: 16,
    padding: 14,
  },
  backText: {
    color: "#2b3ea0",
    fontWeight: "700",
  },
  detailHeader: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  detailSubtitle: {
    color: "#2b2b2b",
    marginBottom: 10,
  },
  detailImage: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginBottom: 12,
  },
  detailButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  detailButton: {
    backgroundColor: "#2c3ea3",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
  detailButtonSecondary: {
    backgroundColor: "#2c3ea3",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
  detailButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  detailDescription: {
    color: "#2b2b2b",
    lineHeight: 18,
  },
  detailSection: {
    color: "#2b3ea0",
    marginTop: 12,
    fontWeight: "700",
  },
  sheet: {
    backgroundColor: "#f7f0d7",
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetOpen: {
    maxHeight: 280,
  },
  sheetHandle: {
    alignItems: "center",
    paddingVertical: 8,
  },
  sheetGrip: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#000",
  },
  sheetTitle: {
    backgroundColor: "#2c3ea3",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  sheetTitleText: {
    color: "#f3d400",
    textAlign: "center",
    fontWeight: "700",
  },
  sheetList: {
    marginTop: 10,
  },
  sheetItemText: {
    color: "#2b3ea0",
    fontSize: 16,
    marginBottom: 6,
  },
});
