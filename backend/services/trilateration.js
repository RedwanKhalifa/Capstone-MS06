
export function trilaterate(scans, beacons){
  let wx=0, wy=0, wsum=0;
  for(const scan of scans){
    const b=beacons.find(x=>x.mac.toLowerCase()===scan.mac.toLowerCase());
    if(!b) continue;
    const w=1/((scan.rssi**2)+1);
    wx+=b.x*w; wy+=b.y*w; wsum+=w;
  }
  if(wsum===0) return {x:0,y:0,floor:1,confidence:0};
  return {x:wx/wsum, y:wy/wsum, floor:1, confidence:0.7};
}
