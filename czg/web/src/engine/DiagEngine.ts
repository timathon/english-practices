import { Topic, Dependency, Question, DiagSession, DiagSummary, TopicStatus } from "./types";

export class DiagGraph {
  public topics: Topic[];
  public byId: Record<string, Topic> = {};
  public index: Record<string, number> = {};
  public prereqs: Record<string, { id: string; strength: "hard" | "soft"; reason?: string }[]> = {};
  public dependents: Record<string, { id: string; strength: "hard" | "soft" }[]> = {};
  public bank: Record<string, Question[]> = {};
  private _anc: Record<string, Set<string>> = {};

  constructor(topics: Topic[], deps: Dependency[], questions: Question[]) {
    this.topics = topics;
    topics.forEach((t, i) => {
      this.byId[t.id] = t;
      this.index[t.id] = i;
      this.prereqs[t.id] = [];
      this.dependents[t.id] = [];
      this.bank[t.id] = [];
    });

    const seen = new Set<string>();
    deps.forEach((d) => {
      if (!this.byId[d.topicId] || !this.byId[d.prerequisiteId]) return;
      const key = `${d.topicId}<${d.prerequisiteId}`;
      if (seen.has(key)) return;
      seen.add(key);
      const strength = d.strength === "soft" ? "soft" : "hard";
      this.prereqs[d.topicId].push({ id: d.prerequisiteId, strength, reason: d.reason });
      this.dependents[d.prerequisiteId].push({ id: d.topicId, strength });
    });

    // Sort prerequisites: hard before soft, then stable topic order
    const rank = (e: { id: string; strength: string }) =>
      (e.strength === "hard" ? 0 : 1) * 1e6 + (this.index[e.id] ?? 0);
    Object.keys(this.prereqs).forEach((id) => {
      this.prereqs[id].sort((a, b) => rank(a) - rank(b));
      this.dependents[id].sort((a, b) => (this.index[a.id] ?? 0) - (this.index[b.id] ?? 0));
    });

    // Populate question bank
    questions.forEach((q) => {
      if (this.bank[q.topicId]) {
        this.bank[q.topicId].push(q);
      }
    });

    // Fallback: If no question in bank, use diagnostic_question
    topics.forEach((t) => {
      if (this.bank[t.id].length === 0 && t.diagnostic_question?.question) {
        this.bank[t.id].push({
          id: `${t.id}_q1`,
          topicId: t.id,
          difficulty: "standard",
          type: "legacy",
          prompt: t.diagnostic_question.question,
          answer: t.diagnostic_question.answer,
          explanation: ""
        });
      }
    });
  }

  public ancestorSet(id: string): Set<string> {
    if (this._anc[id]) return this._anc[id];
    const out = new Set<string>();
    const stack = [id];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const cur = stack.pop()!;
      for (const p of this.prereqs[cur] || []) {
        if (!visited.has(p.id)) {
          visited.add(p.id);
          out.add(p.id);
          stack.push(p.id);
        }
      }
    }
    this._anc[id] = out;
    return out;
  }

  public topoSort(ids: string[]): string[] {
    const set = new Set(ids);
    const indeg: Record<string, number> = {};
    set.forEach((id) => {
      indeg[id] = (this.prereqs[id] || []).filter((p) => set.has(p.id)).length;
    });

    const ready = Array.from(set).filter((id) => indeg[id] === 0);
    const byIndex = (a: string, b: string) => (this.index[a] ?? 0) - (this.index[b] ?? 0);
    const order: string[] = [];

    while (ready.length > 0) {
      ready.sort(byIndex);
      const id = ready.shift()!;
      order.push(id);
      (this.dependents[id] || []).forEach((d) => {
        if (!set.has(d.id)) return;
        indeg[d.id] -= 1;
        if (indeg[d.id] === 0) ready.push(d.id);
      });
    }

    return order.length === set.size ? order : Array.from(set);
  }
}

export function createDiagSession(graph: DiagGraph, targets: string[], limit: number = 10): DiagSession {
  const ts = Array.from(new Set(targets)).filter((id) => graph.byId[id]);
  if (ts.length === 0) {
    throw new Error("No valid targets provided");
  }

  // Find all ancestors
  const fullSet = new Set(ts);
  ts.forEach((id) => {
    graph.ancestorSet(id).forEach((a) => fullSet.add(a));
  });

  const order = graph.topoSort(Array.from(fullSet));
  const pos: Record<string, number> = {};
  order.forEach((id, i) => (pos[id] = i));

  // Stack starts with targets sorted nearest to end
  const stack = ts.slice().sort((a, b) => (pos[b] ?? 0) - (pos[a] ?? 0));

  return {
    targets: ts,
    limit,
    order,
    status: {},
    stack,
    answers: [],
    attempts: {},
    seed: String(Date.now())
  };
}

