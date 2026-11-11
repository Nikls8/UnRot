"use client";

import React, { useState, useRef, useEffect } from "react";
import { useConvexStore, DemoView } from "@/lib/mockConvexStore";
import {
  RotateCcw,
  SlidersHorizontal,
  Check,
  WifiOff,
  CalendarOff,
  GraduationCap,
  Tv,
  Smartphone,
  Swords,
  Users,
} from "lucide-react";

export function DemoControlBar() {
  const {
    db,
    activeView,
    setActiveView,
    activeStudentId,
    setActiveStudentId,
    activeStudent,
    simulateBadWifi,
    setSimulateBadWifi,
    simulateEmptyTeacherWeek,
    setSimulateEmptyTeacherWeek,
    resetDemoState,
  } = useConvexStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReset = () => {
    resetDemoState();
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2000);
  };

  // Count how many duels are waiting for a given student's turn
  const getWaitingTurnCount = (userId: string) => {
    return db.duels.filter((duel) => {
      if (duel.isFinished) return false;
      if (duel.player1Id !== userId && duel.player2Id !== userId) return false;
      const r = duel.rounds.find((x) => x.roundNumber === duel.currentRound);
      if (!r) return false;
      const isP1 = duel.player1Id === userId;
      const myDone = isP1 ? r.player1Completed : r.player2Completed;
      if (myDone) return false;
      // Either subject is already chosen, OR it's my turn to choose the subject!
      return r.chosenSubjectId !== null || r.chooserId === userId;
    }).length;
  };

  const views: {
    id: DemoView;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "teacher",
      label: "Lehrer-Cockpit",
      shortLabel: "Lehrer",
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      id: "live",
      label: "Live im Unterricht",
      shortLabel: "Live",
      icon: <Tv className="w-4 h-4" />,
    },
    {
      id: "home",
      label: `Schüler-App (${activeStudent.name})`,
      shortLabel: activeStudent.name,
      icon: <Smartphone className="w-4 h-4" />,
    },
    {
      id: "duel",
      label: "Aktives Duell",
      shortLabel: "Duell",
      icon: <Swords className="w-4 h-4" />,
    },
  ];

  const activeSimCount =
    (simulateBadWifi ? 1 : 0) + (simulateEmptyTeacherWeek ? 1 : 0);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        {/* Left: Brand + 4 Student Test Accounts Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView("teacher")}
            className="flex items-center gap-2 text-left shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-sm flex items-center justify-center">
              U
            </div>
            <div className="hidden sm:flex items-baseline gap-1">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                unrot
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          </button>

          {/* 4 Test Student Accounts Switcher */}
          <div className="hidden lg:flex items-center gap-1 pl-3 border-l border-slate-200">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Schüler:
            </span>
            {db.users.map((student) => {
              const isSelected = student._id === activeStudentId;
              const turnsWaiting = getWaitingTurnCount(student._id);

              return (
                <button
                  key={student._id}
                  onClick={() => {
                    setActiveStudentId(student._id);
                    if (activeView === "teacher" || activeView === "live") {
                      setActiveView("home");
                    }
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  title={`Als ${student.name} testen (${turnsWaiting} offene Züge)`}
                >
                  <span>{student.name}</span>
                  {turnsWaiting > 0 && (
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        isSelected
                          ? "bg-emerald-400 text-slate-950"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {turnsWaiting}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Perspective Bar */}
        <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
          {views.map((v) => {
            const isActive = activeView === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span
                  className={isActive ? "text-slate-900" : "text-slate-400"}
                >
                  {v.icon}
                </span>
                <span className="hidden md:inline">{v.label}</span>
                <span className="md:hidden">{v.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Demo Scenarios Popover + Reset */}
        <div className="flex items-center gap-1.5 relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              activeSimCount > 0 || menuOpen
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Optionen</span>
            {activeSimCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeSimCount}
              </span>
            )}
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all flex items-center gap-1"
            title="Demo-State zurücksetzen"
          >
            {resetDone ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3 z-50">
              {/* Mobile Student Account Switcher inside Menu */}
              <div className="space-y-1.5 pb-2 border-b border-slate-100">
                <div className="text-[11px] font-bold text-slate-700">
                  Aktiver Test-Schüler-Account:
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {db.users.map((u) => {
                    const turns = getWaitingTurnCount(u._id);
                    return (
                      <button
                        key={u._id}
                        onClick={() => {
                          setActiveStudentId(u._id);
                          setMenuOpen(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border text-left flex items-center justify-between ${
                          activeStudentId === u._id
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span>{u.name}</span>
                        {turns > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold">
                            {turns} Zug
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] font-bold text-slate-700">
                Unhappy-Path-Simulationen:
              </div>

              <button
                onClick={() => setSimulateBadWifi(!simulateBadWifi)}
                className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2.5 ${
                  simulateBadWifi
                    ? "bg-amber-50/90 border-amber-200 text-amber-950"
                    : "bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100/70"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <WifiOff className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <div className="text-xs font-semibold">
                      Schlechtes Schul-WLAN simulieren
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Offline-Antwort-Puffer im Live-Quiz
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {simulateBadWifi ? "An" : "Aus"}
                </span>
              </button>

              <button
                onClick={() =>
                  setSimulateEmptyTeacherWeek(!simulateEmptyTeacherWeek)
                }
                className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2.5 ${
                  simulateEmptyTeacherWeek
                    ? "bg-indigo-50/90 border-indigo-200 text-indigo-950"
                    : "bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100/70"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <CalendarOff className="w-4 h-4 mt-0.5 shrink-0 text-indigo-600" />
                  <div>
                    <div className="text-xs font-semibold">
                      Kein neues Lehrer-Quiz diese Woche
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Smart-Mix (Spaced Repetition) aktivieren
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {simulateEmptyTeacherWeek ? "An" : "Aus"}
                </span>
              </button>

              <div className="pt-1 border-t border-slate-100 flex justify-between items-center">
                <button
                  onClick={() => {
                    handleReset();
                    setMenuOpen(false);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Alles zurücksetzen</span>
                </button>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Fertig
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
