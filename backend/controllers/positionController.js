import fs from 'fs';
import path from 'path';

export function computePosition(req, res) {
  const beaconsPath = path.join(process.cwd(), "db", "beaconLocations.json");
  const file = fs.readFileSync(beaconsPath, "utf8");
  const beacons = JSON.parse(file);

  const scans = req.body.scans || [];

  // Use existing trilateration service
  import('../services/trilateration.js').then(({ trilaterate }) => {
    const result = trilaterate(scans, beacons);
    res.json(result);
  });
}
