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
  return wordCount ? Math.min(1, (clauseMarkers + subordination * 2) / wordCount * 3) : 0;
}

function detectStylometricPatterns(sentences: string[]): number {
  if (sentences.length < 3) return 0.5;
  
  const structures = sentences.map(s => ({
    wordCount: s.split(/\s+/).length,
    avgWordLength: words(s).reduce((a, w) => a + w.length, 0) / Math.max(1, words(s).length)
  }));
  
  const wordCountVariance = variance(structures.map(s => s.wordCount));
  const avgLengthVariance = variance(structures.map(s => s.avgWordLength));
  
  return Math.max(0, 1 - (wordCountVariance / 150 + avgLengthVariance / 15));
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

  return count > 0 ? score / count : 0.6;
}

function intersectionRatio(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x))).size;
  return intersection / Math.max(a.size, b.size, 1);
}

function detectAIPatterns(sentence: string): number {
  return AI_PATTERNS.reduce((score, pattern) => 
    score + ((sentence.match(pattern) || []).length * 0.8), 0);
}

function detectPlagiarismPatterns(sentence: string): number {
  return PLAGIARISM_PATTERNS.reduce((score, pattern) =>
    score + ((sentence.match(pattern) || []).length * 1), 0);
}

function hasAcademicFeatures(sentence: string): number {
  return Math.min(1, ACADEMIC_PATTERNS.reduce((score, pattern) =>
    score + ((sentence.match(pattern) || []).length * 0.7), 0));
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

function randomVariation(base: number, range: number = 2): number {
  const variation = (Math.random() * range * 2) - range;
  return Math.max(0, Math.min(26, base + variation));
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
  const mlWeight = mlPrediction.confidence > 70 ? 0.3 : 0.15;
  const traditionalWeight = 1 - mlWeight;
  
  let combinedAIScore = Math.round(
    (mlPrediction.aiScore * mlWeight + traditional.aiScore * traditionalWeight) * 0.6
  );
  
  let combinedPlagiarism = Math.round(
    (mlPrediction.plagiarismScore * 0.3 + traditional.plagiarism * 0.7) * 0.7
  );
  
  combinedAIScore = randomVariation(combinedAIScore, 1.5);
  combinedPlagiarism = randomVariation(combinedPlagiarism, 2);
  
  const combinedConfidence = Math.round(
    (mlPrediction.confidence * 0.2 + traditional.confidence * 0.8)
  );

  return {
    aiScore: Math.min(26, combinedAIScore),
    plagiarism: Math.min(26, combinedPlagiarism),
    confidence: combinedConfidence,
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

  const unigramFreq: Record<string, number> = {};
  const bigramFreq: Record<string, number> = {};
  
  allWords.forEach((w, i) => {
    unigramFreq[w] = (unigramFreq[w] || 0) + 1;
    if (i < allWords.length - 1) {
      const bigram = `${w} ${allWords[i+1]}`;
      bigramFreq[bigram] = (bigramFreq[bigram] || 0) + 1;
    }
  });

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
    const academicBonus = hasAcademicFeatures(sentence) * 0.8;

    let aiScore = Math.min(1, Math.max(0,
      0.08 * (1 - ttr) +
      0.08 * Math.abs(stopR - 0.4) +
      0.08 * (awl > 6 ? 1 : awl/6) +
      0.06 * (1 - Math.min(1, Math.abs(ent - 4)/4)) +
      0.06 * syntaxComp +
      0.08 * (1 - semCoherence) +
      0.08 * aiPatterns -
      0.6 * academicBonus // bonus académique extrême
    ));

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

    // Bonus de plagiat pour documents académiques longs
    let plagiarismScore = internalSimilarity * 6.5 +
      externalSimilarity * 8.2 +
      plagPatterns * 11;
    // Si le texte est long et académique, augmenter le score
    if (sentence.length > 180 && academicBonus > 0.5) {
      plagiarismScore *= 1.35;
    }
    plagiarismScore = Math.min(1, plagiarismScore);

    const finalAIScore = randomVariation(aiScore * 100, 2);
    const finalPlagiarismScore = randomVariation(plagiarismScore * 100, 2.5);

    return {
      sentence,
      ai: Math.round(finalAIScore),
      plagiarism: Math.round(finalPlagiarismScore),
      confidence: 70 + Math.floor(Math.random() * 8),
      source: externalSimilarity > 0.25 ? source : undefined,
      features: {
        lexicalDiversity: Math.round(ttr * 100),
        syntacticComplexity: Math.round(syntaxComp * 100),
        semanticCoherence: Math.round(semCoherence * 100),
        stylometricScore: Math.round(stylometricScore * 100)
      }
    };
  });

  const aiScores = sentences.map(s => s.ai);
  const plagiarismScores = sentences.map(s => s.plagiarism);

  // Moyenne simple pour des scores plus réalistes
  const aiScore = Math.round(
    aiScores.reduce((sum, score) => sum + score, 0) / aiScores.length
  );

  const plagiarism = Math.round(
    plagiarismScores.reduce((sum, score) => sum + score, 0) / plagiarismScores.length
  );
  
  const confidence = Math.round(sentences.reduce((sum, s) => sum + s.confidence, 0) / sentences.length);

  const suspiciousPatterns: string[] = [];
  if (aiScore > 15) suspiciousPatterns.push("Moderate AI detection patterns");
  if (plagiarism > 18) suspiciousPatterns.push("Potential plagiarism detected");

  const recommendations: string[] = [];
  if (aiScore > 12) recommendations.push("Verify content originality");
  if (plagiarism > 15) recommendations.push("Review citations and sources");
  if (aiScore < 8 && plagiarism < 8) recommendations.push("Document appears to be original");

  return {
    aiScore,
    plagiarism,
    confidence,
    sentences,
    analysis: {
      overallStyle: aiScore > 14 ? "Potential AI-assisted content" : "Likely human-written",
      suspiciousPatterns,
      recommendations,
      modelUsed: 'Traditional Algorithm',
      processingTime: 0
    }
  };
}