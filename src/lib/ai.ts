const OLLAMA_BASE = 'http://localhost:11434/v1'
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1'

// Usar Ollama local se disponível, senão DeepSeek
async function getClient(): Promise<{ base: string; key?: string; model: string }> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/models`)
    if (res.ok) {
      return {
        base: OLLAMA_BASE,
        model: 'qwen2.5-coder:7b',
      }
    }
  } catch {}

  return {
    base: DEEPSEEK_BASE,
    key: process.env.DEEPSEEK_API_KEY!,
    model: 'deepseek-chat',
  }
}

export async function chatCompletion(
  messages: { role: string; content: string }[],
  systemPrompt?: string,
  options?: { temperature?: number; maxTokens?: number; json?: boolean }
): Promise<string> {
  const client = await getClient()

  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (client.key) headers['Authorization'] = `Bearer ${client.key}`

  const res = await fetch(`${client.base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: client.model,
      messages: allMessages,
      temperature: options?.temperature ?? 0.9,
      max_tokens: options?.maxTokens ?? 2000,
      response_format: options?.json ? { type: 'json_object' } : undefined,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}
