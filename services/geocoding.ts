import { LocationSearchResult } from "../types";

export const searchLocations = async (query: string): Promise<LocationSearchResult[]> => {
  if (!query || query.length < 3) return [];

  try {
    // OpenStreetMap Nominatim API (Free, no key required for low volume)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&dedupe=1`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch locations");
    }

    const data = await response.json();

    return data.map((item: any) => ({
      name: item.name || item.display_name.split(',')[0], // Try to get the specific place name, fallback to first part of address
      coords: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      },
      address: item.display_name,
      sourceUrl: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`
    }));

  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
};