const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildGeminiModelList,
  createDemoFishInfo,
  identifyFishWithFallback
} = require('./fishIdentification');

const validFishInfo = {
  fishName: 'Rainbow Trout',
  rarityScore: 4,
  description: 'A freshwater trout often found in Canadian lakes and rivers.',
  location: 'Cold freshwater lakes and rivers',
  fishStory: 'A steady cast near the shoreline brought this trout in.',
  weight: 800,
  length: 35
};

function createResponse(fishInfo = validFishInfo) {
  return {
    response: {
      text: async () => JSON.stringify(fishInfo)
    }
  };
}

test('buildGeminiModelList keeps primary first and removes duplicates', () => {
  const models = buildGeminiModelList('gemini-2.5-flash', 'gemini-2.5-flash-lite, gemini-2.5-flash, gemini-flash-latest');

  assert.deepEqual(models, [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest'
  ]);
});

test('identifyFishWithFallback retries temporary failures before returning live fish info', async () => {
  let attempts = 0;
  const fakeGenAI = {
    getGenerativeModel: () => ({
      generateContent: async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('503 service unavailable: high demand');
        }
        return createResponse();
      }
    })
  };

  const result = await identifyFishWithFallback({
    genAI: fakeGenAI,
    modelNames: ['gemini-2.5-flash'],
    request: {},
    retryAttempts: 2,
    wait: async () => {}
  });

  assert.equal(attempts, 3);
  assert.equal(result.aiStatus, 'live');
  assert.equal(result.usedModel, 'gemini-2.5-flash');
  assert.deepEqual(result.fishInfo, validFishInfo);
});

test('identifyFishWithFallback tries fallback models when the primary model quota is exhausted', async () => {
  const calledModels = [];
  const fakeGenAI = {
    getGenerativeModel: ({ model }) => ({
      generateContent: async () => {
        calledModels.push(model);
        if (model === 'gemini-2.5-flash') {
          throw new Error('429 too many requests: quota exceeded');
        }
        return createResponse();
      }
    })
  };

  const result = await identifyFishWithFallback({
    genAI: fakeGenAI,
    modelNames: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    request: {},
    retryAttempts: 2,
    wait: async () => {}
  });

  assert.deepEqual(calledModels, ['gemini-2.5-flash', 'gemini-2.5-flash-lite']);
  assert.equal(result.aiStatus, 'live');
  assert.equal(result.usedModel, 'gemini-2.5-flash-lite');
});

test('identifyFishWithFallback returns demo fish info when every AI attempt fails', async () => {
  const fakeGenAI = {
    getGenerativeModel: () => ({
      generateContent: async () => {
        throw new Error('503 service unavailable');
      }
    })
  };

  const result = await identifyFishWithFallback({
    genAI: fakeGenAI,
    modelNames: ['gemini-2.5-flash'],
    request: {},
    retryAttempts: 1,
    wait: async () => {}
  });

  assert.equal(result.aiStatus, 'demo');
  assert.equal(result.usedModel, null);
  assert.deepEqual(result.fishInfo, createDemoFishInfo());
});
