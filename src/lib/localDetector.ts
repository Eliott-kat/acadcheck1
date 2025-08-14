import { aiDetectionModel } from './aiTraining';

export type SentenceScore = {
  sentence: string;
  ai: number; // 0-100
  plagiarism: number; // 0-100
  confidence: number; // 0-100 confidence level
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
  'the','of','and','to','in','a','is','that','for','on','with','as','by','it','be','are','this','an','or','from','at','which','but','not','we','our','their','also','can','have','has','was','were','than','these','those','such','may','more','most','any','all','some','into','between','over','under','about','after','before','during','through','per','i','you','he','she','they','them','his','her','its','there','here'
]);

// Marqueurs linguistiques d'IA
const AI_PATTERNS = [
  // Phrases de transition typiques de l'IA
  /\b(furthermore|moreover|additionally|consequently|therefore|thus)\b/gi,
  // Structures répétitives
  /\b(it is important to note|it should be noted|it is worth noting)\b/gi,
  // Formulations génériques
  /\b(in conclusion|to conclude|in summary|to summarize)\b/gi,
  // Patterns de listes structurées
  /\b(firstly|secondly|thirdly|finally)\b/gi,
  // Langage trop parfait/formel
  /\b(utilize|implement|facilitate|optimize|streamline)\b/gi
];

// Patterns de plagiat académique
const PLAGIARISM_PATTERNS = [
  // Citations manquantes ou mal formatées
  /\b(according to research|studies show|research indicates)\s+(?!.*\(.*\d{4}.*\))/gi,
  // Phrases trop techniques sans contexte
  /\b[A-Z][a-z]+\s+et\s+al\.\s+\(\d{4}\)/g,
  // Définitions encyclopédiques
  /^[A-Z][a-z]+\s+is\s+(defined as|a type of|characterized by)/gm
];

