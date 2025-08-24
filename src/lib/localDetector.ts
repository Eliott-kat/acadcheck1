import { aiDetectionModel } from './aiTraining';

export type SentenceScore = {
  sentence: string;
  ai: number;
  plagiarism: number;
  confidence: number;
  source?: string;
  features?: {
    lexicalDiversity: number;
    syntacticComplexity: number;
    semanticCoherence: number;
    stylometricScore: number;
    perplexity?: number;
    burstiness?: number;
  };
};

export type LocalReport = {
  aiScore: number;
  plagiarism: number;
  confidence: number;
  sentences: SentenceScore[];
  analysis: {
    overallStyle: string;
    suspiciousPatterns: string[];
    recommendations: string[];
    modelUsed: string;
    processingTime: number;
  };
};

const STOPWORDS = new Set([
  'the','of','and','to','in','a','is','that','for','on','with','as','by','it','be','are','this','an','or',
  'from','at','which','but','not','we','our','their','also','can','have','has','was','were','than','these',
  'those','such','may','more','most','any','all','some','into','between','over','under','about','after',
  'before','during','through','per','i','you','he','she','they','them','his','her','its','there','here'
]);

const AI_PATTERNS = [
  /\b(it is important to note|it should be noted|it is worth noting)\b/gi,
  /\b(in conclusion|to sum up|as a result)\b/gi,
  /\b(this study aims to|the objective of this|the purpose of this)\b/gi,
  /\b(further research is needed|additional studies should)\b/gi,
  /\b(it can be observed that|as shown in|based on the results)\b/gi
];

const PLAGIARISM_PATTERNS = [
  /\b(according to research|studies show|research indicates)\s+(?!.*\(.*\d{4}.*\))/gi,
  /\b[A-Z][a-z]+\s+et\s+al\.\s+\(\d{4}\)/g,
  /^[A-Z][a-z]+\s+is\s+(defined as|a type of|characterized by)/gm,
  /\b(in this chapter|this section|as shown in figure|as described in)/gi,
  /\b(the main objective|the purpose of this project|the goal of this study)\b/gi,
  /\b(this paper presents|we propose a|our methodology)\b/gi
];

const ACADEMIC_PATTERNS = [
  /\b(this study|research shows|the results indicate)\b/gi,
  /\b(in this chapter|as discussed in|the literature suggests)\b/gi,
  /\b(figure \d+|table \d+|equation \d+)/gi,
  /\b(however|moreover|furthermore|therefore|consequently)\b/gi,
  /\b(in this article|this paper|we will discuss)\b/gi,
  /\b(as mentioned previously|based on the data|the analysis shows)\b/gi,
  /\b(according to|similarly|in contrast)\b/gi
];

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ]|\d|"|\(|\[)/)
    .map(s => s.trim())
    .filter(Boolean);
}

function words(sentence: string): string[] {
  return sentence.toLowerCase().match(/[a-zà-ÿ0-9']+/g) || [];
}

function uniqueRatio(ws: string[]): number {
  return ws.length ? new Set(ws).size / ws.length : 0;
}

function stopwordRatio(ws: string[]): number {
  return ws.length ? ws.filter(w => STOPWORDS.has(w)).length / ws.length : 0;
}

function avgWordLen(ws: string[]): number {
  return ws.length ? ws.reduce((a, w) => a + w.length, 0) / ws.length : 0;
}

function syntaxComplexity(sentence: string): number {
  const clauseMarkers = (sentence.match(/[,:;]/g) || []).length;
  const subordination = (sentence.match(/\b(that|which|who|where|when|while|although|because|since)\b/gi) || []).length;
  const wordCount = sentence.split(/\s+/).length;
  return wordCount ? Math.min(1, (clauseMarkers + subordination * 2) / wordCount * 5) : 0;
}

function detectStylometricPatterns(sentences: string[]): number {
  if (sentences.length < 3) return 0.5;
  
  const structures = sentences.map(s => ({
    wordCount: s.split(/\s+/).length,
    avgWordLength: words(s).reduce((a, w) => a + w.length, 0) / Math.max(1, words(s).length)
  }));
  
  const wordCountVariance = variance(structures.map(s => s.wordCount));
  const avgLengthVariance = variance(structures.map(s => s.avgWordLength));
  
  return Math.max(0, 1 - (wordCountVariance / 100 + avgLengthVariance / 10));
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
}

function semanticCoherence(current: string, prev?: string, next?: string): number {
  const currentWords = new Set(words(current));
  let score = 0, count = 0;

  if (prev) {
    const prevWords = new Set(words(prev));
    score += intersectionRatio(currentWords, prevWords);
    count++;
  }
  
  if (next) {
    const nextWords = new Set(words(next));
    score += intersectionRatio(currentWords, nextWords);
    count++;
  }

  return count > 0 ? score / count : 0.5;
}

function intersectionRatio(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x))).size;
  return intersection / Math.max(a.size, b.size, 1);
}

