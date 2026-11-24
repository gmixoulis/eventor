import { VenueMapScreen } from '@/components/venue/venue-map-screen';

/** "Map 2" (beta): the real MapLibre map with OpenStreetMap paths, GPS and the demo walk. */
export default function Map2Screen() {
  return <VenueMapScreen variant="real" />;
}
