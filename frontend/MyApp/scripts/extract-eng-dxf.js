const fs = require("fs");
const path = require("path");

const INPUTS = [
  { id: "1N", floorId: "1", label: "Floor 1 North", file: "C:/Users/laith/Downloads/Copy of ENG_1ST FLOOR NORTH.dxf" },
  { id: "1S", floorId: "1", label: "Floor 1 South", file: "C:/Users/laith/Downloads/Copy of ENG_1ST FLOOR SOUTH.dxf" },
  { id: "2N", floorId: "2", label: "Floor 2 North", file: "C:/Users/laith/Downloads/Copy of ENG_2ND FLOOR NORTH.dxf" },
  { id: "2S", floorId: "2", label: "Floor 2 South", file: "C:/Users/laith/Downloads/Copy of ENG_2ND FLOOR SOUTH.dxf" },
  { id: "3N", floorId: "3", label: "Floor 3 North", file: "C:/Users/laith/Downloads/Copy of ENG_3RD FLOOR NORTH.dxf" },
  { id: "3S", floorId: "3", label: "Floor 3 South", file: "C:/Users/laith/Downloads/Copy of ENG_3RD FLOOR SOUTH.dxf" },
  { id: "4S", floorId: "4", label: "Floor 4 South", file: "C:/Users/laith/Downloads/Copy of ENG_4TH FLOOR SOUTH.dxf" },
  { id: "5N", floorId: "5", label: "Floor 5 North", file: "C:/Users/laith/Downloads/Copy of ENG_5TH FLOOR NORTH.dxf" },
  { id: "5S", floorId: "5", label: "Floor 5 South", file: "C:/Users/laith/Downloads/Copy of ENG_5TH FLOOR SOUTH.dxf" },
];

const OUTPUT_DIR = path.resolve(__dirname, "..", "..", "tmp-eng-dxf");
const APP_OUTPUT = path.resolve(__dirname, "..", "services", "generated-eng-dxf.ts");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function polygonArea(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
}

function isClosed(points) {
  if (points.length < 3) {
    return false;
  }
  const first = points[0];
  const last = points[points.length - 1];
  return Math.hypot(first.x - last.x, first.y - last.y) < 0.0001;
}

