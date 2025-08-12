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
  // Avoid regex lookbehind for Safari compatibility: insert a splitter token after end punctuation
  const withDelims = text.replace(/([.!?])\s+(?=[A-ZÀ-ÖØ-Þ]|\d|“|\(|\[)/g, '$1|');
  return withDelims
    .split('|')
    .map(s => s.trim())
    .filter(Boolean);
}

function words(sentence: string): string[] {
  try {
    const re = new RegExp("[\\p{L}\\p{N}']+", "gu");
    return sentence.toLowerCase().match(re) ?? [];
  } catch {
    // Fallback for engines without Unicode property escapes
    return sentence.toLowerCase().match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9']+/g) ?? [];
  }
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

export function analyzeText(
  text: string,
  opts?: { corpus?: { name: string; text: string }[]; ngram?: number }
): LocalReport {
  const n = Math.max(3, Math.min(7, opts?.ngram ?? 5));
  const sents = splitSentences(text);
  const sentWords = sents.map(words);
  const lengths = sentWords.map(w => w.length);
  const meanLen = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
  const stdLen = Math.sqrt(
    (lengths.reduce((a, b) => a + Math.pow(b - meanLen, 2), 0) / (lengths.length || 1)) || 0.0001
  );

  // Global repetition metrics (document-level burstiness/perplexity proxies)
  const allWords = sentWords.flat();
  const unigramFreq: Record<string, number> = {};
  const bigrams: string[] = [];
  for (let i = 0; i < allWords.length; i++) {
    unigramFreq[allWords[i]] = (unigramFreq[allWords[i]] || 0) + 1;
    if (i < allWords.length - 1) bigrams.push(allWords[i] + ' ' + allWords[i + 1]);
  }
  const bigramFreq: Record<string, number> = {};
  for (const bg of bigrams) bigramFreq[bg] = (bigramFreq[bg] || 0) + 1;
  const repeatedBigrams = Object.values(bigramFreq).filter(v => v > 1).length;
  const repBigramRatio = repeatedBigrams / Math.max(1, Object.keys(bigramFreq).length);

  // Precompute n-grams for plagiarism proxy (near-duplicate within doc)
  const gramSets = sentWords.map(w => ngrams(w, n));

  // External corpus n-gram sets (computed once per document)
  const corpus = opts?.corpus || [];
  const corpusSets = corpus.map(d => ({ name: d.name, set: ngrams(words(d.text), n) }));

  const sentences: SentenceScore[] = sents.map((s, i) => {
    const ws = sentWords[i];
    const ttr = uniqueRatio(ws);
    const stopR = stopwordRatio(ws);
    const awl = avgWordLen(ws);
    const ent = charEntropy(s);

    const puncts = (s.match(/[,:;\-—()\[\]“”"'…]/g) || []).length;
    const digits = (s.match(/\d/g) || []).length;

    // Sentence-level burstiness vs mean
    const burstSim = 1 - Math.min(1, Math.abs((ws.length - meanLen) / (stdLen || 1)));

    // Token frequency concentration (lower => more human)
    const tfc = ws.reduce((a, w) => a + (unigramFreq[w] || 0), 0) / Math.max(1, ws.length);
    const tfcNorm = Math.min(1, (tfc - 1) / 5); // normalize

    // Repetition around sentence: share of bigrams that are repeated globally
    let sentRepBigrams = 0, sentBigramsCount = 0;
    for (let j = 0; j < ws.length - 1; j++) {
      sentBigramsCount++;
      if ((bigramFreq[ws[j] + ' ' + ws[j + 1]] || 0) > 1) sentRepBigrams++;
    }
    const sentRepRatio = sentBigramsCount ? sentRepBigrams / sentBigramsCount : 0;

    // Feature engineering to [0,1]
    const ttrScore = 1 - ttr; // low ttr => more AI
    const stopMid = 1 - Math.min(1, Math.abs(stopR - 0.45) / 0.45);
    const awlScore = Math.min(1, Math.max(0, (awl - 4) / 4));
    const entScore = 1 - Math.min(1, Math.abs(ent - 3.5) / 3.5);
    const punctScore = Math.min(1, puncts / 8); // few punctuation => AI-ish
    const digitScore = Math.min(1, digits / 6); // many digits often human/technical => reduce AI score later
    const repDocScore = repBigramRatio; // document repetition
    const repSentScore = sentRepRatio;  // sentence repetition
    const tfcScore = tfcNorm;           // token concentration

    // Combine (weights tuned heuristically)
    let ai01 =
      0.22 * burstSim +
      0.18 * ttrScore +
      0.12 * stopMid +
      0.12 * awlScore +
      0.10 * entScore +
      0.10 * repDocScore +
      0.10 * repSentScore +
      0.06 * punctScore;

    // Reduce AI score if many digits (data-heavy sentence)
    ai01 = Math.max(0, ai01 - 0.08 * digitScore);

    // Plagiarism proxy: overlap with any other sentence's n-grams (internal)
    let plgInternal = 0;
    for (let j = 0; j < sents.length; j++) {
      if (j === i) continue;
      const sim = jaccard(gramSets[i], gramSets[j]);
      plgInternal = Math.max(plgInternal, sim);
      if (plgInternal > 0.98) break;
    }

    // External plagiarism vs corpus (max Jaccard over docs)
    let bestExt = 0;
    let bestSource: string | undefined = undefined;
    if (corpusSets.length) {
      for (const cs of corpusSets) {
        const sim = jaccard(gramSets[i], cs.set);
        if (sim > bestExt) {
          bestExt = sim;
          bestSource = cs.name;
        }
        if (bestExt > 0.98) break;
      }
    }

    const plg = Math.max(plgInternal, bestExt);

    const ai = Math.round(ai01 * 100);
    const plagiarism = Math.round(plg * 100);

    // Only attach a source label if external similarity is meaningful
    const source = bestExt >= 0.3 ? bestSource : undefined;

    return { sentence: s, ai, plagiarism, source };
  });

  const aiScore = Math.round(sentences.reduce((a, s) => a + s.ai, 0) / (sentences.length || 1));
  const plgSorted = [...sentences].map(s => s.plagiarism).sort((a, b) => a - b);
  const idx95 = Math.floor(0.95 * (plgSorted.length - 1));
  const plagiarism = plgSorted.length ? plgSorted[idx95] : 0;

  return { aiScore, plagiarism, sentences };
}
