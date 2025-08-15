import React from "react";

interface SentenceHighlightProps {
  text: string;
  sentences: string[];
  highlightIndexes?: number[]; // index des phrases à surligner
  highlightClass?: string;
}

// Découpe le texte en phrases (simple, améliorable)
function splitSentences(text: string): string[] {
  return text.match(/[^.!?\n]+[.!?\n]?/g) || [];
}

const defaultClass = "bg-accent/50 underline decoration-2 rounded-sm px-0.5";

const SentenceHighlight: React.FC<SentenceHighlightProps> = ({
  text,
  sentences,
  highlightIndexes = [],
  highlightClass = defaultClass,
}) => {
  const parts = splitSentences(text);
  return (
    <span>
      {parts.map((sentence, idx) =>
        highlightIndexes.includes(idx) ? (
          <mark key={idx} className={highlightClass}>{sentence}</mark>
        ) : (
          <span key={idx}>{sentence}</span>
        )
      )}
    </span>
  );
};

export default SentenceHighlight;
