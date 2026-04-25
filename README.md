# Conversions App

Hosted at: https://photonomad0.github.io/ConversionsApp/

A lightweight Progressive Web App that works offline and provides quick unit and radio-grid conversions.

## Conversions

- **Fahrenheit ⇄ Celsius**
- **Feet ⇄ Meters**
- **Pounds ⇄ Kilograms**
- **Miles ⇄ Kilometers**
- **Latitude/Longitude ⇄ Maidenhead Grid**
  - Grid-to-lat/lon returns the **center of the square**
  - Lat/lon input supports decimal degrees and common DMS-style formats

Designed to be simple, fast, mobile-friendly, and installable to your home screen.

## Demo / Screens

Open the app in a browser and you’ll see collapsible cards for:

1. **Temperature F⇄C**
2. **Feet ⇄ Meters**
3. **Pounds ⇄ Kilograms**
4. **Miles ⇄ Kilometers**
5. **Lat/Lon → Grid**
6. **Maidenhead Grid → Lat/Lon**

## Features

- Offline-capable after first load
- Progressive Web App support
- Home Screen install support, especially handy on iPhone
- Collapsible conversion cards
- No build step required
- Static files only, suitable for GitHub Pages

## Getting Started Locally

PWAs, service workers, and manifests work best through `http://localhost` rather than opening `index.html` directly with `file://`.

### Option 1: Python local server

From the project directory, run:
```bash
python3 -m http.server 8000
```

Then open:
```text http://localhost:8000/``` 

### Option 2: Node local server

If you have Node.js installed, you can use:
```bash npx serve .```

Then open the local URL shown in your terminal.

## Deploying to GitHub Pages

This app is designed to run as a static site on GitHub Pages.


## Files
```text 
index.html
app.js
manifest.webmanifest
sw.js
README.m
```

## Notes

If updates do not appear immediately after deployment, clear the browser cache or unregister the service worker from browser DevTools, then reload the page.


