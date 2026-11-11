"use client";

import React, { useState } from "react";
import { useConvexStore, QuestionDoc } from "@/lib/mockConvexStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Bookmark,
  ShieldCheck,
  HelpCircle,
  Users,
  Sparkles,
  Swords,
  Zap,
  Scissors,
} from "lucide-react";

export function ActiveDuelView() {
  const {
    db,
    duelMode,
    activeStudent,
    activeStudentId,
    setActiveStudentId,
    currentCourse,
    currentQuiz,
    activeDuel,
    getQuestionById,
    getCourseBySubject,
    setActiveView,
    chooseSubjectForRound,
    recordPlayerRoundAnswer,
    completePlayerRoundTurn,
    toggleBookmarkQuestion,
  } = useConvexStore();

  const [stepIndex, setStepIndex] = useState<number>(0); // 0, 1, 2, or 3 (Round Complete)
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [roundResults, setRoundResults] = useState<boolean[]>([]);
  const [lockedRoundNum, setLockedRoundNum] = useState<number>(
    activeDuel.currentRound
  );

  // Quizduell Jokers (once per round)
  const [used5050InRound, setUsed5050InRound] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [usedDoubleXpInRound, setUsedDoubleXpInRound] = useState(false);
  const [doubleXpActiveThisQuestion, setDoubleXpActiveThisQuestion] =
    useState(false);

  // Sync lockedRoundNum when switching duel or student
  React.useEffect(() => {
    setLockedRoundNum(activeDuel.currentRound);
    setStepIndex(0);
    setSelectedOption(null);
    setRoundResults([]);
    setUsed5050InRound(false);
    setEliminatedOptions([]);
    setUsedDoubleXpInRound(false);
    setDoubleXpActiveThisQuestion(false);
  }, [activeDuel._id, activeStudentId, duelMode]);

  const isPlayer1 = activeDuel.player1Id === activeStudentId;
  const opponentId = isPlayer1 ? activeDuel.player2Id : activeDuel.player1Id;
  const opponentUser =
    db.users.find((u) => u._id === opponentId) || db.users[1];

  const roundObj =
    activeDuel.rounds.find((r) => r.roundNumber === lockedRoundNum) ||
    activeDuel.rounds[0];

  const myAlreadyCompleted = isPlayer1
    ? roundObj.player1Completed
    : roundObj.player2Completed;
  const oppAlreadyCompleted = isPlayer1
    ? roundObj.player2Completed
    : roundObj.player1Completed;

  // Determine the 3 questions for this session
  const roundQuestions: QuestionDoc[] = React.useMemo(() => {
    if (duelMode === "mistakes") {
      const allQ = db.quizzes.flatMap((q) => q.questions);
      const bookmarked = allQ.filter((q) =>
        activeStudent.bookmarkedQuestionIds.includes(q.id)
      );
      if (bookmarked.length >= 3) return bookmarked.slice(0, 3);
      return [...bookmarked, ...currentQuiz.questions].slice(0, 3);
    }

    if (duelMode === "smartmix") {
      return currentQuiz.questions.slice(0, 3);
    }

    // Friend Duel Mode: use the exact locked questionIds of this round!
    if (roundObj.questionIds.length > 0) {
      return roundObj.questionIds
        .map((id) => getQuestionById(id))
        .filter((q): q is QuestionDoc => Boolean(q));
    }

    return currentQuiz.questions.slice(0, 3);
  }, [
    duelMode,
    db.quizzes,
    activeStudent.bookmarkedQuestionIds,
    currentQuiz.questions,
    roundObj.questionIds,
    getQuestionById,
  ]);

  const currentQuestion = roundQuestions[stepIndex] || roundQuestions[0];
  const isFinished = stepIndex >= 3;
  const isBookmarked =
    currentQuestion &&
    activeStudent.bookmarkedQuestionIds.includes(currentQuestion.id);

  // Total duel scores
  let totalMyScore = 0;
  let totalOppScore = 0;
  activeDuel.rounds.forEach((r) => {
    const mAns = isPlayer1 ? r.player1Answers : r.player2Answers;
    const oAns = isPlayer1 ? r.player2Answers : r.player1Answers;
    totalMyScore += mAns.filter((a) => a === "correct").length;
    totalOppScore += oAns.filter((a) => a === "correct").length;
  });

  const handleActivate5050 = () => {
    if (used5050InRound || selectedOption !== null || !currentQuestion) return;
    const wrongIndices = [0, 1, 2, 3].filter(
      (i) => i !== currentQuestion.correctIndex
    );
    // Eliminate 2 wrong options
    const toEliminate = wrongIndices.slice(0, 2);
    setEliminatedOptions(toEliminate);
    setUsed5050InRound(true);
  };

  const handleActivateDoubleXp = () => {
    if (usedDoubleXpInRound || selectedOption !== null) return;
    setUsedDoubleXpInRound(true);
    setDoubleXpActiveThisQuestion(true);
  };

  const handleSelectOption = (optionIndex: number) => {
    if (
      selectedOption !== null ||
      !currentQuestion ||
      eliminatedOptions.includes(optionIndex)
    )
      return;
    setSelectedOption(optionIndex);

    const isCorrect = optionIndex === currentQuestion.correctIndex;
    setRoundResults((prev) => [...prev, isCorrect]);

    const earnedXp = doubleXpActiveThisQuestion ? 40 : 20;

    if (duelMode === "friend_duel") {
      recordPlayerRoundAnswer(
        activeDuel._id,
        roundObj.roundNumber,
        stepIndex,
        currentQuestion.id,
        isCorrect,
        earnedXp
      );
    }
  };

  const handleNextQuestion = () => {
    setEliminatedOptions([]);
    setDoubleXpActiveThisQuestion(false);
    if (stepIndex < 2) {
      setSelectedOption(null);
      setStepIndex((prev) => prev + 1);
    } else {
      setSelectedOption(null);
      setStepIndex(3);
      if (duelMode === "friend_duel") {
        completePlayerRoundTurn(activeDuel._id, roundObj.roundNumber);
      }
    }
  };

  const correctCount = roundResults.filter(Boolean).length;
  const oppRoundAnswers = isPlayer1
    ? roundObj.player2Answers
    : roundObj.player1Answers;

  // Check if we need to show the "Choose 1 of 3 Random Subjects" screen first
  const needsSubjectChoice =
    duelMode === "friend_duel" &&
    !isFinished &&
    roundObj.chosenSubjectId === null;

  const isMyTurnToChooseSubject = roundObj.chooserId === activeStudentId;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
      {/* Top Bar: Back Button + Quick Account Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => setActiveView("home")}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Zurück zur Übersicht</span>
        </button>

        {/* Quick Account Switcher for Testing Question Handoff */}
        <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">
            Account:
          </span>
          {db.users.map((u) => (
            <button
              key={u._id}
              onClick={() => setActiveStudentId(u._id)}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                u._id === activeStudentId
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {u.name}
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================= */}
      {/* PHASE 1: CHOOSE 1 OF 3 RANDOM SUBJECTS FOR THIS ROUND (QUIZDUELL) */}
      {/* ================================================================= */}
      {needsSubjectChoice && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {isMyTurnToChooseSubject ? (
            <>
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Sparkles className="w-3.5 h-3.5" />
                  Runde {roundObj.roundNumber} von 6 • Du hast die Fachwahl!
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Wähle 1 von 3 zufälligen Fächern für Runde {roundObj.roundNumber}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Du legst die 3 Fragen vor – danach muss{" "}
                  <strong>{opponentUser.name}</strong> in Runde{" "}
                  {roundObj.roundNumber} exakt dieselben 3 Fragen beantworten. In der nächsten Runde wählt dann {opponentUser.name}.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {roundObj.candidateSubjects.map((subjId) => {
                  const course = getCourseBySubject(subjId);
                  const quiz = db.quizzes.find((q) => q.subjectId === subjId)!;

                  return (
                    <button
                      key={subjId}
                      onClick={() =>
                        chooseSubjectForRound(
                          activeDuel._id,
                          roundObj.roundNumber,
                          subjId
                        )
                      }
                      className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-slate-900 bg-slate-50/60 hover:bg-white text-left transition-all flex items-center justify-between gap-4 group shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-900">
                            {course.subjectLabel}
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            ({course.teacherName})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          {quiz.title}
                        </p>
                      </div>

                      <span className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white group-hover:bg-emerald-600 transition-colors shrink-0 flex items-center gap-1.5">
                        <span>Wählen</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900">
                  In Runde {roundObj.roundNumber} ist {opponentUser.name} mit der Fachwahl dran!
                </h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Wechsle kurz auf {opponentUser.name}s Account, um 1 aus 3 Fächern für Runde {roundObj.roundNumber} auszuwählen und vorzulegen.
                </p>
              </div>
              <button
                onClick={() => setActiveStudentId(opponentUser._id)}
                className="px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all inline-flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>Jetzt als {opponentUser.name} Fach wählen &amp; spielen →</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* IF THIS PLAYER ALREADY COMPLETED THIS ROUND -> PROMPT HANDOFF     */}
      {/* ================================================================= */}
      {!needsSubjectChoice &&
        duelMode === "friend_duel" &&
        myAlreadyCompleted &&
        !isFinished && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900">
                Du hast Runde {roundObj.roundNumber} bereits abgeschlossen!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Jetzt ist <strong>{opponentUser.name}</strong> mit genau denselben 3 Fragen aus{" "}
                <strong>
                  {roundObj.chosenSubjectId
                    ? getCourseBySubject(roundObj.chosenSubjectId).subjectLabel
                    : currentCourse.subjectLabel}
                </strong>{" "}
                an der Reihe.
              </p>
            </div>

            <button
              onClick={() => setActiveStudentId(opponentUser._id)}
              className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>
                Zu {opponentUser.name}s Account wechseln &amp; dieselben 3 Fragen beantworten →
              </span>
            </button>
          </div>
        )}

      {/* ================================================================= */}
      {/* PHASE 2: ACTIVE QUESTION CARD (Questions 1/3, 2/3, 3/3)           */}
      {/* ================================================================= */}
      {!needsSubjectChoice &&
        !(duelMode === "friend_duel" && myAlreadyCompleted) &&
        !isFinished &&
        currentQuestion && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            {/* Header & Segmented Progress Bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-slate-400" />
                  {duelMode === "mistakes"
                    ? "Fehler-Training • Eigene Merkliste"
                    : duelMode === "smartmix"
                    ? `Übungsmodus • ${currentCourse.subjectLabel}`
                    : `Runde ${roundObj.roundNumber} (${
                        getCourseBySubject(
                          roundObj.chosenSubjectId || "bio"
                        ).subjectLabel
                      }) • ${activeStudent.name} vs. ${opponentUser.name}`}
                </span>
                <span className="text-slate-900 font-bold">
                  Frage {stepIndex + 1} / 3
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((idx) => {
                  const answered = idx < roundResults.length;
                  const wasRight = roundResults[idx];
                  const isActive = idx === stepIndex;

                  return (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        answered
                          ? wasRight
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                          : isActive
                          ? "bg-slate-900"
                          : "bg-slate-100"
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Question Text & Week Badge */}
            <div className="space-y-1.5 py-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">
                  Woche {currentQuestion.week}
                </span>
                {currentQuestion.topicTag && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    • {currentQuestion.topicTag}
                  </span>
                )}
                {currentQuestion.isCustom && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Eigene Lehrer-Frage
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                {currentQuestion.question}
              </h2>
            </div>

            {/* QUIZDUELL JOKERS BAR (50:50 & 2x XP Booster) */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5">
              <span className="text-[11px] font-bold text-slate-500 pl-1">
                Runden-Joker:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleActivate5050}
                  disabled={used5050InRound || selectedOption !== null}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                    eliminatedOptions.length > 0
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : used5050InRound
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-sm"
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>
                    {eliminatedOptions.length > 0
                      ? "50:50 aktiv (-2)"
                      : used5050InRound
                      ? "50:50 genutzt"
                      : "50:50-Joker"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleActivateDoubleXp}
                  disabled={usedDoubleXpInRound || selectedOption !== null}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                    doubleXpActiveThisQuestion
                      ? "bg-amber-500 text-white border-amber-500"
                      : usedDoubleXpInRound
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-white hover:bg-amber-50 text-amber-800 border-amber-200 shadow-sm"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>
                    {doubleXpActiveThisQuestion
                      ? "2x XP aktiv (+40 XP)"
                      : usedDoubleXpInRound
                      ? "2x XP genutzt"
                      : "2x-XP-Booster"}
                  </span>
                </button>
              </div>
            </div>

            {/* 4 Answer Options */}
            <div className="space-y-2.5">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQuestion.correctIndex;
                const hasAnswered = selectedOption !== null;
                const isEliminated = eliminatedOptions.includes(idx);

                let tileClass =
                  "bg-slate-50/70 hover:bg-slate-100/80 border-slate-200 text-slate-900";
                let letterClass =
                  "bg-white border border-slate-200 text-slate-700";

                if (isEliminated && !hasAnswered) {
                  tileClass =
                    "bg-slate-50/30 border-slate-200/40 text-slate-300 line-through cursor-not-allowed opacity-55";
                  letterClass =
                    "bg-slate-100 border-slate-200/40 text-slate-300";
                } else if (hasAnswered) {
                  if (isCorrect) {
                    tileClass =
                      "bg-emerald-50 border-emerald-500 text-emerald-950";
                    letterClass =
                      "bg-emerald-600 border-emerald-600 text-white";
                  } else if (isSelected && !isCorrect) {
                    tileClass = "bg-rose-50 border-rose-400 text-rose-950";
                    letterClass = "bg-rose-500 border-rose-500 text-white";
                  } else {
                    tileClass =
                      "bg-slate-50/40 border-slate-200/50 text-slate-400";
                    letterClass =
                      "bg-slate-100 border-slate-200/50 text-slate-400";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={hasAnswered || isEliminated}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 ${tileClass}`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${letterClass}`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm font-semibold leading-snug">
                        {opt}
                      </span>
                    </div>

                    {isEliminated && !hasAnswered && (
                      <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">
                        50:50
                      </span>
                    )}

                    {hasAnswered && isCorrect && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold">
                            +{doubleXpActiveThisQuestion ? 40 : 20} XP
                          </span>
                        )}
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                    )}

                    {hasAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Opponent Comparison Pill if Opponent already answered this question! */}
            {selectedOption !== null &&
              duelMode === "friend_duel" &&
              oppAlreadyCompleted && (
                <div className="px-3.5 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>
                    Vergleich mit {opponentUser.name} bei Frage {stepIndex + 1}:
                  </span>
                  <span
                    className={
                      oppRoundAnswers[stepIndex] === "correct"
                        ? "text-emerald-700 font-bold"
                        : "text-rose-600 font-bold"
                    }
                  >
                    {opponentUser.name} lag{" "}
                    {oppRoundAnswers[stepIndex] === "correct"
                      ? "✓ richtig"
                      : "✗ falsch"}
                  </span>
                </div>
              )}

            {/* Immediate Feedback & Explanation */}
            <AnimatePresence mode="wait">
              {selectedOption !== null && (
                <motion.div
                  key={`exp-${currentQuestion.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 pt-1"
                >
                  {selectedOption === currentQuestion.correctIndex ? (
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-emerald-900">
                          Richtig beantwortet (+
                          {doubleXpActiveThisQuestion ? "40 XP • 2x Booster!" : "20 XP"})
                        </div>
                        <p className="text-xs text-emerald-800 leading-relaxed">
                          {currentQuestion.aiExplanation}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <HelpCircle className="w-4 h-4 text-slate-700" />
                        <span>Kurz erklärt:</span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {currentQuestion.aiExplanation}
                      </p>

                      <button
                        onClick={() =>
                          toggleBookmarkQuestion(currentQuestion.id)
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                          isBookmarked
                            ? "bg-amber-50 text-amber-900 border-amber-200"
                            : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 ${
                            isBookmarked
                              ? "fill-amber-500 text-amber-500"
                              : "text-slate-400"
                          }`}
                        />
                        <span>
                          {isBookmarked
                            ? "Für Fehler-Training gemerkt"
                            : "Frage für späteres Fehler-Training merken"}
                        </span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleNextQuestion}
                    className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>
                      {stepIndex < 2
                        ? `Weiter zu Frage ${stepIndex + 2} von 3`
                        : `Runde ${roundObj.roundNumber} abschließen`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      {/* ================================================================= */}
      {/* PHASE 3: ROUND COMPLETION & MULTI-ACCOUNT HANDOFF                 */}
      {/* ================================================================= */}
      {isFinished && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-center"
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200">
              <Flame className="w-6 h-6 text-amber-500 fill-amber-500" />
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  {activeStudent.name}s Tages-Streak
                </div>
                <div className="text-lg font-black text-slate-900">
                  🔥 {activeStudent.streakDays} Tage aktiv
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900">
              {correctCount} von 3 Fragen richtig!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Runde abgeschlossen (+1 für das Kurs-Ziel) • Gesamtstand:{" "}
              <strong className="text-slate-800">
                {activeStudent.xp.toLocaleString("de-DE")} XP
              </strong>
            </p>
          </div>

          {/* Round Comparison Box */}
          {duelMode === "friend_duel" && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 text-left">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-b border-slate-200/70 pb-2">
                <span>
                  Runde {roundObj.roundNumber} •{" "}
                  {
                    getCourseBySubject(roundObj.chosenSubjectId || "bio")
                      .subjectLabel
                  }
                </span>
                <span className="text-slate-900 font-bold">
                  Gesamtstand: {totalMyScore} : {totalOppScore}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900">
                    {activeStudent.name} (Du)
                  </div>
                  <div className="flex items-center gap-1.5">
                    {roundResults.map((ok, i) => (
                      <span
                        key={i}
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white ${
                          ok ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      >
                        {ok ? "✓" : "✗"}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900">
                    {opponentUser.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {oppAlreadyCompleted
                      ? oppRoundAnswers.map((ans, i) => (
                          <span
                            key={i}
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white ${
                              ans === "correct"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          >
                            {ans === "correct" ? "✓" : "✗"}
                          </span>
                        ))
                      : [0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400"
                          >
                            ?
                          </span>
                        ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Next Action: Either Handoff to Opponent OR Start Next Round! */}
          {duelMode === "friend_duel" && !oppAlreadyCompleted ? (
            <div className="space-y-3">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-left">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm font-medium text-emerald-950 leading-relaxed">
                  Du hast vorgelegt! {opponentUser.name} bekommt jetzt in Runde{" "}
                  {roundObj.roundNumber} exakt dieselben 3 Fragen. Wechsle direkt auf {opponentUser.name}s Account, um den Gegenzug zu spielen!
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveStudentId(opponentUser._id);
                }}
                className="w-full py-4 px-5 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>
                  Jetzt als „{opponentUser.name}“ genau diese 3 Fragen nachspielen →
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm font-medium text-slate-700">
                Runde {roundObj.roundNumber} ist von beiden Spielern abgeschlossen! In{" "}
                <strong>Runde {activeDuel.currentRound}</strong> darfst du jetzt{" "}
                <strong>1 aus 3 zufälligen Fächern</strong> für den nächsten Durchgang auswählen!
              </div>

              <button
                onClick={() => {
                  setLockedRoundNum(activeDuel.currentRound);
                  setStepIndex(0);
                  setSelectedOption(null);
                  setRoundResults([]);
                  setUsed5050InRound(false);
                  setEliminatedOptions([]);
                  setUsedDoubleXpInRound(false);
                  setDoubleXpActiveThisQuestion(false);
                }}
                className="w-full py-4 px-5 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  Direkt weiter zu Runde {activeDuel.currentRound} (1 aus 3 Fächern wählen) →
                </span>
              </button>
            </div>
          )}

          <button
            onClick={() => setActiveView("home")}
            className="w-full py-3 px-4 rounded-2xl font-semibold text-xs sm:text-sm bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-all"
          >
            Zurück zur Duell-Übersicht
          </button>
        </motion.div>
      )}
    </div>
  );
}
