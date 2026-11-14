import test from "node:test";
import assert from "node:assert/strict";
import { rankAgents } from "../src/domain/dispatch.js";

const agent = (id, values = {}) => ({
  id,
  role: "SHIPPER",
  accountStatus: "ACTIVE",
  availability: "AVAILABLE",
  serviceAreas: [],
  rating: 5,
  completedDeliveries: 0,
  ...values,
});

test("dispatch prefers matching area, then lower active workload", () => {
  const agents = [
    agent(1, { serviceAreas: ["Quận 1"] }),
    agent(2, { serviceAreas: ["Quận 2"] }),
    agent(3, { serviceAreas: ["Quận 1"] }),
  ];
  const ranked = rankAgents(agents, {
    pickupArea: "Quận 1",
    activeCountByAgent: new Map([[1, 2], [3, 0]]),
  });
  assert.deepEqual(ranked.map(({ id }) => id), [3, 1, 2]);
});

test("dispatch skips inactive, unavailable, and explicitly excluded agents", () => {
  const agents = [
    agent(1, { availability: "OFFLINE" }),
    agent(2, { accountStatus: "LOCKED" }),
    agent(3, { role: "ADMIN" }),
    agent(4),
  ];
  assert.deepEqual(rankAgents(agents, { excludedAgentIds: [4] }), []);
});

test("dispatch uses rating, completed deliveries, and id for stable ties", () => {
  const ranked = rankAgents([
    agent(8, { rating: 4.8, completedDeliveries: 5 }),
    agent(5, { rating: 4.8, completedDeliveries: 5 }),
    agent(4, { rating: 4.9, completedDeliveries: 1 }),
  ]);
  assert.deepEqual(ranked.map(({ id }) => id), [4, 5, 8]);
});