function simplifyCollinear(points) {
  if (points.length < 4) {
    return points;
  }

  const simplified = [points[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    const prev = simplified[simplified.length - 1];
    const current = points[index];
    const next = points[index + 1];
    const cross =
      (current.x - prev.x) * (next.y - current.y) -
      (current.y - prev.y) * (next.x - current.x);

    if (Math.abs(cross) > 0.000001) {
      simplified.push(current);
    }
  }
  simplified.push(points[points.length - 1]);
  return simplified;
}

function parseDxfPolylineFile(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const polylines = [];
  let currentPolyline = null;

  for (let index = 0; index < lines.length - 1; index += 2) {
    const code = lines[index].trim();
    const value = (lines[index + 1] ?? "").trim();

    if (code === "0" && value === "POLYLINE") {
      currentPolyline = { layer: "0", points: [] };
      continue;
    }

    if (code === "0" && value === "SEQEND") {
      if (currentPolyline && currentPolyline.points.length > 1) {
        const simplified = simplifyCollinear(currentPolyline.points);
        polylines.push({
          layer: currentPolyline.layer,
          points: simplified,
          closed: isClosed(simplified),
          area: isClosed(simplified) ? polygonArea(simplified) : 0,
        });
      }
      currentPolyline = null;
      continue;
    }

    if (!currentPolyline) {
      continue;
    }

    if (code === "8") {
      currentPolyline.layer = value;
      continue;
    }

    if (code === "0" && value === "VERTEX") {
      currentPolyline.points.push({ x: 0, y: 0 });
      continue;
    }

    const point = currentPolyline.points[currentPolyline.points.length - 1];
    if (!point) {
      continue;
    }

    if (code === "10") {
      point.x = Number(value);
    }

    if (code === "20") {
      point.y = Number(value);
    }
  }

  const validPolylines = polylines.filter(
    (polyline) =>
      polyline.points.length > 1 &&
      polyline.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  );

  const bounds = validPolylines.reduce(
    (accumulator, polyline) => {
      polyline.points.forEach((point) => {
        accumulator.minX = Math.min(accumulator.minX, point.x);
        accumulator.minY = Math.min(accumulator.minY, point.y);
        accumulator.maxX = Math.max(accumulator.maxX, point.x);
        accumulator.maxY = Math.max(accumulator.maxY, point.y);
      });
      return accumulator;
    },
    { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY }
  );

  return {
    bounds,
    polylines: validPolylines,
  };
}

function normalizePoint(point, bounds) {
  const width = Math.max(0.000001, bounds.maxX - bounds.minX);
  const height = Math.max(0.000001, bounds.maxY - bounds.minY);
  return {
    x: Number(((point.x - bounds.minX) / width).toFixed(6)),
    y: Number(((point.y - bounds.minY) / height).toFixed(6)),
  };
}

function extractSummary(input) {
  const { bounds, polylines } = parseDxfPolylineFile(input.file);
  const normalizedPolylines = polylines.map((polyline) => ({
    layer: polyline.layer,
    closed: polyline.closed,
    area: Number(polyline.area.toFixed(6)),
    points: polyline.points.map((point) => normalizePoint(point, bounds)),
  }));

  const closedPolylines = normalizedPolylines.filter((polyline) => polyline.closed);
  const largeClosed = closedPolylines
    .filter((polyline) => polyline.area > 0.01)
    .sort((left, right) => right.area - left.area);

  return {
    id: input.id,
    floorId: input.floorId,
    label: input.label,
    sourceFile: input.file,
    bounds,
    polylineCount: normalizedPolylines.length,
    closedPolylineCount: closedPolylines.length,
    largeClosedPolylineCount: largeClosed.length,
    largestClosedPolylines: largeClosed.slice(0, 25),
  };
}

function getPolygonBounds(points) {
  return points.reduce(
    (accumulator, point) => ({
      minX: Math.min(accumulator.minX, point.x),
      minY: Math.min(accumulator.minY, point.y),
      maxX: Math.max(accumulator.maxX, point.x),
      maxY: Math.max(accumulator.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  );
}

function getCentroid(points) {
  const totals = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 }
  );
  return {
    x: totals.x / points.length,
    y: totals.y / points.length,
  };
}

function candidatePolygonsForSheet(parsed) {
  const totalWidth = parsed.bounds.maxX - parsed.bounds.minX;
  const totalHeight = parsed.bounds.maxY - parsed.bounds.minY;
  const pageArea = totalWidth * totalHeight;

  return parsed.polylines
    .filter((polyline) => polyline.closed)
    .filter((polyline) => polyline.area > pageArea * 0.00005 && polyline.area < pageArea * 0.03)
    .map((polyline) => {
      const bounds = getPolygonBounds(polyline.points);
      const centroid = getCentroid(polyline.points);
      return {
        ...polyline,
        bounds,
        centroid,
      };
    })
    .filter((polyline) => polyline.centroid.x < parsed.bounds.maxX * 0.9)
    .filter((polyline) => polyline.points.length >= 4 && polyline.points.length <= 24)
    .sort((left, right) => right.area - left.area)
    .slice(0, 140);
}

function sheetPlacement(sheetId) {
  if (sheetId.endsWith("N")) {
    return {
      minX: 6,
      maxX: 96,
      minY: 8,
      maxY: 34,
    };
  }

  return {
    minX: 4,
    maxX: 96,
    minY: 34,
    maxY: 74,
  };
}

function normalizedCandidates(input) {
  const parsed = parseDxfPolylineFile(input.file);
  const candidates = candidatePolygonsForSheet(parsed);
  const contentBounds = candidates.reduce(
    (accumulator, polyline) => ({
      minX: Math.min(accumulator.minX, polyline.bounds.minX),
      minY: Math.min(accumulator.minY, polyline.bounds.minY),
      maxX: Math.max(accumulator.maxX, polyline.bounds.maxX),
      maxY: Math.max(accumulator.maxY, polyline.bounds.maxY),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  );

  const placement = sheetPlacement(input.id);
  const width = Math.max(0.000001, contentBounds.maxX - contentBounds.minX);
  const height = Math.max(0.000001, contentBounds.maxY - contentBounds.minY);

  return candidates.map((polyline) => ({
    fill: input.id.endsWith("N") ? "#dfe7f3" : "#d8e2ef",
    stroke: "#c1cde0",
    points: polyline.points.map((point) => ({
      x: Number(
        (
          placement.minX +
          ((point.x - contentBounds.minX) / width) * (placement.maxX - placement.minX)
        ).toFixed(3)
      ),
      y: Number(
        (
          placement.minY +
          ((point.y - contentBounds.minY) / height) * (placement.maxY - placement.minY)
        ).toFixed(3)
      ),
    })),
  }));
}

function buildAppOutput() {
  const floorFeatures = {};

  INPUTS.filter((input) => fs.existsSync(input.file)).forEach((input) => {
    const floorId = input.floorId;
    floorFeatures[floorId] = floorFeatures[floorId] ?? [];
    floorFeatures[floorId].push(...normalizedCandidates(input));
  });

  const fileContents = `export const DXF_FLOOR_FEATURES = ${JSON.stringify(floorFeatures, null, 2)} as const;\n`;
  fs.writeFileSync(APP_OUTPUT, fileContents);
}

function main() {
  ensureDir(OUTPUT_DIR);
  const summaries = INPUTS.filter((input) => fs.existsSync(input.file)).map(extractSummary);
  const summaryPath = path.join(OUTPUT_DIR, "eng-dxf-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summaries, null, 2));
  buildAppOutput();
  console.log(`Wrote ${summaryPath}`);
  console.log(`Wrote ${APP_OUTPUT}`);
  console.log(`Processed ${summaries.length} DXF files.`);
}

main();
