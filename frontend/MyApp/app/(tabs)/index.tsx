import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Image,
    Keyboard,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { IconSymbol } from "../../components/ui/icon-symbol";
import { ENG_ROOMS, TMU_BUILDINGS, type BuildingEntry } from "../../constants/tmu-buildings";
import { TMU_CAMPUS_OVERLAYS } from "../../constants/tmu-campus-overlays";
import { useAppState } from "../../context/app-state";

const SEARCH_SUGGESTIONS = [...ENG_ROOMS];
const FALLBACK_BUILDING_IMAGE =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80";
const TMU_REGION = {
  latitude: 43.6577,
  longitude: -79.3788,
  latitudeDelta: 0.0038,
  longitudeDelta: 0.0038,
};
const TMU_CAMERA = {
  center: {
    latitude: 43.6577,
    longitude: -79.3788,
  },
  pitch: 0,
  heading: 0,
  zoom: 16.9,
  altitude: 1200,
};

type SearchResultItem = {
  key: string;
  value: string;
  title: string;
  subtitle?: string;
  rank: number;
};

export default function HomeScreen() {
  const router = useRouter();
  const { saved, setAllAccessibility } = useAppState();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingEntry | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [labelTracksViewChanges, setLabelTracksViewChanges] = useState(true);
  const engBuilding = TMU_BUILDINGS.find((entry) => entry.code === "ENG") ?? null;
  const isLegacyAndroid = Platform.OS === "android" && Number(Platform.Version) <= 29;
  const showCampusOverlays = !selectedBuilding && !searchQuery.trim();

  const legacyAndroidMapHtml = useMemo(() => {
    const overlays = showCampusOverlays
      ? TMU_CAMPUS_OVERLAYS.map((overlay) => ({
          code: overlay.code,
          label: overlay.label,
          labelCoordinate: {
            latitude: overlay.labelCoordinate.latitude,
            longitude: overlay.labelCoordinate.longitude,
          },
          polygon: overlay.polygon.map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
          })),
        }))
      : [];

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
      body { background: #e8edf2; }
      .overlay-label {
        background: rgba(6, 12, 20, 0.84);
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.3px;
        border-radius: 8px;
        padding: 2px 6px;
        white-space: nowrap;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const overlays = ${JSON.stringify(overlays)};
      const map = L.map('map', { zoomControl: true, attributionControl: true }).setView([43.6577, -79.3788], 17);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      overlays.forEach((overlay) => {
        const polygon = L.polygon(
          overlay.polygon.map((point) => [point.latitude, point.longitude]),
          {
            color: '#2c61a8',
            weight: 2,
            fillColor: '#2d62aa',
            fillOpacity: 0.3,
          }
        ).addTo(map);

        polygon.on('click', () => {
          window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'overlay', code: overlay.code }));
        });

        const labelIcon = L.divIcon({
          className: 'overlay-label-wrap',
          html: '<div class="overlay-label">' + overlay.label + '</div>',
        });

        const marker = L.marker(
          [overlay.labelCoordinate.latitude, overlay.labelCoordinate.longitude],
          { icon: labelIcon }
        ).addTo(map);

        marker.on('click', () => {
          window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'overlay', code: overlay.code }));
        });
      });
    </script>
  </body>
