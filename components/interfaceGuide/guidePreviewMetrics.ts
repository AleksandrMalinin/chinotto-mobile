import { spacing } from '../../theme';

/** Uniform downscale for guide mockups — real components at 1× inside a smaller phone frame. */
export const GUIDE_PREVIEW_SCALE = 0.68;

/** Baseline logical height before width-responsive sizing. */
export const GUIDE_PREVIEW_BASE_DESIGN_WIDTH = 360;
export const GUIDE_PREVIEW_BASE_DESIGN_HEIGHT = 368;

/** Slide inner width → design width so scaled preview fills the modal slide. */
export function resolveGuidePreviewDesignWidth(windowWidth: number): number {
  const sheetWidth = Math.min(560, Math.max(320, windowWidth - spacing.md * 2));
  const slideInnerWidth = sheetWidth - spacing.lg * 2;
  const targetScaledWidth = Math.max(240, slideInnerWidth - 4);
  return Math.ceil(targetScaledWidth / GUIDE_PREVIEW_SCALE);
}

export function resolveGuidePreviewDesignHeight(designWidth: number): number {
  const widthRatio = designWidth / GUIDE_PREVIEW_BASE_DESIGN_WIDTH;
  return Math.round(GUIDE_PREVIEW_BASE_DESIGN_HEIGHT * widthRatio);
}

export function guidePreviewScaledSize(
  designWidth: number,
  designHeight: number,
  scale = GUIDE_PREVIEW_SCALE,
) {
  return {
    width: designWidth * scale,
    height: designHeight * scale,
  };
}

/** Solid tone behind guide previews — matches `InterfaceGuideModal` glass fill. */
export function guidePreviewEdgeFadeColor(sunlightMode: boolean): string {
  return sunlightMode ? '#f4f5fa' : '#1a1a24';
}
