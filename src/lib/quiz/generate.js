// Quiz generation with LangChain.
//
// The pipeline:
//   Documents (from loaders.js)
//     -> RecursiveCharacterTextSplitter   (only when the reviewer is long)
//     -> ChatPromptTemplate                (fills in the material and question count)
//     -> chat model .withStructuredOutput  (returns JSON matching QuizSchema)
//
// The chain is the same for every provider; only createModel() changes.
// That swap is the main thing LangChain buys you here.
import { z } from 'zod'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { HumanMessage } from '@langchain/core/messages'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { activeModel } from '../ai'

const QuizSchema = z.object({
  title: z.string().describe('Short title for the quiz, naming the topic of the material'),
  questions: z.array(z.object({
    question: z.string().describe('The question stem. Answerable from the material alone.'),
    choices: z.array(z.string()).describe('Exactly four answer options, without A/B/C/D prefixes'),
    answerIndex: z.number().int().describe('Index from 0 to 3 of the correct option in choices'),
    explanation: z.string().describe('One or two sentences on why that answer is correct, grounded in the material'),
  })),
})

const SYSTEM =
  'You write practice questions for someone reviewing for a professional board exam. ' +
  'Base every question only on facts stated in the study material the user provides. ' +
  'Test understanding and application, not trivia such as page numbers or slide titles. ' +
  'Each question has exactly four options and one correct answer. Make the wrong options plausible: ' +
  'common misconceptions, near-miss values, or related terms from the same material. ' +
  'Avoid "all of the above" and "none of the above". Cover different parts of the material.'

// Text reviewers: the extracted text is filled into the template
const prompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM],
  ['human', 'Write exactly {count} multiple-choice questions from this study material.\n\n<material>\n{material}\n</material>'],
])

// PDFs with no selectable text: the PDF itself is sent as a file content block,
// which LangChain converts into each provider's native PDF input
const pdfPrompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM],
  new MessagesPlaceholder('reviewer'),
])

// Under this size the whole reviewer goes in one request
const SINGLE_REQUEST_CHARS = 60_000
const MAX_SECTIONS = 6

// LangChain retries failed calls with growing delays (6 times by default). Keep it short so
// a bad key or network problem shows up in seconds instead of minutes.
const MAX_RETRIES = 2

// If the main model fails (busy, overloaded, or down), the chain re-runs on this one
const BACKUP_MODELS = { gemini: 'gemini-flash-lite-latest' }

// Claude models that accept Anthropic's server-side refusal fallback
const FALLBACK_MODELS = ['claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5', 'claude-fable-5-1', 'claude-fable-5-2']

async function createModel(ai, model = activeModel(ai)) {
  const apiKey = ai.keys[ai.provider]?.trim()
  if (!apiKey) throw new Error('Add an API key in Settings first.')

  if (ai.provider === 'anthropic') {
    const { ChatAnthropic } = await import('@langchain/anthropic')
    const fallback = FALLBACK_MODELS.includes(model)
    return new ChatAnthropic({
      model,
      apiKey,
      maxTokens: 16000,
      maxRetries: MAX_RETRIES,
      // If the model declines, Anthropic re-runs the request on a fallback model in the same call
      ...(fallback && { betas: ['server-side-fallback-2026-07-01'], invocationKwargs: { fallbacks: 'default' } }),
    })
  }

  if (ai.provider === 'openai') {
    const { ChatOpenAI } = await import('@langchain/openai')
    // No temperature: OpenAI's reasoning models only accept the default
    return new ChatOpenAI({ model, apiKey, maxRetries: MAX_RETRIES })
  }

  const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai')
  return new ChatGoogleGenerativeAI({ model, apiKey, temperature: 0.4, maxOutputTokens: 16000, maxRetries: MAX_RETRIES })
}

// The model that returns quiz JSON, with a backup model chained on via .withFallbacks()
async function createQuizModel(ai) {
  // method "jsonSchema" uses each provider's native JSON output mode rather than a forced tool call
  const toQuiz = m => m.withStructuredOutput(QuizSchema, { name: 'quiz', method: 'jsonSchema' })
  const main = toQuiz(await createModel(ai))
  const backup = BACKUP_MODELS[ai.provider]
  if (!backup || backup === activeModel(ai)) return main
  return main.withFallbacks([toQuiz(await createModel(ai, backup))])
}

