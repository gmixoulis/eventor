/** Startup pitches: the text of each pitch reel, with no media, so the assistant server can read it too. */
export type Pitch = {
  id: string;
  startup: string;
  /** One line, at most 90 characters. */
  pitch: string;
  /** A sample person whose role is 'Startup'. */
  founderId: string;
  tags: string[];
};

const pitches: Pitch[] = [
  {
    id: 'reel-001',
    startup: 'Startup 1',
    pitch: 'Small farmers sell straight to restaurants, with fair prices and next-day delivery.',
    founderId: 'person-1',
    tags: ['Foodtech', 'Marketplace', 'Pre-Seed'],
  },
  {
    id: 'reel-002',
    startup: 'Startup 2',
    pitch: 'Warehouse robots that slow down, steer around and work safely next to people.',
    founderId: 'person-3',
    tags: ['Robotics', 'Logistics'],
  },
  {
    id: 'reel-melody-minds',
    startup: 'Startup 3',
    pitch: 'A music-learning app that listens to how you practice and adapts every lesson.',
    founderId: 'person-9',
    tags: ['Music', 'Edtech'],
  },
  {
    id: 'reel-003',
    startup: 'Startup 4',
    pitch: 'Electric boat rentals for harbor tourism: quiet, clean and booked from your phone.',
    founderId: 'person-11',
    tags: ['Travel', 'Climate', 'Mobility'],
  },
  {
    id: 'reel-harbor-health',
    startup: 'Startup 5',
    pitch: 'Remote monitoring that lets chronic-care clinics spot problems before visits.',
    founderId: 'person-13',
    tags: ['Healthtech', 'Series A'],
  },
  {
    id: 'reel-pixel-forge',
    startup: 'Startup 6',
    pitch: 'A game engine that lets small teams build stylized 3D worlds without a big studio.',
    founderId: 'person-15',
    tags: ['Gaming', '3D'],
  },
];

export function listPitches(): Pitch[] {
  return pitches;
}
