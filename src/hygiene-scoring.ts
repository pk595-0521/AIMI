export const isHygieneCriterion = (criterion: {name: string}) => /data hygiene/i.test(criterion.name);

/** Only this pillar is adjusted. Keep base scores intact for human review. */
export function adjustedPillarScore(criterion: {name: string}, base: number, multiplier: number) {
  return base * (isHygieneCriterion(criterion) ? multiplier : 1);
}
