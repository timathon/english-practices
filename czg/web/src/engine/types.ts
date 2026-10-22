export interface StandardEntry {
  cs_id: string;
  cms_id?: string;
  relevance_degree: "Direct" | "Supporting" | "Preparatory";
  mapped_aspects: string[];
  content_requirement: string;
  academic_requirement: string;
  core_competencies: string[];
}

export interface Section {
  section_number: string;
  title: string;
  page_range: string;
  key_concepts: string[];
  standards: StandardEntry[];
  topic_ids: string[];
}

export interface Chapter {
  chapter_number: number;
  title: string;
  page_range: string;
  sections: Section[];
}

export interface Topic {
  id: string;
  name: string;
  domain: string;
  grade?: number;
  semester?: string;
  chapter?: string;
  type: string;
  description: string;
  mastery_criteria: string[];
  diagnostic_question?: {
    question: string;
    answer: string;
  };
  standards: { id: string; confidence: string }[];
}

export interface Dependency {
  topicId: string;
  prerequisiteId: string;
  strength: "hard" | "soft";
  reason?: string;
}

export interface Question {
  id: string;
  topicId: string;
  difficulty: "basic" | "standard" | "advanced";
  type: string;
  prompt: string;
  figure?: string; // Raw SVG string for geometry
  choices?: string[];
  answer: string;
  explanation?: string;
  verify?: string;
}

export interface TextbookBundle {
  metadata: {
    textbook_id: string;
    textbook_name: string;
    publisher: string;
    edition: string;
    version: string;
    stats: {
      total_chapters: number;
      total_sections: number;
      total_topics: number;
      total_dependencies: number;
      total_questions: number;
    };
  };
  chapters: Chapter[];
  topics: Topic[];
  dependencies: Dependency[];
  questions: Question[];
}

export type TopicStatus = "mastered" | "shaky" | "weak" | "untested" | "inferred";

export interface DiagSession {
  targets: string[];
  limit: number;
  order: string[];
  status: Record<string, TopicStatus>;
  stack: string[];
  answers: {
    topicId: string;
    qid: string;
    verdict: "correct" | "wrong" | "skip";
    userAnswer?: string;
  }[];
  attempts: Record<string, { qid: string; verdict: "correct" | "wrong" | "skip" }[]>;
  seed: string;
}

export interface DiagSummary {
  status: Record<string, TopicStatus>;
  mastered: string[];
  shaky: string[];
  weak: string[];
  rootCauses: string[];
  learningPath: string[];
  totalAnswered: number;
}
