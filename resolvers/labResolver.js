const fallbackResolver = (model) => {
  if (model.startsWith("gpt-") || model.startsWith("o")) {
    return "openai";
  }

  if (model.startsWith("claude-")) {
    return "anthropic";
  }

  if (model.startsWith("gemini-")) {
    return "google";
  }

  if (model.startsWith("grok-")) {
    return "xai";
  }

  if (model.startsWith("llama-")) {
    return "meta";
  }

  if (model.startsWith("qwen")) {
    return "alibaba";
  }

  if (model.startsWith("deepseek-")) {
    return "deepseek";
  }

  if (model.startsWith("command-")) {
    return "cohere";
  }

  if (model.startsWith("nova-")) {
    return "amazon";
  }

  if (model.startsWith("mistral") || model.startsWith("ministral")) {
    return "mistral";
  }

  if (model.startsWith("kimi")) {
    return "moonshot";
  }

  return '';

}

const labResolver = (model) => {
  const modelMap = {
    "gpt-5": "openai",
    "gpt-5-mini": "openai",
    "gpt-5-nano": "openai",
    "gpt-5.6": "openai",
    "gpt-4.1": "openai",
    "gpt-4.1-mini": "openai",
    "gpt-4.1-nano": "openai",
    "gpt-4o": "openai",
    "gpt-4o-mini": "openai",
    "o1": "openai",
    "o1-pro": "openai",
    "o3": "openai",
    "o3-pro": "openai",
    "o4-mini": "openai",

    "claude-opus-4": "anthropic",
    "claude-sonnet-4": "anthropic",
    "claude-3.7-sonnet": "anthropic",
    "claude-3.5-sonnet": "anthropic",
    "claude-3.5-haiku": "anthropic",

    "gemini-2.5-pro": "google",
    "gemini-2.5-flash": "google",
    "gemini-2.5-flash-lite": "google",
    "gemini-2.0-flash": "google",
    "gemini-2.0-flash-lite": "google",

    "grok-4": "xai",
    "grok-3": "xai",
    "grok-3-mini": "xai",

    "llama-4-maverick": "meta",
    "llama-4-scout": "meta",

    
    "mistral-large": "mistral",
    "mistral-medium": "mistral",
    "ministral-8b": "mistral",
    "ministral-3b": "mistral",

    "command-a": "cohere",
    "command-r-plus": "cohere",
    "command-r": "cohere",

    "deepseek-chat": "deepseek",
    "deepseek-reasoner": "deepseek",

    "kimi-k2": "moonshot",

    "qwen3": "alibaba",
    "qwen2.5-vl": "alibaba",

    "nova-pro": "amazon",
    "nova-lite": "amazon",
    "nova-micro": "amazon",
  }
  const normalizedModel = (model || '').toString().toLowerCase()

  return modelMap[normalizedModel] || fallbackProviderResolver(normalizedModel);
}


export default labResolver;