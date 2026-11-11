"use client";

import React, { useState, useMemo } from "react";
import {
  useConvexStore,
  QuestionDoc,
  UNROT_AI_PROMPT_TEMPLATE,
  parseUnrotBulkText,
} from "@/lib/mockConvexStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  RefreshCw,
  Pencil,
  Check,
  Play,
  FolderCheck,
  Lock,
  Copy,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Calendar,
  X,
  ClipboardPaste,
  UserPlus,
  Search,
  Trash2,
  Sparkles,
  Trophy,
  Share2,
} from "lucide-react";

const SAMPLE_BULK_IMPORT_TEXT = `WOCHE: 4 | Ökologie & Fotosynthese-Faktoren
THEMA: Temperaturabhängigkeit
FRAGE: Warum fällt die Fotosyntheserate bei Temperaturen über 40 °C bei den meisten heimischen Pflanzen rapide ab?
A: Weil Enzyme wie Rubisco durch Hitze denaturieren (ihre räumliche Struktur verlieren)
B: Weil Wassermoleküle bei 40 °C im Blatt gefrieren
C: Weil Chlorophyll bei Wärme kein grünes Licht mehr reflektiert
D: Weil die Mitochondrien das gesamte CO2 vernichten
RICHTIG: A
ERKLÄRUNG: Die Dunkelreaktion ist enzymgesteuert (Rubisco). Ab ca. 40 °C denaturieren die Proteine unumkehrbar (RGT-Regel-Grenze).
---
WOCHE: 4 | Ökologie & Fotosynthese-Faktoren
THEMA: Sonnen- vs. Schattenblatt
FRAGE: Wodurch unterscheidet sich ein Sonnenblatt anatomisch typischerweise von einem Schattenblatt derselben Buche?
A: Das Sonnenblatt ist dicker und besitzt ein mehrschichtiges Palisadengewebe mit mehr Chloroplasten
B: Das Sonnenblatt hat überhaupt keine Spaltöffnungen (Stomata)
C: Das Schattenblatt hat eine doppelt so dicke Kutikula wie das Sonnenblatt
D: Das Sonnenblatt besteht ausschließlich aus Schwammgewebe
RICHTIG: A
ERKLÄRUNG: Durch das mehrschichtige Palisadenparenchym kann das Sonnenblatt die hohe Lichtintensität optimal für eine höhere maximale Fotosyntheserate ausnutzen.
---
WOCHE: 4 | Ökologie & Fotosynthese-Faktoren
THEMA: C4- und CAM-Pflanzen
FRAGE: Welchen evolutionären Vorteil haben CAM-Pflanzen (z. B. Ananas, Kakteen) an extrem trockenen Standorten?
A: Sie öffnen ihre Spaltöffnungen nur nachts zur CO2-Aufnahme (Speicherung als Äpfelsäure) und sparen tagsüber Wasser
B: Sie benötigen überhaupt kein CO2 für den Aufbau von Glukose
C: Sie führen die Lichtreaktion in völliger Dunkelheit im Boden durch
D: Sie nehmen Kohlenstoff ausschließlich über die Wurzeln auf
RICHTIG: A
ERKLÄRUNG: Durch die zeitliche Trennung (nachts CO2-Fixierung in der Vakuole, tagsüber Calvin-Zyklus bei geschlossenen Stomata) minimieren CAM-Pflanzen den Wasserverlust.`;

