/**
 * Venue footprint for the demo: the REAL building outline of New York City Hall
 * (OpenStreetMap way/575213527, amenity=townhall), centred on VENUE_CENTER in src/lib/geo.ts.
 * The building ring is real OSM data (Open Database License, (c) OpenStreetMap contributors);
 * the walkable paths and the entrance are demo placeholders around it, enough to exercise the
 * venue map and the walking-directions graph. Replace the paths/entrance with your venue's own
 * survey or OSM export when you have one.
 */
import type { VenueFeatureCollection } from '@/components/venue/geo';

export const osmVenue: VenueFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {"type":"Feature","properties":{"kind":"building","name":"New York City Hall","osm":"way/575213527"},"geometry":{"type":"Polygon","coordinates":[[[-74.0064455,40.7127755],[-74.0063211,40.7127133],[-74.0062755,40.7127656],[-74.006161,40.7127084],[-74.006179,40.7126875],[-74.0060873,40.7126412],[-74.0060005,40.7125975],[-74.0059823,40.7126187],[-74.005867,40.7125612],[-74.0059134,40.712508],[-74.0057875,40.712445],[-74.0055687,40.7126963],[-74.0058093,40.7128167],[-74.0057897,40.7128392],[-74.0058825,40.7128854],[-74.0059683,40.7129289],[-74.0059886,40.7129057],[-74.0062278,40.7130254],[-74.0064455,40.7127755]]]}},
    {"type":"Feature","properties":{"kind":"path","highway":"pedestrian"},"geometry":{"type":"LineString","coordinates":[[-74.0065322,40.7128114],[-74.0062949,40.7127935],[-74.0060814,40.7127755],[-74.0058204,40.7127575],[-74.0055,40.7127395],[-74.0052509,40.7127935],[-74.0049898,40.7128474]]}},
    {"type":"Feature","properties":{"kind":"path","highway":"footway"},"geometry":{"type":"LineString","coordinates":[[-74.0058441,40.7124157],[-74.0058204,40.7125776],[-74.0058204,40.7127575]]}},
    {"type":"Feature","properties":{"kind":"path","highway":"footway"},"geometry":{"type":"LineString","coordinates":[[-74.0054644,40.7125237],[-74.0056424,40.7126496],[-74.0058204,40.7127575]]}},
    {"type":"Feature","properties":{"kind":"entrance","entrance":"main","osm":"node/14007767788"},"geometry":{"type":"Point","coordinates":[-74.0058441,40.7124157]}},
  ],
};
