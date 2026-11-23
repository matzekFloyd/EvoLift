import { EXRX_LEVELS, exrxLevelScore, type ExrxLevel } from "@/lib/strength-standards";

export const LEVEL_FIGURE_VIEW_BOX = "0 0 100 204";

/** The five ExRx levels drawn as bodies. Below untrained is a rating, not a physique. */
export const LEVEL_BODY_LEVELS = EXRX_LEVELS.filter((level) => level !== "Under the untrained mark");

const CENTER = 50;

type Pt = [number, number];

/** Distance from the midline and height, for the untrained and the elite body. */
type Joint = { untrained: Pt; elite: Pt; corner: boolean };

type Anchor = { at: Pt; corner: boolean };

export type LevelFigure = {
  body: string;
  head: string;
  seams: string[];
  shoulderBreadth: number;
  chestReach: number;
  armThickness: number;
  forearmThickness: number;
  thighThickness: number;
  calfThickness: number;
};

function joint(untrainedDx: number, untrainedY: number, eliteDx: number, eliteY: number, corner = false): Joint {
  return { untrained: [untrainedDx, untrainedY], elite: [eliteDx, eliteY], corner };
}

/**
 * Same joints at every level. Untrained is a narrow person with arms against the body.
 * Elite is much broader at the shoulders, arms, and thighs, with a narrower waist.
 */
const DELT_OUT = joint(19.5, 52, 38, 52);
const UPPER_ARM_OUT = joint(20.2, 74, 35, 76);
const UPPER_ARM_IN = joint(15.6, 74, 23.5, 76);
const FOREARM_OUT = joint(19, 94, 28, 96);
const FOREARM_IN = joint(16.2, 94, 22, 96);
const CHEST_SIDE = joint(12.8, 72, 21, 74);
const THIGH_OUT = joint(14.8, 118, 22, 120);
const THIGH_IN = joint(2.2, 118, 2.4, 120);
const CALF_OUT = joint(12.2, 166, 15.5, 166);
const CALF_IN = joint(3.4, 166, 3.8, 166);

/** Left half, from the neck down the outside and back up the inside leg. */
const LEFT_OUTLINE: Joint[] = [
  joint(5.2, 24, 7.2, 24),
  joint(5.6, 34, 8.2, 33),
  joint(9, 38, 16, 36),
  joint(14, 43, 26, 41),
  joint(17.5, 47, 32, 45),
  DELT_OUT,
  joint(20, 64, 36, 66),
  UPPER_ARM_OUT,
  joint(19.6, 84, 32, 86),
  FOREARM_OUT,
  joint(18.6, 104, 27, 104),
  joint(19.2, 110, 28, 110),
  joint(18.2, 116, 26.5, 116),
  joint(16.2, 112, 25, 112),
  joint(16.6, 104, 24.5, 104),
  FOREARM_IN,
  joint(16.4, 84, 23, 86),
  UPPER_ARM_IN,
  joint(13.2, 64, 18, 66, true),
  CHEST_SIDE,
  joint(12.2, 80, 17, 82),
  joint(11.4, 90, 13.5, 92),
  joint(13.2, 102, 17, 104),
  THIGH_OUT,
  joint(13.2, 136, 20, 138),
  joint(11.6, 152, 14.5, 154),
  CALF_OUT,
  joint(8.8, 190, 10, 190),
  joint(11.5, 198, 13, 198),
  joint(11, 201, 12.5, 201),
  joint(3.8, 201, 4.2, 201),
  joint(3.4, 197, 3.8, 197),
  joint(3.6, 190, 4, 190),
  CALF_IN,
  joint(3.2, 152, 3.6, 154),
  joint(2.6, 136, 2.8, 138),
  THIGH_IN,
  joint(0, 108, 0, 110, true),
];

/** One head for every level, a little narrower at the jaw. */
const HEAD_RIGHT: Pt[] = [
  [0, 5],
  [5.5, 6.8],
  [8.3, 12],
  [8.5, 18],
  [7.6, 24],
  [4.8, 29.5],
  [0, 31.5],
];

/** 0 at Untrained, 1 at Elite. Below untrained uses the untrained physique. */
function build(level: ExrxLevel): number {
  return Math.max(0, exrxLevelScore(level) - 1) / 4;
}

function mix(level: ExrxLevel, low: number, high: number): number {
  return low + (high - low) * build(level);
}

function reach(level: ExrxLevel, part: Joint): number {
  return mix(level, part.untrained[0], part.elite[0]);
}

function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