export function TeacherCockpitView() {
  const {
    db,
    activeCourseId,
    setActiveCourseId,
    currentCourse,
    currentQuiz,
    setActiveView,
    setLiveStep,
    teacherPdfGenerated,
    setTeacherPdfGenerated,
    updateQuestionText,
    deleteQuestion,
    regenerateQuestionByAI,
    addCustomQuestion,
    addNewWeekToCourse,
    bulkImportQuestionsToCourse,
    createNewTeacherAndCourse,
    generateGapFollowUpQuestion,
    publishQuizToArchive,
  } = useConvexStore();

  const [selectedWeek, setSelectedWeek] = useState<"all" | number>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    question: string;
    options: [string, string, string, string];
    aiExplanation: string;
  } | null>(null);

  // Panels: "single" | "bulk" | "newTeacher" | "newWeek" | null
  const [activePanel, setActivePanel] = useState<
    "single" | "bulk" | "newTeacher" | "newWeek" | null
  >(null);

  // Single Question Form State
  const [newWeek, setNewWeek] = useState<number>(1);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newOptions, setNewOptions] = useState<[string, string, string, string]>([
    "",
    "",
    "",
    "",
  ]);
  const [newCorrectIndex, setNewCorrectIndex] = useState<number>(0);
  const [newExplanation, setNewExplanation] = useState("");
  const [newTopicTag, setNewTopicTag] = useState("");

  // New Week Inline State
  const [customWeekTitle, setCustomWeekTitle] = useState("");

  // Bulk Import State
  const [promptCustomTopic, setPromptCustomTopic] = useState(
    "Ökologie & Fotosynthese-Faktoren"
  );
  const [promptCustomWeek, setPromptCustomWeek] = useState(
    "4 | Ökologie & Fotosynthese-Faktoren"
  );
  const [bulkRawText, setBulkRawText] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  // New Teacher / Course State
  const [teacherNameInput, setTeacherNameInput] = useState("");
  const [subjectLabelInput, setSubjectLabelInput] = useState("Biologie");
  const [courseTitleInput, setCourseTitleInput] = useState("");
  const [firstWeekInput, setFirstWeekInput] = useState("");

  // Toasts
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 3500);
  };

  // Dynamic weeks of currentCourse
  const weekNumbers = useMemo(() => {
    const keys = Object.keys(currentCourse.weekTitles)
      .map(Number)
      .sort((a, b) => a - b);
    return keys.length > 0 ? keys : [1, 2, 3];
  }, [currentCourse.weekTitles]);

  // Live preview of bulk import text
  const parsedBulkPreview = useMemo(() => {
    if (!bulkRawText.trim()) return [];
    return parseUnrotBulkText(bulkRawText, weekNumbers[weekNumbers.length - 1] || 1);
  }, [bulkRawText, weekNumbers]);

  const customizedPrompt = useMemo(() => {
    return UNROT_AI_PROMPT_TEMPLATE.replace(
      "[DEIN THEMA HIER EINTRAGEN]",
      promptCustomTopic || currentCourse.subjectLabel
    ).replace(
      "[Z.B. 4 | Titel der Woche]",
      promptCustomWeek || "4 | Neues Wochenthema"
    );
  }, [promptCustomTopic, promptCustomWeek, currentCourse.subjectLabel]);

  const handleCopyPrompt = () => {
    try {
      navigator.clipboard.writeText(customizedPrompt);
    } catch {
      // ignore
    }
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleRunBulkImport = () => {
    if (parsedBulkPreview.length === 0) return;
    const count = bulkImportQuestionsToCourse(
      currentCourse._id,
      parsedBulkPreview
    );
    const importedWeek = parsedBulkPreview[0].week;
    setBulkRawText("");
    setActivePanel(null);
    setSelectedWeek(importedWeek);
    showToast(
      `${count} Fragen erfolgreich importiert und Woche ${importedWeek} zugeordnet!`
    );
  };

  const handleCreateSingleQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    let targetWeek = newWeek;
    if (newWeek === -1) {
      // User selected "+ Neue Woche anlegen" inside the form!
      targetWeek = addNewWeekToCourse(
        currentCourse._id,
        customWeekTitle || "Vertiefung & Klausurtraining"
      );
      setCustomWeekTitle("");
    }

    const filledOptions: [string, string, string, string] = [
      newOptions[0].trim() || "Antwort A",
      newOptions[1].trim() || "Antwort B",
      newOptions[2].trim() || "Antwort C",
      newOptions[3].trim() || "Antwort D",
    ];
    const created = addCustomQuestion(
      currentCourse._id,
      targetWeek,
      newQuestionText.trim(),
      filledOptions,
      newCorrectIndex,
      newExplanation,
      newTopicTag
    );
    setNewQuestionText("");
    setNewOptions(["", "", "", ""]);
    setNewExplanation("");
    setNewTopicTag("");
    setActivePanel(null);
    setSelectedWeek(targetWeek);
    setExpandedId(created.id);
    showToast(`Eigene Frage in Woche ${targetWeek} gespeichert!`);
  };

  const handleCreateNewWeekOnly = (e: React.FormEvent) => {
    e.preventDefault();
    const createdWeekNum = addNewWeekToCourse(
      currentCourse._id,
      customWeekTitle
    );
    setCustomWeekTitle("");
    setActivePanel(null);
    setSelectedWeek(createdWeekNum);
    showToast(`Woche ${createdWeekNum} wurde angelegt!`);
  };

  const handleCreateTeacherCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherNameInput.trim() || !subjectLabelInput.trim()) return;
    const created = createNewTeacherAndCourse(
      teacherNameInput,
      subjectLabelInput,
      courseTitleInput,
      firstWeekInput
    );
    setTeacherNameInput("");
    setCourseTitleInput("");
    setFirstWeekInput("");
    setActivePanel(null);
    setSelectedWeek("all");
    showToast(`Neuer Kurs „${created.title}“ (${created.roomCode}) angelegt!`);
  };

  const handleExportWeekAsText = () => {
    const formatted = filteredQuestions
      .map(
        (q) =>
          `WOCHE: ${q.week} | ${q.weekTopic.replace(/^Woche\s*\d+\s*:\s*/i, "")}\nTHEMA: ${
            q.topicTag || "Klausurstoff"
          }\nFRAGE: ${q.question}\nA: ${q.options[0]}\nB: ${q.options[1]}\nC: ${
            q.options[2]
          }\nD: ${q.options[3]}\nRICHTIG: ${String.fromCharCode(
            65 + q.correctIndex
          )}\nERKLÄRUNG: ${q.aiExplanation}`
      )
      .join("\n---\n");
    try {
      navigator.clipboard.writeText(formatted);
    } catch {
      // ignore
    }
    showToast(
      `${filteredQuestions.length} Fragen im UNROT-Format in die Zwischenablage kopiert!`
    );
  };

  const handleTriggerGenerator = () => {
    setIsGeneratingAll(true);
    setTimeout(() => {
      setIsGeneratingAll(false);
      setTeacherPdfGenerated(true);
    }, 1100);
  };

  const handleRegenerateSingle = (questionId: string) => {
    setRegeneratingId(questionId);
    setTimeout(() => {
      regenerateQuestionByAI(currentQuiz._id, questionId);
      setRegeneratingId(null);
    }, 400);
  };

  const startEditing = (q: QuestionDoc) => {
    setEditingId(q.id);
    setExpandedId(q.id);
    setEditDraft({
      question: q.question,
      options: [...q.options] as [string, string, string, string],
      aiExplanation: q.aiExplanation,
    });
  };

  const saveEditing = (questionId: string) => {
    if (!editDraft) return;
    updateQuestionText(
      currentQuiz._id,
      questionId,
      editDraft.question,
      editDraft.options,
      editDraft.aiExplanation
    );
    setEditingId(null);
    setEditDraft(null);
    showToast("Frage aktualisiert!");
  };

  const handleCopyCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
    } catch {
      // ignore
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const filteredQuestions = useMemo(() => {
    return currentQuiz.questions.filter((q) => {
      const matchesWeek = selectedWeek === "all" || q.week === selectedWeek;
      const cleanSearch = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !cleanSearch ||
        q.question.toLowerCase().includes(cleanSearch) ||
        (q.topicTag || "").toLowerCase().includes(cleanSearch) ||
        q.options.some((o) => o.toLowerCase().includes(cleanSearch));
      return matchesWeek && matchesSearch;
    });
  }, [currentQuiz.questions, selectedWeek, searchQuery]);

  const top3Gaps = [...currentQuiz.questions]
    .sort((a, b) => b.errorRatePercent - a.errorRatePercent)
    .slice(0, 3);

  const coopPercent = Math.min(
    100,
    Math.round(
      (currentCourse.coopRoundsCurrent / currentCourse.coopRoundsTarget) * 100
    )
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* 1. COURSE / TEACHER SELECTOR BAR + "+ NEUER LEHRER / KURS" */}
      <div className="space-y-4 border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {db.courses.map((course) => {
            const active = course._id === activeCourseId;
            return (
              <button
                key={course._id}
                onClick={() => {
                  setActiveCourseId(course._id);
                  setSelectedWeek("all");
                  setEditingId(null);
                  setActivePanel(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                  active
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{course.subjectLabel}</span>
                <span
                  className={`text-[10px] ${
                    active ? "text-slate-300" : "text-slate-400"
                  }`}
                >
                  ({course.teacherName})
                </span>
              </button>
            );
          })}

          {/* Button to Create a New Teacher / Course (including duplicate subjects!) */}
          <button
            onClick={() =>
              setActivePanel(activePanel === "newTeacher" ? null : "newTeacher")
            }
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Neuer Lehrer / Kurs</span>
          </button>
        </div>

        {/* New Teacher / Course Creator Drawer */}
        <AnimatePresence>
          {activePanel === "newTeacher" && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreateTeacherCourse}
              className="bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-md space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Neuen Lehrer &amp; Kurs anlegen (auch doppelte oder eigene Fächer möglich)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Erstellt sofort einen eigenen Kurs-Code, eine erste Woche und schaltet den Kurs für Schüler-Duelle frei.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Name der Lehrkraft *
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherNameInput}
                    onChange={(e) => setTeacherNameInput(e.target.value)}
                    placeholder="z. B. Frau Dr. Schulz"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fach (frei oder doppelt) *
                  </label>
                  <input
                    type="text"
                    required
                    list="subject-suggestions"
                    value={subjectLabelInput}
                    onChange={(e) => setSubjectLabelInput(e.target.value)}
                    placeholder="z. B. Biologie, Chemie, Spanisch..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                  <datalist id="subject-suggestions">
                    <option value="Biologie" />
                    <option value="Mathematik" />
                    <option value="Deutsch" />
                    <option value="Englisch" />
                    <option value="Geschichte" />
                    <option value="Musik" />
                    <option value="Informatik" />
                    <option value="Darstellendes Spiel" />
                    <option value="Religion & Ethik" />
                    <option value="Chemie" />
                    <option value="Physik" />
                    <option value="Spanisch" />
                    <option value="Politik & Wirtschaft" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kurs-Bezeichnung (optional)
                  </label>
                  <input
                    type="text"
                    value={courseTitleInput}
                    onChange={(e) => setCourseTitleInput(e.target.value)}
                    placeholder="z. B. Biologie LK Q2 (Frau Schulz)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thema für Woche 1
                  </label>
                  <input
                    type="text"
                    value={firstWeekInput}
                    onChange={(e) => setFirstWeekInput(e.target.value)}
                    placeholder="z. B. Genetik & DNA-Replikation"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                >
                  Lehrerkurs jetzt erstellen
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Course Header & Codes */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {currentCourse.title}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Lehrkraft: <strong>{currentCourse.teacherName}</strong> •{" "}
              {weekNumbers.length} Unterrichtswochen •{" "}
              {currentQuiz.questions.length} Fragen im Katalog
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleCopyCode(currentCourse.roomCode)}
              className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-left transition-colors flex items-center gap-2.5 shadow-sm"
            >
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Kurs-Code
                </div>
                <div className="text-sm font-bold font-mono text-slate-900">
                  {currentCourse.roomCode}
                </div>
              </div>
              {copiedCode === currentCourse.roomCode ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            <button
              onClick={() => handleCopyCode(currentCourse.shareCode)}
              className="bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-left transition-colors flex items-center gap-2.5 shadow-sm"
            >
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Direkt-Code
                </div>
                <div className="text-sm font-bold font-mono text-slate-900">
                  {currentCourse.shareCode}
                </div>
              </div>
              {copiedCode === currentCourse.shareCode ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {statusToast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold text-emerald-950 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusToast}</span>
            </div>
            <button
              onClick={() => setStatusToast(null)}
              className="text-xs text-emerald-700 hover:underline"
            >
              OK
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Action Toolbar: Bulk Import (Own AI), Single Question, New Week, or PDF Demo */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Fragen hinzufügen &amp; Wochen verwalten
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nutze deine eigene kostenlose KI per Copy &amp; Paste (Bulk-Import) oder erstelle einzelne Fragen.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* BULK IMPORT BUTTON (BYO AI!) */}
                <button
                  onClick={() =>
                    setActivePanel(activePanel === "bulk" ? null : "bulk")
                  }
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    activePanel === "bulk"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm"
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Bulk-Import (Eigene KI)</span>
                </button>

                {/* SINGLE QUESTION BUTTON */}
                <button
                  onClick={() => {
                    setNewWeek(
                      typeof selectedWeek === "number"
                        ? selectedWeek
                        : weekNumbers[weekNumbers.length - 1] || 1
                    );
                    setActivePanel(activePanel === "single" ? null : "single");
                  }}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                    activePanel === "single"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Einzelfrage</span>
                </button>

                {/* PDF DEMO GENERATOR BUTTON */}
                <button
                  onClick={handleTriggerGenerator}
                  disabled={isGeneratingAll}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5"
                  title="Demo-Skript einlesen"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Skript-Demo</span>
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* BULK IMPORT PANEL (Prompt Copy + Textarea + Auto-Parser)  */}
            {/* ========================================================= */}
            <AnimatePresence>
              {activePanel === "bulk" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase mb-1">
                        0 € API-Kosten • Bring Your Own AI
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        Fragen in Mengen aus ChatGPT, Claude oder Gemini einfügen
                      </h3>
                      <p className="text-xs text-slate-500">
                        1. Kopiere den Prompt oben in deine KI → 2. Füge die Antwort der KI unten ein → UNROT ordnet Woche, Titel, Frage und Lösung automatisch zu!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePanel(null)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Step 1: Prompt Builder & Copy Box */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Schritt 1: Vorlage-Prompt für deine KI (optional anpassen &amp; kopieren)
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-all"
                      >
                        {promptCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Prompt kopiert!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>KI-Prompt kopieren</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Gewünschtes Thema für den Prompt:
                        </label>
                        <input
                          type="text"
                          value={promptCustomTopic}
                          onChange={(e) => setPromptCustomTopic(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Ziel-Woche &amp; Wochentitel (erstellt bei Bedarf neue Woche):
                        </label>
                        <input
                          type="text"
                          value={promptCustomWeek}
                          onChange={(e) => setPromptCustomWeek(e.target.value)}
                          placeholder="z. B. 4 | Ökologie & Nachhaltigkeit"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                      {customizedPrompt}
                    </pre>
                  </div>

                  {/* Step 2: Paste Area */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-800">
                        Schritt 2: KI-Ausgabe hier gesammelt einfügen (beliebig viele Fragen mit --- getrennt)
                      </label>
                      <button
                        type="button"
                        onClick={() => setBulkRawText(SAMPLE_BULK_IMPORT_TEXT)}
                        className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Beispiel-Batch (3 Fragen für Woche 4) einfügen</span>
                      </button>
                    </div>

                    <textarea
                      rows={8}
                      value={bulkRawText}
                      onChange={(e) => setBulkRawText(e.target.value)}
                      placeholder={`WOCHE: 4 | Titel der Woche\nTHEMA: Stichwort\nFRAGE: Deine Frage?\nA: Option A\nB: Option B\nC: Option C\nD: Option D\nRICHTIG: A\nERKLÄRUNG: Kurze Erklärung...\n---`}
                      className="w-full p-3.5 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  {/* Step 3: Live Parser Preview & Import Button */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="text-xs">
                      {parsedBulkPreview.length > 0 ? (
                        <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          {parsedBulkPreview.length} Fragen automatisch erkannt (Woche{" "}
                          {Array.from(
                            new Set(parsedBulkPreview.map((p) => p.week))
                          ).join(", ")}
                          )
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Noch keine Fragen im Textfeld erkannt. Klicke oben rechts auf „Beispiel-Batch einfügen“ zum Testen!
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePanel(null)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        disabled={parsedBulkPreview.length === 0}
                        onClick={handleRunBulkImport}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-40 transition-all"
                      >
                        Alle {parsedBulkPreview.length} Fragen jetzt importieren
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* SINGLE QUESTION FORM (Supports creating a new week too!)  */}
            {/* ========================================================= */}
            <AnimatePresence>
              {activePanel === "single" && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateSingleQuestion}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Einzelne Frage für {currentCourse.title} erstellen
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActivePanel(null)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Unterrichtswoche wählen (oder neue Woche anlegen)
                      </label>
                      <select
                        value={newWeek}
                        onChange={(e) => setNewWeek(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
                      >
                        {weekNumbers.map((w) => (
                          <option key={w} value={w}>
                            {currentCourse.weekTitles[w]}
                          </option>
                        ))}
                        <option value={-1}>
                          + Neue Woche ({Math.max(...weekNumbers) + 1}) beim Speichern anlegen...
                        </option>
                      </select>
                    </div>

                    {newWeek === -1 ? (
                      <div>
                        <label className="block text-xs font-semibold text-emerald-700 mb-1">
                          Titel der neuen Woche {Math.max(...weekNumbers) + 1} *
                        </label>
                        <input
                          type="text"
                          required
                          value={customWeekTitle}
                          onChange={(e) => setCustomWeekTitle(e.target.value)}
                          placeholder="z. B. Ökologie & Klimawandel"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-500 text-xs text-slate-900"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Stichwort / Thema (optional)
                        </label>
                        <input
                          type="text"
                          value={newTopicTag}
                          onChange={(e) => setNewTopicTag(e.target.value)}
                          placeholder="z. B. Klausur-Schwerpunkt"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fragetext *
                    </label>
                    <input
                      type="text"
                      required
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="Wie lautet deine Frage an den Kurs?"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm text-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      4 Antwortmöglichkeiten (Klicke auf A–D für die richtige Lösung)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[0, 1, 2, 3].map((oIdx) => {
                        const isCorrect = newCorrectIndex === oIdx;
                        return (
                          <div key={oIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setNewCorrectIndex(oIdx)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                isCorrect
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </button>
                            <input
                              type="text"
                              required
                              value={newOptions[oIdx]}
                              onChange={(e) => {
                                const next = [...newOptions] as [
                                  string,
                                  string,
                                  string,
                                  string
                                ];
                                next[oIdx] = e.target.value;
                                setNewOptions(next);
                              }}
                              placeholder={
                                isCorrect
                                  ? `Antwort ${String.fromCharCode(
                                      65 + oIdx
                                    )} (Richtig)`
                                  : `Distraktor ${String.fromCharCode(
                                      65 + oIdx
                                    )}`
                              }
                              className={`w-full px-3 py-1.5 rounded-xl bg-white border text-xs text-slate-900 ${
                                isCorrect
                                  ? "border-emerald-500"
                                  : "border-slate-300"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kurze Erklärung bei Fehlern (optional)
                    </label>
                    <input
                      type="text"
                      value={newExplanation}
                      onChange={(e) => setNewExplanation(e.target.value)}
                      placeholder="Erscheint sofort, wenn ein Schüler im Duell falsch tippt..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePanel(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Frage speichern
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* ADD NEW WEEK MINI-FORM                                    */}
            {/* ========================================================= */}
            <AnimatePresence>
              {activePanel === "newWeek" && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateNewWeekOnly}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 overflow-hidden"
                >
                  <span className="text-xs font-bold text-slate-800 shrink-0">
                    Woche {Math.max(...weekNumbers) + 1} anlegen:
                  </span>
                  <input
                    type="text"
                    required
                    value={customWeekTitle}
                    onChange={(e) => setCustomWeekTitle(e.target.value)}
                    placeholder="Titel der neuen Woche (z. B. Genetik & Proteinbiosynthese)"
                    className="flex-1 w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white"
                    >
                      Woche hinzufügen
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePanel(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Loading Bar when converting PDF */}
            <AnimatePresence>
              {isGeneratingAll && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-900" />
                      Analysiere „{currentQuiz.sourceFileName}“...
                    </span>
                    <span className="text-slate-400">Sek II</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "5%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.05, ease: "easeInOut" }}
                      className="h-full bg-slate-900 rounded-full"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* WEEK FILTER TABS + SEARCH + QUESTION CATALOG */}
          {teacherPdfGenerated && !isGeneratingAll && (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 sm:px-5 border-b border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Fragenkatalog nach Unterrichtswoche
                    </h3>
                  </div>

                  {/* Search & Export QoL Bar */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Fragen durchsuchen..."
                        className="pl-8 pr-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                    <button
                      onClick={handleExportWeekAsText}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1"
                      title="Angezeigte Fragen im UNROT-Textformat kopieren"
                    >
                      <Share2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                  </div>
                </div>

                {/* Week Pills + "+ Neue Woche" Button */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setSelectedWeek("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedWeek === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    Alle Wochen ({currentQuiz.questions.length})
                  </button>
                  {weekNumbers.map((w) => {
                    const count = currentQuiz.questions.filter(
                      (q) => q.week === w
                    ).length;
                    return (
                      <button
                        key={w}
                        onClick={() => setSelectedWeek(w)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          selectedWeek === w
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                        }`}
                      >
                        {currentCourse.weekTitles[w] || `Woche ${w}`} ({count})
                      </button>
                    );
                  })}
                  <button
                    onClick={() =>
                      setActivePanel(
                        activePanel === "newWeek" ? null : "newWeek"
                      )
                    }
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all"
                  >
                    + Neue Woche
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {filteredQuestions.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-600">
                    Noch keine Fragen in dieser Ansicht vorhanden.
                  </p>
                  <button
                    onClick={() => setActivePanel("bulk")}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    + Jetzt per Bulk-Import oder Einzelfrage ergänzen
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredQuestions.map((q, idx) => {
                    const isEditing = editingId === q.id;
                    const isRegenerating = regeneratingId === q.id;
                    const isExpanded = expandedId === q.id || isEditing;

                    return (
                      <div
                        key={q.id}
                        className={`p-4 sm:p-5 transition-colors ${
                          isRegenerating
                            ? "bg-slate-50 opacity-60"
                            : "hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : q.id)
                            }
                            className="flex-1 text-left flex items-start gap-3"
                          >
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                  Woche {q.week}
                                </span>
                                {q.topicTag && (
                                  <span className="text-[11px] font-medium text-slate-400">
                                    • {q.topicTag}
                                  </span>
                                )}
                                {q.isCustom && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    Neu / Importiert
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-slate-900 leading-snug">
                                {q.question}
                              </p>
                              {!isExpanded && (
                                <p className="text-xs text-emerald-700 font-medium">
                                  ✓ {q.options[q.correctIndex]}
                                </p>
                              )}
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            {isEditing ? (
                              <button
                                onClick={() => saveEditing(q.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Speichern</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => startEditing(q)}
                                className="px-2 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 flex items-center gap-1"
                                title="Frage bearbeiten"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              onClick={() => handleRegenerateSingle(q.id)}
                              disabled={isRegenerating}
                              className="px-2 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 flex items-center gap-1"
                              title="Alternative Fragenvariante"
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${
                                  isRegenerating ? "animate-spin" : ""
                                }`}
                              />
                            </button>

                            <button
                              onClick={() => {
                                deleteQuestion(currentQuiz._id, q.id);
                                showToast("Frage entfernt.");
                              }}
                              className="px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                              title="Frage löschen"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : q.id)
                              }
                              className="p-1 text-slate-400 hover:text-slate-700"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="pl-9 pt-3 space-y-3 overflow-hidden"
                            >
                              {isEditing && editDraft ? (
                                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                  <input
                                    type="text"
                                    value={editDraft.question}
                                    onChange={(e) =>
                                      setEditDraft({
                                        ...editDraft,
                                        question: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-sm text-slate-900"
                                  />
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {editDraft.options.map((opt, oIdx) => (
                                      <div
                                        key={oIdx}
                                        className="flex items-center gap-2"
                                      >
                                        <span
                                          className={`w-5 h-5 rounded text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                            oIdx === q.correctIndex
                                              ? "bg-emerald-600 text-white"
                                              : "bg-slate-200 text-slate-600"
                                          }`}
                                        >
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) => {
                                            const nextOpts = [
                                              ...editDraft.options,
                                            ] as [
                                              string,
                                              string,
                                              string,
                                              string
                                            ];
                                            nextOpts[oIdx] = e.target.value;
                                            setEditDraft({
                                              ...editDraft,
                                              options: nextOpts,
                                            });
                                          }}
                                          className="w-full px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs text-slate-800"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <textarea
                                    rows={2}
                                    value={editDraft.aiExplanation}
                                    onChange={(e) =>
                                      setEditDraft({
                                        ...editDraft,
                                        aiExplanation: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {q.options.map((opt, oIdx) => {
                                      const isCorrect = oIdx === q.correctIndex;
                                      return (
                                        <div
                                          key={oIdx}
                                          className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 border ${
                                            isCorrect
                                              ? "bg-emerald-50/70 border-emerald-200 text-emerald-950 font-semibold"
                                              : "bg-slate-50/70 border-slate-200/70 text-slate-600"
                                          }`}
                                        >
                                          <span
                                            className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                              isCorrect
                                                ? "bg-emerald-600 text-white"
                                                : "bg-slate-200/80 text-slate-600"
                                            }`}
                                          >
                                            {String.fromCharCode(65 + oIdx)}
                                          </span>
                                          <span>{opt}</span>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 leading-relaxed">
                                    <span className="font-semibold text-slate-800">
                                      Erklärung bei Fehlern:{" "}
                                    </span>
                                    {q.aiExplanation}
                                  </div>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (4 Cols): Start, Cooperative Goal & 1-Click Gap Follow-Up */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Start & Share */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Im Unterricht einsetzen
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Starte das Quiz mit 15s-Countdown am Beamer oder schalte es im Kurs-Archiv frei.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setLiveStep(0);
                  setActiveView("live");
                }}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Live-Quiz jetzt starten (5 Min.)</span>
              </button>

              <button
                onClick={() => {
                  publishQuizToArchive(currentQuiz._id);
                  showToast(
                    `Im Kurs-Archiv (${currentCourse.roomCode}) veröffentlicht!`
                  );
                }}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-slate-100 hover:bg-slate-200/80 text-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <FolderCheck className="w-4 h-4 text-slate-600" />
                <span>Direkt ins Kurs-Archiv freigeben</span>
              </button>
            </div>
          </div>

          {/* Card 2: Cooperative Course Goal ("Kurs vs. Klausur") */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900">
                  Kurs-Wochenziel („Kurs vs. Klausur“)
                </h2>
              </div>
              <span className="text-xs font-bold text-emerald-700">
                {currentCourse.coopRoundsCurrent} /{" "}
                {currentCourse.coopRoundsTarget} Runden
              </span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${coopPercent}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all"
              />
            </div>

            <p className="text-xs text-slate-500 leading-snug">
              Sobald der Kurs gemeinsam{" "}
              <strong>{currentCourse.coopRoundsTarget} Duell-Runden</strong>{" "}
              erreicht, wird deine Klausur-Checkliste automatisch in der Schüler-App freigeschaltet.
            </p>
          </div>

          {/* Card 3: Top-3 Knowledge Gaps + 1-Click Follow-Up Generator */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Top-3 Wissenslücken ({currentCourse.shortLabel})
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                  Anonym
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Erzeuge mit 1 Klick eine gezielte Vertiefungsfrage für die nächste Stunde.
              </p>
            </div>

            <div className="space-y-3">
              {top3Gaps.map((gap) => {
                const isHigh = gap.errorRatePercent >= 55;
                return (
                  <div
                    key={gap.id}
                    className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Woche {gap.week} • {gap.topicTag}
                      </span>
                      <span
                        className={`font-bold ${
                          isHigh ? "text-rose-600" : "text-amber-600"
                        }`}
                      >
                        {gap.errorRatePercent} % Fehler
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-snug">
                      {gap.gapDescription || gap.question}
                    </p>

                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${gap.errorRatePercent}%` }}
                        className={`h-full rounded-full ${
                          isHigh ? "bg-rose-500" : "bg-amber-500"
                        }`}
                      />
                    </div>

                    {/* 1-Click Follow-Up Question Generator */}
                    <button
                      onClick={() => {
                        const created = generateGapFollowUpQuestion(
                          currentCourse._id,
                          gap
                        );
                        setSelectedWeek(gap.week);
                        setExpandedId(created.id);
                        showToast(
                          `Vertiefungsfrage zu „${gap.topicTag}“ für Woche ${gap.week} erstellt!`
                        );
                      }}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>
                        + Vertiefungsfrage aus dieser Lücke generieren
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-700 font-semibold">
                  Privat-Duelle sind anonymisiert:
                </strong>{" "}
                Keine Einsicht in einzelne Schüler oder Spielzeiten.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
