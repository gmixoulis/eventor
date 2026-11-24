import { VenueMapScreen } from '@/components/venue/venue-map-screen';

/** "Map": the real MapLibre street map, the default map everywhere it is linked.
 *  It falls back to the schematic drawing where the native map engine is unavailable. */
export default function MapScreen() {
  return <VenueMapScreen variant="real" />;
}
