export async function parseCube(url: string): Promise<Float32Array> {
  const text = await fetch(url).then(r => r.text())
  const lines = text.split('\n')
  const values: number[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip comments and headers
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('LUT')) continue
    const [r, g, b] = trimmed.split(/\s+/).map(Number)
    if (!isNaN(r)) values.push(r, g, b, 1.0) // RGBA
  }

  return new Float32Array(values)
}