export function nextQuestionItem(graph: DiagGraph, session: DiagSession): { topicId: string; question: Question; attempt: number } | null {
  if (session.answers.length >= session.limit) return null;

  while (session.stack.length > 0) {
    const topId = session.stack[0];
    const stat = session.status[topId];
    if (stat === "mastered" || stat === "inferred" || stat === "shaky" || stat === "weak") {
      session.stack.shift();
      continue;
    }

    const pastAttempts = session.attempts[topId] || [];
    const attempt = pastAttempts.length + 1;
    const pool = (graph.bank[topId] || []).filter((q) => !pastAttempts.some((a) => a.qid === q.id));

    if (pool.length === 0) {
      // No more questions, mark status based on past attempt
      if (pastAttempts.length > 0 && pastAttempts[pastAttempts.length - 1].verdict !== "correct") {
        session.status[topId] = "weak";
        session.stack.shift();
        // push prerequisites
        for (const p of graph.prereqs[topId] || []) {
          if (!session.status[p.id]) {
            session.stack.unshift(p.id);
          }
        }
      } else {
        session.stack.shift();
      }
      continue;
    }

    const question = pool[0];
    return { topicId: topId, question, attempt };
  }

  return null;
}

export function recordAnswer(
  graph: DiagGraph,
  session: DiagSession,
  topicId: string,
  qid: string,
  verdict: "correct" | "wrong" | "skip",
  userAnswer?: string
): DiagSession {
  const newSession: DiagSession = {
    ...session,
    status: { ...session.status },
    stack: [...session.stack],
    answers: [...session.answers, { topicId, qid, verdict, userAnswer }],
    attempts: { ...session.attempts, [topicId]: [...(session.attempts[topicId] || []), { qid, verdict }] }
  };

  const attempts = newSession.attempts[topicId];
  if (verdict === "correct") {
    if (attempts.length === 1) {
      // First attempt correct -> Mastered! Infer ancestors
      newSession.status[topicId] = "mastered";
      graph.ancestorSet(topicId).forEach((ancId) => {
        if (!newSession.status[ancId]) {
          newSession.status[ancId] = "inferred";
        }
      });
      newSession.stack.shift();
    } else {
      // Second attempt correct -> Shaky (don't backtrack further)
      newSession.status[topicId] = "shaky";
      newSession.stack.shift();
    }
  } else {
    // wrong or skip
    if (attempts.length === 1) {
      // Give second chance on same topic with easier/parallel question
      // (Keep on stack)
    } else {
      // Both attempts failed -> Weak! Backtrack along prerequisites
      newSession.status[topicId] = "weak";
      newSession.stack.shift();
      const prereqs = graph.prereqs[topicId] || [];
      // Push untested prerequisites to front of stack
      for (let i = prereqs.length - 1; i >= 0; i--) {
        const pId = prereqs[i].id;
        if (!newSession.status[pId] && !newSession.stack.includes(pId)) {
          newSession.stack.unshift(pId);
        }
      }
    }
  }

  return newSession;
}

export function summarizeSession(graph: DiagGraph, session: DiagSession): DiagSummary {
  const mastered: string[] = [];
  const shaky: string[] = [];
  const weak: string[] = [];

  Object.entries(session.status).forEach(([id, st]) => {
    if (st === "mastered" || st === "inferred") mastered.push(id);
    else if (st === "shaky") shaky.push(id);
    else if (st === "weak") weak.push(id);
  });

  // Find root causes: weak topics whose own prerequisites are NOT weak
  const rootCauses = weak.filter((id) => {
    const ps = graph.prereqs[id] || [];
    return !ps.some((p) => session.status[p.id] === "weak");
  });

  // Learning path: topological sort of (weak + shaky)
  const toLearn = Array.from(new Set([...weak, ...shaky]));
  const learningPath = graph.topoSort(toLearn);

  return {
    status: session.status,
    mastered,
    shaky,
    weak,
    rootCauses,
    learningPath,
    totalAnswered: session.answers.length
  };
}