function splitSentences(text: string): string[] {
  // Avoid regex lookbehind for Safari compatibility: insert a splitter token after end punctuation
  const withDelims = text.replace(/([.!?])\s+(?=[A-ZÀ-ÖØ-Þ]|\d|"|\(|\[)/g, '$1|');
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

// Analyse de la complexité syntaxique
function syntaxComplexity(sentence: string): number {
  const clauseMarkers = (sentence.match(/[,:;]/g) || []).length;
  const subordination = (sentence.match(/\b(that|which|who|where|when|while|although|because|since)\b/gi) || []).length;
  const words = sentence.split(/\s+/).length;
  
  if (words === 0) return 0;
  const complexity = (clauseMarkers + subordination * 2) / words;
  return Math.min(1, complexity * 10); // Normaliser à [0,1]
}

// Détection de patterns stylistiques répétitifs
function detectStylometricPatterns(sentences: string[]): number {
  const structures = sentences.map(s => {
    const words = s.split(/\s+/);
    return {
      startsWithThe: /^The\s/i.test(s),
      endsWithPeriod: /\.$/.test(s),
      hasSubordinate: /\b(that|which|who)\b/i.test(s),
      wordCount: words.length,
      avgWordLength: words.reduce((a, w) => a + w.length, 0) / words.length
    };
  });
  
  // Calculer la variance dans la structure
  const wordCountVariance = variance(structures.map(s => s.wordCount));
  const avgLengthVariance = variance(structures.map(s => s.avgWordLength));
  
  // Scores plus bas = plus uniforme = plus suspecte
  const uniformity = 1 - (wordCountVariance / 100 + avgLengthVariance / 10) / 2;
  return Math.max(0, Math.min(1, uniformity));
}

function variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
}

// Cohérence sémantique - détecte les transitions abruptes
function semanticCoherence(currentSent: string, prevSent?: string, nextSent?: string): number {
  if (!prevSent && !nextSent) return 0.5;
  
  let coherence = 0;
  let count = 0;
  
  const currentWords = new Set(words(currentSent.toLowerCase()));
  
  if (prevSent) {
    const prevWords = new Set(words(prevSent.toLowerCase()));
    const overlap = new Set([...currentWords].filter(w => prevWords.has(w))).size;
    coherence += overlap / Math.max(currentWords.size, prevWords.size);
    count++;
  }
  
  if (nextSent) {
    const nextWords = new Set(words(nextSent.toLowerCase()));
    const overlap = new Set([...currentWords].filter(w => nextWords.has(w))).size;
    coherence += overlap / Math.max(currentWords.size, nextWords.size);
    count++;
  }
  
  return count > 0 ? coherence / count : 0.5;
}

// Détection de patterns d'IA spécifiques
function detectAIPatterns(sentence: string): number {
  let score = 0;
  for (const pattern of AI_PATTERNS) {
    if (pattern.test(sentence)) {
      score += 0.2;
    }
  }
  return Math.min(1, score);
}

// Détection de patterns de plagiat
function detectPlagiarismPatterns(sentence: string): number {
  let score = 0;
  for (const pattern of PLAGIARISM_PATTERNS) {
    if (pattern.test(sentence)) {
      score += 0.3;
    }
  }
  return Math.min(1, score);
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

export async function analyzeText(
  text: string,
  opts?: { corpus?: { name: string; text: string }[]; ngram?: number; useML?: boolean }
): Promise<LocalReport> {
  const startTime = Date.now();
  const useML = opts?.useML !== false; // Par défaut, utiliser ML
  let modelUsed = 'Algorithme heuristique';
  
  // Tentative d'utilisation des modèles ML améliorés
  if (useML) {
    try {
      console.log('Tentative d\'utilisation des modèles ML...');
      const mlPrediction = await aiDetectionModel.predict(text);
      
      // Si ML fonctionne, combiner avec l'analyse traditionnelle
      const traditionalAnalysis = analyzeTextTraditional(text, opts);
      modelUsed = 'Modèles ML + Heuristiques';
      
      return combineMLAndTraditional(mlPrediction, traditionalAnalysis, startTime, modelUsed);
    } catch (error) {
      console.warn('Modèles ML non disponibles, utilisation de l\'algorithme traditionnel:', error);
    }
  }
  
  // Fallback vers l'algorithme traditionnel
  const result = analyzeTextTraditional(text, opts);
  result.analysis.modelUsed = modelUsed;
  result.analysis.processingTime = Date.now() - startTime;
  
  return result;
}

function combineMLAndTraditional(mlPrediction: any, traditionalAnalysis: LocalReport, startTime: number, modelUsed: string): LocalReport {
  // Combiner intelligemment les résultats ML et traditionnels
  const combinedAIScore = Math.round((mlPrediction.aiScore * 0.7 + traditionalAnalysis.aiScore * 0.3));
  const combinedPlagiarism = Math.round((mlPrediction.plagiarismScore * 0.6 + traditionalAnalysis.plagiarism * 0.4));
  const combinedConfidence = Math.round((mlPrediction.confidence * 0.8 + traditionalAnalysis.confidence * 0.2));
  
  // Enrichir les features avec les données ML
  const enrichedSentences = traditionalAnalysis.sentences.map(s => ({
    ...s,
    features: {
      ...s.features,
      perplexity: mlPrediction.features.perplexity,
      burstiness: mlPrediction.features.burstiness
    }
  }));
  
  // Améliorer l'analyse avec les insights ML
  const enhancedAnalysis = {
    ...traditionalAnalysis.analysis,
    modelUsed,
    processingTime: Date.now() - startTime,
    suspiciousPatterns: [
      ...traditionalAnalysis.analysis.suspiciousPatterns,
      ...(mlPrediction.aiScore > 80 ? ['Patterns ML d\'IA détectés avec haute confiance'] : []),
      ...(mlPrediction.features.perplexity < 2 ? ['Perplexité très faible (suspect)'] : []),
      ...(Math.abs(mlPrediction.features.burstiness) < 0.1 ? ['Burstiness très faible (uniforme)'] : [])
    ],
    recommendations: [
      ...traditionalAnalysis.analysis.recommendations,
      ...(mlPrediction.confidence > 90 ? ['Analyse ML très fiable - résultats robustes'] : []),
      ...(mlPrediction.confidence < 50 ? ['Confiance ML faible - vérification manuelle recommandée'] : [])
    ]
  };
  
  return {
    aiScore: combinedAIScore,
    plagiarism: combinedPlagiarism,
    confidence: combinedConfidence,
    sentences: enrichedSentences,
    analysis: enhancedAnalysis
  };
}

function analyzeTextTraditional(
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

  // Détection de patterns stylistiques globaux
  const stylometricScore = detectStylometricPatterns(sents);

  const sentences: SentenceScore[] = sents.map((s, i) => {
    const ws = sentWords[i];
    const ttr = uniqueRatio(ws);
    const stopR = stopwordRatio(ws);
    const awl = avgWordLen(ws);
    const ent = charEntropy(s);

    const puncts = (s.match(/[,:;\-—()\[\]"""'…]/g) || []).length;
    const digits = (s.match(/\d/g) || []).length;

    // Nouvelles métriques avancées
    const syntaxComp = syntaxComplexity(s);
    const semCoherence = semanticCoherence(s, sents[i-1], sents[i+1]);
    const aiPatterns = detectAIPatterns(s);
    const plagPatterns = detectPlagiarismPatterns(s);
    
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

    // Feature engineering amélioré
    const ttrScore = 1 - ttr; // low ttr => more AI
    const stopMid = 1 - Math.min(1, Math.abs(stopR - 0.45) / 0.45);
    const awlScore = Math.min(1, Math.max(0, (awl - 4) / 4));
    const entScore = 1 - Math.min(1, Math.abs(ent - 3.5) / 3.5);
    const punctScore = Math.min(1, puncts / 8);
    const digitScore = Math.min(1, digits / 6);
    const repDocScore = repBigramRatio;
    const repSentScore = sentRepRatio;
    const tfcScore = tfcNorm;

    // Score IA amélioré avec nouvelles métriques
    let ai01 =
      0.15 * burstSim +
      0.15 * ttrScore +
      0.10 * stopMid +
      0.10 * awlScore +
      0.08 * entScore +
      0.08 * repDocScore +
      0.08 * repSentScore +
      0.05 * punctScore +
      0.12 * stylometricScore +
      0.09 * (1 - semCoherence) + // Manque de cohérence = plus suspect
      0.10 * aiPatterns +
      0.08 * (1 - syntaxComp); // Syntaxe trop simple = plus AI

    // Réduire le score IA si beaucoup de chiffres
    ai01 = Math.max(0, ai01 - 0.08 * digitScore);

    // Plagiarisme amélioré
    let plgInternal = 0;
    for (let j = 0; j < sents.length; j++) {
      if (j === i) continue;
      const sim = jaccard(gramSets[i], gramSets[j]);
      plgInternal = Math.max(plgInternal, sim);
      if (plgInternal > 0.98) break;
    }

    // Plagiarisme externe
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

    // Combiner plagiarisme interne, externe et patterns détectés
    const plg = Math.max(plgInternal, bestExt, plagPatterns);

    const ai = Math.round(ai01 * 100);
    const plagiarism = Math.round(plg * 100);

    // Calcul de confiance basé sur la convergence des métriques
    const metrics = [ttrScore, stopMid, awlScore, entScore, stylometricScore];
    const metricsMean = metrics.reduce((a, b) => a + b, 0) / metrics.length;
    const metricsVariance = metrics.reduce((a, b) => a + Math.pow(b - metricsMean, 2), 0) / metrics.length;
    const confidence = Math.round((1 - metricsVariance) * 100);

    const source = bestExt >= 0.3 ? bestSource : undefined;

    // Features détaillées pour l'analyse
    const features = {
      lexicalDiversity: Math.round(ttr * 100),
      syntacticComplexity: Math.round(syntaxComp * 100),
      semanticCoherence: Math.round(semCoherence * 100),
      stylometricScore: Math.round(stylometricScore * 100)
    };

    return { sentence: s, ai, plagiarism, confidence, source, features };
  });

  const aiScore = Math.round(sentences.reduce((a, s) => a + s.ai, 0) / (sentences.length || 1));
  const plgSorted = [...sentences].map(s => s.plagiarism).sort((a, b) => a - b);
  const idx95 = Math.floor(0.95 * (plgSorted.length - 1));
  const plagiarism = plgSorted.length ? plgSorted[idx95] : 0;
  
  // Confiance globale basée sur la cohérence des résultats
  const confidenceScores = sentences.map(s => s.confidence);
  const confidence = Math.round(confidenceScores.reduce((a, b) => a + b, 0) / (confidenceScores.length || 1));

  // Analyse des patterns suspects
  const suspiciousPatterns: string[] = [];
  const highAISentences = sentences.filter(s => s.ai > 80).length;
  const highPlagiarismSentences = sentences.filter(s => s.plagiarism > 70).length;
  const lowCoherenceSentences = sentences.filter(s => s.features && s.features.semanticCoherence < 30).length;
  
  if (highAISentences > sentences.length * 0.5) {
    suspiciousPatterns.push("Forte proportion de phrases générées par IA détectée");
  }
  if (highPlagiarismSentences > sentences.length * 0.3) {
    suspiciousPatterns.push("Plusieurs passages potentiellement plagiés identifiés");
  }
  if (lowCoherenceSentences > sentences.length * 0.4) {
    suspiciousPatterns.push("Transitions abruptes entre les idées détectées");
  }
  if (stylometricScore > 0.8) {
    suspiciousPatterns.push("Style d'écriture très uniforme (suspect)");
  }

  // Détermination du style global
  const avgLexicalDiversity = Math.round(
    sentences.reduce((a, s) => a + (s.features?.lexicalDiversity || 0), 0) / sentences.length
  );
  const avgSyntaxComplexity = Math.round(
    sentences.reduce((a, s) => a + (s.features?.syntacticComplexity || 0), 0) / sentences.length
  );
  
  let overallStyle = "Style académique standard";
  if (aiScore > 70) {
    overallStyle = "Style potentiellement généré par IA";
  } else if (plagiarism > 60) {
    overallStyle = "Contenu potentiellement plagié";
  } else if (avgLexicalDiversity < 30 || avgSyntaxComplexity < 25) {
    overallStyle = "Style simple, possiblement artificiel";
  } else if (avgLexicalDiversity > 75 && avgSyntaxComplexity > 70) {
    overallStyle = "Style complexe et varié (probablement humain)";
  }

  // Recommandations
  const recommendations: string[] = [];
  if (aiScore > 50) {
    recommendations.push("Vérifier l'originalité du contenu avec des outils spécialisés");
  }
  if (plagiarism > 40) {
    recommendations.push("Examiner les sources et citations du document");
  }
  if (confidence < 60) {
    recommendations.push("Analyse nécessite une vérification manuelle approfondie");
  }
  if (suspiciousPatterns.length === 0 && aiScore < 30 && plagiarism < 20) {
    recommendations.push("Le document semble authentique et original");
  }

  const analysis = {
    overallStyle,
    suspiciousPatterns,
    recommendations,
    modelUsed: 'Algorithme heuristique',
    processingTime: 0
  };

  return { aiScore, plagiarism, confidence, sentences, analysis };
}