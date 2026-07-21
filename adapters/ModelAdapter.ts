import ChatGPTAdapter from "./ChatGPTAdapter.js";
import ClaudeAdapter from "./ClaudeAdapter.js";
import GeminiAdapter from "./GeminiAdapter.js";

export interface ModelAdapterOptions {
  apiKey: string;
  modelName: string;
}

export class ModelAdapter {
  apiKey: string;
  modelName: string;
  loadedModel: new (options: { apiKey: string; modelName?: string }) => any;
  model: any;

  readonly modelRegistry: Record<string, any> = {
    "gpt-5": ChatGPTAdapter,
    "gpt-5-mini": ChatGPTAdapter,
    "gpt-5-nano": ChatGPTAdapter,
    "gpt-5.6": ChatGPTAdapter,
    "gpt-4.1": ChatGPTAdapter,
    "gpt-4.1-mini": ChatGPTAdapter,
    "gpt-4.1-nano": ChatGPTAdapter,
    "gpt-4o": ChatGPTAdapter,
    "gpt-4o-mini": ChatGPTAdapter,
    "o1": ChatGPTAdapter,
    "o1-pro": ChatGPTAdapter,
    "o3": ChatGPTAdapter,
    "o3-pro": ChatGPTAdapter,
    "o4-mini": ChatGPTAdapter,
    "claude-opus-4": ClaudeAdapter,
    "claude-sonnet-4": ClaudeAdapter,
    "claude-3.7-sonnet": ClaudeAdapter,
    "claude-3.5-sonnet": ClaudeAdapter,
    "claude-3.5-haiku": ClaudeAdapter,
    "gemini-2.5-pro": GeminiAdapter,
    "gemini-2.5-flash": GeminiAdapter,
    "gemini-2.5-flash-lite": GeminiAdapter,
    "gemini-2.0-flash": GeminiAdapter,
    "gemini-2.0-flash-lite": GeminiAdapter,
  };

  readonly modelPrefixRegistry: Record<string, any> = {
    "gpt-": ChatGPTAdapter,
    "o": ChatGPTAdapter,
    "claude-": ClaudeAdapter,
    "gemini-": GeminiAdapter,
  };

  constructor({ apiKey, modelName }: ModelAdapterOptions) {
    this.ensureAPIKey(apiKey);
    this.ensureModelName(modelName);

    this.apiKey = apiKey;
    this.modelName = modelName;
    this.loadedModel = this.resolveModel(this.modelName);
    this.model = new this.loadedModel({
      apiKey: this.apiKey,
      modelName: this.modelName,
    });
  }

  ensureAPIKey(apiKey: string) {
    if (!apiKey) {
      throw new Error("API key is required");
    }
  }

  ensureModelName(modelName: string) {
    if (!modelName) {
      throw new Error("Model name is required");
    }
  }

  analyze(content: any) {
    return this.model.analyze(content);
  }

  uploadFile(file: any) {
    return this.model.uploadFile(file);
  }

  resolveModel(modelName: string) {
    const resolvedModel = this.modelRegistry[modelName];

    if (resolvedModel) {
      return resolvedModel;
    }

    const modelPrefixKeys = Object.keys(this.modelPrefixRegistry);

    const resolvedPrefix = modelPrefixKeys.find((modelPrefix) => {
      return modelName.startsWith(modelPrefix);
    });

    if (resolvedPrefix && this.modelPrefixRegistry[resolvedPrefix]) {
      return this.modelPrefixRegistry[resolvedPrefix];
    }

    throw new Error(`Model "${modelName}" could not be resolved`);
  }
}

export default ModelAdapter;
