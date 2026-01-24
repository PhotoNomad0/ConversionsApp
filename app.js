function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function latLonToMaidenhead(lat, lon, precision = 6) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Invalid lat/lon");
  lat = clamp(lat, -90, 90);
  lon = ((lon + 180) % 360 + 360) % 360 - 180; // normalize to [-180,180)

  // shift to positive
  let adjLon = lon + 180;
  let adjLat = lat + 90;

  let maiden = "";

  // Field (A-R)
  const fieldLon = Math.floor(adjLon / 20);
  const fieldLat = Math.floor(adjLat / 10);
  maiden += String.fromCharCode("A".charCodeAt(0) + fieldLon);
  maiden += String.fromCharCode("A".charCodeAt(0) + fieldLat);

  if (precision <= 2) return maiden;

  // Square (0-9)
  const squareLon = Math.floor((adjLon % 20) / 2);
  const squareLat = Math.floor(adjLat % 10);
  maiden += String(squareLon);
  maiden += String(squareLat);

  if (precision <= 4) return maiden;

  // Subsquare (a-x)
  const subsLon = Math.floor(((adjLon % 2) / 2) * 24);
  const subsLat = Math.floor(((adjLat % 1) / 1) * 24);
  maiden += String.fromCharCode("a".charCodeAt(0) + subsLon);
  maiden += String.fromCharCode("a".charCodeAt(0) + subsLat);

  // Extensions beyond 6 exist (alternating digits/letters with finer resolution),
  // but 6 is the common ham-radio default.
  return maiden.slice(0, precision);
}

function maidenheadToLatLon(grid) {
  if (!grid) throw new Error("Empty grid");
  const g = grid.trim();
  if (g.length < 2) throw new Error("Grid too short");

  const A = "A".charCodeAt(0);
  const a = "a".charCodeAt(0);

  const g0 = g[0].toUpperCase().charCodeAt(0) - A;
  const g1 = g[1].toUpperCase().charCodeAt(0) - A;
  if (g0 < 0 || g0 > 17 || g1 < 0 || g1 > 17) throw new Error("Invalid field");

  let lon = g0 * 20 - 180;
  let lat = g1 * 10 - 90;

  // Size of the current cell in degrees
  let lonSize = 20;
  let latSize = 10;

  if (g.length >= 4) {
    const s0 = parseInt(g[2], 10);
    const s1 = parseInt(g[3], 10);
    if (!Number.isInteger(s0) || s0 < 0 || s0 > 9 || !Number.isInteger(s1) || s1 < 0 || s1 > 9) {
      throw new Error("Invalid square");
    }
    lon += s0 * 2;
    lat += s1 * 1;
    lonSize = 2;
    latSize = 1;
  }

  if (g.length >= 6) {
    const c0 = g[4].toLowerCase().charCodeAt(0) - a;
    const c1 = g[5].toLowerCase().charCodeAt(0) - a;
    if (c0 < 0 || c0 > 23 || c1 < 0 || c1 > 23) throw new Error("Invalid subsquare");
    lon += (c0 / 24) * lonSize;
    lat += (c1 / 24) * latSize;
    lonSize = lonSize / 24;
    latSize = latSize / 24;
  }

  // Return the center of the cell we decoded
  return { lat: lat + latSize / 2, lon: lon + lonSize / 2 };
}

// --- UI wiring ---
document.getElementById("toGrid").addEventListener("click", () => {
  const lat = Number(document.getElementById("lat").value);
  const lon = Number(document.getElementById("lon").value);
  try {
    const grid = latLonToMaidenhead(lat, lon, 6);
    document.getElementById("gridOut").textContent = grid;
  } catch (e) {
    document.getElementById("gridOut").textContent = String(e.message || e);
  }
});

document.getElementById("toLatLon").addEventListener("click", () => {
  const grid = document.getElementById("grid").value;
  try {
    const { lat, lon } = maidenheadToLatLon(grid);
    document.getElementById("latOut").textContent = lat.toFixed(6);
    document.getElementById("lonOut").textContent = lon.toFixed(6);
  } catch (e) {
    document.getElementById("latOut").textContent = "—";
    document.getElementById("lonOut").textContent = String(e.message || e);
  }
});

// --- Service Worker registration (offline) ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch {
      // If registration fails, the app still works online.
    }
  });
}
