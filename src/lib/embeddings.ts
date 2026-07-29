import 'server-only'

/**
 * Semantic profile embeddings via the Hugging Face Inference API.
 *
 * Model: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions, cosine space).
 * The dimension is baked into the `vector(384)` column, so swapping models
 * means writing a migration too.
 *
 * Everything here is server-only — HF_TOKEN must never reach the client.
 */

const MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
const ENDPOINT = `https://router.huggingface.co/hf-inference/models/${MODEL}/pipeline/feature-extraction`

export const EMBEDDING_DIMENSIONS = 384

/** Thrown when HF is unreachable or misconfigured. Callers decide whether to degrade. */
export class EmbeddingError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'EmbeddingError'
  }
}

interface ProfileTextInput {
  headline?: string | null
  department?: string | null
  bio?: string | null
  working_on?: string | null
  curious_about?: string | null
  fun_fact?: string | null
  location?: string | null
  interests?: string[]
}

/**
 * Flattens a profile into the single string we embed.
 *
 * Field labels are included on purpose: MiniLM is trained on natural sentences,
 * so "Curious about: distributed systems" embeds closer to related text than a
 * bare keyword dump would. Ordering is stable so that an unchanged profile
 * always produces a byte-identical source string — that's what lets us skip
 * redundant API calls.
 */
export function buildProfileText(input: ProfileTextInput): string {
  const parts: string[] = []

  if (input.headline) parts.push(`Role: ${input.headline}`)
  if (input.department) parts.push(`Team: ${input.department}`)
  if (input.location) parts.push(`Based in ${input.location}`)
  if (input.bio) parts.push(`About: ${input.bio}`)
  if (input.working_on) parts.push(`Currently working on: ${input.working_on}`)
  if (input.curious_about) parts.push(`Curious about: ${input.curious_about}`)
  if (input.fun_fact) parts.push(`Fun fact: ${input.fun_fact}`)
  if (input.interests?.length) {
    parts.push(`Interested in: ${[...input.interests].sort().join(', ')}`)
  }

  return parts.join('. ').replace(/\s+/g, ' ').trim()
}

/**
 * Embeds one or more strings. Returns one 384-float vector per input.
 *
 * HF cold-starts a model container on first hit and answers 503; we retry with
 * backoff rather than surfacing that to the user.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  const token = process.env.HF_TOKEN
  if (!token) {
    throw new EmbeddingError(
      'HF_TOKEN is not set. Add it to .env.local — matching falls back to interest overlap without it.'
    )
  }

  const cleaned = texts.map((t) => t.trim()).filter(Boolean)
  if (cleaned.length === 0) return []

  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: Response
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: cleaned,
          // Pool token vectors into one sentence vector and L2-normalize, so
          // cosine distance in Postgres is a plain dot product.
          options: { wait_for_model: true },
          normalize: true,
        }),
        signal: AbortSignal.timeout(30_000),
      })
    } catch (cause) {
      if (attempt === maxAttempts) {
        throw new EmbeddingError('Could not reach the Hugging Face Inference API.', cause)
      }
      await sleep(attempt * 1_000)
      continue
    }

    // 503 = model loading. Retry.
    if (response.status === 503 && attempt < maxAttempts) {
      await sleep(attempt * 2_000)
      continue
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new EmbeddingError(
        `Hugging Face returned ${response.status}: ${detail.slice(0, 200)}`
      )
    }

    const payload = (await response.json()) as unknown

    const vectors = normalizeShape(payload)
    if (vectors.length !== cleaned.length) {
      throw new EmbeddingError(
        `Expected ${cleaned.length} vectors, received ${vectors.length}.`
      )
    }
    for (const v of vectors) {
      if (v.length !== EMBEDDING_DIMENSIONS) {
        throw new EmbeddingError(
          `Expected ${EMBEDDING_DIMENSIONS}-dim vectors, received ${v.length}.`
        )
      }
    }

    return vectors
  }

  throw new EmbeddingError('Hugging Face model did not become ready in time.')
}

/** Convenience wrapper for the single-string case. */
export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embed([text])
  if (!vector) throw new EmbeddingError('No vector returned for input.')
  return vector
}

/**
 * The feature-extraction pipeline returns `number[][]` for a batch, but a bare
 * `number[]` when handed a single string, and occasionally `number[][][]` when
 * pooling is not applied server-side. Collapse all three into `number[][]`.
 */
function normalizeShape(payload: unknown): number[][] {
  if (!Array.isArray(payload)) {
    throw new EmbeddingError('Unexpected embedding payload: not an array.')
  }

  if (typeof payload[0] === 'number') {
    return [payload as number[]]
  }

  if (Array.isArray(payload[0]) && typeof payload[0][0] === 'number') {
    return payload as number[][]
  }

  // Token-level output: mean-pool each sequence ourselves.
  if (Array.isArray(payload[0]) && Array.isArray(payload[0][0])) {
    return (payload as number[][][]).map(meanPool)
  }

  throw new EmbeddingError('Unexpected embedding payload shape.')
}

function meanPool(tokens: number[][]): number[] {
  const dims = tokens[0].length
  const summed = new Array<number>(dims).fill(0)

  for (const token of tokens) {
    for (let i = 0; i < dims; i++) summed[i] += token[i]
  }

  const pooled = summed.map((s) => s / tokens.length)
  const magnitude = Math.sqrt(pooled.reduce((acc, v) => acc + v * v, 0))
  return magnitude > 0 ? pooled.map((v) => v / magnitude) : pooled
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** True when embeddings are configured. UI uses this to explain degraded matching. */
export function embeddingsEnabled(): boolean {
  return Boolean(process.env.HF_TOKEN)
}
