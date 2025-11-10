import React, { useState, useRef, useEffect } from "react";
import {
  Dimensions,
  Image,
  View,
  Switch,
  Text,
  StyleSheet,
} from "react-native";
import ImageZoom from "react-native-image-pan-zoom";
import Svg, { Circle, Polyline } from "react-native-svg";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Mock markers
const markers = [
  { x: 50, y: 400, label: "Entrance" },
  { x: 485, y: 250, label: "Eng 101" },
];

// Mock path
const pathPoints = [
  { x: 50, y: 400 },
  { x: 485, y: 400 },
  { x: 485, y: 250 },
];

// User location
const userLocation = { x: 100, y: 400 };

export default function CampusMap() {
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const imageZoomRef = useRef<any>(null);

  const imageWidth = 800;
  const imageHeight = 600;

  const scaleToFit = Math.min(
    screenWidth / imageWidth,
    screenHeight / imageHeight
  );

  // Center on user location when component mounts
  useEffect(() => {
    if (imageZoomRef.current) {
      // Offset so userLocation is centered in viewport
      const offsetX = userLocation.x - screenWidth / 2;
      const offsetY = userLocation.y - screenHeight / 2;

      imageZoomRef.current.centerOn({
        x: -offsetX, // negative because panning direction is inverted
        y: -offsetY,
        scale: 1,
        duration: 300, // smooth animation
      });
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: accessibilityMode ? "#000" : "#fff" }}>
      {/* Accessibility Mode Toggle */}
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

      {/* Zoomable Map */}
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
          {/* Campus Map Image */}
          <Image
            source={require("../../assets/images/CampusMapEng1stFloor.png")}
            style={{ width: imageWidth, height: imageHeight }}
          />

          {/* Overlay Markers, Path, and User Dot */}
          <Svg
            width={imageWidth}
            height={imageHeight}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            {/* Path */}
            <Polyline
              points={pathPoints.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={accessibilityMode ? "yellow" : "red"}
              strokeWidth={accessibilityMode ? 8 : 4}
            />

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

            {/* User Location Dot */}
            <Circle
              cx={userLocation.x}
              cy={userLocation.y}
              r={accessibilityMode ? 20 : 12}
              fill={accessibilityMode ? "orange" : "dodgerblue"}
              stroke="white"
              strokeWidth={3}
            />
          </Svg>
        </View>
      </ImageZoom>
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
    color: "#FFD700", // gold for visibility
  },
});
