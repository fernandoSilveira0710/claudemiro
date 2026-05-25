const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1'

export async function chatCompletion(
  messages: { role: string; content: string }[],
  systemPrompt?: string,
  options?: { temperature?: number; maxTokens?: number; json?: boolean }
) {
  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: allMessages,
      temperature: options?.temperature ?? 0.9,
      max_tokens: options?.maxTokens ?? 2000,
      response_format: options?.json ? { type: 'json_object' } : undefined,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}
