# Lat/Lon ⇄ Maidenhead Grid (PWA)

A lightweight Progressive Web App that works offline and provides:
- **Latitude/Longitude ⇄ Maidenhead grid** conversion (grid-to-lat/lon returns the **center of the square**)
- **Fahrenheit ⇄ Celsius** conversion

Designed to be simple, fast, and installable to your home screen.

## Demo / Screens
Open the app in a mobile browser and you’ll see three cards:
1. **Lat/Lon → Grid**
2. **Grid → Lat/Lon (center of square)**
3. **Temperature ⇄**

## Features
- Offline-capable after first load (PWA)
- Home Screen install support (especially handy on iPhone)
- No build step required (static files)

## Getting started (local)

### Option 1: Simple local server (recommended)
PWAs (service workers / manifests) typically work best via `http://localhost` rather than `file://`.

