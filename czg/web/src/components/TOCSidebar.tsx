import React from "react";
import { Chapter, Section, TopicStatus } from "../engine/types";
import { ChevronRight, CheckCircle2, AlertTriangle, XCircle, Circle } from "lucide-react";

interface TOCSidebarProps {
  chapters: Chapter[];
  selectedSection: Section | null;
  onSelectSection: (sec: Section) => void;
  masteryMap: Record<string, TopicStatus>;
  isOpen?: boolean;
  onClose?: () => void;
}

export const TOCSidebar: React.FC<TOCSidebarProps> = ({
  chapters,
  selectedSection,
  onSelectSection,
  masteryMap,
  isOpen = false,
  onClose
}) => {
  const handleItemClick = (sec: Section) => {
    onSelectSection(sec);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && <div className="toc-backdrop" onClick={onClose} />}
      <aside className={`toc-sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">教材章节目录 (TOC)</span>
          <span className="sidebar-count">{chapters.length} 章</span>
        </div>

      <div className="chapter-list">
        {chapters.map((ch) => (
          <div key={ch.chapter_number} className="chapter-group">
            <div className="chapter-title">
              <span className="chapter-num">第 {ch.chapter_number} 章</span>
              <span className="chapter-name">{ch.title.replace(/^第.*?章\s*/, "")}</span>
            </div>

            <div className="section-list">
              {ch.sections.map((sec) => {
                const isSelected = selectedSection?.section_number === sec.section_number;

                // Calculate mastery status for this section
                let masteredCount = 0;
                let weakCount = 0;
                const total = sec.topic_ids.length;

                sec.topic_ids.forEach((tid) => {
                  const st = masteryMap[tid];
                  if (st === "mastered" || st === "inferred") masteredCount++;
                  else if (st === "weak") weakCount++;
                });

                return (
                  <button
                    key={sec.section_number}
                    className={`section-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleItemClick(sec)}
                  >
                    <div className="section-left">
                      <span className="section-no">{sec.section_number}</span>
                      <span className="section-title">{sec.title}</span>
                    </div>

                    <div className="section-right">
                      {weakCount > 0 ? (
                        <span className="badge-status badge-weak" title="有薄弱根因">
                          <XCircle size={13} />
                        </span>
                      ) : masteredCount === total && total > 0 ? (
                        <span className="badge-status badge-mastered" title="全掌握">
                          <CheckCircle2 size={13} />
                        </span>
                      ) : masteredCount > 0 ? (
                        <span className="badge-status badge-partial">
                          {masteredCount}/{total}
                        </span>
                      ) : (
                        <span className="badge-status badge-untested">
                          <Circle size={10} />
                        </span>
                      )}
                      <ChevronRight size={14} className="arrow-icon" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
    </>
  );
};
