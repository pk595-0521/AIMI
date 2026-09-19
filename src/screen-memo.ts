import { SCREEN_SECTIONS, SCREEN_TEMPLATE } from './data/screen';

const heading = `## ${SCREEN_SECTIONS[4]}`;
export function splitScreenMemo(memo: string) {
  const index = memo.indexOf(heading);
  return index < 0 ? { text: memo, visual: '' } : { text: memo.slice(0, index).trimEnd(), visual: memo.slice(index + heading.length).trim() };
}
export function withScreenVisual(memo: string, visual: string) {
  return `${splitScreenMemo(memo || SCREEN_TEMPLATE).text}\n\n${heading}\n\n${visual}`;
}
export function screenVisualTemplate(track: string) {
  const columns: Record<string, string[]> = {
    consulting: ['Week', 'North remediation', 'South rollout', 'Budget ($)', 'Owner', 'Release threshold'],
    'investment-banking': ['Bridge item', 'Baseline ($M)', 'Revised ($M)', 'Evidence / assumption'],
    'business-operations': ['Action', 'Shipments protected', 'Avoided penalties ($)', 'Freight cost ($)', 'Net benefit ($)', 'Dwell threshold'],
    'product-management': ['Onboarding step', 'Baseline conversion', 'Recovery target', 'Alternate path', 'Owner / trigger'],
  };
  const cells = columns[track] || ['Action', 'Evidence', 'Owner'];
  return `| ${cells.join(' | ')} |\n| ${cells.map(() => '---').join(' | ')} |\n| ${cells.map(() => '').join(' | ')} |`;
}
