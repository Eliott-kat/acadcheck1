import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface HighlightedTextProps {
  text: string;
  highlights: string[];
  className?: string; // permet de surcharger le style du <mark>
}

// Échappe les caractères spéciaux d'une chaîne pour l'utiliser dans une RegExp
function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Surligne toutes les occurrences (insensible à la casse) des mots/phrases données
 * en les enveloppant dans un <mark> avec une classe Tailwind.
 * - Trouve toutes les occurrences (g flag)
 * - Insensible à la casse (i flag)
 * - Gère ponctuation/espaces autour (on matche uniquement la sous-chaîne, la ponctuation autour reste intacte)
 * - Évite les conflits/chevauchements en priorisant les plus longues occurrences
 */
const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  highlights,
  className,
}) => {
  const { regex, valid } = useMemo(() => {
    const list = (highlights || [])
      .map((h) => h?.trim())
      .filter((h): h is string => Boolean(h && h.length > 0));

    if (list.length === 0) return { regex: null as RegExp | null, valid: false };

    // Prioriser les occurrences plus longues pour éviter de couper des expressions plus grandes
    const escaped = list
      .sort((a, b) => b.length - a.length)
      .map((h) => escapeRegex(h));

    try {
      return { regex: new RegExp(`(${escaped.join("|")})`, "gi"), valid: true };
    } catch {
      return { regex: null as RegExp | null, valid: false };
    }
  }, [highlights]);

  const defaultMarkClass = "bg-accent/50 underline decoration-destructive decoration-2 rounded-sm px-0.5";

  if (!text || !valid || !regex) {
    return <span>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (start > lastIndex) {
      parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex, start)}</span>);
    }

    parts.push(
      <mark key={`m-${start}`} className={cn(defaultMarkClass, className)}>
        {match[0]}
      </mark>
    );

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <span>{parts}</span>;
};

export default HighlightedText;
