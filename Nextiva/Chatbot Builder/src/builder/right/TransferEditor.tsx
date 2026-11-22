import { Select } from '../../design-system';
import type { NodeElement } from '../types';

/** Fixed customer-experience queues a conversation can be handed to. */
const CX_TEAMS = ['Support team', 'Sales', 'Billing', 'Onboarding', 'Customer success', 'Technical support'];

export function TransferEditor({
  element,
  patch,
  record,
}: {
  element: NodeElement;
  patch: (p: Partial<NodeElement>) => void;
  record: () => void;
}) {
  const team = CX_TEAMS.includes(element.text ?? '') ? element.text : '';
  return (
    <Select
      label="Transfer to team"
      placeholder="Select a team"
      value={team}
      options={CX_TEAMS.map((name) => ({ value: name, label: name }))}
      onChange={(text) => {
        record();
        patch({ text });
      }}
    />
  );
}