// Split long material into consecutive sections so every part of the file is covered,
// and spread the requested question count across them.
async function planRequests(docs, count) {
  const fullText = docs.map(d => d.pageContent).join('\n\n')
  if (fullText.length <= SINGLE_REQUEST_CHARS) return [{ material: fullText, count }]

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 4000, chunkOverlap: 200 })
  const chunks = await splitter.splitDocuments(docs)
  const sections = Math.min(MAX_SECTIONS, Math.ceil(count / 3), chunks.length)
  const perSection = Math.ceil(chunks.length / sections)

  return Array.from({ length: sections }, (_, i) => ({
    material: chunks.slice(i * perSection, (i + 1) * perSection).map(c => c.pageContent).join('\n\n'),
    count: Math.floor(count / sections) + (i < count % sections ? 1 : 0),
  })).filter(r => r.material && r.count > 0)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Models tend to put the right answer in the same slot; shuffle and re-point answerIndex
function clean(questions, count) {
  const seen = new Set()
  return questions
    .filter(q => q.question?.trim() && q.choices?.length === 4 && q.answerIndex >= 0 && q.answerIndex < 4)
    .filter(q => { const k = q.question.trim().toLowerCase(); return !seen.has(k) && seen.add(k) })
    .slice(0, count)
    .map((q, i) => {
      const order = shuffle([0, 1, 2, 3])
      return {
        id: `q${i + 1}`,
        question: q.question.trim(),
        choices: order.map(o => q.choices[o].trim()),
        answerIndex: order.indexOf(q.answerIndex),
        explanation: q.explanation?.trim() ?? '',
      }
    })
}

export async function generateQuiz({ source, count, ai, onStatus }) {
  const structured = await createQuizModel(ai)

  if (source.pdfBase64) {
    onStatus?.('Reading the PDF pages')
    const result = await pdfPrompt.pipe(structured).invoke({
      reviewer: [new HumanMessage({
        content: [
          // OpenAI requires a filename on file inputs; Gemini and Claude ignore it
          { type: 'file', mimeType: 'application/pdf', data: source.pdfBase64, metadata: { filename: source.name } },
          { type: 'text', text: `Write exactly ${count} multiple-choice questions from this study material.` },
        ],
      })],
    })
    const questions = clean(result.questions ?? [], count)
    if (!questions.length) throw new Error('The model could not read questions out of this PDF. Try again, or export it with selectable text.')
    return { title: result.title?.trim() || null, questions }
  }

  const chain = prompt.pipe(structured)
  const requests = await planRequests(source.docs, count)
  onStatus?.(requests.length > 1
    ? `Long reviewer: writing questions from ${requests.length} sections`
    : 'Writing questions')

  const results = await chain.batch(requests, { maxConcurrency: 3 })
  const questions = clean(results.flatMap(r => r.questions ?? []), count)
  if (!questions.length) throw new Error('The model did not return any usable questions. Try again.')

  return { title: results[0]?.title?.trim() || null, questions }
}

// Sends one tiny request through the same model setup the quiz generator uses,
// so a passing test means generation will reach the model too
export async function testConnection(ai) {
  const model = await createModel(ai)
  const started = performance.now()
  const reply = await model.invoke('Reply with exactly one word: OK')
  return {
    model: activeModel(ai),
    seconds: (performance.now() - started) / 1000,
    reply: reply.text.trim().slice(0, 80),
  }
}

// LangChain wraps each provider's errors differently, so check status codes and messages
export function friendlyError(err, provider) {
  const status = err?.status ?? err?.response?.status ?? err?.cause?.status
  const msg = String(err?.message ?? err)
  if (status === 401 || status === 403 || /api[ _-]?key|unauthori[sz]ed|permission/i.test(msg)) {
    return 'The API key was rejected. Check that it was copied in full and belongs to the selected provider.'
  }
  if ([500, 502, 503, 504, 529].includes(status) || /\[5\d\d|overloaded|high demand|unavailable|try again later/i.test(msg)) {
    return 'The model is busy right now. This is temporary and on the provider’s side; wait a minute and try again, or pick a different model in Settings.'
  }
  if (status === 429 || /quota|rate limit|resource.?exhausted/i.test(msg)) {
    return 'You have hit the provider’s rate limit or quota. Wait a minute and try again.'
  }
  if (status === 404 || /not found|is not supported/i.test(msg)) {
    return `That model name was not found. Check the model in Settings. (${msg.slice(0, 160)})`
  }
  if (/connection error|failed to fetch|network/i.test(msg)) {
    // OpenAI's error responses lack the CORS header browsers need to read them,
    // so a rejected key surfaces here as a generic connection error
    return provider === 'openai'
      ? 'No readable response from OpenAI. This usually means the API key was rejected; check the key first, then your connection.'
      : 'Could not reach the AI service. Check your connection.'
  }
  return msg.slice(0, 240)
}
