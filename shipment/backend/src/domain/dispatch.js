export const rankAgents = (agents, { pickupArea, excludedAgentIds = [], activeCountByAgent = new Map() } = {}) => {
  const excluded = new Set(excludedAgentIds.map(Number));
  const normalizedArea = pickupArea?.trim().toLocaleLowerCase();

  return agents
    .filter((agent) =>
      agent.role === "SHIPPER" &&
      agent.accountStatus === "ACTIVE" &&
      agent.availability === "AVAILABLE" &&
      !excluded.has(Number(agent.id))
    )
    .map((agent) => {
      const areas = Array.isArray(agent.serviceAreas) ? agent.serviceAreas : [];
      const areaPenalty = normalizedArea && areas.length > 0 &&
        !areas.some((area) => String(area).trim().toLocaleLowerCase() === normalizedArea) ? 1 : 0;
      return {
        agent,
        areaPenalty,
        activeCount: activeCountByAgent.get(Number(agent.id)) || 0,
        rating: Number(agent.rating || 0),
        completedDeliveries: Number(agent.completedDeliveries || 0),
      };
    })
    .sort((a, b) =>
      a.areaPenalty - b.areaPenalty ||
      a.activeCount - b.activeCount ||
      b.rating - a.rating ||
      b.completedDeliveries - a.completedDeliveries ||
      Number(a.agent.id) - Number(b.agent.id)
    )
    .map(({ agent }) => agent);
};
