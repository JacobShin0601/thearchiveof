export type QueueMode = 'pooled' | 'separate';

export interface QueueSimulationInput {
  arrivalRatePerMinute: number;
  averageServiceMinutes: number;
  servers: number;
  serviceCv: number;
  mode: QueueMode;
  durationMinutes?: number;
  seed?: number;
}

export interface QueueSimulationResult {
  arrivals: number;
  utilization: number;
  stable: boolean;
  averageWaitMinutes: number;
  p95WaitMinutes: number;
  averageQueueLength: number;
  waitedShare: number;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function exponential(mean: number, random: () => number) {
  return -Math.log(Math.max(Number.EPSILON, 1 - random())) * mean;
}

function normal(random: () => number) {
  const u1 = Math.max(Number.EPSILON, random());
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function serviceTime(mean: number, cv: number, random: () => number) {
  if (cv <= 0.001) return mean;
  const variance = Math.log(1 + cv * cv);
  const sigma = Math.sqrt(variance);
  const location = Math.log(mean) - variance / 2;
  return Math.exp(location + sigma * normal(random));
}

function percentile(sorted: number[], fraction: number) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

export function simulateQueue(input: QueueSimulationInput): QueueSimulationResult {
  const arrivalRate = Math.max(0.001, input.arrivalRatePerMinute);
  const averageService = Math.max(0.01, input.averageServiceMinutes);
  const servers = Math.max(1, Math.floor(input.servers));
  const serviceCv = Math.max(0, input.serviceCv);
  const duration = Math.max(30, input.durationMinutes ?? 240);
  const random = seededRandom(input.seed ?? 20261002);
  const waits: number[] = [];
  const availability = Array.from({ length: servers }, () => 0);
  const laneCompletions = Array.from({ length: servers }, () => [] as number[]);
  let arrival = 0;

  while (true) {
    arrival += exponential(1 / arrivalRate, random);
    if (arrival > duration) break;
    const durationForJob = serviceTime(averageService, serviceCv, random);
    let start = arrival;

    if (input.mode === 'pooled') {
      let server = 0;
      for (let index = 1; index < servers; index += 1) {
        if (availability[index] < availability[server]) server = index;
      }
      start = Math.max(arrival, availability[server]);
      availability[server] = start + durationForJob;
    } else {
      for (const lane of laneCompletions) {
        while (lane.length > 0 && lane[0] <= arrival) lane.shift();
      }
      const minimumLength = Math.min(...laneCompletions.map((lane) => lane.length));
      const candidates = laneCompletions
        .map((lane, index) => ({ lane, index }))
        .filter(({ lane }) => lane.length === minimumLength);
      const selected = candidates[Math.floor(random() * candidates.length)].index;
      const lane = laneCompletions[selected];
      start = Math.max(arrival, lane.at(-1) ?? arrival);
      lane.push(start + durationForJob);
    }

    waits.push(Math.max(0, start - arrival));
  }

  const utilization = (arrivalRate * averageService) / servers;
  const sorted = [...waits].sort((a, b) => a - b);
  const averageWaitMinutes = waits.reduce((sum, wait) => sum + wait, 0) / Math.max(1, waits.length);
  const effectiveArrivalRate = waits.length / duration;

  return {
    arrivals: waits.length,
    utilization,
    stable: utilization < 1,
    averageWaitMinutes,
    p95WaitMinutes: percentile(sorted, 0.95),
    averageQueueLength: effectiveArrivalRate * averageWaitMinutes,
    waitedShare: waits.filter((wait) => wait > 1e-9).length / Math.max(1, waits.length),
  };
}