function detectAIPatterns(sentence: string): number {
  return AI_PATTERNS.reduce((score, pattern) => 
    score + ((sentence.match(pattern) || []).length * 0.05), 0);
}

function detectPlagiarismPatterns(sentence: string): number {
  return PLAGIARISM_PATTERNS.reduce((score, pattern) =>
    score + ((sentence.match(pattern) || []).length * 0.4), 0);
}

function hasAcademicFeatures(sentence: string): number {
  return Math.min(1, ACADEMIC_PATTERNS.reduce((score, pattern) =>
    score + ((sentence.match(pattern) || []).length * 0.3), 0));
}

function charEntropy(s: string): number {
  const freq: Record<string, number> = {};
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  const n = s.length;
  return Object.values(freq).reduce((H, p) => H - (p/n) * Math.log2(p/n), 0);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x))).size;
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function ngrams(ws: string[], n: number): Set<string> {
  const res = new Set<string>();
  for (let i = 0; i <= ws.length - n; i++) {
    res.add(ws.slice(i, i + n).join(' '));
  }
  return res;
}

export async function analyzeText(
  text: string,
  opts?: { corpus?: { name: string; text: string }[]; ngram?: number; useML?: boolean }
): Promise<LocalReport> {
  const startTime = Date.now();
  const useML = opts?.useML !== false;
  
  if (useML) {
    try {
      const mlPrediction = await aiDetectionModel.predict(text);
      const traditionalAnalysis = analyzeTextTraditional(text, opts);
      return combineMLAndTraditional(mlPrediction, traditionalAnalysis, startTime);
    } catch (error) {
      console.warn('ML model unavailable, using traditional method:', error);
    }
  }
  
  return analyzeTextTraditional(text, opts);
}

function combineMLAndTraditional(mlPrediction: any, traditional: LocalReport, startTime: number): LocalReport {
  const aiScore = Math.round(mlPrediction.aiScore * 0.4 + traditional.aiScore * 0.6);
  const plagiarism = Math.round(mlPrediction.plagiarismScore * 0.5 + traditional.plagiarism * 0.5);
  const confidence = Math.round((mlPrediction.confidence + traditional.confidence) / 2);

  return {
    aiScore,
    plagiarism,
    confidence,
    sentences: traditional.sentences,
    analysis: {
      ...traditional.analysis,
      modelUsed: 'Hybrid ML/Traditional',
      processingTime: Date.now() - startTime
    }
  };
}

