import Dexie, { Table } from "dexie";
import { fileToText } from "./fileToText";

export type CorpusDocument = {
  id?: number;
  name: string;
  text: string;
  addedAt: number;
};

class CorpusDB extends Dexie {
  documents!: Table<CorpusDocument, number>;
  constructor() {
    super("acadcheck_corpus_db");
    this.version(1).stores({
      documents: "++id, name, addedAt",
    });
  }
}

const db = new CorpusDB();

export async function addDocumentFromFile(file: File): Promise<number> {
  const text = await fileToText(file);
  const doc: CorpusDocument = {
    name: file.name,
    text,
    addedAt: Date.now(),
  };
  return await db.documents.add(doc);
}

export async function getAllDocuments(): Promise<CorpusDocument[]> {
  return await db.documents.orderBy("addedAt").toArray();
}

export async function countDocuments(): Promise<number> {
  return await db.documents.count();
}

export async function clearCorpus(): Promise<void> {
  await db.documents.clear();
}
