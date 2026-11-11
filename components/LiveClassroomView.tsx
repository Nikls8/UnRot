"use client";

import React, { useState, useEffect } from "react";
import { useConvexStore } from "@/lib/mockConvexStore";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Smartphone,
  Columns,
  Users,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Play,
  WifiOff,
  Flame,
  Timer,
  BarChart2,
} from "lucide-react";

type FocusMode = "beamer" | "phone" | "split";

export function LiveClassroomView() {
  const {
    db,
    currentCourse,
    currentQuiz,
    activeStudent,
    activeDuel,
    simulateBadWifi,
    setSimulateBadWifi,
    liveStep,
    setLiveStep,
    claimLiveQuizXpAndChallengeMaja,
  } = useConvexStore();

  const [focusMode, setFocusMode] = useState<FocusMode>("beamer");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [liveScoreXp, setLiveScoreXp] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(15);
  const [timerPaused, setTimerPaused] = useState<boolean>(false);

  const liveQuestions = currentQuiz.questions.slice(0, 2);
  const currentQuestionIndex = liveStep === 1 ? 0 : liveStep === 2 ? 1 : 0;
  const currentQuestion =
    liveQuestions[currentQuestionIndex] || liveQuestions[0];

  const opponentId =
    activeDuel.player1Id === activeStudent._id
      ? activeDuel.player2Id
      : activeDuel.player1Id;
  const opponentUser =
    db.users.find((u) => u._id === opponentId) || db.users[1];

  // Reset 15s countdown on question change
  useEffect(() => {
    if (liveStep === 1 || liveStep === 2) {
      setSecondsLeft(15);
    }
  }, [liveStep]);

  // Countdown tick
  useEffect(() => {
    if (
      (liveStep !== 1 && liveStep !== 2) ||
      selectedOption !== null ||
      timerPaused ||
      secondsLeft <= 0
    ) {
      return;
    }
    const id = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [liveStep, selectedOption, timerPaused, secondsLeft]);

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    setLiveScoreXp((prev) => prev + 60);
  };

  const handleNextStep = () => {
    setSelectedOption(null);
    if (liveStep === 0) {
      setLiveStep(1);
    } else if (liveStep === 1) {
      setLiveStep(2);
    } else if (liveStep === 2) {
      setLiveStep(3);
    }
  };

  // Simulated class vote distribution (24 students total)
  const getClassVoteCounts = (correctIdx: number) => {
    const counts = [2, 2, 2, 2];
    counts[correctIdx] = 15; // 15 of 24 got it right
    const mainDistractor = (correctIdx + 1) % 4;
    counts[mainDistractor] = 6; // 6 fell for main distractor
    const other1 = (correctIdx + 2) % 4;
    const other2 = (correctIdx + 3) % 4;
    counts[other1] = 2;
    counts[other2] = 1;
    return counts;
  };

  const voteCounts = currentQuestion
    ? getClassVoteCounts(currentQuestion.correctIndex)
    : [15, 6, 2, 1];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Bar: Device Switcher + Step Progress */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center bg-slate-200/70 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setFocusMode("beamer")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              focusMode === "beamer"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Smartboard (Beamer)</span>
          </button>
          <button
            onClick={() => setFocusMode("phone")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              focusMode === "phone"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Schüler-Handy ({activeStudent.name})</span>
          </button>
          <button
            onClick={() => setFocusMode("split")}
            className={`hidden md:flex px-3.5 py-1.5 rounded-lg text-xs font-semibold items-center gap-1.5 transition-all ${
              focusMode === "split"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Nebeneinander</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { step: 0, label: "1. Beitritt (QR)" },
            { step: 1, label: "2. Frage 1" },
            { step: 2, label: "3. Frage 2" },
            { step: 3, label: "4. Stunden-Ende" },
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => {
                setSelectedOption(null);
                setLiveStep(item.step);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                liveStep === item.step
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-500 border border-slate-200 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Offline WiFi Protection Notice */}
      <AnimatePresence>
        {simulateBadWifi && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 text-xs sm:text-sm text-amber-950">
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong className="font-semibold">Offline-Schutz aktiv:</strong>{" "}
                Deine Antworten werden lokal gespeichert und bei Verbindung synchronisiert.
              </span>
            </div>
            <button
              onClick={() => setSimulateBadWifi(false)}
              className="text-xs font-semibold text-amber-800 hover:underline shrink-0"
            >
              Beenden
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div
        className={
          focusMode === "split"
            ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            : "w-full"
        }
      >
        {/* SMARTBOARD / BEAMER VIEW */}
        {(focusMode === "beamer" || focusMode === "split") && (
          <div
            className={`${
              focusMode === "split" ? "lg:col-span-7" : "max-w-4xl mx-auto"
            } bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-7`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {currentCourse.title}
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  {currentQuiz.title}
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/80">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>24 / 24 Schüler verbunden</span>
              </div>
            </div>

            {liveStep === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 items-center py-4">
                <div className="sm:col-span-5 flex flex-col items-center">
                  <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm">
                    <QRCodeSVG
                      value={`https://unrot.app/join?pin=${currentCourse.livePin}&course=${currentCourse.roomCode}`}
                      size={176}
                      level="M"
                      bgColor="#FFFFFF"
                      fgColor="#0F172A"
                    />
                  </div>
                  <span className="mt-3 text-xs font-medium text-slate-500">
                    Mit Handykamera scannen – ohne App-Download
                  </span>
                </div>

                <div className="sm:col-span-7 space-y-5 text-center sm:text-left">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Oder im Browser unter unrot.app • Live-PIN:
                    </div>
                    <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900">
                      {currentCourse.livePin}
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    Wir starten mit <strong>2 kurzen Einstiegsfragen</strong> (15s-Timer) am Beamer. Danach nehmt ihr das gesamte Quiz-Deck direkt für eure 6x3-Duelle mit nach Hause.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 justify-center sm:justify-start">
                    <button
                      onClick={() => setLiveStep(1)}
                      className="px-6 py-3 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Live-Quiz starten (Frage 1/2)</span>
                    </button>
                    {focusMode === "beamer" && (
                      <button
                        onClick={() => setFocusMode("phone")}
                        className="px-4 py-3 rounded-xl font-semibold text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Auf {activeStudent.name}s Handy wechseln</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(liveStep === 1 || liveStep === 2) && currentQuestion && (
              <div className="space-y-6 py-1">
                {/* Top Status + 15s Live Countdown */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                    Frage {liveStep} von 2 • Woche {currentQuestion.week}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTimerPaused(!timerPaused)}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${
                        secondsLeft <= 5 && selectedOption === null
                          ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                          : "bg-slate-100 text-slate-800 border-slate-200"
                      }`}
                      title="Klicken zum Pausieren/Fortsetzen des Timers"
                    >
                      <Timer className="w-3.5 h-3.5" />
                      <span>
                        {selectedOption !== null
                          ? "Abstimmung beendet"
                          : `${secondsLeft}s verbleibend`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Countdown Progress Bar */}
                {selectedOption === null && (
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${(secondsLeft / 15) * 100}%` }}
                      className={`h-full transition-all duration-700 rounded-full ${
                        secondsLeft <= 5 ? "bg-rose-500" : "bg-slate-900"
                      }`}
                    />
                  </div>
                )}

                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                  {currentQuestion.question}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === currentQuestion.correctIndex;
                    const hasAnswered =
                      selectedOption !== null || secondsLeft === 0;
                    const votes = voteCounts[idx];
                    const votePct = Math.round((votes / 24) * 100);

                    let cardStyle =
                      "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800";
                    if (hasAnswered) {
                      if (isCorrect) {
                        cardStyle =
                          "bg-emerald-50 border-emerald-500 text-emerald-950";
                      } else if (isSelected && !isCorrect) {
                        cardStyle = "bg-rose-50 border-rose-400 text-rose-950";
                      } else {
                        cardStyle =
                          "bg-slate-50/60 border-slate-200/70 text-slate-500";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        disabled={hasAnswered}
                        className={`p-4 rounded-2xl border-2 text-left text-sm font-semibold flex flex-col justify-between gap-3 transition-all ${cardStyle}`}
                      >
                        <div className="w-full flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                          {hasAnswered && isCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          {hasAnswered && isSelected && !isCorrect && (
                            <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                          )}
                        </div>

                        {/* Live Class Answer Distribution Bar (24 students) */}
                        {hasAnswered && (
                          <div className="w-full space-y-1 pt-1 border-t border-slate-200/60">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="flex items-center gap-1">
                                <BarChart2 className="w-3 h-3" />
                                {votes} Schüler ({votePct} %)
                              </span>
                              {isCorrect && <span>✓ Richtige Lösung</span>}
                            </div>
                            <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${votePct}%` }}
                                className={`h-full rounded-full ${
                                  isCorrect ? "bg-emerald-600" : "bg-slate-400"
                                }`}
                              />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    {selectedOption !== null || secondsLeft === 0
                      ? "Antwortverteilung der 24 Schüler live aufgedeckt"
                      : "Klicke auf eine Antwort, um die Live-Auswertung zu sehen"}
                  </span>
                  <button
                    onClick={handleNextStep}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 transition-all"
                  >
                    <span>
                      {liveStep === 1
                        ? "Nächste Frage (2/2)"
                        : "Stunden-Quiz abschließen"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {liveStep === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-xl mx-auto py-6 space-y-6"
              >
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Stunden-Quiz beendet • +120 XP gesammelt</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Bei Kahoot wäre das Quiz jetzt weg – bei UNROT lebt es weiter!
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Alle Fragen aus <strong>{currentQuiz.title}</strong> sind ab sofort für euer 6x3-Duell freigeschaltet. Nimm deine +120 XP direkt mit nach Hause.
                  </p>
                </div>

                <button
                  onClick={claimLiveQuizXpAndChallengeMaja}
                  className="w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>
                    120 XP sichern &amp; Quiz mit nach Hause nehmen → Direkt{" "}
                    {opponentUser.name} zum Duell fordern!
                  </span>
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* STUDENT PHONE VIEW */}
        {(focusMode === "phone" || focusMode === "split") && (
          <div
            className={`${
              focusMode === "split" ? "lg:col-span-5" : "max-w-sm mx-auto"
            } bg-white border-2 border-slate-200 rounded-[2.25rem] p-5 sm:p-6 shadow-md space-y-5`}
          >
            <div className="space-y-3">
              <div className="w-20 h-1 bg-slate-200 rounded-full mx-auto" />
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${activeStudent.colorClass}`}
                  >
                    {activeStudent.avatar}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {activeStudent.name}s Handy
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  +{liveStep === 3 ? 120 : liveScoreXp} XP
                </span>
              </div>
            </div>

            {liveStep === 0 && (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-emerald-700">
                    Verbunden mit PIN {currentCourse.livePin}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Bereit für {currentCourse.subjectLabel}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sammle +120 XP im Unterricht und nimm das Quiz anschließend mit in deine App.
                  </p>
                </div>
                <button
                  onClick={() => setLiveStep(1)}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-white transition-all"
                >
                  Frage 1 starten
                </button>
              </div>
            )}

            {(liveStep === 1 || liveStep === 2) && currentQuestion && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Frage {liveStep} / 2</span>
                  <span className="text-emerald-700">
                    {secondsLeft}s • +60 XP
                  </span>
                </div>

                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {currentQuestion.question}
                </p>

                <div className="space-y-2">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === currentQuestion.correctIndex;
                    const hasAnswered = selectedOption !== null;

                    let btnClass =
                      "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800";
                    if (hasAnswered) {
                      if (isCorrect) {
                        btnClass =
                          "bg-emerald-50 border-emerald-500 text-emerald-950";
                      } else if (isSelected && !isCorrect) {
                        btnClass = "bg-rose-50 border-rose-400 text-rose-950";
                      } else {
                        btnClass =
                          "bg-slate-50/40 border-slate-200/50 text-slate-400";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        disabled={hasAnswered}
                        className={`w-full p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2 transition-all ${btnClass}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {hasAnswered && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedOption !== null && (
                  <button
                    onClick={handleNextStep}
                    className="w-full py-3 rounded-xl font-semibold text-xs bg-slate-900 text-white"
                  >
                    {liveStep === 1
                      ? "Weiter zu Frage 2 →"
                      : "Zum Stunden-Abschluss →"}
                  </button>
                )}
              </div>
            )}

            {liveStep === 3 && (
              <div className="space-y-4 text-center py-3">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>+120 XP gesichert</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  Stunden-Quiz beendet! Bei Kahoot wäre das Quiz jetzt weg – bei UNROT lebt es weiter!
                </h3>
                <p className="text-xs text-slate-500">
                  Fordere jetzt {opponentUser.name} zum 6x3-Quizduell heraus.
                </p>
                <button
                  onClick={claimLiveQuizXpAndChallengeMaja}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                >
                  120 XP sichern &amp; {opponentUser.name} fordern →
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>unrot.app/live</span>
              <span className="font-mono">{currentCourse.roomCode}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
