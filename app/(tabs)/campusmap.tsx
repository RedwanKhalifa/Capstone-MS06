import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Dimensions,
  Image,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import ImageZoom from "react-native-image-pan-zoom";
import Svg, { Circle, Polyline } from "react-native-svg";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function CampusMap() {
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [pathPoints, setPathPoints] = useState<{ x: number; y: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(1);
  const imageZoomRef = useRef<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // Added error message state
  const [showFallbackMap, setShowFallbackMap] = useState(false); // Added fallback map state
  const [userLocation, setUserLocation] = useState({x:180, y:425})

  const imageWidth = 800;
  const imageHeight = 600;

  const scaleToFit = Math.min(
    screenWidth / imageWidth,
    screenHeight / imageHeight
  );

  // 🗺️ Mock markers for each floor
  const floor1Markers = [
    { x: 200, y: 420, label: "ENG101" },
    { x: 125, y: 390, label: "Stairs" },
  ];

  const floor2Markers = [
    { x: 105, y: 350, label: "Stairs" },
    { x: 370, y: 425, label: "ENG203" },
  ];

  // 🧭 Mock paths for each floor
  const floor1Path = [
    { x: 200, y: 420 },
    { x: 125, y: 420 },
    { x: 125, y: 390 },
  ];

  const floor2Path = [
    { x: 105, y: 350 },
    { x: 105, y: 425 },
    { x: 370, y: 425 },
  ];

  const showError = (msg: string) => {
    setErrorMsg(msg); // Use setErrorMsg to set the error message
    Alert.alert("Error", msg);
  };

  // 🔹 Simulate navigation (ENG101 → ENG203 via stairs)
  const fetchRoute = async () => {
    setIsLoading(true);
    setPathPoints([]);
    setCurrentFloor(1); // Start on first floor
    setShowFallbackMap(false); // Reset fallback map state

    try {
      // Simulate navigation request
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network request

      // If navigation is successful
      setPathPoints(floor1Path);

      // Step 2: Transition to Floor 2 after short delay
      setTimeout(() => {
        setCurrentFloor(2);
        setPathPoints(floor2Path);
        setIsLoading(false);
      }, 3000); // Wait 3 seconds before switching floors
    } catch (error) {
      console.error("Navigation request failed:", error);
      showError("Failed to fetch route. Displaying fallback map.");
      setShowFallbackMap(true); // Show fallback map
      setIsLoading(false);
    }
  };

  // 🟨 Center on start marker when component mounts
  useEffect(() => {
    const getStartMarker = () => {
      if (currentFloor === 1) {
        return floor1Markers[0];
      } else if (currentFloor === 2) {
        return floor2Markers[0];
      }
      return null;
    };

    const startMarker = getStartMarker();

    if (!startMarker) {
      console.warn(`No start marker found for floor ${currentFloor}`);
      return;
    }

    if (!imageZoomRef.current) {
      console.warn("imageZoomRef.current is null");
      return;
    }

    const offsetX = startMarker.x - screenWidth / 2;
    const offsetY = startMarker.y - screenHeight / 2;

    try {
      imageZoomRef.current.centerOn({
        x: -offsetX,
        y: -offsetY,
        scale: 1,
        duration: 300,
      });
    } catch (error) {
      console.error("Error centering on marker:", error);
    }
  }, [currentFloor, screenWidth, screenHeight]);

  // Select correct floor data
  const markers = currentFloor === 1 ? floor1Markers : floor2Markers;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: accessibilityMode ? "#000" : "#fff",
      }}
    >
      {/* Accessibility toggle */}
      <View style={styles.toggleContainer}>
        <Text
          style={[
            styles.toggleText,
            accessibilityMode && styles.toggleTextHighContrast,
          ]}
        >
          Accessibility Mode
        </Text>
        <Switch
          value={accessibilityMode}
          onValueChange={setAccessibilityMode}
          thumbColor={accessibilityMode ? "#FFD700" : "#f4f3f4"}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
        />
      </View>

      {/* Floor buttons */}
      <View style={styles.floorButtons}>
        <Button title="1st Floor" onPress={() => setCurrentFloor(1)} />
        <Button title="2nd Floor" onPress={() => setCurrentFloor(2)} />
      </View>

      {/* Route demo button */}
      <View style={{ paddingHorizontal: 12, marginBottom: 5 }}>
        <Button
          title={isLoading ? "Loading Route..." : "Show Route ENG101 → ENG203"}
          onPress={fetchRoute}
          color={accessibilityMode ? "#FFD700" : "#007AFF"}
          disabled={isLoading}
        />
      </View>

      {/* Error banner */}
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Zoomable map */}
      {showFallbackMap ? (
        <Text style={styles.fallbackText}>Fallback Map</Text> // Display fallback map
      ) : (
        <ImageZoom
          ref={imageZoomRef}
          cropWidth={screenWidth}
          cropHeight={screenHeight}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          minScale={scaleToFit}
          maxScale={3}
        >
          <View>
            <Image
              source={
                currentFloor === 1
                  ? require("../../assets/images/CampusMapEng1stFloor.png")
                  : require("../../assets/images/CampusMapEng2ndFloor.png")
              }
              style={{ width: imageWidth, height: imageHeight }}
            />

            <Svg
              width={imageWidth}
              height={imageHeight}
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              {/* Route polyline */}
              {Array.isArray(pathPoints) && pathPoints.length > 0 && (
                <Polyline
                  points={pathPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke={accessibilityMode ? "yellow" : "red"}
                  strokeWidth={accessibilityMode ? 8 : 4}
                />
              )}

              {/* Markers */}
              {markers.map((m, i) => (
                <Circle
                  key={i}
                  cx={m.x}
                  cy={m.y}
                  r={accessibilityMode ? 15 : 10}
                  fill={accessibilityMode ? "lime" : "blue"}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}

              {/* 🟢 User Live Location */}
              {currentFloor === 2 && (
              <Circle
                cx={userLocation.x}
                cy={userLocation.y}
                r={accessibilityMode ? 20 : 12}
                fill={accessibilityMode ? "orange" : "dodgerblue"}
                stroke="white"
                strokeWidth={3}
              />
              )}
            </Svg>
          </View>
        </ImageZoom>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginTop: 20,
    backgroundColor: "#f0f0f0",
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  toggleTextHighContrast: {
    color: "#FFD700",
  },
  floorButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 8,
  },
  errorBanner: { // Added errorBanner style
    backgroundColor: "red",
    padding: 10,
    marginBottom: 10,
  },
  errorText: { // Added errorText style
    color: "white",
    textAlign: "center",
  },
  fallbackText: { // Added fallbackText style
    fontSize: 20,
    textAlign: "center",
    marginTop: 20,
  },
});
