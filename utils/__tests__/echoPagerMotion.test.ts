import {
  echoContentOpacity,
  echoContentParallaxX,
  echoWashPresence,
} from '../echoPagerMotion';

describe('echoPagerMotion', () => {
  const pageWidth = 393;

  it('echoWashPresence inputRange is monotonically increasing', () => {
    const scrollX = { interpolate: jest.fn() } as never;
    echoWashPresence(scrollX, pageWidth);
    const config = (scrollX.interpolate as jest.Mock).mock.calls[0]![0];
    const range = config.inputRange as number[];
    for (let i = 1; i < range.length; i += 1) {
      expect(range[i]).toBeGreaterThanOrEqual(range[i - 1]!);
    }
    expect(config.outputRange).toEqual([1, 0.88, 0.42, 0]);
  });

  it('echoContentOpacity inputRange is monotonically increasing', () => {
    const scrollX = { interpolate: jest.fn() } as never;
    echoContentOpacity(scrollX, pageWidth);
    const config = (scrollX.interpolate as jest.Mock).mock.calls[0]![0];
    const range = config.inputRange as number[];
    for (let i = 1; i < range.length; i += 1) {
      expect(range[i]).toBeGreaterThanOrEqual(range[i - 1]!);
    }
    expect(config.outputRange).toEqual([1, 0.22, 0, 0]);
  });

  it('echoContentParallaxX inputRange is monotonically increasing', () => {
    const scrollX = { interpolate: jest.fn() } as never;
    echoContentParallaxX(scrollX, pageWidth);
    const config = (scrollX.interpolate as jest.Mock).mock.calls[0]![0];
    expect(config.inputRange).toEqual([0, pageWidth]);
    expect(config.outputRange).toEqual([0, 2.5]);
  });
});