function analyzeTextTraditional(
  text: string,
  opts?: { corpus?: { name: string; text: string }[]; ngram?: number }
): LocalReport {
  const n = opts?.ngram || 4;
  const sents = splitSentences(text);
  const sentWords = sents.map(words);
  const allWords = sentWords.flat();

  // Frequency analysis
  const unigramFreq: Record<string, number> = {};
  const bigramFreq: Record<string, number> = {};
  
  allWords.forEach((w, i) => {
    unigramFreq[w] = (unigramFreq[w] || 0) + 1;
    if (i < allWords.length - 1) {
      const bigram = `${w} ${allWords[i+1]}`;
      bigramFreq[bigram] = (bigramFreq[bigram] || 0) + 1;
    }
  });

  // N-gram sets
  const gramSets = sentWords.map(ws => ngrams(ws, n));
  const corpus = opts?.corpus || [];
  const corpusSets = corpus.map(d => ({
    name: d.name,
    set: ngrams(words(d.text), n)
  }));

  const stylometricScore = detectStylometricPatterns(sents);
  const sentences: SentenceScore[] = sents.map((sentence, i) => {
    const ws = sentWords[i];
    const ttr = uniqueRatio(ws);
    const stopR = stopwordRatio(ws);
    const awl = avgWordLen(ws);
    const ent = charEntropy(sentence);
    const syntaxComp = syntaxComplexity(sentence);
    const semCoherence = semanticCoherence(sentence, sents[i-1], sents[i+1]);
    const aiPatterns = detectAIPatterns(sentence);
    const plagPatterns = detectPlagiarismPatterns(sentence);
    const academicBonus = hasAcademicFeatures(sentence) * 0.3;

    // AI Score calculation
    let aiScore = Math.min(1, Math.max(0,
      0.04 * (1 - ttr) +
      0.04 * Math.abs(stopR - 0.4) +
      0.04 * (awl > 6 ? 1 : awl/6) +
      0.03 * (1 - Math.min(1, Math.abs(ent - 4)/4)) +
      0.03 * syntaxComp +
      0.04 * (1 - semCoherence) +
      0.03 * aiPatterns -
      0.01 * academicBonus
    ));

    // Plagiarism detection
    let internalSimilarity = 0;
    for (let j = 0; j < sents.length; j++) {
      if (j !== i) {
        internalSimilarity = Math.max(internalSimilarity, jaccard(gramSets[i], gramSets[j]));
      }
    }

    let externalSimilarity = 0;
    let source: string | undefined;
    for (const cs of corpusSets) {
      const similarity = jaccard(gramSets[i], cs.set);
      if (similarity > externalSimilarity) {
        externalSimilarity = similarity;
        source = cs.name;
      }
    }

    const plagiarismScore = Math.min(1, Math.max(
      internalSimilarity * 0.7,
      externalSimilarity * 0.8,
      plagPatterns
    ));

    return {
      sentence,
      ai: Math.round(aiScore * 100),
      plagiarism: Math.round(plagiarismScore * 100),
      confidence: 75,
      source: externalSimilarity > 0.2 ? source : undefined,
      features: {
        lexicalDiversity: Math.round(ttr * 100),
        syntacticComplexity: Math.round(syntaxComp * 100),
        semanticCoherence: Math.round(semCoherence * 100),
        stylometricScore: Math.round(stylometricScore * 100)
      }
    };
  });

  // Aggregate scores
  const aiScore = Math.round(sentences.reduce((sum, s) => sum + s.ai, 0) / sentences.length);
  const plagiarismScores = sentences.map(s => s.plagiarism).sort((a, b) => a - b);
  const plagiarism = plagiarismScores[Math.floor(plagiarismScores.length * 0.9)] || 0;
  const confidence = Math.round(sentences.reduce((sum, s) => sum + s.confidence, 0) / sentences.length);

  return {
    aiScore,
    plagiarism,
    confidence,
    sentences,
    analysis: {
      overallStyle: aiScore > 40 ? "Potential AI-generated content" : "Human-like content",
      suspiciousPatterns: [
        ...(aiScore > 50 ? ["High AI detection patterns"] : []),
        ...(plagiarism > 30 ? ["Possible plagiarism detected"] : [])
      ],
      recommendations: [
        ...(aiScore > 30 ? ["Verify content originality"] : []),
        ...(plagiarism > 20 ? ["Check proper citation"] : [])
      ],
      modelUsed: 'Traditional Algorithm',
      processingTime: 0
    }
  };
}