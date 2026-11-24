import test from "node:test";
import assert from "node:assert/strict";
import vectorSearchEngine from "../src/modules/search/vectorSearch.service.js";

test("vectorSearchEngine initializes 5000 vectors of 2048 dimensions and reports UP status", () => {
  const ready = vectorSearchEngine.init();
  assert.equal(ready, true);
  assert.equal(vectorSearchEngine.totalRecords, 5000);
  assert.equal(vectorSearchEngine.vectorDim, 2048);

  const status = vectorSearchEngine.getStatus();
  assert.equal(status.status, "UP");
  assert.equal(status.total_vectors, 5000);
  assert.equal(status.vector_dim, 2048);
});

test("translateToEnglish preserves ASCII queries and translates Vietnamese fallback phrases", async () => {
  const en = await vectorSearchEngine.translateToEnglish("white sneakers");
  assert.equal(en, "white sneakers");

  const vi = await vectorSearchEngine.translateToEnglish("giày màu trắng");
  assert.ok(vi.toLowerCase().includes("white"));
  assert.ok(vi.toLowerCase().includes("shoes"));
});

test("search handles empty/invalid queries safely and returns white shoes for 'giày màu trắng'", async () => {
  vectorSearchEngine.init();
  assert.deepEqual(await vectorSearchEngine.search("", 5), []);
  assert.deepEqual(await vectorSearchEngine.search(null, 5), []);

  const results = await vectorSearchEngine.search("giày màu trắng", 5);
  assert.equal(results.length, 5);
  assert.ok(results[0].title.toLowerCase().includes("white"));
});

test("rerankCandidates prioritizes matching color over conflicting color", () => {
  vectorSearchEngine.init();
  const candidates = [
    { id: 1140, score: 0.65 }, // Amazon Brand - Symbol Men's Black Formal Shoes
    { id: 1379, score: 0.62 }, // Amazon Brand - Symbol Women's White Sneakers
  ];
  const ranked = vectorSearchEngine.rerankCandidates("white shoes", candidates, 2);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].id, 1379);
  assert.ok(ranked[0].finalScore > ranked[1].finalScore);
});

test("rerankCandidates penalizes mismatched devices for phone queries", () => {
  vectorSearchEngine.init();
  const ranked = vectorSearchEngine.rerankCandidates("phone case", [
    { id: 297, score: 0.60 },
    { id: 1, score: 0.60 },
  ], 2);
  assert.equal(ranked.length, 2);
  assert.ok(ranked[0].finalScore >= ranked[1].finalScore);
});

test("getSimilarProducts returns descending cosine matches excluding target product", () => {
  vectorSearchEngine.init();
  const similar = vectorSearchEngine.getSimilarProducts(1379, 5);
  assert.equal(similar.length, 5);
  assert.ok(similar.every((s) => s.id !== 1379));
  for (let i = 1; i < similar.length; i++) {
    assert.ok(similar[i - 1].score >= similar[i].score);
  }
});

test("getRecommendationsByUserHistory excludes already viewed products", () => {
  vectorSearchEngine.init();
  const viewed = [278, 1379];
  const recs = vectorSearchEngine.getRecommendationsByUserHistory(viewed, 5);
  assert.equal(recs.length, 5);
  for (const item of recs) {
    assert.ok(!viewed.includes(item.id));
    assert.equal(typeof item.score, "number");
  }
});

test("translateToEnglish survives HTTP 429 HTML responses without throwing JSON SyntaxError", async (t) => {
  vectorSearchEngine.translationCache.clear();
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false,
    status: 429,
    headers: { get: () => "text/html; charset=UTF-8" },
    json: async () => {
      throw new SyntaxError("Unexpected token '<'");
    },
  }));

  const translated = await vectorSearchEngine.translateToEnglish("ốp lưng điện thoại màu hồng");
  assert.equal(translated, "phone case pink");
});

test("getRecommendationsByUserHistory returns empty array safely for invalid/out-of-range IDs", () => {
  vectorSearchEngine.init();
  assert.deepEqual(vectorSearchEngine.getRecommendationsByUserHistory([], 5), []);
  assert.deepEqual(vectorSearchEngine.getRecommendationsByUserHistory([-1, 0, 999999, "bad"], 5), []);
});

test("search supports rerank=false (Stage 1 only) and mode=ram options", async () => {
  vectorSearchEngine.init();
  const pureStage1 = await vectorSearchEngine.search("giày màu trắng", 5, { mode: "ram", rerank: false });
  assert.equal(pureStage1.length, 5);
  assert.equal(pureStage1[0].lexicalScore, 0);
  assert.equal(pureStage1[0].finalScore, pureStage1[0].semanticScore);
});
