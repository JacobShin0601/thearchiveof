export interface QueueMetrics {
  offeredLoad: number;
  utilization: number;
  stable: boolean;
  waitProbability: number;
  averageWaitMinutes: number;
  serviceLevel: number;
}

export function humanHandoffRate(contactRate: number, handoffShare: number) {
  return Math.max(0, contactRate) * Math.min(1, Math.max(0, handoffShare));
}

export function meanInterarrivalMinutes(ratePerHour: number) {
  return ratePerHour > 0 ? 60 / ratePerHour : Number.POSITIVE_INFINITY;
}

export function erlangC(
  arrivalRatePerHour: number,
  averageHandleMinutes: number,
  agents: number,
  targetWaitMinutes: number,
): QueueMetrics {
  const arrivalRate = Math.max(0, arrivalRatePerHour);
  const handleMinutes = Math.max(Number.EPSILON, averageHandleMinutes);
  const serverCount = Math.max(1, Math.floor(agents));
  const serviceRate = 60 / handleMinutes;
  const offeredLoad = arrivalRate / serviceRate;
  const utilization = offeredLoad / serverCount;

  if (arrivalRate === 0) {
    return {
      offeredLoad: 0,
      utilization: 0,
      stable: true,
      waitProbability: 0,
      averageWaitMinutes: 0,
      serviceLevel: 1,
    };
  }

  if (utilization >= 1) {
    return {
      offeredLoad,
      utilization,
      stable: false,
      waitProbability: 1,
      averageWaitMinutes: Number.POSITIVE_INFINITY,
      serviceLevel: 0,
    };
  }

  let term = 1;
  let sum = 1;
  for (let k = 1; k < serverCount; k += 1) {
    term *= offeredLoad / k;
    sum += term;
  }
  const finalTerm = term * offeredLoad / serverCount;
  const delayTerm = finalTerm / (1 - utilization);
  const waitProbability = delayTerm / (sum + delayTerm);
  const spareCapacityPerHour = serverCount * serviceRate - arrivalRate;
  const averageWaitMinutes = (waitProbability / spareCapacityPerHour) * 60;
  const targetHours = Math.max(0, targetWaitMinutes) / 60;
  const serviceLevel = 1 - waitProbability * Math.exp(-spareCapacityPerHour * targetHours);

  return {
    offeredLoad,
    utilization,
    stable: true,
    waitProbability,
    averageWaitMinutes,
    serviceLevel,
  };
}
