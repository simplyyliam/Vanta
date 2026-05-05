export type CubeLut = {
  size: number;
  data: Uint8Array;
};

export async function parseCube(url: string): Promise<CubeLut> {
  const text = await fetch(url).then((r) => r.text());
  const lines = text.split("\n");
  const values: number[] = [];
  let size = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("LUT_3D_SIZE")) {
      const [, sizeValue] = trimmed.split(/\s+/);
      size = Number(sizeValue);
      continue;
    }

    if (/^[A-Z_]+/.test(trimmed)) continue;

    const [r, g, b] = trimmed.split(/\s+/).map(Number);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      values.push(r, g, b);
    }
  }

  if (!size) {
    throw new Error("Invalid .cube: missing LUT_3D_SIZE");
  }

  const expectedTriplets = size * size * size;
  if (values.length !== expectedTriplets * 3) {
    throw new Error(
      `Invalid .cube: expected ${expectedTriplets} RGB entries, got ${values.length / 3}`,
    );
  }

  const data = new Uint8Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const clamped = Math.min(1, Math.max(0, values[i]));
    data[i] = Math.round(clamped * 255);
  }

  return { size, data };
}
