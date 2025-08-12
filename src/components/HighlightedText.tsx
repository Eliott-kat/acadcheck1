import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface HighlightedTextProps {
  text: string;
  highlights?: string[];
  className?: string; // style par défaut du <mark>
  groups?: { terms: string[]; className: string }[]; // groupes avec styles spécifiques
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
  groups,
}) => {
  const tokens = useMemo(() => {
    const base = (highlights || [])
      .map((h) => h?.trim())
      .filter((h): h is string => Boolean(h && h.length > 0))
      .map((t) => ({ term: t, className }));
    const grouped = (groups || [])
      .flatMap((g) => g.terms.map((t) => t?.trim()).filter(Boolean).map((t) => ({ term: t as string, className: g.className })));
    const arr = [...base, ...grouped];
    // Prioriser les occurrences plus longues
    return arr.sort((a, b) => b.term.length - a.term.length);
  }, [highlights, groups, className]);

  const defaultMarkClass = "bg-accent/50 underline decoration-destructive decoration-2 rounded-sm px-0.5";

  if (!text || tokens.length === 0) {
    return <span>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Construire toutes les correspondances non chevauchantes
  type Match = { start: number; end: number; text: string; cls?: string };
  const matches: Match[] = [];
  const used: boolean[] = Array(text.length).fill(false);

  for (const tok of tokens) {
    const pattern = new RegExp(escapeRegex(tok.term), "gi");
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const s = m.index;
      const e = s + m[0].length;
      let overlap = false;
      for (let i = s; i < e; i++) if (used[i]) { overlap = true; break; }
      if (overlap) continue;
      for (let i = s; i < e; i++) used[i] = true;
      matches.push({ start: s, end: e, text: text.slice(s, e), cls: tok.className });
    }
  }

  matches.sort((a, b) => a.start - b.start);

  for (const m of matches) {
    if (m.start > lastIndex) parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex, m.start)}</span>);
    parts.push(
      <mark key={`m-${m.start}`} className={cn(defaultMarkClass, m.cls)}>
        {m.text}
      </mark>
    );
    lastIndex = m.end;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <span>{parts}</span>;
};

export default HighlightedText;