</html>`;
  }, [showCampusOverlays]);

  useEffect(() => {
    if (!showCampusOverlays) {
      return;
    }

    setLabelTracksViewChanges(true);
    const timer = setTimeout(() => setLabelTracksViewChanges(false), 1200);
    return () => clearTimeout(timer);
  }, [showCampusOverlays]);

  const filteredResults = useMemo<SearchResultItem[]>(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return recents.map((item, index) => {
        const title = item.includes(" - ") ? item.split(" - ")[0] : item;
        const subtitle = item.includes(" - ")
          ? item.split(" - ")[1]
          : item.startsWith("ENG ")
            ? engBuilding?.name
            : undefined;

        return {
          key: `${item}-${index}`,
          value: item,
          title,
          subtitle,
          rank: index,
        };
      });
    }

    const buildingMatches = TMU_BUILDINGS.filter((building) => {
      const candidate = `${building.code} ${building.name}`.toLowerCase();
      return candidate.includes(query);
    }).map((building) => {
      const code = building.code.toLowerCase();
      const name = building.name.toLowerCase();
      let rank = 4;

      if (code === query) {
        rank = 0;
      } else if (code.startsWith(query)) {
        rank = 1;
      } else if (name.startsWith(query)) {
        rank = 2;
      } else if (name.includes(query)) {
        rank = 3;
      }

      return {
        key: `building-${building.code}`,
        value: `${building.code} - ${building.name}`,
        title: building.code,
        subtitle: building.name,
        rank,
      };
    });

    const roomMatches = SEARCH_SUGGESTIONS.filter((item) =>
      item.toLowerCase().includes(query)
    ).map((item, index) => ({
      key: `room-${item}-${index}`,
      value: item,
      title: item,
      subtitle: item.startsWith("ENG ") ? engBuilding?.name : undefined,
      rank: item.toLowerCase().startsWith(query) ? 10 : 11,
    }));

    return [...buildingMatches, ...roomMatches].sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      return left.title.localeCompare(right.title);
    });
  }, [engBuilding?.name, recents, searchQuery]);

  const handleSelectSearch = (value: string) => {
    const cleanValue = value.replace(/\s+-\s+.*/, "");
    const roomSelected = ENG_ROOMS.includes(cleanValue) ? cleanValue : null;
    const buildingCode = roomSelected ? "ENG" : cleanValue;
    const building = TMU_BUILDINGS.find((entry) => entry.code === buildingCode) ?? null;

    if (building) {
      setSelectedBuilding(building);
      setSelectedRoom(roomSelected);
      setSearchActive(false);
      setRecents((current) => {
        const next = [value, ...current.filter((item) => item !== value)];
        return next.slice(0, 5);
      });
    }
  };

  const isFavorite = (value: string) => saved.favorites.includes(value);
  const isStarred = (value: string) => saved.starred.includes(value);
  const isWanted = (value: string) => saved.wantToGo.includes(value);

  const buildFallbackEntry = (code: string): BuildingEntry => ({
    code,
    name: code,
    description: `${code} is part of the Toronto Metropolitan University campus map overlay.`,
    accessibility: "Accessibility information will be updated soon.",
    image: FALLBACK_BUILDING_IMAGE,
  });

  const handleOverlayPress = (code: string) => {
    Keyboard.dismiss();
    setSearchActive(false);
    const building = TMU_BUILDINGS.find((entry) => entry.code === code) ?? buildFallbackEntry(code);
    setSelectedBuilding(building);
    setSelectedRoom(null);
  };

  const dismissSearch = () => {
    Keyboard.dismiss();
    setSearchActive(false);
  };

  const handleLegacyAndroidMapMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string; code?: string };
      if (payload.type === "overlay" && payload.code) {
        handleOverlayPress(payload.code);
      }
    } catch {
      // Ignore malformed map events from embedded content.
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>TMU SMART{"\n"}CAMPUS NAVIGATION</Text>
        </View>
        <Pressable style={styles.profileButton} onPress={() => router.push("/settings")}>
          <IconSymbol name="person.circle" color="#0b0b0b" size={32} />
        </Pressable>
      </View>

      <View style={styles.map}>
        {isLegacyAndroid ? (
          <WebView
            style={styles.mapView}
            originWhitelist={["*"]}
            source={{ html: legacyAndroidMapHtml }}
            onMessage={handleLegacyAndroidMapMessage}
            javaScriptEnabled
            domStorageEnabled
            onTouchStart={dismissSearch}
          />
        ) : (
          <MapView
            style={styles.mapView}
            initialRegion={TMU_REGION}
            initialCamera={TMU_CAMERA}
            showsBuildings
            showsCompass
            toolbarEnabled={false}
            rotateEnabled={false}
            moveOnMarkerPress={false}
            minZoomLevel={15.8}
            onPress={dismissSearch}
          >
            {showCampusOverlays &&
              TMU_CAMPUS_OVERLAYS.map((overlay) => (
                <Polygon
                  key={`${overlay.code}-shape`}
                  coordinates={overlay.polygon}
                  tappable
                  strokeColor="#2c61a8"
                  fillColor="rgba(45, 98, 170, 0.30)"
                  strokeWidth={2}
                  onPress={() => handleOverlayPress(overlay.code)}
                />
              ))}

            {showCampusOverlays &&
              TMU_CAMPUS_OVERLAYS.map((overlay) => (
                <Marker
                  key={`${overlay.code}-label`}
                  coordinate={overlay.labelCoordinate}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={labelTracksViewChanges}
                  zIndex={1000}
                  onPress={() => handleOverlayPress(overlay.code)}
                >
                  <View style={styles.overlayLabel}>
                    <Text style={styles.overlayLabelText}>{overlay.label}</Text>
                  </View>
                </Marker>
              ))}
          </MapView>
        )}

        <View style={styles.mapContent}>
          <View style={styles.searchBar}>
            <IconSymbol name="magnifyingglass" color="#4a4a4a" size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Buildings..."
              placeholderTextColor="#4a4a4a"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => {
                setSelectedBuilding(null);
                setSearchActive(true);
              }}
            />
            <Pressable>
              <IconSymbol name="microphone" color="#4a4a4a" size={20} />
            </Pressable>
          </View>

          <Pressable style={styles.quickIndoorButton} onPress={() => router.push("/indoor")}>
            <IconSymbol name="figure.walk" color="#f3d400" size={20} />
            <Text style={styles.quickIndoorButtonText}>Go to Indoor Navigation</Text>
          </Pressable>

          {!!selectedBuilding && (
            <View style={styles.detailCard}>
              <Pressable
                onPress={() => {
                  setSelectedBuilding(null);
                  setSelectedRoom(null);
                  setSearchQuery("");
                  setSearchActive(false);
                }}
              >
                <Text style={styles.backText}>Back</Text>
              </Pressable>
              <View style={styles.detailHeader}>
                <View style={styles.detailTitleRow}>
                  <View style={styles.marker} />
                  <Text style={styles.detailTitle}>{selectedRoom ?? selectedBuilding.code}</Text>
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
                  onPress={() =>
                    Linking.openURL("https://www.google.com/maps/search/" + selectedBuilding.name)
                  }
                >
                  <Text style={styles.detailButtonText}>Outdoor</Text>
                </Pressable>
                {selectedRoom && (
                  <Pressable
                    style={styles.detailButtonSecondary}
                    onPress={() => router.push({ pathname: "/indoor", params: { destination: selectedRoom } })}
                  >
                    <Text style={styles.detailButtonText}>Indoor</Text>
                  </Pressable>
                )}
              </View>
              <Text style={styles.detailDescription}>{selectedBuilding.description}</Text>
              <Text style={styles.detailSection}>Accessibility</Text>
              <Text style={styles.detailDescription}>{selectedBuilding.accessibility}</Text>
            </View>
          )}

          {!selectedBuilding && searchActive && filteredResults.length > 0 && (
            <View style={styles.resultsCard}>
              <Text style={styles.resultsTitle}>{searchQuery ? "Results" : "Recent"}</Text>
              <ScrollView style={styles.resultsList}>
                {filteredResults.map((item) => (
                  <Pressable
                    key={item.key}
                    style={styles.resultItem}
                    onPress={() => handleSelectSearch(item.value)}
                  >
                    <View style={styles.resultTitleRow}>
                      <View style={styles.markerSmall} />
                      <Text style={styles.resultTitle}>{item.title}</Text>
                      <View style={styles.resultIcons}>
                        {isStarred(item.title) && (
                          <IconSymbol name="star.fill" color="#2c3ea3" size={18} />
                        )}
                        {isFavorite(item.title) && (
                          <IconSymbol name="heart.fill" color="#2c3ea3" size={18} />
                        )}
                        {isWanted(item.title) && (
                          <IconSymbol name="flag.fill" color="#2c3ea3" size={18} />
                        )}
                      </View>
                    </View>
                    {item.subtitle && <Text style={styles.resultSubtitle}>{item.subtitle}</Text>}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <Pressable style={styles.accessibilityButton} onPress={() => setAllAccessibility(true)}>
          <IconSymbol name="person.circle" color="#1c2b85" size={26} />
        </Pressable>
      </View>

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
    position: "relative",
  },
  mapView: {
    ...StyleSheet.absoluteFillObject,
  },
  mapContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  overlayLabel: {
    backgroundColor: "rgba(6, 12, 20, 0.84)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  overlayLabelText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
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
  quickIndoorButton: {
    marginTop: 10,
    backgroundColor: "#1c2b85",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickIndoorButtonText: {
    color: "#f3d400",
    fontWeight: "700",
    fontSize: 15,
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
