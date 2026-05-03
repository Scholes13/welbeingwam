type FetchJsonOptions = RequestInit & {
  fetchImpl?: typeof fetch
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = await parseJsonBody(response)

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed: ${response.status} ${response.statusText}`

    throw new Error(message)
  }

  if (typeof body === 'string') {
    throw new Error('Expected JSON response but received text')
  }

  return body as T
}

export async function fetchJson<T>(input: string | URL | Request, options: FetchJsonOptions = {}): Promise<T> {
  const { fetchImpl = fetch, ...init } = options
  const response = await fetchImpl(input, init)
  return readJsonResponse<T>(response)
}
