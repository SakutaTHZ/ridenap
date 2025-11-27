import { Coordinates } from '../types';

export const getRoute = async (start: Coordinates, end: Coordinates): Promise<Coordinates[]> => {
  try {
    // Using OSRM public demo server
    // Note: In a production app, you should use your own OSRM instance or a commercial routing API like Mapbox or Google Directions
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch route');
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return [];
    }

    const coordinates = data.routes[0].geometry.coordinates;
    // OSRM returns [lng, lat], we need [lat, lng]
    return coordinates.map((coord: number[]) => ({
      lat: coord[1],
      lng: coord[0],
    }));
  } catch (error) {
    console.error("Routing error:", error);
    return [];
  }
};