import { applyEchoAiPipeline, rerankEchoCandidates } from '../echoAiRerank';
import type { EchoCandidate } from '../selectEchoCandidates';

const sample: EchoCandidate[] = [
  { id: '1', text: 'a', createdAt: '2026-01-01T00:00:00.000Z', kind: 'gravity' },
  { id: '2', text: 'b', createdAt: '2026-01-02T00:00:00.000Z', kind: 'drift' },
];

describe('echoAiRerank', () => {
  it('passthrough preserves order when AI flag is off', () => {
    expect(rerankEchoCandidates(sample).map((c) => c.id)).toEqual(['1', '2']);
    expect(applyEchoAiPipeline(sample).map((c) => c.id)).toEqual(['1', '2']);
  });
});
