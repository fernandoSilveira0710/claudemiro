// Sistema de modelos por plano
// Cada plano tem um modelo padrão. PRO pode escolher entre opções.

export interface ModelConfig {
  name: string
  provider: 'ollama' | 'deepseek' | 'openai' | 'custom'
  model: string
  baseUrl: string
  apiKey?: string
}

const MODELS: Record<string, ModelConfig> = {
  // Local
  qwen: {
    name: 'Qwen 2.5 Coder 7B',
    provider: 'ollama',
    model: 'qwen2.5-coder:7b',
    baseUrl: 'http://localhost:11434/v1',
  },
  gemma: {
    name: 'Gemma 3 4B',
    provider: 'ollama',
    model: 'gemma3:4b',
    baseUrl: 'http://localhost:11434/v1',
  },

  // Cloud (API keys do .env)
  deepseek: {
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY,
  },
}

export { MODELS }

// Plano → modelo padrão
const PLAN_MODEL: Record<string, string> = {
  FREE: 'gemma',
  FLEX: 'qwen',
  PRO: 'deepseek',
}

// Modelos disponíveis por plano
const PLAN_OPTIONS: Record<string, string[]> = {
  FREE: ['gemma'],
  FLEX: ['gemma', 'qwen'],
  PRO: ['gemma', 'qwen', 'deepseek'],
}

export function getModelForPlan(plan: string, preferredModel?: string): ModelConfig {
  const availableModels = PLAN_OPTIONS[plan] || PLAN_OPTIONS['FREE']

  // Se o usuário tem preferência salva e está disponível no plano dele
  if (preferredModel && availableModels.includes(preferredModel)) {
    return MODELS[preferredModel]
  }

  // Modelo padrão do plano
  const defaultModel = PLAN_MODEL[plan] || 'gemma'
  return MODELS[defaultModel]
}

export function getAvailableModels(plan: string): ModelConfig[] {
  const availableModels = PLAN_OPTIONS[plan] || PLAN_OPTIONS['FREE']
  return availableModels.map(id => MODELS[id]).filter(Boolean)
}

export async function chatCompletion(
  messages: { role: string; content: string }[],
  systemPrompt?: string,
  options?: { temperature?: number; maxTokens?: number; json?: boolean },
  modelOverride?: ModelConfig
): Promise<string> {
  // Usar modelo passado ou detectar automaticamente
  let model: ModelConfig

  if (modelOverride) {
    model = modelOverride
  } else {
    // Usar variável de ambiente para forçar modelo em produção
    const forcedModel = process.env.AI_MODEL
    if (forcedModel && MODELS[forcedModel]) {
      model = MODELS[forcedModel]
    } else {
      // Fallback: tenta Ollama local (dev), senão DeepSeek (prod)
      try {
        const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(500) })
        model = res.ok ? MODELS.qwen : MODELS.deepseek
      } catch {
        model = MODELS.deepseek
      }
    }
  }

  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (model.apiKey) headers['Authorization'] = `Bearer ${model.apiKey}`

  const res = await fetch(`${model.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model.model,
      messages: allMessages,
      temperature: options?.temperature ?? 0.9,
      max_tokens: options?.maxTokens ?? 2000,
      response_format: options?.json ? { type: 'json_object' } : undefined,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI error (${model.provider}/${model.model}): ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}
