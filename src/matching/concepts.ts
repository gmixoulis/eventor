export const CONCEPT_GROUPS: string[][] = [
  ['group-industry-fintech', 'group-industry-legaltech'],
  ['group-industry-health-wellbeing', 'group-industry-life-sciences'],
  ['group-industry-media', 'group-industry-music', 'group-industry-visual-arts'],
  ['group-industry-robotics', 'group-industry-space-tech'],
  ['group-startup-stage-series-a', 'group-investment-type-series-a'],
  ['group-startup-stage-series-b', 'group-investment-type-series-b'],
  [
    'group-startup-stage-early-stage-pre-seed-and-seed',
    'group-investment-type-early-stage-pre-seed-and-seed',
  ],
  ['group-startup-stage-growth-stage-scale-up', 'group-investment-type-growth-stage'],
];

export function shareConcept(a: string, b: string): boolean {
  return CONCEPT_GROUPS.some((group) => group.includes(a) && group.includes(b));
}