/** A closed curve through every anchor. Handles scale with each span, so short spans do not loop. */
function smoothClosed(anchors: Anchor[]): string {
  const count = anchors.length;
  const tangents = anchors.map((anchor, index): Pt => {
    if (anchor.corner) {
      return [0, 0];
    }
    const before = anchors[(index - 1 + count) % count].at;
    const after = anchors[(index + 1) % count].at;
    const dx = after[0] - before[0];
    const dy = after[1] - before[1];
    const length = Math.hypot(dx, dy) || 1;
    return [dx / length, dy / length];
  });
  let d = `M${fmt(anchors[0].at[0])} ${fmt(anchors[0].at[1])}`;
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    const from = anchors[index].at;
    const to = anchors[next].at;
    const handle = Math.hypot(to[0] - from[0], to[1] - from[1]) * 0.32;
    const c1: Pt = [from[0] + tangents[index][0] * handle, from[1] + tangents[index][1] * handle];
    const c2: Pt = [to[0] - tangents[next][0] * handle, to[1] - tangents[next][1] * handle];
    d += ` C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(to[0])} ${fmt(to[1])}`;
  }
  return `${d} Z`;
}

function mirrored(left: Anchor[]): Anchor[] {
  const right = left
    .filter((anchor) => anchor.at[0] !== CENTER)
    .reverse()
    .map((anchor): Anchor => ({ at: [CENTER * 2 - anchor.at[0], anchor.at[1]], corner: anchor.corner }));
  return left.concat(right);
}

const HEAD_PATH = smoothClosed(
  mirrored(
    [...HEAD_RIGHT].reverse().map(([dx, y]): Anchor => ({ at: [CENTER - dx, y], corner: false })),
  ),
);

/**
 * One standing person in one outline. The skeleton is the same at every level.
 * Higher levels add shoulder, chest, arm, and thigh, and the arms hang wider.
 */
export function levelFigure(level: ExrxLevel): LevelFigure {
  const left = LEFT_OUTLINE.map(
    (part): Anchor => ({
      at: [CENTER - reach(level, part), mix(level, part.untrained[1], part.elite[1])],
      corner: part.corner,
    }),
  );

  const pecY = mix(level, 58, 61);
  const pecReach = mix(level, 13.5, 17.5);
  const pecDrop = mix(level, 2.5, 5);
  const pecLift = mix(level, 3, 5);
  const pec = (sign: number) =>
    `M${fmt(CENTER + sign * 1.2)} ${fmt(pecY)} Q${fmt(CENTER + sign * pecReach * 0.6)} ${fmt(pecY + pecDrop)} ${fmt(CENTER + sign * pecReach)} ${fmt(pecY - pecLift)}`;
  const absEnd = mix(level, pecY + 3, 86);
  const seams = [pec(-1), pec(1), `M${CENTER} ${fmt(mix(level, 50, 46))} L${CENTER} ${fmt(pecY)}`];
  if (absEnd - pecY >= 8) {
    seams.push(`M${CENTER} ${fmt(pecY + 4)} L${CENTER} ${fmt(absEnd)}`);
  }

  return {
    body: smoothClosed(mirrored(left)),
    head: HEAD_PATH,
    seams,
    shoulderBreadth: reach(level, DELT_OUT) * 2,
    chestReach: reach(level, CHEST_SIDE),
    armThickness: reach(level, UPPER_ARM_OUT) - reach(level, UPPER_ARM_IN),
    forearmThickness: reach(level, FOREARM_OUT) - reach(level, FOREARM_IN),
    thighThickness: reach(level, THIGH_OUT) - reach(level, THIGH_IN),
    calfThickness: reach(level, CALF_OUT) - reach(level, CALF_IN),
  };
}

/** The drawn level that matches the rating. Below untrained marks no body. */
export function markedOverallLevel(badge: string | null): ExrxLevel | null {
  if (badge == null) {
    return null;
  }
  return LEVEL_BODY_LEVELS.find((item) => item === badge) ?? null;
}

function pathFits(path: string): boolean {
  const nums = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  for (let index = 0; index < nums.length; index += 2) {
    const x = nums[index];
    const y = nums[index + 1];
    if (x < 1 || x > 99 || y < 1 || y > 203) {
      return false;
    }
  }
  return nums.length > 0;
}

/** True when the body and the head stay inside the figure. */
export function musclesFitFigure(level: ExrxLevel): boolean {
  const figure = levelFigure(level);
  return pathFits(figure.body) && pathFits(figure.head);
}

/** How far the chest reaches from the midline. Higher levels are wider. */
export function chestReach(level: ExrxLevel): number {
  return levelFigure(level).chestReach;
}

/** Outer shoulder width. Higher levels are broader. */
export function shoulderBreadth(level: ExrxLevel): number {
  return levelFigure(level).shoulderBreadth;
}
