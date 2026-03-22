import { runSerializedDb } from '../runSerializedDb';

describe('runSerializedDb', () => {
  it('runs tasks strictly in submission order', async () => {
    const order: number[] = [];
    const p1 = runSerializedDb(async () => {
      order.push(1);
    });
    const p2 = runSerializedDb(async () => {
      order.push(2);
    });
    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });

  it('propagates rejection but keeps the queue usable', async () => {
    const order: string[] = [];
    await expect(
      runSerializedDb(async () => {
        order.push('a');
        throw new Error('fail');
      })
    ).rejects.toThrow('fail');

    await runSerializedDb(async () => {
      order.push('b');
    });
    expect(order).toEqual(['a', 'b']);
  });
});
