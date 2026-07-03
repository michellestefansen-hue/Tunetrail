import type { StyleSpecification } from "maplibre-gl";

const GLOW = "#ff9c4d";
const BG = "#0a0918";
const WATER = "#0a0918";

export const nightGlowStyle: StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    openmaptiles: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": BG },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": WATER },
    },
    {
      id: "landcover",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      paint: { "fill-color": "#241d3a", "fill-opacity": 0.5 },
    },
    {
      id: "coastline-glow-wide",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "line-color": GLOW,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 6, 8, 18],
        "line-opacity": 0.35,
        "line-blur": 10,
      },
    },
    {
      id: "coastline-glow-mid",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "line-color": GLOW,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 5],
        "line-opacity": 0.6,
        "line-blur": 3,
      },
    },
    {
      id: "coastline-glow-core",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "line-color": "#ffe4c2",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 8, 1.8],
        "line-opacity": 1,
      },
    },
    {
      id: "boundary-country-glow",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["<=", ["get", "admin_level"], 2],
      paint: {
        "line-color": GLOW,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 10],
        "line-opacity": 0.3,
        "line-blur": 5,
      },
    },
    {
      id: "boundary-country",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["<=", ["get", "admin_level"], 2],
      paint: {
        "line-color": GLOW,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 8, 1.6],
        "line-opacity": 1,
        "line-dasharray": [2, 2],
      },
    },
    {
      id: "boundary-region",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["==", ["get", "admin_level"], 4],
      paint: {
        "line-color": GLOW,
        "line-width": 0.6,
        "line-opacity": 0.4,
        "line-dasharray": [1, 3],
      },
    },
    {
      id: "place-city-label",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 14],
        "text-letter-spacing": 0.08,
        "text-transform": "uppercase",
      },
      paint: {
        "text-color": "#ffd9b3",
        "text-halo-color": "#0a0918",
        "text-halo-width": 1.4,
        "text-opacity": 0.9,
      },
    },
  ],
};
