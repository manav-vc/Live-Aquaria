const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-flash-latest'];

function getErrorText(error) {
  return `${error?.message || ''} ${error?.status || ''} ${error?.statusText || ''}`;
}

function isGeminiAuthError(error) {
  return /api key|apikey|unauthorized|forbidden|permission|401|403/i.test(getErrorText(error));
}

function isGeminiModelError(error) {
  return /model.*not found|not supported|404/i.test(getErrorText(error));
}

function isGeminiQuotaError(error) {
  return /quota|too many requests|429/i.test(getErrorText(error));
}

function isGeminiTemporaryError(error) {
  return /service unavailable|high demand|temporar|internal|deadline|500|503|504/i.test(getErrorText(error));
}

function buildGeminiModelList(primaryModel = DEFAULT_GEMINI_MODEL, fallbackModelsValue) {
  const fallbackModels = fallbackModelsValue
    ? fallbackModelsValue.split(',').map((modelName) => modelName.trim())
    : DEFAULT_FALLBACK_MODELS;

  return [primaryModel, ...fallbackModels].filter((modelName, index, modelNames) => (
    modelName && modelNames.indexOf(modelName) === index
  ));
}

function createDemoFishInfo() {
  return {
    fishName: 'Rainbow Trout (Demo Mode)',
    rarityScore: 4,
    description: 'Demo fallback result shown because the live AI service is unavailable. The upload, location, save, and result-display flow still works.',
    location: 'Cold freshwater lakes and rivers across Canada',
    fishStory: 'A calm cast near the shoreline brought in a bright rainbow trout, making it a perfect catch to save in Live Aquaria.',
    weight: 800,
    length: 35
  };
}

function getFriendlyGeminiMessage(error) {
  if (!error) {
    return 'Gemini did not return a response.';
  }
  if (isGeminiAuthError(error)) {
    return 'Gemini API key is missing, invalid, or unauthorized.';
  }
  if (isGeminiModelError(error)) {
    return 'Gemini model is unavailable for this API key.';
  }
  if (isGeminiQuotaError(error)) {
    return 'Gemini API quota or rate limit was reached.';
  }
  if (isGeminiTemporaryError(error)) {
    return 'Gemini is temporarily overloaded or unavailable.';
  }
  return 'Gemini could not process the image.';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function identifyFishWithFallback({
  genAI,
  modelNames,
  request,
  retryAttempts = 2,
  wait = delay,
  logger = console
}) {
  if (!genAI) {
    return {
      aiStatus: 'demo',
      usedModel: null,
      fallbackReason: 'Gemini API key is not configured.',
      fishInfo: createDemoFishInfo()
    };
  }

  let lastError = null;

  for (const modelName of modelNames) {
    const model = genAI.getGenerativeModel({ model: modelName });

    for (let attempt = 0; attempt <= retryAttempts; attempt += 1) {
      try {
        const result = await model.generateContent(request);
        const response = await result.response;
        const fishInfo = JSON.parse(await response.text());

        return {
          aiStatus: 'live',
          usedModel: modelName,
          fallbackReason: null,
          fishInfo
        };
      } catch (error) {
        lastError = error;
        logger.warn(`Gemini attempt failed for ${modelName} (${attempt + 1}/${retryAttempts + 1}):`, getFriendlyGeminiMessage(error));

        if (isGeminiTemporaryError(error) && attempt < retryAttempts) {
          await wait(1000 * 2 ** attempt);
          continue;
        }

        break;
      }
    }
  }

  return {
    aiStatus: 'demo',
    usedModel: null,
    fallbackReason: getFriendlyGeminiMessage(lastError),
    fishInfo: createDemoFishInfo()
  };
}

module.exports = {
  DEFAULT_GEMINI_MODEL,
  buildGeminiModelList,
  createDemoFishInfo,
  getFriendlyGeminiMessage,
  identifyFishWithFallback,
  isGeminiAuthError,
  isGeminiModelError,
  isGeminiQuotaError,
  isGeminiTemporaryError
};
