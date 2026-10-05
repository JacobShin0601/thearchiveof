export const SERIES = [
  {
    name: 'Agent Engineering',
    description: {
      ko: '에이전트 패턴에서 비동기 실행, 상태, 스트리밍, 런타임까지 프로덕션 시스템의 핵심을 순서대로 다룹니다.',
      en: 'A practical path through agent patterns, asynchronous execution, state, streaming, and production runtimes.',
    },
  },
  {
    name: 'Enterprise AX',
    description: {
      ko: 'AI를 도입하는 데서 멈추지 않고, 기업의 업무와 조직을 실제로 바꾸는 방법을 현장 관점에서 다룹니다.',
      en: 'A field-driven series on moving beyond AI adoption to redesign enterprise work and operating models.',
    },
  },
  {
    name: 'Optimization',
    description: {
      ko: '목적함수와 제약, 상충하는 목표를 실제 의사결정 문제와 연결해 설명합니다.',
      en: 'Objectives, constraints, and trade-offs explained through practical decision problems.',
    },
  },
  {
    name: 'Internal LLM Serving',
    catalogTopLevel: false,
    description: {
      ko: '내부 GPU에서 vLLM으로 LLM을 서빙하는 이유, 튜닝, 성능 진단까지 이어지는 선택형 실전 경로입니다.',
      en: 'A focused path on why to serve with vLLM on internal GPUs, how to tune it, and how to diagnose slowdowns.',
    },
  },
] as const;
