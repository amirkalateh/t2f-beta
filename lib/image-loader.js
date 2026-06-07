export default function imageLoader({ src, width, quality }) {
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  return `${src}?w=${width}&q=${quality || 75}`;
}
