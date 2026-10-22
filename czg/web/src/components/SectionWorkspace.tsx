import React from "react";
import { Section, Topic, Dependency, TopicStatus } from "../engine/types";
import { MathText } from "./MathText";
import { PlayCircle, Award, BookCheck, Network, Layers, Sparkles } from "lucide-react";
import { getStandardTaxonomyPath, getStandardSubTopic, getCoreCompetencyName } from "../lib/csTaxonomy";

interface SectionWorkspaceProps {
  section: Section;
  topicsById: Record<string, Topic>;
  deps: Dependency[];
  masteryMap: Record<string, TopicStatus>;
  onStartDiagnosis: (targetSection?: Section) => void;
}

export const SectionWorkspace: React.FC<SectionWorkspaceProps> = ({
  section,
  topicsById,
  deps,
  masteryMap,
  onStartDiagnosis
}) => {
  // Find immediate prerequisites for this section's topics
  const secTopicSet = new Set(section.topic_ids);
  const prereqEdges = deps.filter((d) => secTopicSet.has(d.topicId));
  const uniquePrereqs = Array.from(new Set(prereqEdges.map((d) => d.prerequisiteId)))
    .map((pid) => topicsById[pid])
    .filter(Boolean);

  return (
    <main className="section-workspace">
      {/* Header Banner */}
      <div className="workspace-hero">
        <div className="hero-content">
          <div className="hero-breadcrumb">
            <span>北师大七上</span> / <span>{section.section_number} 节</span>
          </div>
          <h1 className="hero-title">{section.title}</h1>
          <p className="hero-page">教材对应页码：第 {section.page_range} 页</p>
        </div>

        <div className="hero-actions">
          <button className="btn-primary-action" onClick={() => onStartDiagnosis(section)}>
            <PlayCircle size={18} />
            <span>自适应智能诊断 ({section.topic_ids.length > 0 ? `${section.topic_ids.length} 个知识点` : "进入练习"})</span>
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="workspace-grid">
        {/* Key Concepts Card */}
        <section className="card card-concepts">
          <div className="card-header">
            <div className="card-icon icon-purple">
              <Layers size={18} />
            </div>
            <h2>本节核心概念与关键思想</h2>
          </div>
          <div className="card-body">
            <div className="concept-tags">
              {section.key_concepts.map((concept, idx) => (
                <div key={idx} className="concept-tag">
                  <span className="concept-bullet"></span>
                  <MathText text={concept} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Curriculum Standards Card */}
        <section className="card card-standards">
          <div className="card-header">
            <div className="card-icon icon-blue">
              <BookCheck size={18} />
            </div>
            <h2>国家课程标准对应要求 (cs-m-2022)</h2>
          </div>
          <div className="card-body">
            {section.standards.length === 0 ? (
              <p className="empty-tip">本节为综合探究拓展内容</p>
            ) : (
              <div className="standards-list">
                {section.standards.map((std, i) => {
                  const subTopic = getStandardSubTopic(std.cs_id) || undefined;
                  return (
                    <div key={i} className="standard-item">
                      <div className="standard-top">
                        <span className="std-badge-id">{std.cs_id}</span>
                        <span className={`std-badge-rel rel-${std.relevance_degree.toLowerCase()}`}>
                          {std.relevance_degree === "Direct" ? "核心直接对应" : "准备/支撑要求"}
                        </span>

                        {/* Domain > Topic > Sub-topic */}
                        {getStandardTaxonomyPath(std.cs_id) && (
                          <span className="std-badge-taxonomy">
                            {getStandardTaxonomyPath(std.cs_id)}
                          </span>
                        )}

                        {/* Core Competencies with Chinese Words */}
                        {std.core_competencies.map((comp) => (
                          <span key={comp} className="std-badge-comp" title={`核心素养代号: ${comp}`}>
                            {getCoreCompetencyName(comp)}
                          </span>
                        ))}
                      </div>

                      <div className="standard-content">
                        <div className="content-line">
                          <span className="line-label">【内容要求】</span>
                          <span className="line-text">
                            <MathText 
                              text={std.content_requirement || std.mapped_aspects.join("；")} 
                              highlight={subTopic}
                            />
                          </span>
                        </div>
                        {std.academic_requirement && (
                          <div className="content-line academic">
                            <span className="line-label">【学业质量】</span>
                            <span className="line-text">
                              <MathText 
                                text={std.academic_requirement} 
                                highlight={subTopic}
                              />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Prerequisites DAG Card */}
        <section className="card card-prereqs">
          <div className="card-header">
            <div className="card-icon icon-teal">
              <Network size={18} />
            </div>
            <h2>先修依赖知识 (Prerequisites)</h2>
          </div>
          <div className="card-body">
            {uniquePrereqs.length === 0 ? (
              <p className="empty-tip">本节无跨章节先修依赖，可直接开展学习</p>
            ) : (
              <div className="prereq-grid">
                {uniquePrereqs.map((t) => {
                  const status = masteryMap[t.id];
                  return (
                    <div key={t.id} className={`prereq-item status-${status || 'untested'}`}>
                      <div className="prereq-title">
                        <MathText text={t.name} />
                      </div>
                      <div className="prereq-sub">
                        {t.chapter || `年级: ${t.grade || '小学'}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};
