import test from "node:test";
import assert from "node:assert/strict";
import vectorSearchEngine from "../src/modules/search/vectorSearch.service.js";
import {
  getHealth,
  searchProducts,
  getSimilarProducts,
  getRecommendations,
  visualSearchByImage,
} from "../src/modules/search/search.controller.js";

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("searchController.getHealth returns UP status with 5000 vectors", () => {
  vectorSearchEngine.init();
  const res = createMockRes();
  getHealth({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "UP");
  assert.equal(res.body.total_vectors, 5000);
});

test("searchController.searchProducts returns empty list on blank query and ranked IDs on valid query", async () => {
  vectorSearchEngine.init();
  const resBlank = createMockRes();
  await searchProducts({ query: { query: "   " } }, resBlank);
  assert.equal(resBlank.statusCode, 200);
  assert.equal(resBlank.body.count, 0);
  assert.deepEqual(resBlank.body.productIds, []);

  const resValid = createMockRes();
  await searchProducts({ query: { query: "giày màu trắng", limit: "5" } }, resValid);
  assert.equal(resValid.statusCode, 200);
  assert.equal(resValid.body.success, true);
  assert.equal(resValid.body.count, 5);
  assert.equal(resValid.body.productIds.length, 5);
});

test("searchController.getSimilarProducts validates productId and returns similar IDs", () => {
  vectorSearchEngine.init();
  const resBad = createMockRes();
  getSimilarProducts({ params: { productId: "abc" }, query: {} }, resBad);
  assert.equal(resBad.statusCode, 400);

  const resOk = createMockRes();
  getSimilarProducts({ params: { productId: "1379" }, query: { limit: "4" } }, resOk);
  assert.equal(resOk.statusCode, 200);
  assert.equal(resOk.body.count, 4);
  assert.ok(!resOk.body.productIds.includes(1379));
});

test("searchController.getRecommendations returns personalized product IDs excluding history", () => {
  vectorSearchEngine.init();
  const res = createMockRes();
  getRecommendations({ body: { viewedProductIds: [278, 1379], limit: 5 }, query: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.productIds.length, 5);
  assert.ok(!res.body.productIds.includes(278));
  assert.ok(!res.body.productIds.includes(1379));
});

test("searchController.visualSearchByImage validates input and ranks vectors from model inference", async () => {
  vectorSearchEngine.init();

  const resBad = createMockRes();
  await visualSearchByImage({ body: {} }, resBad);
  assert.equal(resBad.statusCode, 400);
  assert.equal(resBad.body.success, false);

  const prevUrl = process.env.MODEL_INFERENCE_URL;
  const prevFetch = globalThis.fetch;

  try {
    delete process.env.MODEL_INFERENCE_URL;
    const resNoModel = createMockRes();
    await visualSearchByImage({ body: { imageBase64: "AAAA", limit: 5 } }, resNoModel);
    assert.equal(resNoModel.statusCode, 200);
    assert.deepEqual(resNoModel.body.productIds, []);

    process.env.MODEL_INFERENCE_URL = "http://mock-qwen:8000";
    const sampleVec = Array.from(
      vectorSearchEngine.vectors.slice(0, vectorSearchEngine.vectorDim)
    );
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "http://mock-qwen:8000/embed-image");
      assert.equal(init.method, "POST");
      return {
        ok: true,
        async json() {
          return { vector: sampleVec, dim: sampleVec.length };
        },
      };
    };

    const resOk = createMockRes();
    await visualSearchByImage({ body: { imageBase64: "AAAA", limit: 4 } }, resOk);
    assert.equal(resOk.statusCode, 200);
    assert.equal(resOk.body.success, true);
    assert.equal(resOk.body.count, 4);
    assert.equal(resOk.body.productIds[0], 1);
  } finally {
    globalThis.fetch = prevFetch;
    if (prevUrl === undefined) {
      delete process.env.MODEL_INFERENCE_URL;
    } else {
      process.env.MODEL_INFERENCE_URL = prevUrl;
    }
  }
});
