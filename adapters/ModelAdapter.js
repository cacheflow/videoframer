import ChatGPTAdapter from "./ChatGPTAdapter.js";

class ModelAdapter {
    constructor({
        apiKey,
        modelName
    }) {
        this.modelRegistry = {
          "gpt-5": ChatGPTAdapter,
          "gpt-5-mini": ChatGPTAdapter,
          "gpt-5-nano": ChatGPTAdapter,
          "gpt-5.6": ChatGPTAdapter,
          "gpt-4.1": ChatGPTAdapter,
          "gpt-4.1-mini": ChatGPTAdapter,
          "gpt-4.1-nano": ChatGPTAdapter,
          "gpt-4o": ChatGPTAdapter,
          "gpt-4o-mini": ChatGPTAdapter, 
          "o1": "",
          "o1-pro": "",
          "o3": "",
          "o3-pro": "",
          "o4-mini": "",
          "claude-opus-4": "",
          "claude-sonnet-4": "",
          "claude-3.7-sonnet": "",
          "claude-3.5-sonnet": "",
          "claude-3.5-haiku": "",
          "gemini-2.5-pro": "",
          "gemini-2.5-flash": "",
          "gemini-2.5-flash-lite": "",
          "gemini-2.0-flash": "",
          "gemini-2.0-flash-lite": "",
          "grok-4": "",
          "grok-3": "",
          "grok-3-mini": "",
          "llama-4-maverick": "",
          "llama-4-scout": "",
          "mistral-large": "",
          "mistral-medium": "",
          "ministral-8b": "",
          "ministral-3b": "",
          "command-a": "",
          "command-r-plus": "",
          "command-r": "",
          "deepseek-chat": "",
          "deepseek-reasoner": "",
          "kimi-k2": "",
          "qwen3": "",
          "qwen2.5-vl": "",
          "nova-pro": "",
          "nova-lite": "",
          "nova-micro": ""
        }
        this.modelPrefixRegistry = {
          "claude-": ChatGPTAdapter,
          "gemini-": ChatGPTAdapter,
          "grok-": null,
          "llama-": null,
          "qwen": null,
          "deepseek-": null,
          "command-": null,
          "nova-": null,
          "mistral": null,
          "ministral": null,
          "kimi": null,
        }
        this.ensureAPIKey(apiKey)
        this.ensureModelName(modelName)
        
        this.apiKey = apiKey
        this.modelName = modelName
        this.loadedModel = this.resolveModel(this.modelName)
        this.model = new this.loadedModel({
          apiKey: this.apiKey,
          modelName: this.modelName
        })
    }

    ensureAPIKey(apiKey) {
      if (!apiKey) {
        throw new Error("API key is required");
      }
    }

    ensureModelName(modelName) {
      if (!modelName) {
        throw new Error("Model name is required");
      }
    }

    analyze() {
        return this.model.analyze
    }

    resolveModel(modelName) {
      let resolvedModel = this.modelRegistry[modelName]
     
      if (resolvedModel) {
        return resolvedModel
      }

      const modelPrefixKeys = Object.keys(this.modelPrefixRegistry)
     
      const resolvedPrefix = modelPrefixKeys.find((modelPrefix) => {
        return modelName.startsWith(modelPrefix);
      })
      
      if (resolvedPrefix && this.modelPrefixRegistry[resolvedPrefix]) {
        return this.modelPrefixRegistry[resolvedPrefix]
      }
      
      throw new Error(`Model "${modelName}" could not be resolved`);
    }
}

export default ModelAdapter
