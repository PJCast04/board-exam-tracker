import { useState, useCallback } from 'react'

// AI provider settings live in their own key, separate from the app data,
// so API keys are never included in an exported backup file.
const STORE = 'bept_ai'

export const PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-flash-latest',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'Free tier available from Google AI Studio.',
  },
  anthropic: {
    label: 'Anthropic Claude',
    defaultModel: 'claude-opus-5-5',
    keyUrl: 'https://platform.claude.com/settings/keys',
    keyHint: 'Paid per use from the Claude Console.',
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-5',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'Paid per use from the OpenAI platform.',
  },
}

const DEFAULTS = { provider: 'gemini', keys: {}, models: {} }

export function loadAiSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE)) } } catch { return DEFAULTS }
}

export function activeModel(ai) {
  return ai.models[ai.provider]?.trim() || PROVIDERS[ai.provider].defaultModel
}

export function useAiSettings() {
  const [ai, setAi] = useState(loadAiSettings)
  const update = useCallback(patch => {
    setAi(prev => {
      const next = { ...prev, ...patch, keys: { ...prev.keys, ...patch.keys }, models: { ...prev.models, ...patch.models } }
      localStorage.setItem(STORE, JSON.stringify(next))
      return next
    })
  }, [])
  return [ai, update]
}
