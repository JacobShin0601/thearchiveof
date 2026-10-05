export type SeriesMode = 'learning-path' | 'research-series';

export type LocalizedCopy = { ko: string; en: string };

export type SeriesEntry = {
  /** Canonical value for post frontmatter `series` (both languages). */
  name: string;
  slug?: string;
  mode?: SeriesMode;
  catalogTopLevel?: boolean;
  title?: LocalizedCopy;
  description: LocalizedCopy;
  homeBlurb?: LocalizedCopy;
  parentName?: string;
};

export const AI_VALUE_CHAIN_SERIES = 'AI Value Chain';

export const SERIES = [
  {
    name: 'Agent Engineering',
    mode: 'learning-path',
    description: {
      ko: '에이전트 패턴에서 비동기 실행, 상태, 스트리밍, 런타임까지 프로덕션 시스템의 핵심을 순서대로 다룹니다.',
      en: 'A practical path through agent patterns, asynchronous execution, state, streaming, and production runtimes.',
    },
  },
  {
    name: 'Enterprise AX',
    mode: 'learning-path',
    description: {
      ko: 'AI를 도입하는 데서 멈추지 않고, 기업의 업무와 조직을 실제로 바꾸는 방법을 현장 관점에서 다룹니다.',
      en: 'A field-driven series on moving beyond AI adoption to redesign enterprise work and operating models.',
    },
  },
  {
    name: 'Optimization',
    mode: 'learning-path',
    title: {
      ko: '최적화',
      en: 'Optimization',
    },
    description: {
      ko: '목적함수와 제약, 상충하는 목표를 실제 의사결정 문제와 연결해 설명합니다.',
      en: 'Objectives, constraints, and trade-offs explained through practical decision problems.',
    },
  },
  {
    name: AI_VALUE_CHAIN_SERIES,
    slug: 'ai-value-chain',
    mode: 'research-series',
    title: {
      ko: 'AI 밸류체인: 기술과 투자',
      en: 'Investing Across the AI Stack',
    },
    description: {
      ko: '반도체·전력·데이터센터부터 모델, 플랫폼과 산업별 애플리케이션까지 AI 가치사슬의 기술 구조, 경제성, 해자와 밸류에이션을 분석합니다.',
      en: 'Investment research across the AI value chain, from chips, power, and data centers to models, platforms, data, and vertical applications.',
    },
    homeBlurb: {
      ko: 'AI 가치사슬에서 누가 비용을 부담하고 누가 이익을 가져가는지 분석합니다.',
      en: 'Who bears the cost, who captures the value, and where durable returns may emerge across the AI stack.',
    },
  },
  {
    name: 'Internal LLM Serving',
    catalogTopLevel: false,
    parentName: 'Agent Engineering',
    mode: 'learning-path',
    description: {
      ko: '내부 GPU에서 vLLM으로 LLM을 서빙하는 이유, 튜닝, 성능 진단까지 이어지는 선택형 실전 경로입니다.',
      en: 'A focused path on why to serve with vLLM on internal GPUs, how to tune it, and how to diagnose slowdowns.',
    },
  },
] satisfies SeriesEntry[];
