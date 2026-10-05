import type { LocalizedCopy } from '../data/series.ts';

export const AI_VALUE_CHAIN_AXIS_IDS = [
  'compute-infrastructure',
  'models-inference',
  'platforms-and-moats',
  'applications',
  'business-models',
] as const;

export type AiValueChainAxisId = (typeof AI_VALUE_CHAIN_AXIS_IDS)[number];

export const AI_VALUE_CHAIN_AXIS_META: Record<
  AiValueChainAxisId,
  { index: number; label: LocalizedCopy; cardQuestion: LocalizedCopy }
> = {
  'compute-infrastructure': {
    index: 1,
    label: { ko: '컴퓨트와 인프라', en: 'Compute & Infrastructure' },
    cardQuestion: {
      ko: '누가 자본을 투입하고 공급 제약을 통제하는가?',
      en: 'Who commits capital and controls supply constraints?',
    },
  },
  'models-inference': {
    index: 2,
    label: { ko: '모델과 추론', en: 'Models & Inference' },
    cardQuestion: {
      ko: '학습·추론 비용 중 어디에 가격 결정력이 남는가?',
      en: 'Where does pricing power sit in training and inference economics?',
    },
  },
  'platforms-and-moats': {
    index: 3,
    label: { ko: '플랫폼·데이터·유통', en: 'Platforms, Data & Distribution' },
    cardQuestion: {
      ko: '데이터, workflow, 유통 중 무엇이 commodity가 되지 않는가?',
      en: 'Which of data, workflow, and distribution resists commoditization?',
    },
  },
  applications: {
    index: 4,
    label: { ko: '애플리케이션과 Vertical AI', en: 'Applications & Vertical AI' },
    cardQuestion: {
      ko: 'Vertical workflow와 희소 데이터는 누구에게 남는가?',
      en: 'Who keeps vertical workflow and scarce data?',
    },
  },
  'business-models': {
    index: 5,
    label: { ko: '비즈니스 모델과 밸류에이션', en: 'Business Models & Valuation' },
    cardQuestion: {
      ko: '규모가 커질수록 반복 가능한 경제성이 개선되는가?',
      en: 'Does repeatability improve as scale grows?',
    },
  },
};

/** Short label for article cards (often English caps in design). */
export const AI_VALUE_CHAIN_AXIS_CARD_LABEL: Record<AiValueChainAxisId, LocalizedCopy> = {
  'compute-infrastructure': {
    ko: 'COMPUTE & INFRASTRUCTURE',
    en: 'COMPUTE & INFRASTRUCTURE',
  },
  'models-inference': {
    ko: 'MODELS & INFERENCE',
    en: 'MODELS & INFERENCE',
  },
  'platforms-and-moats': {
    ko: 'PLATFORMS, DISTRIBUTION & MOATS',
    en: 'PLATFORMS, DISTRIBUTION & MOATS',
  },
  applications: {
    ko: 'APPLICATIONS & VERTICAL AI',
    en: 'APPLICATIONS & VERTICAL AI',
  },
  'business-models': {
    ko: 'BUSINESS MODELS & VALUATION',
    en: 'BUSINESS MODELS & VALUATION',
  },
};

export function aiValueChainAxisLabel(axisId: AiValueChainAxisId, language: 'ko' | 'en'): string {
  return AI_VALUE_CHAIN_AXIS_CARD_LABEL[axisId][language];
}
