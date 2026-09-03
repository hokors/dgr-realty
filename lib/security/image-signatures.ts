const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((value, index) => bytes[offset + index] === value);

export function hasValidImageSignature(bytes: Uint8Array, contentType: string) {
  if (contentType === 'image/jpeg') return bytes.length >= 3 && startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (contentType === 'image/png') return bytes.length >= 8 && startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (contentType === 'image/webp') {
    return bytes.length >= 12
      && startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
      && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  }
  if (contentType === 'image/avif') {
    if (bytes.length < 16 || !startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return false;
    const header = new TextDecoder('ascii').decode(bytes.slice(8, Math.min(bytes.length, 32)));
    return header.includes('avif') || header.includes('avis');
  }
  return false;
}
