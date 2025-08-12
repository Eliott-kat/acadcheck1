export type SentenceScore = {
  sentence: string;
  ai: number; // 0-100
  plagiarism: number; // 0-100
  source?: string;
};

export type LocalReport = {
  aiScore: number;
  plagiarism: number;
  sentences: SentenceScore[];
};

const STOPWORDS = new Set([
  'the','of','and','to','in','a','is','that','for','on','with','as','by','it','be','are','this','an','or','from','at','which','but','not','we','our','their','also','can','have','has','was','were','than','these','those','such','may','more','most','any','all','some','into','between','over','under','about','after','before','during','through','per','i','you','he','she','they','them','his','her','its','there','here'
]);

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[\.!?])\s+(?=[A-ZÀ-ÖØ-Þ])/)
    .map(s => s.trim())
    .filter(Boolean);
}

function words(sentence: string): string[] {
  return sentence.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
}

function uniqueRatio(ws: string[]): number {
  if (ws.length === 0) return 0;
  const set = new Set(ws);
  return set.size / ws.length;
}

function stopwordRatio(ws: string[]): number {
  if (ws.length === 0) return 0;
  let c = 0;
  for (const w of ws) if (STOPWORDS.has(w)) c++;
  return c / ws.length;
}

function avgWordLen(ws: string[]): number {
  if (ws.length === 0) return 0;
  return ws.reduce((a, w) => a + w.length, 0) / ws.length;
}

function charEntropy(s: string): number {
  if (!s) return 0;
  const freq: Record<string, number> = {};
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  const n = s.length;
  let H = 0;
  for (const k in freq) {
    const p = freq[k] / n;
    H -= p * Math.log2(p);
  }
  return H; // bits per char
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = new Set([...a].filter(x => b.has(x))).size;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function ngrams(ws: string[], n: number): Set<string> {
  const res = new Set<string>();
  for (let i = 0; i <= ws.length - n; i++) res.add(ws.slice(i, i + n).join(' '));
  return res;
}

export function analyzeText(text: string): LocalReport {
  const sents = splitSentences(text);
  const sentWords = sents.map(words);
  const lengths = sentWords.map(w => w.length);
  const meanLen = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
  const stdLen = Math.sqrt(
    (lengths.reduce((a, b) => a + Math.pow(b - meanLen, 2), 0) / (lengths.length || 1)) || 0.0001
  );

  // Precompute n-grams for plagiarism proxy (near-duplicate within doc)
  const triSets = sentWords.map(w => ngrams(w, 5)); // 5-grams

  const sentences: SentenceScore[] = sents.map((s, i) => {
    const ws = sentWords[i];
    const ttr = uniqueRatio(ws); // lower can indicate AI
    const stopR = stopwordRatio(ws); // mid-high for human
    const awl = avgWordLen(ws); // higher can indicate formal/AI
    const ent = charEntropy(s); // very mid-range can be AI-ish

    // Burstiness proxy: similarity of length to mean (less bursty => more AI-like)
    const burstSim = 1 - Math.min(1, Math.abs((ws.length - meanLen) / (stdLen || 1)));

    // Heuristic AI score [0,100]
    // We design feature scores in [0,1], then weight.
    const ttrScore = 1 - ttr; // low ttr => more AI
    const stopScore = Math.abs(stopR - 0.45); // far from 0.45 => more AI; invert below
    const stopAdj = 1 - Math.min(1, stopScore / 0.45);
    const awlScore = Math.min(1, Math.max(0, (awl - 4) / 4));
    const entScore = 1 - Math.min(1, Math.abs(ent - 3.5) / 3.5); // center around ~3.5

    const ai01 =
      0.32 * burstSim +
      0.25 * ttrScore +
      0.18 * stopAdj +
      0.15 * awlScore +
      0.10 * entScore;

    // Plagiarism proxy: overlap with any other sentence's 5-grams
    let plg = 0;
    for (let j = 0; j < sents.length; j++) {
      if (j === i) continue;
      const sim = jaccard(triSets[i], triSets[j]);
      plg = Math.max(plg, sim);
      if (plg > 0.9) break;
    }

    const ai = Math.round(ai01 * 100);
    const plagiarism = Math.round(plg * 100);

    return { sentence: s, ai, plagiarism };
  });

  const aiScore = Math.round(sentences.reduce((a, s) => a + s.ai, 0) / (sentences.length || 1));
  // Overall plagiarism: 95th percentile of sentence-level
  const plgSorted = [...sentences].map(s => s.plagiarism).sort((a, b) => a - b);
  const idx95 = Math.floor(0.95 * (plgSorted.length - 1));
  const plagiarism = plgSorted.length ? plgSorted[idx95] : 0;

  return { aiScore, plagiarism, sentences };
}
