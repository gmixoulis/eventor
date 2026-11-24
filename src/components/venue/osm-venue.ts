/**
 * Synthetic placeholder venue footprint for the demo, centred in central Manhattan
 * (around VENUE_CENTER in src/lib/geo.ts). It is NOT real survey data: one building
 * polygon, a few walkable paths and entrance points, enough to exercise the venue map
 * and the walking-directions graph. Replace it with your own venue's GeoJSON
 * (for example an OpenStreetMap export under the Open Database License) when you have one.
 */
import type { VenueFeatureCollection } from '@/components/venue/geo';

export const osmVenue: VenueFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {"type":"Feature","properties":{"kind":"building","name":"Main Hall","osm":"way/1000001"},"geometry":{"type":"Polygon","coordinates":[[[-73.99940,40.74870],[-73.99860,40.74870],[-73.99860,40.74930],[-73.99940,40.74930],[-73.99940,40.74870]]]}},
    {"type":"Feature","properties":{"kind":"path","highway":"pedestrian"},"geometry":{"type":"LineString","coordinates":[[-73.99900,40.74840],[-73.99900,40.74870]]}},
    {"type":"Feature","properties":{"kind":"path","highway":"footway"},"geometry":{"type":"LineString","coordinates":[[-73.99860,40.74870],[-73.99840,40.74900],[-73.99860,40.74930]]}},
    {"type":"Feature","properties":{"kind":"path","highway":"footway"},"geometry":{"type":"LineString","coordinates":[[-73.99940,40.74870],[-73.99960,40.74900],[-73.99940,40.74930]]}},
    {"type":"Feature","properties":{"kind":"path","highway":"footway"},"geometry":{"type":"LineString","coordinates":[[-73.99940,40.74930],[-73.99900,40.74950],[-73.99860,40.74930]]}},
    {"type":"Feature","properties":{"kind":"path","highway":"footway"},"geometry":{"type":"LineString","coordinates":[[-73.99900,40.74870],[-73.99900,40.74900],[-73.99900,40.74930]]}},
    {"type":"Feature","properties":{"kind":"entrance","entrance":"main","osm":"node/7181893116"},"geometry":{"type":"Point","coordinates":[-73.99900,40.74868]}},
    {"type":"Feature","properties":{"kind":"entrance","entrance":"yes","osm":"node/14007767788"},"geometry":{"type":"Point","coordinates":[-73.99862,40.74900]}},
  ],
};
