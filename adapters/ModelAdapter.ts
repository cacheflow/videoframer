import ChatGPTAdapter from "./ChatGPTAdapter.js";
import ClaudeAdapter from "./ClaudeAdapter.js";
import GeminiAdapter from "./GeminiAdapter.js";

export interface ModelAdapterOptions {
  apiKey: string;
  model: string;
  prompt: string;
  provider: string;
}

export class ModelAdapter {
  apiKey: string;
  model: string;
  prompt?: string;
  provider: string;
  adapter: ChatGPTAdapter | ClaudeAdapter | GeminiAdapter;

  readonly modelRegistry: Record<string, any> = {
    "gpt-5": {adapter: ChatGPTAdapter, provider: 'openai' },
    "gpt-5-mini": {adapter: ChatGPTAdapter, provider: 'openai' },
    "gpt-5-nano": {adapter: ChatGPTAdapter, provider: 'openai' },
    "gpt-5.6": {adapter: ChatGPTAdapter, provider: 'openai' },
    "gpt-4.1": {adapter: ChatGPTAdapter, provider: 'openai' },
    "gpt-4.1-mini": {adapter: ChatGPTAdapter, provider: 'openai' },
    "gpt-4.1-nano": {adapter: ChatGPTAdapter, provider: 'openai' },
    "gpt-4o": {adapter: ChatGPTAdapter, provider: 'openai' },
    "gpt-4o-mini": {adapter: ChatGPTAdapter, provider: 'openai' },
    o1: {adapter: ChatGPTAdapter, provider: 'openai' },
    "o1-pro": {adapter: ChatGPTAdapter, provider: 'openai' },
    o3: {adapter: ChatGPTAdapter, provider: 'openai' },
    "o3-pro": {adapter: ChatGPTAdapter, provider: 'openai' },
    "o4-mini": {adapter: ChatGPTAdapter, provider: 'openai' },
    "claude-opus-4": {adapter: ClaudeAdapter, provider: 'claude' },
    "claude-sonnet-4": {adapter: ClaudeAdapter, provider: 'claude' },
    "claude-3.7-sonnet": {adapter: ClaudeAdapter, provider: 'claude' },
    "claude-3.5-sonnet": {adapter: ClaudeAdapter, provider: 'claude' },
    "claude-3.5-haiku": {adapter: ClaudeAdapter, provider: 'claude' },
    "gemini-2.5-pro": {adapter: GeminiAdapter, provider: 'gemini' },
    "gemini-2.5-flash": {adapter: GeminiAdapter, provider: 'gemini' },
    "gemini-2.5-flash-lite": {adapter: GeminiAdapter, provider: 'gemini' },
    "gemini-2.0-flash": {adapter: GeminiAdapter, provider: 'gemini' },
    "gemini-2.0-flash-lite": {adapter: GeminiAdapter, provider: 'gemini' },
  };

  readonly modelPrefixRegistry: Record<string, any> = {
    "gpt-": {adapter: ChatGPTAdapter, provider: 'openai' },
    o: {adapter: ChatGPTAdapter, provider: 'openai' },
    "claude-": {adapter: ClaudeAdapter, provider: 'claude' },
    "gemini-": {adapter: GeminiAdapter, provider: 'gemini' },
  };

  readonly providerRegistry: Record<string, any> = {
    gemini: {adapter: GeminiAdapter, provider: 'gemini' },
    google: {adapter: GeminiAdapter, provider: 'gemini' },
    openai: {adapter: ChatGPTAdapter, provider: 'openai' },
    oai: {adapter: ChatGPTAdapter, provider: 'openai' },
    chatgpt: {adapter: ChatGPTAdapter, provider: 'openai' },
    claude: {adapter: ClaudeAdapter, provider: 'claude' },
    anthropic: {adapter: ClaudeAdapter, provider: 'claude' },
  };

  constructor({ apiKey, model, prompt, provider }: ModelAdapterOptions) {
    this.ensureAPIKey(apiKey);
    this.ensuremodel(model);

    this.apiKey = apiKey;
    this.model = model;
    this.prompt = prompt;
    this.provider = provider;
    this.adapter = this.resolveAdapter({ model: this.model, provider: this.provider });
  }

  ensureAPIKey(apiKey: string) {
    if (!apiKey) {
      throw new Error("API key is required");
    }
  }

  ensuremodel(model: string) {
    if (!model) {
      throw new Error("Model name is required");
    }
  }

  analyze(content: any) {
    return this.adapter.analyze(content);
  }

  uploadFile(file: any) {
    return this.adapter.uploadFile(file);
  }

  resolveProvider(provider: string) {
    return this.providerRegistry[provider];
  }

  resolveModelByPrefix = (model: string) => {
    const modelPrefixKeys = Object.keys(this.modelPrefixRegistry);

    const resolvedPrefix = modelPrefixKeys.find((modelPrefix) => {
      return model.startsWith(modelPrefix);
    });

    if (resolvedPrefix && this.modelPrefixRegistry[resolvedPrefix]) {
      return this.modelPrefixRegistry[resolvedPrefix];
    }

    return null;
  };

  resolveAdapter = ({model, provider}: {
    model: string;
    provider: string;
  }) => {
    const normalizedModelName = (model || '').toLowerCase();
    const { apiKey, prompt } = this;
    const resolvedProvider = this.resolveProvider(provider);
    let adapter;

    if (resolvedProvider) {
      adapter = resolvedProvider.adapter;
    }

    const resolvedModel = (this.modelRegistry[normalizedModelName] || '');

    if (resolvedModel) {
      adapter = resolvedModel.adapter;
    }

    const resolvedModelByPrefix = this.resolveModelByPrefix(normalizedModelName);

    if (resolvedModelByPrefix) {
      adapter = resolvedModelByPrefix.adapter;
    }

    if (adapter) {
      return new adapter({ 
        apiKey, 
        model: normalizedModelName,
        prompt, 
      });
    }

    throw new Error(`Adapter for model "${normalizedModelName}" could not be resolved`);
  };
}

export default ModelAdapter;
