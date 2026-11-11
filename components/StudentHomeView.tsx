"use client";

import React, { useState } from "react";
import { useConvexStore, DuelDoc, QuestionDoc } from "@/lib/mockConvexStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Star,
  Calendar,
  Swords,
  Target,
  BookOpen,
  KeyRound,
  Brain,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  UserPlus,
  Users,
  Copy,
  Check,
  Award,
  Layers,
  RotateCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type HomeTab = "duels" | "flashcards" | "archive" | "code";

export function StudentHomeView() {
  const {
    db,
    activeStudent,
    activeStudentId,
    setActiveStudentId,
    currentCourse,
    currentQuiz,
    setActiveCourseId,
    activeDuel,
    setActiveDuelId,
    getCourseBySubject,
    simulateEmptyTeacherWeek,
    setSimulateEmptyTeacherWeek,
    enterCourseOrQuizCode,
    createFriendDuelWithOpponent,
    openDuelPlayScreen,
    startPracticeMode,
    markFlashcardMastered,
  } = useConvexStore();

  const [activeTab, setActiveTab] = useState<HomeTab>("duels");
  const [codeInput, setCodeInput] = useState("");
  const [codeFeedback, setCodeFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);
  const [createdDuelBanner, setCreatedDuelBanner] = useState<DuelDoc | null>(
    null
  );

  // Cooperative Goal Checklist collapse
  const [showExamChecklist, setShowExamChecklist] = useState(false);

  // Flashcards state
  const [flashcardFilter, setFlashcardFilter] = useState<"bookmarks" | "course">(
    "bookmarks"
  );
  const [cardIndex, setCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // All duels where activeStudent is player1 or player2
  const studentDuels = db.duels.filter(
    (d) => d.player1Id === activeStudentId || d.player2Id === activeStudentId
  );

  const selectedDuel =
    studentDuels.find((d) => d._id === activeDuel._id) ||
    studentDuels[0] ||
    db.duels[0];

  const isSelectedPlayer1 = selectedDuel.player1Id === activeStudentId;
  const opponentId = isSelectedPlayer1
    ? selectedDuel.player2Id
    : selectedDuel.player1Id;
  const opponentUser =
    db.users.find((u) => u._id === opponentId) || db.users[1];

  // Calculate scores for selectedDuel
  const calcScores = (duel: DuelDoc) => {
    let p1 = 0;
    let p2 = 0;
    duel.rounds.forEach((r) => {
      p1 += r.player1Answers.filter((a) => a === "correct").length;
      p2 += r.player2Answers.filter((a) => a === "correct").length;
    });
    return { p1, p2 };
  };

  const { p1: scoreP1, p2: scoreP2 } = calcScores(selectedDuel);
  const myScore = isSelectedPlayer1 ? scoreP1 : scoreP2;
  const oppScore = isSelectedPlayer1 ? scoreP2 : scoreP1;

  // Determine turn status in currentRound of selectedDuel
  const currentRoundObj =
    selectedDuel.rounds.find(
      (r) => r.roundNumber === selectedDuel.currentRound
    ) || selectedDuel.rounds[0];

  const myRoundDone = isSelectedPlayer1
    ? currentRoundObj.player1Completed
    : currentRoundObj.player2Completed;

  const canIPlayNow =
    !selectedDuel.isFinished &&
    !myRoundDone &&
    (currentRoundObj.chosenSubjectId !== null ||
      currentRoundObj.chooserId === activeStudentId);

  const waitingForOpponentToChoose =
    !selectedDuel.isFinished &&
    !myRoundDone &&
    currentRoundObj.chosenSubjectId === null &&
    currentRoundObj.chooserId !== activeStudentId;

  // Build Flashcard Deck
  const allQuestions = db.quizzes.flatMap((q) => q.questions);
  const bookmarkedQuestions = allQuestions.filter((q) =>
    activeStudent.bookmarkedQuestionIds.includes(q.id)
  );
  const flashcardDeck: QuestionDoc[] =
    flashcardFilter === "bookmarks" && bookmarkedQuestions.length > 0
      ? bookmarkedQuestions
      : currentQuiz.questions;

  const activeFlashcard =
    flashcardDeck[cardIndex % Math.max(1, flashcardDeck.length)] ||
    currentQuiz.questions[0];

  const handleStartNewFriendDuel = (oppId: string) => {
    const created = createFriendDuelWithOpponent(oppId);
    setCreatedDuelBanner(created);
  };

  const handleCopyInvite = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
    } catch {
      // ignore
    }
    setCopiedInvite(code);
    setTimeout(() => setCopiedInvite(null), 1800);
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = enterCourseOrQuizCode(codeInput);
    setCodeFeedback({
      type: res.success ? "success" : "error",
      text: res.message,
    });
  };

  const triggerQuickCode = (sample: string) => {
    setCodeInput(sample);
    const res = enterCourseOrQuizCode(sample);
    setCodeFeedback({
      type: res.success ? "success" : "error",
      text: res.message,
    });
  };

  const coopUnlocked =
    currentCourse.coopRoundsCurrent >= currentCourse.coopRoundsTarget;
  const coopPercent = Math.min(
    100,
    Math.round(
      (currentCourse.coopRoundsCurrent / currentCourse.coopRoundsTarget) * 100
    )
  );

  const renderDot = (status: "correct" | "wrong" | "pending") => {
    if (status === "correct") {
      return (
        <span
          className="w-3.5 h-3.5 rounded-[4px] bg-emerald-500 inline-block"
          title="Richtig"
        />
      );
    }
    if (status === "wrong") {
      return (
        <span
          className="w-3.5 h-3.5 rounded-[4px] bg-rose-500 inline-block"
          title="Falsch"
        />
      );
    }
    return (
      <span
        className="w-3.5 h-3.5 rounded-[4px] bg-slate-200 inline-block"
        title="Offen"
      />
    );
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* TEST ACCOUNT SWITCHER BAR (4 Schüler-Accounts zum Testen der Fragen-Weitergabe) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Users className="w-4 h-4 text-slate-400" />
          <span>Test-Schüler wechseln:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {db.users.map((u) => {
            const active = u._id === activeStudentId;
            return (
              <button
                key={u._id}
                onClick={() => {
                  setActiveStudentId(u._id);
                  setCreatedDuelBanner(null);
                  setCardIndex(0);
                  setIsCardFlipped(false);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  active
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${u.colorClass}`}
                >
                  {u.avatar}
                </span>
                <span>{u.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. CLEAN STUDENT HEADER */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl font-bold text-base flex items-center justify-center shadow-sm ${activeStudent.colorClass}`}
            >
              {activeStudent.avatar}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {activeStudent.name} ({activeStudent.age}, {activeStudent.grade})
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Noch {currentCourse.examDaysLeft} Tage bis zur{" "}
                  {currentCourse.subjectLabel}-Klausur
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-amber-900">
                {activeStudent.streakDays} Tage
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-slate-800">
                {activeStudent.xp.toLocaleString("de-DE")} XP
              </span>
            </div>
          </div>
        </div>

        {/* COOPERATIVE COURSE GOAL BAR ("Kurs vs. Klausur") */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Kurs-Ziel ({currentCourse.subjectLabel}): Klausur-Checkliste</span>
            </div>
            <span className="text-xs font-black text-emerald-700">
              {currentCourse.coopRoundsCurrent} / {currentCourse.coopRoundsTarget} Runden
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${coopPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {coopUnlocked
                ? "🎉 Kurs-Ziel erreicht! Klausur-Checkliste ist freigeschaltet."
                : `Noch ${
                    currentCourse.coopRoundsTarget - currentCourse.coopRoundsCurrent
                  } gemeinsame Kurs-Runden bis zur Freischaltung!`}
            </span>
            <button
              onClick={() => setShowExamChecklist((prev) => !prev)}
              className="font-bold text-slate-800 hover:text-emerald-700 flex items-center gap-0.5 shrink-0"
            >
              <span>Checkliste</span>
              {showExamChecklist ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {showExamChecklist && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1"
              >
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700">
                    Klausur-Schwerpunkte von {currentCourse.teacherName}:
                  </div>
                  {currentCourse.examChecklist.map((tip, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs text-slate-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4-Tab App Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
          <button
            onClick={() => setActiveTab("duels")}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "duels"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Duelle ({studentDuels.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("flashcards")}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "flashcards"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lernkarten</span>
          </button>
          <button
            onClick={() => setActiveTab("archive")}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "archive"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Kurse ({db.courses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "code"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>
        </div>
      </div>

      {/* Smart-Mix Banner if Empty Teacher Week is active */}
      <AnimatePresence>
        {simulateEmptyTeacherWeek && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-indigo-50/90 border border-indigo-200 rounded-3xl p-5 space-y-3 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Brain className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  UNROT Smart-Mix • Spaced Repetition
                </span>
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {currentCourse.teacherName} hat noch kein neues Quiz hochgeladen – rette deine Streak mit 3 Wiederholungsfragen aus den letzten Wochen!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => startPracticeMode("smartmix")}
                className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition-all"
              >
                3 Smart-Mix Wiederholungsfragen starten →
              </button>
              <button
                onClick={() => setSimulateEmptyTeacherWeek(false)}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
              >
                Ausblenden
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* TAB 1: QUIZDUELL-MODUS (Freund einladen, Runden-Fachwahl) */}
      {/* ========================================================= */}
      {activeTab === "duels" && (
        <div className="space-y-5">
          {/* Friend Challenge & Invite Code Generator Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Freund zum Quizduell einladen (Abwechselnde Fachwahl)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">1 aus 3 Fächern</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {db.users
                .filter((u) => u._id !== activeStudentId)
                .map((friend) => (
                  <button
                    key={friend._id}
                    onClick={() => handleStartNewFriendDuel(friend._id)}
                    className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2 transition-all"
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${friend.colorClass}`}
                    >
                      {friend.avatar}
                    </span>
                    <span>+ Duell vs. {friend.name} starten</span>
                  </button>
                ))}
            </div>

            {/* Newly Created Duel Invite Code Banner */}
            {createdDuelBanner && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="text-xs text-emerald-950">
                  <span className="font-bold">Neues Duell erstellt!</span> Teile
                  diesen Einladungs-Code mit deinem Freund:{" "}
                  <strong className="font-mono text-sm">
                    {createdDuelBanner.inviteCode}
                  </strong>
                </div>
                <button
                  onClick={() => openDuelPlayScreen(createdDuelBanner._id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0"
                >
                  Runde 1 starten →
                </button>
              </div>
            )}
          </div>

          {/* Duel Selector Strip (All Duels of activeStudent) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {studentDuels.map((d) => {
              const isP1 = d.player1Id === activeStudentId;
              const opp =
                db.users.find(
                  (u) => u._id === (isP1 ? d.player2Id : d.player1Id)
                ) || db.users[1];
              const isSelected = d._id === selectedDuel._id;
              const sc = calcScores(d);
              const myS = isP1 ? sc.p1 : sc.p2;
              const opS = isP1 ? sc.p2 : sc.p1;

              const rObj =
                d.rounds.find((r) => r.roundNumber === d.currentRound) ||
                d.rounds[0];
              const myDone = isP1
                ? rObj.player1Completed
                : rObj.player2Completed;
              const isMyTurn =
                !d.isFinished &&
                !myDone &&
                (rObj.chosenSubjectId !== null ||
                  rObj.chooserId === activeStudentId);

              return (
                <button
                  key={d._id}
                  onClick={() => setActiveDuelId(d._id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-white border-2 border-slate-900 shadow-sm"
                      : "bg-white border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center ${opp.colorClass}`}
                    >
                      {opp.avatar}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>vs. {opp.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ({d.inviteCode})
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-500">
                        Runde {d.currentRound}/6 •{" "}
                        <span
                          className={
                            isMyTurn
                              ? "text-emerald-700 font-bold"
                              : "text-slate-400"
                          }
                        >
                          {isMyTurn ? "Du bist dran!" : `Warte auf ${opp.name}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    {myS} : {opS}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Focused 6x3 Duel Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                    Runde {selectedDuel.currentRound} von 6
                  </span>
                  <button
                    onClick={() => handleCopyInvite(selectedDuel.inviteCode)}
                    className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-600 flex items-center gap-1"
                    title="Einladungs-Code kopieren"
                  >
                    <span>Code: {selectedDuel.inviteCode}</span>
                    {copiedInvite === selectedDuel.inviteCode ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>

                <h2 className="text-xl font-bold text-slate-900">
                  {activeStudent.name} vs. {opponentUser.name}
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  {canIPlayNow
                    ? currentRoundObj.chosenSubjectId
                      ? `${opponentUser.name} hat ${
                          getCourseBySubject(currentRoundObj.chosenSubjectId)
                            .subjectLabel
                        } vorgelegt – jetzt bist du mit denselben 3 Fragen dran!`
                      : `Du bist dran: Wähle für Runde ${selectedDuel.currentRound} 1 aus 3 zufälligen Fächern!`
                    : `Warte auf ${opponentUser.name} in Runde ${selectedDuel.currentRound}`}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-center shrink-0">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Stand
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {myScore} : {oppScore}
                </div>
              </div>
            </div>

            {/* 6x3 Round Matrix with Chosen Subject per Round */}
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 space-y-2">
              <div className="grid grid-cols-12 text-[11px] font-semibold text-slate-400 pb-1.5 border-b border-slate-200/70">
                <div className="col-span-3">{activeStudent.name}</div>
                <div className="col-span-6 text-center">
                  Runde &amp; gewähltes Fach
                </div>
                <div className="col-span-3 text-right">{opponentUser.name}</div>
              </div>

              {selectedDuel.rounds.map((r) => {
                const isCurrent = r.roundNumber === selectedDuel.currentRound;
                const myAns = isSelectedPlayer1
                  ? r.player1Answers
                  : r.player2Answers;
                const oppAns = isSelectedPlayer1
                  ? r.player2Answers
                  : r.player1Answers;
                const chooserUser =
                  db.users.find((u) => u._id === r.chooserId) || activeStudent;
                const subjectLabel = r.chosenSubjectId
                  ? getCourseBySubject(r.chosenSubjectId).shortLabel
                  : `${chooserUser.name} wählt (1/3)`;

                return (
                  <div
                    key={r.roundNumber}
                    className={`grid grid-cols-12 items-center py-1.5 px-2.5 rounded-xl ${
                      isCurrent
                        ? "bg-white border border-slate-200 shadow-sm"
                        : ""
                    }`}
                  >
                    <div className="col-span-3 flex items-center gap-1.5">
                      {myAns.map((ans, idx) => (
                        <React.Fragment key={idx}>
                          {renderDot(ans)}
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="col-span-6 text-center">
                      <span
                        className={`text-xs ${
                          isCurrent
                            ? "text-slate-900 font-bold"
                            : "text-slate-500 font-medium"
                        }`}
                      >
                        R{r.roundNumber}: {subjectLabel}
                      </span>
                    </div>

                    <div className="col-span-3 flex items-center justify-end gap-1.5">
                      {oppAns.map((ans, idx) => (
                        <React.Fragment key={idx}>
                          {renderDot(ans)}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons: Play Turn OR Switch to Opponent Account to test Handoff! */}
            <div className="space-y-2.5 pt-1">
              {canIPlayNow ? (
                <button
                  onClick={() => openDuelPlayScreen(selectedDuel._id)}
                  className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Swords className="w-4 h-4" />
                  <span>
                    {currentRoundObj.chosenSubjectId
                      ? `Runde ${selectedDuel.currentRound} (${
                          getCourseBySubject(currentRoundObj.chosenSubjectId)
                            .subjectLabel
                        }) jetzt beantworten`
                      : `Runde ${selectedDuel.currentRound}: Fach auswählen & spielen`}
                  </span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 font-medium text-center">
                    {waitingForOpponentToChoose
                      ? `${opponentUser.name} ist dran, das Fach für Runde ${selectedDuel.currentRound} auszuwählen.`
                      : `Du hast Runde ${selectedDuel.currentRound} bereits gespielt! Jetzt ist ${opponentUser.name} mit genau denselben 3 Fragen dran.`}
                  </div>
                  <button
                    onClick={() => {
                      setActiveStudentId(opponentUser._id);
                      openDuelPlayScreen(selectedDuel._id);
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    <span>
                      Als „{opponentUser.name}“ weiterspielen (Fragen-Weitergabe testen) →
                    </span>
                  </button>
                </div>
              )}

              <button
                onClick={() => startPracticeMode("mistakes")}
                className="w-full py-3 px-4 rounded-2xl font-semibold text-xs sm:text-sm bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <Target className="w-4 h-4 text-slate-500" />
                <span>
                  Allein üben: Nur meine Fehler wiederholen (
                  {activeStudent.bookmarkedQuestionIds.length})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: LERNKARTEN (ACTIVE RECALL) & KLAUSUR-FITNESS       */}
      {/* ========================================================= */}
      {activeTab === "flashcards" && (
        <div className="space-y-5">
          {/* Interactive Flip-Card Box */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Interaktive Lernkarten (Active Recall)
                </h2>
                <p className="text-xs text-slate-500">
                  Klicke auf die Karte zum Umdrehen – perfekt vor der Klausur
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => {
                    setFlashcardFilter("bookmarks");
                    setCardIndex(0);
                    setIsCardFlipped(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    flashcardFilter === "bookmarks"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  Merkliste ({bookmarkedQuestions.length})
                </button>
                <button
                  onClick={() => {
                    setFlashcardFilter("course");
                    setCardIndex(0);
                    setIsCardFlipped(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    flashcardFilter === "course"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  {currentCourse.shortLabel} ({currentQuiz.questions.length})
                </button>
              </div>
            </div>

            {activeFlashcard && (
              <div className="space-y-4">
                <div
                  onClick={() => setIsCardFlipped((prev) => !prev)}
                  className={`cursor-pointer rounded-2xl border-2 p-6 min-h-[210px] flex flex-col justify-between transition-all select-none ${
                    isCardFlipped
                      ? "bg-emerald-50/70 border-emerald-300"
                      : "bg-slate-50/80 hover:bg-slate-100/70 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                      {isCardFlipped ? "Rückseite (Lösung)" : "Vorderseite (Frage)"} •{" "}
                      Woche {activeFlashcard.week}
                    </span>
                    <span>
                      Karte {(cardIndex % flashcardDeck.length) + 1} /{" "}
                      {flashcardDeck.length}
                    </span>
                  </div>

                  {!isCardFlipped ? (
                    <div className="py-4 space-y-2">
                      {activeFlashcard.topicTag && (
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {activeFlashcard.topicTag}
                        </div>
                      )}
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {activeFlashcard.question}
                      </h3>
                    </div>
                  ) : (
                    <div className="py-3 space-y-2.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        ✓ Richtige Antwort:
                      </div>
                      <div className="text-base font-bold text-emerald-950 bg-white border border-emerald-200 rounded-xl p-3">
                        {activeFlashcard.options[activeFlashcard.correctIndex]}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed pt-1">
                        <strong>Erklärung:</strong> {activeFlashcard.aiExplanation}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 pt-2">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>
                      {isCardFlipped
                        ? "Klicken, um zurück zur Frage zu drehen"
                        : "Klicken, um Lösung & Erklärung aufzudecken"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      markFlashcardMastered(activeFlashcard.id, false);
                      setIsCardFlipped(false);
                      setCardIndex((prev) => prev + 1);
                    }}
                    className="py-3 px-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all"
                  >
                    Noch unsicher (Auf Merkliste behalten)
                  </button>
                  <button
                    onClick={() => {
                      markFlashcardMastered(activeFlashcard.id, true);
                      setIsCardFlipped(false);
                      setCardIndex((prev) => prev + 1);
                    }}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                  >
                    ✓ Sitzt sicher (+10 XP)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Klausur-Fitness Overview across Subjects */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-3.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Dein Klausur-Fitness-Barometer nach Fächern
              </h3>
              <p className="text-xs text-slate-500">
                Berechnet aus deinen Duell-Runden und gemeisterten Lernkarten
              </p>
            </div>

            <div className="space-y-2.5">
              {db.courses.map((course, idx) => {
                const quiz = db.quizzes.find((q) => q.courseId === course._id);
                const qCount = quiz ? quiz.questions.length : 9;
                const bookmarkedInCourse = quiz
                  ? quiz.questions.filter((q) =>
                      activeStudent.bookmarkedQuestionIds.includes(q.id)
                    ).length
                  : 0;
                const fitness = Math.min(
                  98,
                  Math.max(48, 86 - bookmarkedInCourse * 14 - (idx % 3) * 5)
                );

                return (
                  <div
                    key={course._id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">
                          {course.subjectLabel}{" "}
                          <span className="text-slate-400 font-normal">
                            ({course.teacherName})
                          </span>
                        </span>
                        <span
                          className={`font-black ${
                            fitness >= 75
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {fitness} % Klausur-Fit
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            fitness >= 75 ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${fitness}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {qCount} Fragen verfügbar • Noch {course.examDaysLeft} Tage bis zur Klausur
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveCourseId(course._id);
                        setFlashcardFilter("course");
                        setCardIndex(0);
                        setIsCardFlipped(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 shrink-0"
                    >
                      Karten ({qCount})
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ALLE FÄCHER & KURS-QUIZZE                          */}
      {/* ========================================================= */}
      {activeTab === "archive" && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Alle {db.courses.length} Unterrichtskurse &amp; Wochen-Decks
              </h2>
              <p className="text-xs text-slate-500">
                Inklusive neu angelegter Lehrer-Kurse und importierter Fragen
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {db.quizzes.map((quiz) => {
              const course =
                db.courses.find((c) => c._id === quiz.courseId) ||
                getCourseBySubject(quiz.subjectId);
              return (
                <div
                  key={quiz._id}
                  className="p-4 rounded-2xl border border-slate-200/90 hover:border-slate-300 bg-slate-50/50 flex items-center justify-between gap-4 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/80 text-slate-800">
                        {course.subjectLabel}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {course.roomCode}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {course.teacherName} • {quiz.questions.length} Fragen (
                      {course.weeks.length} Wochen)
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveCourseId(course._id);
                      startPracticeMode("smartmix", quiz.subjectId);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 shadow-sm flex items-center gap-1.5 shrink-0"
                  >
                    <span>Üben</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: CODE EINLÖSEN (Kurs-Code ODER Duell-Einladungs-Code) */}
      {/* ========================================================= */}
      {activeTab === "code" && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Kurs-Code oder Duell-Einladung eingeben
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gib einen Kurs-Code (z. B. BIO-Q1-7X9) oder den Duell-Code eines Freundes (z. B. DUEL-208) ein.
            </p>
          </div>

          <form onSubmit={handleCodeSubmit} className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="z. B. BIO-Q1-7X9 oder DUEL-208"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white transition-all shrink-0"
            >
              Einlösen
            </button>
          </form>

          {/* Quick-Test Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 mr-1">
              Schnell-Test:
            </span>
            {[
              { code: "DUEL-208", label: "Duell-Einladung (DUEL-208)" },
              { code: "DUEL-309", label: "Duell-Einladung (DUEL-309)" },
              { code: "BIO-Q1-7X9", label: "Biologie (BIO-Q1-7X9)" },
              { code: "INF-Q1-8C4", label: "Informatik (INF-Q1-8C4)" },
              { code: "123", label: "Falscher Code (123)" },
            ].map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => triggerQuickCode(item.code)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  item.code === "123"
                    ? "bg-rose-50/70 text-rose-700 border-rose-200 hover:bg-rose-100"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {codeFeedback && (
              <motion.div
                key={codeFeedback.text}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
                  codeFeedback.type === "error"
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : "bg-emerald-50 border-emerald-200 text-emerald-900"
                }`}
              >
                {codeFeedback.type === "error" ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{codeFeedback.text}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
