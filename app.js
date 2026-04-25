function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function latLonToMaidenhead(lat, lon, precision = 6) {
  // Accept numbers OR DMS/decimal strings, e.g.:
  // "37.7749", "37°46'29\"N", "37 46 29 N", "37:46:29N", "122°25'10\"W"
  function parseCoord(value, kind /* "lat" | "lon" */) {
    if (Number.isFinite(value)) return value;
    if (typeof value !== "string") return NaN;

    const s0 = value.trim();
    if (!s0) return NaN;

    // 1) Plain decimal in a string
    const asNum = Number(s0);
    if (Number.isFinite(asNum)) return asNum;

    // 2) DMS parsing
    // Normalize common symbols and separators.
    const s = s0
      .toUpperCase()
      .replace(/[º]/g, "°")
      .replace(/[′’]/g, "'")
      .replace(/[″]/g, '"')
      .replace(/,/g, " ")
      .replace(/\s+/g, " ");

    // Hemisphere letter can appear anywhere; we remove it after detecting.
    const hemiMatch = s.match(/[NSEW]/);
    const hemi = hemiMatch ? hemiMatch[0] : null;
    const sNoHemi = hemi ? s.replace(/[NSEW]/g, " ").trim() : s;

    // Extract numeric parts (deg, min, sec). Allow ":" or spaces or symbols.
    // Examples accepted:
    //  - 37°46'29"
    //  - 37 46 29
    //  - 37:46:29
    //  - -37 46 29
    const nums = sNoHemi.match(/[+-]?\d+(?:\.\d+)?/g);
    if (!nums || nums.length === 0) return NaN;
    if (nums.length > 3) return NaN;

    const deg = Number(nums[0]);
    const min = nums.length >= 2 ? Number(nums[1]) : 0;
    const sec = nums.length >= 3 ? Number(nums[2]) : 0;

    if (![deg, min, sec].every(Number.isFinite)) return NaN;
    if (min < 0 || min >= 60) return NaN;
    if (sec < 0 || sec >= 60) return NaN;

    // Sign: explicit negative wins; otherwise hemisphere controls sign.
    const explicitNeg = deg < 0 || s0.trim().startsWith("-");
    const absDeg = Math.abs(deg) + min / 60 + sec / 3600;

    let signed = absDeg;
    if (hemi) {
      if (kind === "lat" && (hemi === "S")) signed = -absDeg;
      else if (kind === "lat" && (hemi === "N")) signed = absDeg;
      else if (kind === "lon" && (hemi === "W")) signed = -absDeg;
      else if (kind === "lon" && (hemi === "E")) signed = absDeg;
      else return NaN; // e.g. "E" used for latitude
    }
    if (explicitNeg) signed = -absDeg;

    return signed;
  }

  lat = parseCoord(lat, "lat");
  lon = parseCoord(lon, "lon");
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

function toDms(value, kind /* "lat" | "lon" */) {
  if (!Number.isFinite(value)) return "—";

  const hemi =
    kind === "lat" ? (value < 0 ? "S" : "N")
      : kind === "lon" ? (value < 0 ? "W" : "E")
        : "";

  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;

  // Keep seconds to 2 decimals; tweak as you like
  return `${deg}°${String(min).padStart(2, "0")}'${sec.toFixed(2).padStart(5, "0")}"${hemi}`;
}

function fToC(f) {
  return (f - 32) * (5 / 9);
}

function cToF(c) {
  return (c * (9 / 5)) + 32;
}

function feetToMeters(feet) {
  return feet * 0.3048;
}

function metersToFeet(meters) {
  return meters / 0.3048;
}

function poundsToKg(pounds) {
  return pounds * 0.45359237;
}

function kgToPounds(kg) {
  return kg / 0.45359237;
}

function milesToKm(miles) {
  return miles * 1.609344;
}

function kmToMiles(km) {
  return km / 1.609344;
}

// --- UI wiring ---
document.getElementById("toGrid").addEventListener("click", () => {
  const latRaw = document.getElementById("lat").value;
  const lonRaw = document.getElementById("lon").value;

  try {
    const grid = latLonToMaidenhead(latRaw, lonRaw, 6);
    document.getElementById("gridOut").textContent = grid;
  } catch (e) {
    document.getElementById("gridOut").textContent = "Invalid lat/lon";
  }
});

document.getElementById("toLatLon").addEventListener("click", () => {
  const grid = document.getElementById("grid").value;
  try {
    const { lat, lon } = maidenheadToLatLon(grid);

    document.getElementById("latOut").textContent = `${lat.toFixed(6)} (${toDms(lat, "lat")})`;
    document.getElementById("lonOut").textContent = `${lon.toFixed(6)} (${toDms(lon, "lon")})`;
  } catch (e) {
    document.getElementById("latOut").textContent = "—";
    document.getElementById("lonOut").textContent = String(e.message || e);
  }
});

document.getElementById("toC").addEventListener("click", () => {
  const fRaw = document.getElementById("tempF").value.trim();
  const f = Number(fRaw);
  if (!Number.isFinite(f)) {
    document.getElementById("tempOut").textContent = "Invalid Fahrenheit";
    return;
  }
  const c = fToC(f);
  document.getElementById("tempC").value = c.toFixed(2);
  document.getElementById("tempOut").textContent = `${f.toFixed(2)} °F = ${c.toFixed(2)} °C`;
});

document.getElementById("toF").addEventListener("click", () => {
  const cRaw = document.getElementById("tempC").value.trim();
  const c = Number(cRaw);
  if (!Number.isFinite(c)) {
    document.getElementById("tempOut").textContent = "Invalid Celsius";
    return;
  }
  const f = cToF(c);
  document.getElementById("tempF").value = f.toFixed(2);
  document.getElementById("tempOut").textContent = `${c.toFixed(2)} °C = ${f.toFixed(2)} °F`;
});

document.getElementById("toMeters").addEventListener("click", () => {
  const feetRaw = document.getElementById("feet").value.trim();
  const feet = Number(feetRaw);
  if (!Number.isFinite(feet)) {
    document.getElementById("lengthOut").textContent = "Invalid feet";
    return;
  }
  const meters = feetToMeters(feet);
  document.getElementById("meters").value = meters.toFixed(2);
  document.getElementById("lengthOut").textContent = `${feet.toFixed(2)} ft = ${meters.toFixed(2)} m`;
});

document.getElementById("toFeet").addEventListener("click", () => {
  const metersRaw = document.getElementById("meters").value.trim();
  const meters = Number(metersRaw);
  if (!Number.isFinite(meters)) {
    document.getElementById("lengthOut").textContent = "Invalid meters";
    return;
  }
  const feet = metersToFeet(meters);
  document.getElementById("feet").value = feet.toFixed(2);
  document.getElementById("lengthOut").textContent = `${meters.toFixed(2)} m = ${feet.toFixed(2)} ft`;
});

document.getElementById("toKg").addEventListener("click", () => {
  const poundsRaw = document.getElementById("pounds").value.trim();
  const pounds = Number(poundsRaw);
  if (!Number.isFinite(pounds)) {
    document.getElementById("weightOut").textContent = "Invalid pounds";
    return;
  }
  const kg = poundsToKg(pounds);
  document.getElementById("kg").value = kg.toFixed(2);
  document.getElementById("weightOut").textContent = `${pounds.toFixed(2)} lb = ${kg.toFixed(2)} kg`;
});

document.getElementById("toPounds").addEventListener("click", () => {
  const kgRaw = document.getElementById("kg").value.trim();
  const kg = Number(kgRaw);
  if (!Number.isFinite(kg)) {
    document.getElementById("weightOut").textContent = "Invalid kilograms";
    return;
  }
  const pounds = kgToPounds(kg);
  document.getElementById("pounds").value = pounds.toFixed(2);
  document.getElementById("weightOut").textContent = `${kg.toFixed(2)} kg = ${pounds.toFixed(2)} lb`;
});

document.getElementById("toKm").addEventListener("click", () => {
  const milesRaw = document.getElementById("miles").value.trim();
  const miles = Number(milesRaw);
  if (!Number.isFinite(miles)) {
    document.getElementById("distanceOut").textContent = "Invalid miles";
    return;
  }
  const km = milesToKm(miles);
  document.getElementById("km").value = km.toFixed(2);
  document.getElementById("distanceOut").textContent = `${miles.toFixed(2)} mi = ${km.toFixed(2)} km`;
});

document.getElementById("toMiles").addEventListener("click", () => {
  const kmRaw = document.getElementById("km").value.trim();
  const km = Number(kmRaw);
  if (!Number.isFinite(km)) {
    document.getElementById("distanceOut").textContent = "Invalid kilometers";
    return;
  }
  const miles = kmToMiles(km);
  document.getElementById("miles").value = miles.toFixed(2);
  document.getElementById("distanceOut").textContent = `${km.toFixed(2)} km = ${miles.toFixed(2)} mi`;
});

// --- Service Worker registration (offline) ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("sw.js");
    } catch {
      // If registration fails, the app still works online.
    }
  });
}
