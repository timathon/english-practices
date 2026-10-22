import React, { useState, useEffect, useMemo } from "react";
import m7aBundle from "./data/m7a-bundle.json";
import { TextbookBundle, Section, TopicStatus, DiagSummary, DiagSession } from "./engine/types";
import { DiagGraph, createDiagSession } from "./engine/DiagEngine";
import { Navbar } from "./components/Navbar";
import { TOCSidebar } from "./components/TOCSidebar";
import { SectionWorkspace } from "./components/SectionWorkspace";
import { AuthModal } from "./components/AuthModal";
import { DiagnosisModal } from "./components/DiagnosisModal";
import { AdminUserManagement } from "./components/AdminUserManagement";
import { useAuth } from "./lib/authContext";
import { api } from "./lib/api";
import { localDB } from "./lib/indexedDB";
import "./index.css";

const bundle = m7aBundle as unknown as TextbookBundle;

export const App: React.FC = () => {
  const { user, token } = useAuth();
  const [selectedSection, setSelectedSection] = useState<Section>(
    bundle.chapters[0].sections[0]
  );
  const [masteryMap, setMasteryMap] = useState<Record<string, TopicStatus>>({});
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [diagModalOpen, setDiagModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<DiagSession | null>(null);

  // Initialize graph
  const graph = useMemo(() => {
    return new DiagGraph(bundle.topics, bundle.dependencies, bundle.questions);
  }, []);

  const topicsById = useMemo(() => {
    return graph.byId;
  }, [graph]);

  // 1. Initial Mount: Load cached mastery from IndexedDB (instant offline-first display)
  useEffect(() => {
    localDB.loadMasteryMap(bundle.metadata.textbook_id).then((cached) => {
      if (cached && Object.keys(cached).length > 0) {
        setMasteryMap((prev) => ({ ...cached as Record<string, TopicStatus>, ...prev }));
      }
    });
  }, []);

  // 2. Sync unsynced offline records & fetch latest progress whenever user is logged in
  useEffect(() => {
    if (!token) return;

    // Background sync function for pending offline records
    const syncPendingRecords = async () => {
      try {
        const unsynced = await localDB.getUnsyncedRecords();
        if (unsynced.length > 0) {
          const syncedIds: string[] = [];
          for (const rec of unsynced) {
            try {
              await api.submitDiagnosis(token, {
                textbookId: rec.textbookId,
                chapter: rec.chapter,
                sectionNumber: rec.sectionNumber,
                targetTopicId: rec.targetTopicId,
                status: rec.status,
                rootCauses: rec.rootCauses,
                history: rec.history,
                masteryUpdates: rec.masteryUpdates,
              });
              syncedIds.push(rec.id);
            } catch (err) {
              console.warn("Failed to sync record", rec.id, err);
            }
          }
          if (syncedIds.length > 0) {
            await localDB.markRecordsSynced(syncedIds);
          }
        }
      } catch (e) {
        console.warn("Error checking unsynced IndexedDB records", e);
      }
    };

    // Run pending sync first, then load fresh progress from server and cache to IndexedDB
    syncPendingRecords().then(() => {
      api.getProgress(token, bundle.metadata.textbook_id)
        .then((res) => {
          const serverMap: Record<string, TopicStatus> = {};
          if (Array.isArray(res.mastery)) {
            res.mastery.forEach((item: any) => {
              serverMap[item.topic_id] = item.mastery_level;
            });
          }
          setMasteryMap(serverMap);
          localDB.saveMasteryMap(bundle.metadata.textbook_id, serverMap);
        })
        .catch(() => {});
    });
  }, [token]);

  // Launch Diagnosis for current section
  const handleStartDiagnosis = (targetSec?: Section) => {
    const activeSec = targetSec || selectedSection;
    const targets = activeSec.topic_ids && activeSec.topic_ids.length > 0 
      ? activeSec.topic_ids 
      : bundle.topics.slice(0, 3).map(t => t.id);

    const session = createDiagSession(graph, targets, 8);
    setActiveSession(session);
    setDiagModalOpen(true);
  };

  // On Finish diagnosis
  const handleFinishDiagnosis = async (summary: DiagSummary, session: DiagSession) => {
    // 1. Update React memory state
    const nextMap = { ...masteryMap, ...summary.status };
    setMasteryMap(nextMap);
    setDiagModalOpen(false);

    const masteryUpdates = Object.entries(summary.status).map(([topicId, level]) => ({
      topicId,
      level
    }));

    const chapterTitle = bundle.chapters.find(c => c.sections.some(s => s.section_number === selectedSection.section_number))?.title || "";
    const status = summary.weak.length > 0 ? "weak" : summary.shaky.length > 0 ? "shaky" : "mastered";
    const recordId = "diag_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);

    // 2. Always persist to IndexedDB immediately (instant offline durability)
    await localDB.saveMasteryMap(bundle.metadata.textbook_id, nextMap);
    await localDB.saveDiagnosisRecord({
      id: recordId,
      textbookId: bundle.metadata.textbook_id,
      chapter: chapterTitle,
      sectionNumber: selectedSection.section_number,
      targetTopicId: session.targets[0] || "",
      status,
      rootCauses: summary.rootCauses,
      history: session.answers,
      masteryUpdates,
      synced: false,
      createdAt: Date.now(),
    });

    // 3. If logged in, upload to Cloudflare D1 immediately and mark synced
    if (token) {
      try {
        await api.submitDiagnosis(token, {
          textbookId: bundle.metadata.textbook_id,
          chapter: chapterTitle,
          sectionNumber: selectedSection.section_number,
          targetTopicId: session.targets[0] || "",
          status,
          rootCauses: summary.rootCauses,
          history: session.answers,
          masteryUpdates
        });
        await localDB.markRecordsSynced([recordId]);
      } catch (e) {
        console.warn("Offline or sync failed, stored in IndexedDB for auto-sync on reconnect/login", e);
      }
    }
  };

  return (
    <div className="czg-app-layout">
      <Navbar
        currentTextbook={bundle.metadata.textbook_id}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSelectTextbook={() => {}}
        onOpenAdmin={() => setAdminModalOpen(true)}
        onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        isSidebarOpen={mobileSidebarOpen}
      />

      <div className="czg-main-body">
        <TOCSidebar
          chapters={bundle.chapters}
          selectedSection={selectedSection}
          onSelectSection={setSelectedSection}
          masteryMap={masteryMap}
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        <SectionWorkspace
          section={selectedSection}
          topicsById={topicsById}
          deps={bundle.dependencies}
          masteryMap={masteryMap}
          onStartDiagnosis={handleStartDiagnosis}
        />
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {adminModalOpen && (
        <AdminUserManagement
          onClose={() => setAdminModalOpen(false)}
        />
      )}

      {diagModalOpen && activeSession && (
        <DiagnosisModal
          key={activeSession.seed}
          isOpen={diagModalOpen}
          onClose={() => setDiagModalOpen(false)}
          graph={graph}
          initialSession={activeSession}
          topicsById={topicsById}
          onFinish={handleFinishDiagnosis}
        />
      )}
    </div>
  );
};
