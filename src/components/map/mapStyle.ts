import type { StyleSpecification } from "maplibre-gl";

const NEON = "#F7C395";
const OUTER_GLOW = "#A43C30";
const BG = "#1F162B";

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
      paint: { "fill-color": "#150f1f", "fill-opacity": 0.25 },
    },
    {
      id: "landcover",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      paint: { "fill-color": "#2b2038", "fill-opacity": 0.3 },
    },
    {
      id: "coastline-glow-xwide",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "line-color": OUTER_GLOW,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 14, 8, 36],
        "line-opacity": 0.45,
        "line-blur": 18,
      },
    },
    {
      id: "coastline-glow-wide",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "line-color": OUTER_GLOW,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 8, 8, 24],
        "line-opacity": 0.6,
        "line-blur": 10,
      },
    },
    {
      id: "coastline-glow-mid",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "line-color": OUTER_GLOW,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3, 8, 7],
        "line-opacity": 0.85,
        "line-blur": 3,
      },
    },
    {
      id: "coastline-glow-core",
      type: "line",
      source: "openmaptiles",
      "source-layer": "water",
      paint: {
        "line-color": NEON,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 8, 2.2],
        "line-opacity": 1,
      },
    },
    {
      id: "boundary-country-glow-wide",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["<=", ["get", "admin_level"], 2],
      paint: {
        "line-color": OUTER_GLOW,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 10, 8, 22],
        "line-opacity": 0.4,
        "line-blur": 12,
      },
    },
    {
      id: "boundary-country-glow",
      type: "line",
      source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["<=", ["get", "admin_level"], 2],
      paint: {
        "line-color": OUTER_GLOW,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 6, 8, 14],
        "line-opacity": 0.55,
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
        "line-color": NEON,
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
        "line-color": NEON,
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
        "text-color": "#FF2D78",
        "text-halo-color": "#1F162B",
        "text-halo-width": 1.4,
        "text-opacity": 0.9,
      },
    },
  ],
};
