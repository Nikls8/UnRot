"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

// ==========================================
// CONVEX-READY DATA MODEL TYPES
// ==========================================

export type DemoView = "teacher" | "live" | "home" | "duel";
export type DuelMode = "friend_duel" | "mistakes" | "smartmix";
export type SubjectId =
  | "bio"
  | "mathe"
  | "deutsch"
  | "englisch"
  | "geschichte"
  | "musik"
  | "informatik"
  | "ds"
  | "religion"
  | string; // Allows custom subjects & duplicate subjects!

export type WeekNumber = number;

export interface QuestionDoc {
  id: string;
  subjectId: SubjectId;
  week: number;
  weekTopic: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number; // 0-3
  aiExplanation: string;
  errorRatePercent: number;
  topicTag?: string;
  gapDescription?: string;
  isCustom?: boolean;
}

export interface CourseDoc {
  _id: string;
  subjectId: SubjectId;
  subjectLabel: string;
  shortLabel: string;
  accentColor:
    | "emerald"
    | "blue"
    | "amber"
    | "indigo"
    | "rose"
    | "purple"
    | "cyan"
    | "orange"
    | "teal";
  title: string;
  teacherName: string;
  gradeLevel: string;
  roomCode: string;
  shareCode: string;
  livePin: string;
  examDaysLeft: number;
  weekTitles: Record<number, string>;
  coopRoundsCurrent: number;
  coopRoundsTarget: number;
  examChecklist: string[];
}

export interface QuizDoc {
  _id: string;
  courseId: string;
  subjectId: SubjectId;
  title: string;
  subtitle: string;
  sourceFileName: string;
  isPublishedToArchive: boolean;
  playedInClassToday: boolean;
  createdAt: string;
  questions: QuestionDoc[];
}

export interface InteractiveRound {
  roundNumber: number; // 1..6
  chooserId: string;
  chosenSubjectId: SubjectId | null;
  candidateSubjects: [SubjectId, SubjectId, SubjectId];
  questionIds: string[];
  player1Answers: ("correct" | "wrong" | "pending")[];
  player2Answers: ("correct" | "wrong" | "pending")[];
  player1Completed: boolean;
  player2Completed: boolean;
}

export interface DuelDoc {
  _id: string;
  inviteCode: string;
  player1Id: string;
  player2Id: string;
  currentRound: number;
  totalRounds: number;
  isFinished: boolean;
  createdAt: string;
  rounds: InteractiveRound[];
}

export interface StudentUserDoc {
  _id: string;
  name: string;
  age: number;
  grade: string;
  avatar: string;
  colorClass: string;
  streakDays: number;
  xp: number;
  streakIncrementedToday: boolean;
  bookmarkedQuestionIds: string[];
  wrongQuestionIds: string[];
  masteredQuestionIds: string[];
  joinedCourseCodes: string[];
}

export interface ConvexMockDatabase {
  courses: CourseDoc[];
  quizzes: QuizDoc[];
  duels: DuelDoc[];
  users: StudentUserDoc[];
}

export interface ParsedBulkQuestion {
  week: number;
  weekTitle?: string;
  topicTag?: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  aiExplanation: string;
}

// ==========================================
// BULK QUESTION PARSER (UNROT FORMAT)
// ==========================================

export const UNROT_AI_PROMPT_TEMPLATE = `Erstelle mir 5 Oberstufen-Multiple-Choice-Fragen (Sek II) zum Thema "[DEIN THEMA HIER EINTRAGEN]" für die Unterrichtswoche "[Z.B. 4 | Titel der Woche]".

WICHTIG: Gib die Fragen AUSSCHLIESSLICH in exakt diesem Textformat aus (trenne mehrere Fragen mit ---), damit ich sie direkt per Copy & Paste in UNROT importieren kann:

WOCHE: 4 | Name des Wochenthemas
THEMA: Kurz-Stichwort
FRAGE: Hier steht der Fragetext?
A: Antwortmöglichkeit A
B: Antwortmöglichkeit B
C: Antwortmöglichkeit C
D: Antwortmöglichkeit D
RICHTIG: A
ERKLÄRUNG: 1 bis 2 kurze Sätze auf Schülerniveau, warum diese Antwort stimmt.
---`;

export function parseUnrotBulkText(
  rawText: string,
  defaultWeek: number = 1
): ParsedBulkQuestion[] {
  const blocks = rawText
    .split(/\n\s*---+\s*\n|\n{2,}(?=(?:WOCHE|THEMA|TITEL|FRAGE)\s*:)/i)
    .map((b) => b.trim())
    .filter(Boolean);

  const results: ParsedBulkQuestion[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    let week = defaultWeek;
    let weekTitle: string | undefined = undefined;
    let topicTag: string | undefined = undefined;
    let question = "";
    const opts: string[] = ["", "", "", ""];
    let correctIndex = 0;
    let aiExplanation = "";

    for (const line of lines) {
      const wMatch = line.match(/^WOCHE\s*:\s*(\d+)(?:\s*[|-]\s*(.+))?$/i);
      if (wMatch) {
        week = Math.max(1, parseInt(wMatch[1], 10));
        if (wMatch[2]) {
          weekTitle = `Woche ${week}: ${wMatch[2].trim().replace(/^Woche\s*\d+\s*:\s*/i, "")}`;
        }
        continue;
      }

      const tMatch = line.match(/^(?:THEMA|TITEL)\s*:\s*(.+)$/i);
      if (tMatch) {
        topicTag = tMatch[1].trim();
        continue;
      }

      const qMatch = line.match(/^(?:FRAGE|Q)\s*:\s*(.+)$/i);
      if (qMatch) {
        question = qMatch[1].trim();
        continue;
      }

      const aMatch = line.match(/^A[):.]\s*(.+)$/i);
      if (aMatch) {
        opts[0] = aMatch[1].trim();
        continue;
      }
      const bMatch = line.match(/^B[):.]\s*(.+)$/i);
      if (bMatch) {
        opts[1] = bMatch[1].trim();
        continue;
      }
      const cMatch = line.match(/^C[):.]\s*(.+)$/i);
      if (cMatch) {
        opts[2] = cMatch[1].trim();
        continue;
      }
      const dMatch = line.match(/^D[):.]\s*(.+)$/i);
      if (dMatch) {
        opts[3] = dMatch[1].trim();
        continue;
      }

      const rMatch = line.match(/^(?:RICHTIG|KORREKT|LÖSUNG|ANSWER)\s*:\s*([A-D1-4])/i);
      if (rMatch) {
        const val = rMatch[1].toUpperCase();
        if (val === "A" || val === "1") correctIndex = 0;
        else if (val === "B" || val === "2") correctIndex = 1;
        else if (val === "C" || val === "3") correctIndex = 2;
        else if (val === "D" || val === "4") correctIndex = 3;
        continue;
      }

      const eMatch = line.match(/^(?:ERKLÄRUNG|ERKLAERUNG|EXPLANATION|INFO)\s*:\s*(.+)$/i);
      if (eMatch) {
        aiExplanation = eMatch[1].trim();
        continue;
      }
    }

    if (question && (opts[0] || opts[1])) {
      const safeOpts: [string, string, string, string] = [
        opts[0] || "Option A",
        opts[1] || "Option B",
        opts[2] || "Option C",
        opts[3] || "Option D",
      ];
      results.push({
        week,
        weekTitle,
        topicTag: topicTag || "KI-Import",
        question,
        options: safeOpts,
        correctIndex,
        aiExplanation:
          aiExplanation ||
          `Richtig ist Antwort ${String.fromCharCode(65 + correctIndex)}: ${
            safeOpts[correctIndex]
          }.`,
      });
    }
  }

  return results;
}

// ==========================================
// 9 SUBJECTS × 3 WEEKS (PROGRESSIVE QUESTIONS)
// ==========================================

export const BIO_QUESTIONS: QuestionDoc[] = [
  {
    id: "q-bio-1",
    subjectId: "bio",
    week: 1,
    weekTopic: "Woche 1: Chloroplasten & Lichtreaktion",
    question:
      "Wo genau findet in den Chloroplasten die lichtabhängige Reaktion (Fotolyse des Wassers) statt?",
    options: [
      "Im Stroma",
      "An der Thylakoidmembran / im Thylakoidinnenraum",
      "In der äußeren Chloroplastenmembran",
      "In der Mitochondrienmatrix",
    ],
    correctIndex: 1,
    aiExplanation:
      "In der Thylakoidmembran sitzen die Fotosysteme – dort wird Wasser durch Lichtenergie gespalten (Fotolyse). Im Stroma läuft später der Calvin-Zyklus ab.",
    errorRatePercent: 68,
    topicTag: "Kompartimentierung",
    gapDescription: "68 % verwechseln Thylakoidmembran und Stroma",
  },
  {
    id: "q-bio-2",
    subjectId: "bio",
    week: 1,
    weekTopic: "Woche 1: Chloroplasten & Lichtreaktion",
    question:
      "Welche Produkte der Lichtreaktion werden zwingend für den anschließenden Calvin-Zyklus benötigt?",
    options: [
      "ATP und NADPH + H+",
      "Glukose und Sauerstoff (O2)",
      "ADP und NADP+",
      "Pyruvat und FADH2",
    ],
    correctIndex: 0,
    aiExplanation:
      "ATP liefert die Energie und NADPH + H+ die Elektronen/Wasserstoffionen, um im Calvin-Zyklus aus CO2 letztlich Glukose aufzubauen.",
    errorRatePercent: 54,
    topicTag: "Energieträger",
    gapDescription: "54 % verwechseln ATP/NADPH+H+ mit den Vorstufen ADP/NADP+",
  },
  {
    id: "q-bio-3",
    subjectId: "bio",
    week: 1,
    weekTopic: "Woche 1: Chloroplasten & Lichtreaktion",
    question:
      "Wie treibt der Protonengradient an der Thylakoidmembran die Bildung von ATP an?",
    options: [
      "H+-Ionen strömen passiv durch die ATP-Synthase vom Thylakoidinnenraum ins Stroma",
      "ATP pumpt aktiv Elektronen vom Stroma in den Thylakoidinnenraum",
      "Sauerstoffmoleküle spalten ADP direkt an der äußeren Membran",
      "Rubisco überträgt Protonen direkt auf Glukose",
    ],
    correctIndex: 0,
    aiExplanation:
      "Im Thylakoidinnenraum sammeln sich H+-Ionen. Wenn sie dem Gefälle folgend durch die ATP-Synthase ins Stroma strömen, wird aus ADP + P neues ATP gebildet.",
    errorRatePercent: 47,
    topicTag: "Chemiosmose",
    gapDescription: "47 % vertauschen die Flussrichtung der Protonen",
  },
  {
    id: "q-bio-4",
    subjectId: "bio",
    week: 2,
    weekTopic: "Woche 2: Calvin-Zyklus & CO2-Fixierung",
    question:
      "Welche Funktion übernimmt das Enzym Rubisco im ersten Schritt des Calvin-Zyklus?",
    options: [
      "Es spaltet Wassermoleküle mithilfe von Chlorophyll a",
      "Es fixiert CO2 an den C5-Körper Ribulose-1,5-bisphosphat (RuBP)",
      "Es regeneriert NADH in der inneren Mitochondrienmembran",
      "Es transportiert Glukose durch die Zellwand",
    ],
    correctIndex: 1,
    aiExplanation:
      "Rubisco heftet CO2 an den C5-Akzeptor RuBP an. Daraus entsteht ein instabiler C6-Körper, der sofort in zwei C3-Moleküle zerfällt.",
    errorRatePercent: 39,
    topicTag: "Calvin-Zyklus",
    gapDescription: "39 % kennen den C5-Akzeptor RuBP nicht sicher",
  },
  {
    id: "q-bio-5",
    subjectId: "bio",
    week: 2,
    weekTopic: "Woche 2: Calvin-Zyklus & CO2-Fixierung",
    question:
      "Was passiert, wenn man bei einer Pflanze die CO2-Zufuhr stoppt, sie aber weiter beleuchtet?",
    options: [
      "Die ATP-Produktion steigt unendlich an",
      "Der Calvin-Zyklus stoppt und NADP+ sowie ADP fehlen bald für die Lichtreaktion",
      "Die Pflanze produziert mehr Glukose aus Wasser",
      "Die Lichtreaktion läuft dauerhaft schneller weiter",
    ],
    correctIndex: 1,
    aiExplanation:
      "Ohne CO2 steht der Calvin-Zyklus still und verbraucht kein ATP/NADPH mehr – dadurch fehlen der Lichtreaktion die leeren Transporter ADP und NADP+.",
    errorRatePercent: 61,
    topicTag: "Kopplung",
    gapDescription: "61 % übersehen die Rückkopplung fehlender Akzeptoren",
  },
  {
    id: "q-bio-6",
    subjectId: "bio",
    week: 2,
    weekTopic: "Woche 2: Calvin-Zyklus & CO2-Fixierung",
    question:
      "Warum müssen im Calvin-Zyklus 6 Moleküle CO2 fixiert werden, um 1 Molekül Glukose (C6) netto zu gewinnen?",
    options: [
      "Weil 10 von 12 gebildeten C3-Molekülen zur Regeneration des C5-Akzeptors RuBP benötigt werden",
      "Weil 5 von 6 CO2-Molekülen ungenutzt entweichen",
      "Weil Glukose direkt aus 6 RuBP-Molekülen besteht",
      "Weil jedes CO2 in der Lichtreaktion halbiert wird",
    ],
    correctIndex: 0,
    aiExplanation:
      "Aus 6 CO2 + 6 C5 entstehen 12 C3-Körper. Nur 2 davon ergeben 1 Glukose, während die übrigen 10 C3-Körper (30 C-Atome) wieder 6 C5-Akzeptoren regenerieren.",
    errorRatePercent: 49,
    topicTag: "Bilanz",
    gapDescription: "49 % vergessen die Regeneration des C5-Akzeptors",
  },
  {
    id: "q-bio-7",
    subjectId: "bio",
    week: 3,
    weekTopic: "Woche 3: Zellatmung & Umweltfaktoren",
    question:
      "Worin unterscheiden sich Fotosynthese und aerobe Zellatmung bei Pflanzenzellen?",
    options: [
      "Zellatmung baut Glukose in Cytosol & Mitochondrien ab, um rund um die Uhr ATP zu gewinnen",
      "Zellatmung findet nur tagsüber in den Chloroplasten statt",
      "Fotosynthese verbraucht O2, während die Atmungskette CO2 fixiert",
      "Pflanzenzellen besitzen keine Mitochondrien",
    ],
    correctIndex: 0,
    aiExplanation:
      "Auch Pflanzenzellen besitzen Mitochondrien und betreiben ständig Zellatmung! Fotosynthese speichert Energie in Glukose, Zellatmung setzt sie als ATP frei.",
    errorRatePercent: 44,
    topicTag: "Zellatmung",
    gapDescription: "44 % glauben, Pflanzenzellen hätten keine Mitochondrien",
  },
  {
    id: "q-bio-8",
    subjectId: "bio",
    week: 3,
    weekTopic: "Woche 3: Zellatmung & Umweltfaktoren",
    question:
      "Was bezeichnet der Lichtkompensationspunkt einer Pflanze?",
    options: [
      "Die Beleuchtungsstärke, bei der O2-Produktion (Fotosynthese) und O2-Verbrauch (Zellatmung) genau gleich groß sind",
      "Den Punkt, an dem Chlorophyll durch Hitze zerstört wird",
      "Die maximale Fotosyntheserate bei Lichtsättigung",
      "Den Zeitpunkt des Sonnenuntergangs",
    ],
    correctIndex: 0,
    aiExplanation:
      "Am Lichtkompensationspunkt atmet die Pflanze genauso viel CO2 aus, wie sie durch Fotosynthese aufnimmt – die Netto-Fotosyntheserate ist dort genau null.",
    errorRatePercent: 52,
    topicTag: "Ökofaktoren",
    gapDescription: "52 % verwechseln Lichtkompensationspunkt und Lichtsättigung",
  },
  {
    id: "q-bio-9",
    subjectId: "bio",
    week: 3,
    weekTopic: "Woche 3: Zellatmung & Umweltfaktoren",
    question:
      "Wo entsteht bei der aeroben Zellatmung der mit Abstand größte Teil des ATP?",
    options: [
      "In der Atmungskette an der inneren Mitochondrienmembran",
      "Bei der Glykolyse im Cytoplasma",
      "Direkt bei der Decarboxylierung im Stroma",
      "An den Ribosomen des rauen ER",
    ],
    correctIndex: 0,
    aiExplanation:
      "Während Glykolyse und Citratzyklus nur je 2 ATP direkt liefern, erzeugt die Atmungskette an der inneren Mitochondrienmembran rund 28–34 ATP pro Glukose!",
    errorRatePercent: 36,
    topicTag: "Atmungskette",
    gapDescription: "36 % überschätzen die ATP-Ausbeute der Glykolyse",
  },
];

export const MATHE_QUESTIONS: QuestionDoc[] = [
  {
    id: "q-mat-1",
    subjectId: "mathe",
    week: 1,
    weekTopic: "Woche 1: Ableitungsregeln & e-Funktion",
    question:
      "Wie lautet die erste Ableitung der Funktion f(x) = x² · eˣ nach der Produktregel?",
    options: [
      "f'(x) = 2x · eˣ",
      "f'(x) = (2x + x²) · eˣ",
      "f'(x) = 2x + eˣ",
      "f'(x) = x³ · eˣ",
    ],
    correctIndex: 1,
    aiExplanation:
      "Produktregel: u'·v + u·v'. Mit u(x) = x² und v(x) = eˣ ergibt sich 2x·eˣ + x²·eˣ = (2x + x²)·eˣ.",
    errorRatePercent: 58,
    topicTag: "Produktregel",
    gapDescription: "58 % leiten beide Faktoren einzeln ab ohne Produktregel",
  },
  {
    id: "q-mat-2",
    subjectId: "mathe",
    week: 1,
    weekTopic: "Woche 1: Ableitungsregeln & e-Funktion",
    question:
      "Wie lautet die Ableitung von f(x) = e^(3x - 1) mithilfe der Kettenregel?",
    options: [
      "f'(x) = 3 · e^(3x - 1)",
      "f'(x) = (3x - 1) · e^(3x - 2)",
      "f'(x) = e^(3x - 1)",
      "f'(x) = 1/3 · e^(3x - 1)",
    ],
    correctIndex: 0,
    aiExplanation:
      "Bei der Kettenregel bleibt die e-Funktion erhalten und wird mit der inneren Ableitung (Ableitung von 3x - 1 ist 3) multipliziert.",
    errorRatePercent: 46,
    topicTag: "Kettenregel",
    gapDescription: "46 % vergessen den Faktor der inneren Ableitung",
  },
  {
    id: "q-mat-3",
    subjectId: "mathe",
    week: 1,
    weekTopic: "Woche 1: Ableitungsregeln & e-Funktion",
    question: "Für welche x-Werte gilt die Gleichung e^(x - 2) = 0?",
    options: [
      "Für kein reelles x (die e-Funktion hat keine Nullstellen)",
      "Für x = 2",
      "Für x = 0",
      "Für x = -2",
    ],
    correctIndex: 0,
    aiExplanation:
      "Wichtig für jede Kurvendiskussion: e^z ist für alle reellen Zahlen strikt positiv (> 0) und wird niemals null!",
    errorRatePercent: 51,
    topicTag: "Nullstellen",
    gapDescription: "51 % setzen bei e^(x-2)=0 fälschlicherweise den Exponenten null",
  },
  {
    id: "q-mat-4",
    subjectId: "mathe",
    week: 2,
    weekTopic: "Woche 2: Extrem- & Wendepunkte",
    question:
      "Welche Bedingung ist notwendig UND hinreichend für einen lokalen Hochpunkt von f an der Stelle x₀?",
    options: [
      "f'(x₀) = 0 und f''(x₀) < 0",
      "f'(x₀) = 0 und f''(x₀) > 0",
      "f''(x₀) = 0 und f'''(x₀) ≠ 0",
      "f(x₀) = 0 und f'(x₀) < 0",
    ],
    correctIndex: 0,
    aiExplanation:
      "Bei einem Hochpunkt ist die Tangente waagerecht (f'(x₀) = 0) und der Graph rechtsgekrümmt, also f''(x₀) < 0.",
    errorRatePercent: 64,
    topicTag: "Extrempunkte",
    gapDescription: "64 % verwechseln f''(x₀) < 0 und f''(x₀) > 0",
  },
  {
    id: "q-mat-5",
    subjectId: "mathe",
    week: 2,
    weekTopic: "Woche 2: Extrem- & Wendepunkte",
    question:
      "An welcher Stelle besitzt der Graph von f(x) = x³ - 6x² + 5 seinen Wendepunkt?",
    options: ["Bei x = 0", "Bei x = 2", "Bei x = 4", "Bei x = -2"],
    correctIndex: 1,
    aiExplanation:
      "Für den Wendepunkt setzen wir die 2. Ableitung gleich null: f'(x) = 3x² - 12x, f''(x) = 6x - 12 = 0 ⇒ x = 2.",
    errorRatePercent: 45,
    topicTag: "Wendepunkte",
    gapDescription: "45 % setzen für Wendepunkte f'(x) = 0 statt f''(x) = 0",
  },
  {
    id: "q-mat-6",
    subjectId: "mathe",
    week: 2,
    weekTopic: "Woche 2: Extrem- & Wendepunkte",
    question:
      "Was liegt bei x₀ = 1 vor, wenn f'(1) = 0, f''(1) = 0 und f'''(1) ≠ 0 gilt?",
    options: [
      "Ein Sattelpunkt (Wendepunkt mit waagerechter Tangente)",
      "Ein lokaler Hochpunkt",
      "Eine Polstelle",
      "Ein lokaler Tiefpunkt",
    ],
    correctIndex: 0,
    aiExplanation:
      "Wenn sowohl die 1. als auch die 2. Ableitung null sind (und f''' ≠ 0), hat der Wendepunkt eine waagerechte Tangente: ein Sattelpunkt.",
    errorRatePercent: 49,
    topicTag: "Sattelpunkte",
    gapDescription: "49 % erkennen f'=0 und f''=0 nicht als Sattelpunkt",
  },
  {
    id: "q-mat-7",
    subjectId: "mathe",
    week: 3,
    weekTopic: "Woche 3: Integralrechnung & Flächen",
    question:
      "Was gibt das bestimmte Integral ∫ₐᵇ f(x) dx an, wenn der Graph teilweise unterhalb der x-Achse verläuft?",
    options: [
      "Den gesamten absoluten Flächeninhalt",
      "Die orientierte Flächenbilanz (Flächen oberhalb minus Flächen unterhalb)",
      "Die Steigung der Sekante zwischen a und b",
      "Den Umfang der Fläche",
    ],
    correctIndex: 1,
    aiExplanation:
      "Das Integral liefert die orientierte Flächenbilanz. Für den absoluten Flächeninhalt muss man an den Nullstellen aufteilen und Beträge nehmen.",
    errorRatePercent: 52,
    topicTag: "Integralbilanz",
    gapDescription: "52 % integrieren über Nullstellen hinweg ohne Aufteilung",
  },
  {
    id: "q-mat-8",
    subjectId: "mathe",
    week: 3,
    weekTopic: "Woche 3: Integralrechnung & Flächen",
    question: "Welche Stammfunktion F(x) gehört zu f(x) = 3 · e^(2x)?",
    options: [
      "F(x) = 6 · e^(2x)",
      "F(x) = 1,5 · e^(2x)",
      "F(x) = 3 · e^(2x)",
      "F(x) = 1,5 · e^(3x)",
    ],
    correctIndex: 1,
    aiExplanation:
      "Beim Aufleiten von e^(k·x) teilt man durch die innere Ableitung k = 2: 3 / 2 = 1,5, also F(x) = 1,5 · e^(2x).",
    errorRatePercent: 41,
    topicTag: "Stammfunktionen",
    gapDescription: "41 % multiplizieren beim Aufleiten mit 2 statt zu teilen",
  },
  {
    id: "q-mat-9",
    subjectId: "mathe",
    week: 3,
    weekTopic: "Woche 3: Integralrechnung & Flächen",
    question:
      "Wie berechnet man den Flächeninhalt zwischen zwei sich schneidenden Funktionsgraphen f und g?",
    options: [
      "Man bestimmt die Schnittstellen und integriert betragsmäßig die Differenzfunktion |f(x) - g(x)| von Schnittstelle zu Schnittstelle",
      "Man multipliziert beide Stammfunktionen F(x) · G(x)",
      "Man bildet die Ableitung f'(x) - g'(x)",
      "Man integriert nur von 0 bis 1",
    ],
    correctIndex: 0,
    aiExplanation:
      "Zuerst f(x) = g(x) lösen, um die Schnittstellen zu finden, und dann abschnittsweise über die Differenzfunktion f(x) - g(x) integrieren.",
    errorRatePercent: 38,
    topicTag: "Differenzfunktion",
    gapDescription: "38 % vergessen die Schnittstellenberechnung vor dem Integrieren",
  },
];

export const DEUTSCH_QUESTIONS: QuestionDoc[] = [
  {
    id: "q-deu-1",
    subjectId: "deutsch",
    week: 1,
    weekTopic: "Woche 1: Prolog & Gelehrtentragödie",
    question:
      "Welche Funktion hat der 'Prolog im Himmel' zwischen dem Herrn und Mephisto für Goethes Faust I?",
    options: [
      "Er nimmt vorweg, dass der strebende Mensch trotz Irrtümern am Ende gerettet werden kann",
      "Er zeigt, dass Gott die Menschheit aufgegeben hat",
      "Er fasst die historische Biografie des Georg Faust zusammen",
      "Er dient als komisches Nachspiel",
    ],
    correctIndex: 0,
    aiExplanation:
      "Der Herr betont: 'Es irrt der Mensch, solang er strebt.' Solange Faust weiterstrebt, kann Mephisto ihn nicht endgültig gewinnen.",
    errorRatePercent: 48,
    topicTag: "Dramenrahmen",
    gapDescription: "48 % übersehen die Rahmenfunktion des Prologs im Himmel",
  },
  {
    id: "q-deu-2",
    subjectId: "deutsch",
    week: 1,
    weekTopic: "Woche 1: Prolog & Gelehrtentragödie",
    question:
      "Worin besteht der Kern der Wette zwischen Faust und Mephisto im 'Studierzimmer'?",
    options: [
      "Faust verkauft seine Seele sofort für 24 Jahre Reichtum",
      "Faust verliert erst, wenn er zum Augenblick sagt: 'Verweile doch! du bist so schön!'",
      "Mephisto muss Faust innerhalb von drei Tagen verheiraten",
      "Faust wettet, dass er alle Bücher auswendig lernt",
    ],
    correctIndex: 1,
    aiExplanation:
      "Es ist eine Wette statt eines festen Zeitpakts: Erst wenn Faust träge im Genuss verharrt ('Verweile doch!'), gehört er Mephisto.",
    errorRatePercent: 57,
    topicTag: "Pakt vs. Wette",
    gapDescription: "57 % verwechseln die Wette mit einem traditionellen 24-Jahre-Pakt",
  },
  {
    id: "q-deu-3",
    subjectId: "deutsch",
    week: 1,
    weekTopic: "Woche 1: Prolog & Gelehrtentragödie",
    question:
      "Inwiefern verkörpert Fausts Famulus Wagner das Gegenbild zu Faust?",
    options: [
      "Wagner steht für trockene, buchgläubige Gelehrsamkeit ohne eigenen Erlebnisdrang",
      "Wagner ist ein rebellischer Stürmer und Dränger",
      "Wagner verführt Faust zur schwarzen Magie",
      "Wagner vertritt die höfische Gesellschaft",
    ],
    correctIndex: 0,
    aiExplanation:
      "Wagner ist mit bloßem Faktenwissen aus Büchern zufrieden, während Faust erkennen will, 'was die Welt im Innersten zusammenhält'.",
    errorRatePercent: 42,
    topicTag: "Kontrastfigur",
    gapDescription: "42 % übersehen Wagners Rolle als Kontrastfolie der Aufklärung",
  },
  {
    id: "q-deu-4",
    subjectId: "deutsch",
    week: 2,
    weekTopic: "Woche 2: Gretchentragödie & Sprache",
    question:
      "Warum scheitert die Verständigung zwischen Faust und Gretchen bei der 'Gretchenfrage' (Marthens Garten)?",
    options: [
      "Weil Gretchen ein klares kirchliches Bekenntnis sucht, während Faust pantheistisch-gefühlsbetont ausweicht",
      "Weil Mephisto das Gespräch lautstark unterbricht",
      "Weil Faust offen zugibt, mit dem Teufel im Bunde zu sein",
      "Weil Gretchen kein Deutsch versteht",
    ],
    correctIndex: 0,
    aiExplanation:
      "Auf Gretchens Frage nach der Religion antwortet Faust mit 'Name ist Schall und Rauch' – er weicht ihrer konkreten Sorge rhetorisch aus.",
    errorRatePercent: 51,
    topicTag: "Gretchenfrage",
    gapDescription: "51 % deuten Fausts Antwort als ehrliche Zustimmung statt als Ausweichen",
  },
  {
    id: "q-deu-5",
    subjectId: "deutsch",
    week: 2,
    weekTopic: "Woche 2: Gretchentragödie & Sprache",
    question:
      "Welches Stilmittel liegt in Fausts Ausruf 'Zwei Seelen wohnen, ach! in meiner Brust' vor?",
    options: [
      "Metapher für den inneren Konflikt zwischen sinnlich-irdischem Trieb und geistigem Streben",
      "Euphemismus für eine Krankheit",
      "Oxymoron für den Osterspaziergang",
      "Alliteration zur Verspottung Wagners",
    ],
    correctIndex: 0,
    aiExplanation:
      "Die 'zwei Seelen' versinnbildlichen Fausts Zerrissenheit zwischen irdischer Sinnlichkeit (Gretchen) und absolutem Erkenntnisstreben.",
    errorRatePercent: 34,
    topicTag: "Stilmittel",
    gapDescription: "34 % benennen die beiden Pole des Zwei-Seelen-Konflikts zu ungenau",
  },
  {
    id: "q-deu-6",
    subjectId: "deutsch",
    week: 2,
    weekTopic: "Woche 2: Gretchentragödie & Sprache",
    question:
      "Warum weigert sich Gretchen in der Schlussszene 'Kerker', mit Faust zu fliehen?",
    options: [
      "Sie erkennt ihre Schuld an und übergibt sich dem Gericht Gottes, wodurch sie moralisch gerettet wird",
      "Sie hofft auf Begnadigung durch ihren Bruder Valentin",
      "Sie will Mephisto allein besiegen",
      "Sie liebt Faust nicht mehr",
    ],
    correctIndex: 0,
    aiExplanation:
      "Indem Gretchen die Flucht mit Mephistos Hilfe ablehnt, entzieht sie sich seiner Macht – daher verkündet die Stimme von oben: 'Ist gerettet!'",
    errorRatePercent: 38,
    topicTag: "Schlussszene",
    gapDescription: "38 % unterscheiden 'Ist gerichtet!' und 'Ist gerettet!' unscharf",
  },
  {
    id: "q-deu-7",
    subjectId: "deutsch",
    week: 3,
    weekTopic: "Woche 3: Epochenbezug (Sturm & Drang / Klassik)",
    question:
      "Warum gilt Goethes 'Faust I' literaturgeschichtlich als Werk des Epochenumbruchs?",
    options: [
      "Es verbindet das rebellische Genie-Denken des Sturm und Drang mit der Formstrenge der Weimarer Klassik",
      "Es ist das erste rein naturalistische Arbeiterdrama",
      "Es wurde vollständig im Mittelalter verfasst",
      "Es lehnt jede Versform zugunsten moderner SMS-Sprache ab",
    ],
    correctIndex: 0,
    aiExplanation:
      "Goethe arbeitete vom jungen 'Urfaust' (Sturm und Drang: Gefühlsüberschwang, Knittelvers) bis zur Ausgabe von 1808 (Weimarer Klassik: Prolog-Rahmen, Blankvers) daran.",
    errorRatePercent: 45,
    topicTag: "Epochenumbruch",
    gapDescription: "45 % ordnen Faust I nur einer einzigen Epoche zu",
  },
];

export const ENGLISCH_QUESTIONS: QuestionDoc[] = [
  {
    id: "q-eng-1",
    subjectId: "englisch",
    week: 1,
    weekTopic: "Woche 1: Rhetoric & Speech Analysis",
    question:
      "What is the primary communicative effect of an 'antithesis' in a political speech?",
    options: [
      "It contrasts two opposing ideas in parallel structure to make the argument more memorable",
      "It softens unpleasant facts by using mild expressions",
      "It repeats the same consonant sound at the beginning of words",
      "It attributes human feelings to nature",
    ],
    correctIndex: 0,
    aiExplanation:
      "An antithesis places contrasting ideas side by side (e.g., 'Ask not what your country can do for you...'), sharpening the core message.",
    errorRatePercent: 55,
    topicTag: "Stylistic Devices",
    gapDescription: "55 % nennen bei Antithesen nur das Zitat ohne den Kontrast-Effekt",
  },
  {
    id: "q-eng-2",
    subjectId: "englisch",
    week: 1,
    weekTopic: "Woche 1: Rhetoric & Speech Analysis",
    question:
      "Which sentence uses the passive voice correctly for an objective essay tone?",
    options: [
      "Strict surveillance measures are being implemented by the regime.",
      "The regime had been implementing strict surveillance measures.",
      "Citizens were implement strict surveillance measures.",
      "Strict surveillance measures have implementing the government.",
    ],
    correctIndex: 0,
    aiExplanation:
      "Present progressive passive is formed with 'am/is/are + being + past participle' ('are being implemented').",
    errorRatePercent: 46,
    topicTag: "Essay Grammar",
    gapDescription: "46 % bilden Present Progressive Passive ohne 'being'",
  },
  {
    id: "q-eng-3",
    subjectId: "englisch",
    week: 2,
    weekTopic: "Woche 2: Shakespeare & Elizabethan Age",
    question: "How does a Shakespearean sonnet structure its 14 lines?",
    options: [
      "Three quatrains (4 lines each) followed by a rhyming couplet (2 lines) with a final turn",
      "Two octaves without a rhyme scheme",
      "Four tercets and two unrhymed lines",
      "One continuous stanza in free verse",
    ],
    correctIndex: 0,
    aiExplanation:
      "A Shakespearean sonnet has three quatrains (abab cdcd efef) and ends with a heroic couplet (gg) delivering the volta (turn).",
    errorRatePercent: 49,
    topicTag: "Sonnet Structure",
    gapDescription: "49 % verwechseln englisches und italienisches Sonett",
  },
  {
    id: "q-eng-4",
    subjectId: "englisch",
    week: 2,
    weekTopic: "Woche 2: Shakespeare & Elizabethan Age",
    question:
      "What does the Elizabethan concept of the 'Great Chain of Being' imply?",
    options: [
      "Every element in the universe has a divinely ordained rank; disrupting it causes chaos in nature and society",
      "Social mobility is encouraged through elections",
      "Technology is superior to royal authority",
      "All living beings are equal without hierarchy",
    ],
    correctIndex: 0,
    aiExplanation:
      "In Elizabethan worldviews, rebelling against the monarch disturbs the cosmic order, often mirrored by storms and unnatural events in Shakespeare's plays.",
    errorRatePercent: 52,
    topicTag: "Worldview",
    gapDescription: "52 % können die 'Great Chain of Being' nicht mit Naturunruhen verknüpfen",
  },
  {
    id: "q-eng-5",
    subjectId: "englisch",
    week: 3,
    weekTopic: "Woche 3: Dystopian Fiction & Future",
    question:
      "Which core characteristic defines a classic dystopian society in literature?",
    options: [
      "An illusion of a perfect or secure order maintained through surveillance, propaganda, or loss of individuality",
      "A nostalgic return to medieval life without government",
      "A purely comedic portrayal of space travel",
      "A society without any technology or rules",
    ],
    correctIndex: 0,
    aiExplanation:
      "Dystopian fiction extrapolates current trends to warn readers about the loss of individual freedom under the guise of stability.",
    errorRatePercent: 37,
    topicTag: "Dystopia",
    gapDescription: "37 % vergessen das Merkmal der scheinbar perfekten Ordnung",
  },
  {
    id: "q-eng-6",
    subjectId: "englisch",
    week: 3,
    weekTopic: "Woche 3: Dystopian Fiction & Future",
    question:
      "Why do dystopian novels frequently use a first-person narrator who starts as a conformist?",
    options: [
      "It allows readers to experience the gradual awakening and questioning of the system firsthand",
      "It proves that the narrator knows everyone's thoughts",
      "It prevents emotional identification",
      "It eliminates all subjective feelings",
    ],
    correctIndex: 0,
    aiExplanation:
      "Starting from inside the system makes its rules feel normal at first; as the narrator notices contradictions, the reader shares their awakening.",
    errorRatePercent: 43,
    topicTag: "Narrative Perspective",
    gapDescription: "43 % verwechseln Ich-Perspektive und allwissenden Erzähler",
  },
];

export const GESCHICHTE_QUESTIONS: QuestionDoc[] = [
  {
    id: "q-ges-1",
    subjectId: "geschichte",
    week: 1,
    weekTopic: "Woche 1: Gründung & Krisen der Weimarer Republik",
    question:
      "Was versteht man unter der 'doppelten Ausrufung der Republik' am 9. November 1918 in Berlin?",
    options: [
      "Philipp Scheidemann (SPD) rief die parlamentarische Republik aus, Karl Liebknecht kurz darauf die sozialistische Räterepublik",
      "Kaiser Wilhelm II. und Hindenburg riefen gemeinsam das Kaiserreich neu aus",
      "Frankreich und Großbritannien gründeten die Weimarer Verfassung",
      "Berlin und München erklärten sich gleichzeitig zur Hauptstadt",
    ],
    correctIndex: 0,
    aiExplanation:
      "Am 9.11.1918 konkurrierten zwei Zukunftsmodelle: Scheidemann wollte eine parlamentarische Demokratie, Liebknecht eine Räterepublik nach sowjetischem Vorbild.",
    errorRatePercent: 49,
    topicTag: "Novemberrevolution",
    gapDescription: "49 % verwechseln die Ziele von Scheidemann und Liebknecht",
  },
  {
    id: "q-ges-2",
    subjectId: "geschichte",
    week: 1,
    weekTopic: "Woche 1: Gründung & Krisen der Weimarer Republik",
    question:
      "Warum erwies sich Artikel 48 der Weimarer Reichsverfassung ('Notverordnungsrecht') später als verhängnisvoll?",
    options: [
      "Er erlaubte dem Reichspräsidenten, Gesetze ohne Reichstagsmehrheit zu erlassen und Grundrechte außer Kraft zu setzen",
      "Er verbot sämtliche demokratischen Parteien im Reichstag",
      "Er schrieb die Hyperinflation von 1923 gesetzlich vor",
      "Er schaffte das Frauenwahlrecht wieder ab",
    ],
    correctIndex: 0,
    aiExplanation:
      "Ab 1930 regierten die Präsidialkabinette mithilfe von Artikel 48 am Parlament vorbei – das höhlte die parlamentarische Demokratie schon vor 1933 aus.",
    errorRatePercent: 58,
    topicTag: "Verfassung",
    gapDescription: "58 % kennen das Zusammenspiel von Art. 48 und Reichstagsauflösung nicht genau",
  },
  {
    id: "q-ges-3",
    subjectId: "geschichte",
    week: 2,
    weekTopic: "Woche 2: Weltwirtschaftskrise & 1933",
    question:
      "Welche unmittelbare Folge hatte der Börsencrash 1929 (Weltwirtschaftskrise) für Deutschland?",
    options: [
      "US-Kredite wurden abgezogen, die Arbeitslosigkeit stieg auf über 6 Millionen und extremistische Parteien (NSDAP, KPD) gewannen massiv",
      "Deutschland erlebte sofort die 'Goldenen Zwanziger'",
      "Der Versailler Vertrag wurde 1929 vollständig aufgehoben",
      "Die SPD erreichte die absolute Mehrheit im Reichstag",
    ],
    correctIndex: 0,
    aiExplanation:
      "Durch den Abzug kurzfristiger US-Kredite (Dawes-Plan) brach die deutsche Wirtschaft ein. Die soziale Not radikalisierte Millionen Wähler.",
    errorRatePercent: 39,
    topicTag: "Weltwirtschaftskrise",
    gapDescription: "39 % übersehen die Abhängigkeit von US-Krediten vor 1929",
  },
  {
    id: "q-ges-4",
    subjectId: "geschichte",
    week: 2,
    weekTopic: "Woche 2: Weltwirtschaftskrise & 1933",
    question:
      "Welche Bedeutung hatte das 'Ermächtigungsgesetz' vom 23. März 1933?",
    options: [
      "Die Regierung Hitler konnte Gesetze ohne Zustimmung von Reichstag und Reichspräsident sowie abweichend von der Verfassung erlassen",
      "Es führte die Weimarer Verfassung zum ersten Mal ein",
      "Es beendete den Zweiten Weltkrieg",
      "Es ernannte Hindenburg zum Reichskanzler",
    ],
    correctIndex: 0,
    aiExplanation:
      "Mit dem Ermächtigungsgesetz schaltete sich das Parlament selbst aus – die Gewaltenteilung war damit endgültig beseitigt.",
    errorRatePercent: 44,
    topicTag: "Machtergreifung",
    gapDescription: "44 % verwechseln Reichstagsbrandverordnung und Ermächtigungsgesetz",
  },
  {
    id: "q-ges-5",
    subjectId: "geschichte",
    week: 3,
    weekTopic: "Woche 3: Kalter Krieg & Ost-West-Konflikt",
    question:
      "Was war das Kernziel des US-amerikanischen Marshall-Plans (ERP) ab 1947?",
    options: [
      "Wirtschaftlicher Wiederaufbau Europas zur Eindämmung des Kommunismus (Containment-Politik) und Sicherung von Absatzmärkten",
      "Die militärische Besetzung der Sowjetunion",
      "Die sofortige Wiedervereinigung Deutschlands im Jahr 1948",
      "Die Abschaffung der D-Mark in den Westzonen",
    ],
    correctIndex: 0,
    aiExplanation:
      "Die USA erkannten, dass wirtschaftliches Elend kommunistische Parteien stärkt. Der Marshall-Plan verband Wirtschaftshilfe mit der Containment-Strategie.",
    errorRatePercent: 41,
    topicTag: "Kalter Krieg",
    gapDescription: "41 % nennen beim Marshall-Plan nur Hilfe, nicht das politische Containment-Ziel",
  },
  {
    id: "q-ges-6",
    subjectId: "geschichte",
    week: 3,
    weekTopic: "Woche 3: Kalter Krieg & Ost-West-Konflikt",
    question:
      "Was meinte Egon Bahr 1963 mit der Formel 'Wandel durch Annäherung' (Neue Ostpolitik)?",
    options: [
      "Durch Verträge, Dialog und Kontakte mit der DDR/UdSSR menschliche Erleichterungen erreichen und das System langfristig öffnen",
      "Die DDR durch vollständigen Abbruch aller Beziehungen isolieren (Hallstein-Doktrin)",
      "Die Bundeswehr an der innerdeutschen Grenze angreifen lassen",
      "Aus der NATO austreten",
    ],
    correctIndex: 0,
    aiExplanation:
      "Statt Konfrontation setzte Willy Brandts Ostpolitik auf Entspannung und Kooperation, um die Folgen der Teilung für die Menschen zu mildern.",
    errorRatePercent: 47,
    topicTag: "Neue Ostpolitik",
    gapDescription: "47 % verwechseln Hallstein-Doktrin und Neue Ostpolitik",
  },
];

export const MUSIK_QUESTIONS: QuestionDoc[] = [
  {
    id: "q-mus-1",
    subjectId: "musik",
    week: 1,
    weekTopic: "Woche 1: Harmonielehre & Kadenzen",
    question:
      "Aus welchen drei Hauptfunktionen besteht eine klassische authentische Kadenz in C-Dur?",
    options: [
      "Tonika (C) – Subdominante (F) – Dominante (G) – Tonika (C)",
      "Tonika (C) – Mollparallele (a) – Septakkord (H) – Tonika (C)",
      "Dominante (G) – Tonika (C) – Subdominante (F)",
      "Nur aus verminderten Dreiklängen",
    ],
    correctIndex: 0,
    aiExplanation:
      "Die klassische Kadenz (T – S – D – T) festigt die Tonart: In C-Dur sind das C-Dur (I), F-Dur (IV), G-Dur (V) und zurück zum Grundakkord C-Dur.",
    errorRatePercent: 43,
    topicTag: "Funktionstheorie",
    gapDescription: "43 % vertauschen Subdominante (IV. Stufe) und Dominante (V. Stufe)",
  },
  {
    id: "q-mus-2",
    subjectId: "musik",
    week: 1,
    weekTopic: "Woche 1: Harmonielehre & Kadenzen",
    question:
      "Was versteht man in der Harmonielehre unter einem 'Trugschluss'?",
    options: [
      "Nach der Dominante (D) folgt statt der erwarteten Tonika (T) überraschend die Tonikaparallele (Tp, z. B. a-Moll statt C-Dur)",
      "Das Orchester hört mitten im Takt plötzlich auf zu spielen",
      "Ein Stück endet immer im dreifachen Forte",
      "Die Melodie wechselt in den Violinschlüssel",
    ],
    correctIndex: 0,
    aiExplanation:
      "Das Ohr erwartet nach der spannungsgeladenen Dominante (G7) die Auflösung nach C-Dur – stattdessen erklingt die Mollparallele (a-Moll, VI. Stufe).",
    errorRatePercent: 56,
    topicTag: "Trugschluss",
    gapDescription: "56 % wissen nicht, dass beim Trugschluss die VI. Stufe (Tp) folgt",
  },
  {
    id: "q-mus-3",
    subjectId: "musik",
    week: 2,
    weekTopic: "Woche 2: Sonatenhauptsatzform (Klassik)",
    question:
      "Wie gliedert sich der formale Ablauf einer klassischen Sonatenhauptsatzform?",
    options: [
      "Exposition (Hauptsatz & Seitensatz) – Durchführung – Reprise (ggf. Coda)",
      "Strophe – Refrain – Bridge – Strophe",
      "thematisches Vorspiel – Fuge – Choral",
      "A – B – A – C – A (Rondoform)",
    ],
    correctIndex: 0,
    aiExplanation:
      "In der Exposition werden die beiden kontrastierenden Themen vorgestellt, in der Durchführung motivisch verarbeitet und in der Reprise in der Grundtonart wiederholt.",
    errorRatePercent: 38,
    topicTag: "Sonatenform",
    gapDescription: "38 % verwechseln die Aufgaben von Exposition und Durchführung",
  },
  {
    id: "q-mus-4",
    subjectId: "musik",
    week: 2,
    weekTopic: "Woche 2: Sonatenhauptsatzform (Klassik)",
    question:
      "Welche Verarbeitungstechnik ist typisch für die 'Durchführung' einer Sonate (z. B. bei Beethoven)?",
    options: [
      "Motivische Abspaltung, Sequenzierung und häufige Modulationen in entfernte Tonarten",
      "Exakte, unveränderte Wiederholung des Anfangs in der Grundtonart",
      "Reines Schlagzeug-Solo ohne Harmonie",
      "Vollständiger Verzicht auf Motive aus der Exposition",
    ],
    correctIndex: 0,
    aiExplanation:
      "In der Durchführung herrscht höchste dramatische Spannung: Motive werden zerlegt (Abspaltung), auf verschiedenen Tonstufen verschoben (Sequenz) und durch viele Tonarten geführt.",
    errorRatePercent: 51,
    topicTag: "Motivisch-thematische Arbeit",
    gapDescription: "51 % können 'Abspaltung' und 'Sequenzierung' am Notentext nicht benennen",
  },
  {
    id: "q-mus-5",
    subjectId: "musik",
    week: 3,
    weekTopic: "Woche 3: Romantik & Programmmusik",
    question:
      "Was kennzeichnet eine 'Sinfonische Dichtung' (Programmmusik des 19. Jahrhunderts, z. B. Smetanas 'Die Moldau')?",
    options: [
      "Ein außermusikalisches Programm (Handlung, Naturbild, Gedicht) bestimmt Form und Ausdruck der Instrumentalmusik",
      "Es handelt sich um eine Oper mit Kostümen und Gesang",
      "Die Musik hat bewusst keinerlei Bezug zu Bildern oder Gefühlen (Absolute Musik)",
      "Sie darf nur von einem einzelnen Klavier gespielt werden",
    ],
    correctIndex: 0,
    aiExplanation:
      "Anders als die 'Absolute Musik' erzählt die Programmmusik mit rein instrumentalen Klangfarben eine literarische oder bildhafte Vorlage nach.",
    errorRatePercent: 35,
    topicTag: "Programmmusik",
    gapDescription: "35 % grenzen Programmmusik und Absolute Musik unscharf voneinander ab",
  },
  {
    id: "q-mus-6",
    subjectId: "musik",
    week: 3,
    weekTopic: "Woche 3: Romantik & Programmmusik",
    question:
      "Welche Funktion hat ein 'Leitmotiv' (z. B. bei Richard Wagner oder in moderner Filmmusik)?",
    options: [
      "Ein prägnantes musikalisches Motiv, das eine bestimmte Person, einen Ort oder eine Idee repräsentiert und sich mit der Handlung wandelt",
      "Das Stimmgerät des Konzertmeisters vor dem Konzert",
      "Der letzte Akkord einer Sinfonie",
      "Eine festgelegte Taktart im 3/4-Takt",
    ],
    correctIndex: 0,
    aiExplanation:
      "Leitmotive verknüpfen Musik und Bedeutung: Erklingt das Motiv (z. B. verändert in Moll), weiß der Hörer sofort, an welche Figur oder Gefahr erinnert wird.",
    errorRatePercent: 29,
    topicTag: "Leitmotivtechnik",
    gapDescription: "29 % übersehen die psychologische Wandlung des Leitmotivs",
  },
];

export const INFORMATIK_QUESTIONS: QuestionDoc[] = [
  {
    id: "q-inf-1",
    subjectId: "informatik",
    week: 1,
    weekTopic: "Woche 1: Algorithmen & Laufzeit (O-Notation)",
    question:
      "Welche Zeitkomplexität hat die Binäre Suche (Binary Search) in einem bereits sortierten Array mit n Elementen im Worst Case?",
    options: [
      "O(log n), da der Suchbereich in jedem Schritt halbiert wird",
      "O(n²), da zwei geschachtelte Schleifen nötig sind",
      "O(n), da jedes Element einzeln geprüft werden muss",
      "O(1), unabhängig von der Größe des Arrays",
    ],
    correctIndex: 0,
    aiExplanation:
      "Durch das Halbieren des Suchraums in jedem Schritt benötigt Binary Search selbst bei 1 Million Elementen maximal ca. 20 Vergleiche: O(log₂ n).",
    errorRatePercent: 48,
    topicTag: "Binäre Suche",
    gapDescription: "48 % vergessen, dass das Array für Binary Search sortiert sein muss",
  },
  {
    id: "q-inf-2",
    subjectId: "informatik",
    week: 1,
    weekTopic: "Woche 1: Algorithmen & Laufzeit (O-Notation)",
    question:
      "Warum benötigt eine rekursive Funktion zwingend eine erreichbare Abbruchbedingung (Base Case)?",
    options: [
      "Damit die Rekursion endet und es nicht zu einem Stack Overflow (Endlosrekursion) kommt",
      "Weil der Compiler sonst keine Variablen anlegen kann",
      "Damit das Programm automatisch parallel auf der Grafikkarte läuft",
      "Um die Datenbank zu verschlüsseln",
    ],
    correctIndex: 0,
    aiExplanation:
      "Jeder rekursive Aufruf legt einen neuen Frame auf dem Call-Stack ab. Ohne erreichbaren Base Case läuft der Stack voll (StackOverflowError).",
    errorRatePercent: 37,
    topicTag: "Rekursion",
    gapDescription: "37 % können den Zusammenhang zwischen Rekursionstiefe und Call-Stack nicht erklären",
  },
  {
    id: "q-inf-3",
    subjectId: "informatik",
    week: 2,
    weekTopic: "Woche 2: Datenstrukturen (Stack, Queue, Binärbaum)",
    question:
      "Nach welchem Prinzip arbeitet die Datenstruktur 'Stack' (Kellerspeicher)?",
    options: [
      "LIFO (Last In – First Out): Das zuletzt abgelegte Element wird als Erstes wieder entnommen",
      "FIFO (First In – First Out): Wie eine Warteschlange an der Kasse",
      "Random Access: Beliebiger Zugriff über einen numerischen Index",
      "Prioritätsgesteuert nach der Größe des Elements",
    ],
    correctIndex: 0,
    aiExplanation:
      "Wie bei einem Bücherstapel legt push() oben ab und pop() nimmt das oberste (zuletzt hinzugefügte) Element wieder herunter (LIFO). Eine Queue arbeitet nach FIFO.",
    errorRatePercent: 42,
    topicTag: "Stack vs. Queue",
    gapDescription: "42 % verwechseln LIFO (Stack) und FIFO (Queue)",
  },
  {
    id: "q-inf-4",
    subjectId: "informatik",
    week: 2,
    weekTopic: "Woche 2: Datenstrukturen (Stack, Queue, Binärbaum)",
    question:
      "In welcher Reihenfolge gibt ein 'Inorder-Durchlauf' (Links – Wurzel – Rechts) die Knoten eines binären Suchbaums (BST) aus?",
    options: [
      "In aufsteigend sortierter Reihenfolge",
      "In zufälliger Reihenfolge",
      "Von den Blättern zur Wurzel absteigend",
      "Ebenenweise von oben nach unten (Breitensuche)",
    ],
    correctIndex: 0,
    aiExplanation:
      "Da im binären Suchbaum links immer kleinere und rechts immer größere Werte stehen, liefert Links → Wurzel → Rechts (Inorder) exakt die sortierte Folge!",
    errorRatePercent: 59,
    topicTag: "Binärer Suchbaum",
    gapDescription: "59 % verwechseln Preorder, Inorder und Postorder am Binärbaum",
  },
  {
    id: "q-inf-5",
    subjectId: "informatik",
    week: 3,
    weekTopic: "Woche 3: Datenbanken & SQL",
    question:
      "Welche Aufgabe hat ein Fremdschlüssel (Foreign Key) in einer relationalen Datenbank?",
    options: [
      "Er verweist auf den Primärschlüssel einer anderen Tabelle und stellt so eine Beziehung zwischen den Tabellen her",
      "Er verschlüsselt das Passwort des Datenbank-Administrators",
      "Er löscht automatisch doppelte Spaltennamen",
      "Er sortiert die Tabelle alphabetisch",
    ],
    correctIndex: 0,
    aiExplanation:
      "Über Primär- und Fremdschlüssel werden Datensätze tabellenübergreifend verknüpft (Referenzielle Integrität) und können per JOIN abgefragt werden.",
    errorRatePercent: 34,
    topicTag: "Datenbankmodell",
    gapDescription: "34 % verwechseln Primärschlüssel und Fremdschlüssel bei 1:n-Beziehungen",
  },
  {
    id: "q-inf-6",
    subjectId: "informatik",
    week: 3,
    weekTopic: "Woche 3: Datenbanken & SQL",
    question:
      "Worin liegt in SQL der Unterschied zwischen den Klauseln WHERE und HAVING?",
    options: [
      "WHERE filtert einzelne Zeilen vor der Gruppierung, HAVING filtert Gruppen nach einem GROUP BY (z. B. HAVING COUNT(*) > 5)",
      "HAVING darf nur bei DELETE-Befehlen genutzt werden",
      "WHERE funktioniert nur mit Textspalten, HAVING nur mit Zahlen",
      "Es gibt keinen Unterschied, beide sind austauschbar",
    ],
    correctIndex: 0,
    aiExplanation:
      "Aggregatfunktionen wie COUNT(), AVG() oder SUM() werden erst nach GROUP BY berechnet – Bedingungen darauf gehören deshalb in die HAVING-Klausel.",
    errorRatePercent: 63,
    topicTag: "SQL Abfragen",
    gapDescription: "63 % nutzen Aggregatfunktionen wie COUNT() direkt im WHERE statt im HAVING",
  },
];

export const DS_QUESTIONS: QuestionDoc[] = [
  {
    id: "q-ds-1",
    subjectId: "ds",
    week: 1,
    weekTopic: "Woche 1: Körper, Raum & Bühnenpräsenz",
    question:
      "Was versteht man im Darstellenden Spiel unter 'Neutralhaltung' (Neutraler Stand)?",
    options: [
      "Einen aufrechten, hüftbreiten, durchlässigen Stand ohne private Alltagsmanierismen als Ausgangspunkt für jede Rolle",
      "Wenn man sich mit dem Rücken zum Publikum an die Wand lehnt",
      "Eine eingefrorene Pantomime-Pose auf einem Bein",
      "Das Vorlesen des Textbuchs im Sitzen",
    ],
    correctIndex: 0,
    aiExplanation:
      "Die Neutralhaltung löscht private Gewohnheiten (wie Hände in den Taschen) aus und erzeugt maximale Bühnenpräsenz und Reaktionsbereitschaft.",
    errorRatePercent: 31,
    topicTag: "Bühnenpräsenz",
    gapDescription: "31 % verwechseln Neutralhaltung mit verspannter Starre",
  },
  {
    id: "q-ds-2",
    subjectId: "ds",
    week: 1,
    weekTopic: "Woche 1: Körper, Raum & Bühnenpräsenz",
    question:
      "Wie erzeugt man auf einer offenen Bühne ein ausgeglichenes Raumbild ('Plateau-Prinzip')?",
    options: [
      "Die Spielenden verteilen sich bewusst im Raum, sodass keine ungewollten Klumpen entstehen und das Bühnenbild im Gleichgewicht bleibt",
      "Alle stehen in einer geraden Linie direkt an der vorderen Bühnenkante",
      "Alle Schauspieler verstecken sich hinter den Kulissen",
      "Man läuft ausschließlich im Kreis",
    ],
    correctIndex: 0,
    aiExplanation:
      "Man stellt sich die Bühne wie eine auf einer Spitze gelagerte Platte (Plateau) vor: Geht jemand nach links vorn, gleicht das Ensemble den Raum optisch aus.",
    errorRatePercent: 45,
    topicTag: "Raumarbeit",
    gapDescription: "45 % bilden im Raumlauf ungewollte Gruppen ('Klumpenbildung')",
  },
  {
    id: "q-ds-3",
    subjectId: "ds",
    week: 2,
    weekTopic: "Woche 2: Theatertheorie (Stanislawski vs. Brecht)",
    question:
      "Welches Ziel verfolgt Bertolt Brecht im 'Epischen Theater' mit dem Verfremdungseffekt (V-Effekt)?",
    options: [
      "Die Illusion durchbrechen, damit das Publikum nicht blind mitfühlt, sondern gesellschaftliche Zustände kritisch hinterfragt",
      "Das Publikum durch Grusel-Effekte zu erschrecken",
      "Eine möglichst perfekte Einfühlung in die Psyche der Figur zu erzeugen",
      "Die Schauspieler durch Masken unkenntlich zu machen",
    ],
    correctIndex: 0,
    aiExplanation:
      "Mittel wie Heraustreten aus der Rolle, Kommentare ans Publikum, Songs oder Spruchbänder schaffen kritische Distanz statt passiver Einfühlung.",
    errorRatePercent: 53,
    topicTag: "Episches Theater",
    gapDescription: "53 % können konkrete Spielmittel des V-Effekts nicht benennen",
  },
  {
    id: "q-ds-4",
    subjectId: "ds",
    week: 2,
    weekTopic: "Woche 2: Theatertheorie (Stanislawski vs. Brecht)",
    question:
      "Wofür nutzt Konstantin Stanislawski in seiner Schauspielmethode das 'Magische Wenn'?",
    options: [
      "Schauspieler fragen sich: 'Was würde ich tun, wenn ich in genau dieser Situation der Figur wäre?', um glaubwürdige Emotionen zu wecken",
      "Um Zaubertricks auf der Bühne vorzuführen",
      "Um das Bühnenbild per Knopfdruck zu wechseln",
      "Um das Publikum von der Bühne auszuschließen",
    ],
    correctIndex: 0,
    aiExplanation:
      "Bei Stanislawski steht die psychologische Glaubwürdigkeit und Einfühlung im Zentrum: Das 'Magische Wenn' aktiviert das emotionale Gedächtnis des Spielers.",
    errorRatePercent: 41,
    topicTag: "Psychologischer Realismus",
    gapDescription: "41 % verwechseln Stanislawskis Einfühlung mit Brechts Distanz",
  },
  {
    id: "q-ds-5",
    subjectId: "ds",
    week: 3,
    weekTopic: "Woche 3: Statusspiel & Inszenierung",
    question:
      "Wie zeigt sich nach Keith Johnstone in der Improvisation ein 'Hochstatus' über Körpersprache?",
    options: [
      "Ruhige, kontrollierte Bewegungen, aufrechte Haltung, gehaltener Blickkontakt und Raumbeanspruchung",
      "Hektisches Blinzeln, ständiges Fassen ins eigene Gesicht und kicherndes Ausweichen",
      "Sich möglichst klein machen und leise nuscheln",
      "Nur durch das Tragen einer Krone als Requisit",
    ],
    correctIndex: 0,
    aiExplanation:
      "Status ist keine soziale Schicht, sondern ein körperliches Verhalten: Ein Diener kann durch Ruhe und Blickführung im Hochstatus gegenüber einem nervösen König spielen!",
    errorRatePercent: 36,
    topicTag: "Status nach Johnstone",
    gapDescription: "36 % verwechseln gespielten Körper-Status mit gesellschaftlichem Rang",
  },
  {
    id: "q-ds-6",
    subjectId: "ds",
    week: 3,
    weekTopic: "Woche 3: Statusspiel & Inszenierung",
    question:
      "Was versteht man im postdramatischen Theater unter einer 'Kontrastierung' von Text und Handlung?",
    options: [
      "Der gesprochene Text und die körperliche Aktion widersprechen sich bewusst (z. B. Liebeserklärung während man Koffer packt)",
      "Alle sprechen den Text gleichzeitig im Chor",
      "Die Handlung verdoppelt eins zu eins das, was ohnehin im Text gesagt wird",
      "Der Text wird komplett gestrichen",
    ],
    correctIndex: 0,
    aiExplanation:
      "Statt den Text nur platt zu illustrieren (Verdopplung), erzeugt die Reibung zwischen Wort und Körperhandlung eine spannende zweite Bedeutungsebene (Subtext).",
    errorRatePercent: 48,
    topicTag: "Ästhetische Mittel",
    gapDescription: "48 % spielen Text oft eins zu eins nach (Illustration statt Kontrast)",
  },
];

export const RELIGION_QUESTIONS: QuestionDoc[] = [
  {
    id: "q-rel-1",
    subjectId: "religion",
    week: 1,
    weekTopic: "Woche 1: Menschenbild & Willensfreiheit",
    question:
      "Was besagt die biblisch-christliche Aussage, der Mensch sei als 'Ebenbild Gottes' (Imago Dei, Gen 1,27) geschaffen?",
    options: [
      "Jeder Mensch besitzt eine unveräußerliche Würde und den Auftrag zum verantwortungsvollen Schutz der Schöpfung",
      "Gott sieht äußerlich exakt so aus wie ein Mensch",
      "Der Mensch ist unfehlbar und allmächtig wie Gott",
      "Nur Könige und Priester besitzen Menschenwürde",
    ],
    correctIndex: 0,
    aiExplanation:
      "Die Gottebenbildlichkeit begründet die gleiche, unantastbare Würde jedes Menschen – unabhängig von Leistung, Herkunft oder Gesundheit.",
    errorRatePercent: 33,
    topicTag: "Imago Dei",
    gapDescription: "33 % verstehen Gottebenbildlichkeit äußerlich statt als Würde- und Beziehungsbegriff",
  },
  {
    id: "q-rel-2",
    subjectId: "religion",
    week: 1,
    weekTopic: "Woche 1: Menschenbild & Willensfreiheit",
    question:
      "Wie erklärt Martin Luther das Verhältnis des Menschen zu sich selbst mit der Formel 'simul iustus et peccator'?",
    options: [
      "Der Mensch ist zugleich Gerechtfertigter (durch Gottes Gnade angenommen) und Sünder (bleibt im Leben fehlbar)",
      "Der Mensch muss sich das Heil durch Ablassbriefe selbst erkaufen",
      "Wer einmal sündigt, kann niemals Vergebung erfahren",
      "Gute Werke allein machen den Menschen vor Gott gerecht",
    ],
    correctIndex: 0,
    aiExplanation:
      "Nach Luther muss der Mensch seinen Wert nicht durch Leistungsdruck beweisen: Trotz seiner Fehlbarkeit ('peccator') spricht Gott ihn aus Gnade frei ('iustus').",
    errorRatePercent: 54,
    topicTag: "Rechtfertigungslehre",
    gapDescription: "54 % können 'simul iustus et peccator' nicht auf heutige Leistungsgesellschaft beziehen",
  },
  {
    id: "q-rel-3",
    subjectId: "religion",
    week: 2,
    weekTopic: "Woche 2: Pflichtethik (Kant) vs. Utilitarismus",
    question:
      "Worauf kommt es beim 'Kategorischen Imperativ' von Immanuel Kant (Pflichtethik / Deontologie) an?",
    options: [
      "Ob die eigene Handlungsmaxime widerspruchsfrei als allgemeines Gesetz für alle Menschen gelten könnte (guter Wille & Pflicht)",
      "Ob die Handlung für mich persönlich den größten finanziellen Vorteil bringt",
      "Ob die Mehrheit der Zuschauer am Ende klatscht",
      "Nur auf die zufälligen Folgen einer Tat, egal aus welcher Absicht",
    ],
    correctIndex: 0,
    aiExplanation:
      "Kant beurteilt Handlungen nach ihrer Verallgemeinerbarkeit und der Achtung der Menschenwürde ('handle so, dass du die Menschheit niemals bloß als Mittel gebrauchst').",
    errorRatePercent: 47,
    topicTag: "Deontologie (Kant)",
    gapDescription: "47 % verwechseln Kants Pflichtethik mit der Goldenen Regel",
  },
  {
    id: "q-rel-4",
    subjectId: "religion",
    week: 2,
    weekTopic: "Woche 2: Pflichtethik (Kant) vs. Utilitarismus",
    question:
      "Welches Grundprinzip vertritt der klassische Utilitarismus (Jeremy Bentham / John Stuart Mill)?",
    options: [
      "Handle so, dass das größtmögliche Glück für die größtmögliche Zahl der Betroffenen entsteht (Folgenethik)",
      "Bestimmte Handlungen sind immer verboten, selbst wenn sie die Welt retten",
      "Moralische Regeln gelten nur innerhalb der eigenen Familie",
      "Gefühle von Leid und Freude spielen für die Moral keine Rolle",
    ],
    correctIndex: 0,
    aiExplanation:
      "Der Utilitarismus ist eine teleologische Folgenethik: Eine Handlung ist genau dann moralisch richtig, wenn ihre Gesamtzufriedenheitsbilanz für alle Betroffenen maximal ist.",
    errorRatePercent: 42,
    topicTag: "Utilitarismus",
    gapDescription: "42 % übersehen das Problem des Minderheitenschutzes im reinen Utilitarismus",
  },
  {
    id: "q-rel-5",
    subjectId: "religion",
    week: 3,
    weekTopic: "Woche 3: Theodizee & Medizinethik",
    question:
      "Welche drei Eigenschaften Gottes stehen beim klassischen 'Theodizee-Problem' (Epikur) in einem scheinbaren Spannungsverhältnis zum Leid in der Welt?",
    options: [
      "Allmacht, Allgüte (Liebe) und Allwissenheit Gottes angesichts der Existenz des Übels",
      "Armut, Schweigen und Unsichtbarkeit",
      "Dreifaltigkeit von Vater, Sohn und Heiligem Geist",
      "Gerechtigkeit, Strenge und Strafe",
    ],
    correctIndex: 0,
    aiExplanation:
      "Die Theodizee-Frage lautet: Wenn Gott allmächtig und allgütig ist, warum lässt er dann unschuldiges Leid (z. B. Naturkatastrophen oder Kriege) zu?",
    errorRatePercent: 39,
    topicTag: "Theodizee",
    gapDescription: "39 % nennen beim Theodizee-Dreieck nur zwei der drei Attribute",
  },
  {
    id: "q-rel-6",
    subjectId: "religion",
    week: 3,
    weekTopic: "Woche 3: Theodizee & Medizinethik",
    question:
      "Welches ethische Argument spricht in der Medizinethik gegen ein unbegrenztes 'Genetic Enhancement' (Optimierung gesunder Embryonen nach Wunsch)?",
    options: [
      "Gefahr der Instrumentalisierung des Kindes ('Designer-Baby') und Verstärkung sozialer Ungleichheit",
      "Die DNA besteht nicht aus Genen",
      "Krankheiten dürften laut Grundgesetz niemals geheilt werden",
      "Genetik funktioniert nur bei Pflanzen",
    ],
    correctIndex: 0,
    aiExplanation:
      "Nach Jürgen Habermas und Kant droht beim Wunsch-Design gesunder Nachkommen, dass Eltern über das Kind wie über ein Produkt verfügen, statt es als freies Gegenüber anzunehmen.",
    errorRatePercent: 35,
    topicTag: "Bioethik",
    gapDescription: "35 % unterscheiden Therapie (Heilung) und Enhancement (Optimierung) nicht klar",
  },
];

export function pick3RandomSubjectsFromCourses(
  courses: CourseDoc[],
  exclude?: SubjectId
): [SubjectId, SubjectId, SubjectId] {
  const uniqueIds = Array.from(new Set(courses.map((c) => c.subjectId))).filter(
    (id) => id !== exclude
  );
  const shuffled = [...uniqueIds].sort(() => Math.random() - 0.5);
  return [
    shuffled[0] || "bio",
    shuffled[1] || "mathe",
    shuffled[2] || "deutsch",
  ];
}

const createInitialDatabase = (): ConvexMockDatabase => ({
  courses: [
    {
      _id: "course-bio",
      subjectId: "bio",
      subjectLabel: "Biologie",
      shortLabel: "Bio",
      accentColor: "emerald",
      title: "Biologie GK Q1 (Herr Müller)",
      teacherName: "Herr Müller",
      gradeLevel: "Q1 • Sek II",
      roomCode: "BIO-Q1-7X9",
      shareCode: "FOTO-26",
      livePin: "849-201",
      examDaysLeft: 6,
      weekTitles: {
        1: "Woche 1: Chloroplasten & Lichtreaktion",
        2: "Woche 2: Calvin-Zyklus & CO2-Fixierung",
        3: "Woche 3: Zellatmung & Umweltfaktoren",
      },
      coopRoundsCurrent: 46,
      coopRoundsTarget: 50,
      examChecklist: [
        "Ort der Lichtreaktion (Thylakoidmembran) strikt vom Stroma (Calvin-Zyklus) trennen",
        "Chemiosmose: H+-Ionen strömen vom sauren Thylakoidlumen (pH 5) durch die ATP-Synthase ins Stroma",
        "Kopplung: Ohne CO2 stoppt der Calvin-Zyklus → es fehlen ADP und NADP+ für die Lichtreaktion",
      ],
    },
    {
      _id: "course-mathe",
      subjectId: "mathe",
      subjectLabel: "Mathematik",
      shortLabel: "Mathe",
      accentColor: "blue",
      title: "Mathematik LK Q1 (Frau Weber)",
      teacherName: "Frau Weber",
      gradeLevel: "Q1 • Sek II",
      roomCode: "MAT-Q1-4K2",
      shareCode: "ANA-26",
      livePin: "512-904",
      examDaysLeft: 11,
      weekTitles: {
        1: "Woche 1: Ableitungsregeln & e-Funktion",
        2: "Woche 2: Extrem- & Wendepunkte",
        3: "Woche 3: Integralrechnung & Flächen",
      },
      coopRoundsCurrent: 38,
      coopRoundsTarget: 50,
      examChecklist: [
        "Produktregel bei x²·eˣ anwenden und eˣ sofort ausklammern (da eˣ > 0)",
        "Hochpunkt: f'(x₀) = 0 und f''(x₀) < 0 | Wendepunkt: f''(x₀) = 0 und f'''(x₀) ≠ 0",
        "Flächenberechnung: Immer erst Nullstellen bzw. Schnittstellen berechnen, niemals über Nullstellen hinweg integrieren",
      ],
    },
    {
      _id: "course-deutsch",
      subjectId: "deutsch",
      subjectLabel: "Deutsch",
      shortLabel: "Deutsch",
      accentColor: "amber",
      title: "Deutsch GK Q1 (Herr Kästner)",
      teacherName: "Herr Kästner",
      gradeLevel: "Q1 • Sek II",
      roomCode: "DEU-Q1-9L1",
      shareCode: "FAUST-26",
      livePin: "730-418",
      examDaysLeft: 14,
      weekTitles: {
        1: "Woche 1: Prolog & Gelehrtentragödie",
        2: "Woche 2: Gretchentragödie & Sprache",
        3: "Woche 3: Epochenbezug (Sturm & Drang / Klassik)",
      },
      coopRoundsCurrent: 41,
      coopRoundsTarget: 50,
      examChecklist: [
        "Wette im Studierzimmer ('Verweile doch!') präzise vom traditionellen 24-Jahre-Teufelspakt abgrenzen",
        "Prolog im Himmel als Rahmen für Fausts Rettung ('Es irrt der Mensch, solang er strebt') deuten",
        "Gretchenfrage: Sprachliche Diskrepanz zwischen Gretchens Kirchenglauben und Fausts Pantheismus belegen",
      ],
    },
    {
      _id: "course-englisch",
      subjectId: "englisch",
      subjectLabel: "Englisch",
      shortLabel: "Englisch",
      accentColor: "indigo",
      title: "Englisch LK Q1 (Ms. Carter)",
      teacherName: "Ms. Carter",
      gradeLevel: "Q1 • Sek II",
      roomCode: "ENG-Q1-3M8",
      shareCode: "SHAK-26",
      livePin: "621-885",
      examDaysLeft: 19,
      weekTitles: {
        1: "Woche 1: Rhetoric & Speech Analysis",
        2: "Woche 2: Shakespeare & Elizabethan Age",
        3: "Woche 3: Dystopian Fiction & Future",
      },
      coopRoundsCurrent: 33,
      coopRoundsTarget: 45,
      examChecklist: [
        "Stylistic devices: Always follow Quote → Name of device → Communicative effect on the audience",
        "Shakespearean Sonnet: 3 quatrains + rhyming couplet with a volta (turning point)",
        "Dystopia: Highlight the contrast between the facade of stability and total surveillance",
      ],
    },
    {
      _id: "course-geschichte",
      subjectId: "geschichte",
      subjectLabel: "Geschichte",
      shortLabel: "Geschichte",
      accentColor: "rose",
      title: "Geschichte GK Q1 (Herr Brandt)",
      teacherName: "Herr Brandt",
      gradeLevel: "Q1 • Sek II",
      roomCode: "GES-Q1-5H3",
      shareCode: "WEIM-26",
      livePin: "319-740",
      examDaysLeft: 9,
      weekTitles: {
        1: "Woche 1: Gründung & Krisen der Weimarer Republik",
        2: "Woche 2: Weltwirtschaftskrise & 1933",
        3: "Woche 3: Kalter Krieg & Ost-West-Konflikt",
      },
      coopRoundsCurrent: 29,
      coopRoundsTarget: 40,
      examChecklist: [
        "9. November 1918: Scheidemann (parlamentarisch) vs. Liebknecht (sozialistische Räterepublik)",
        "Artikel 48 WRV (Notverordnungsrecht) + Artikel 25 (Reichstagsauflösung) als strukturelle Schwäche",
        "Marshall-Plan 1947 als wirtschaftliches Instrument der US-Containment-Politik",
      ],
    },
    {
      _id: "course-musik",
      subjectId: "musik",
      subjectLabel: "Musik",
      shortLabel: "Musik",
      accentColor: "purple",
      title: "Musik GK Q1 (Frau Lindner)",
      teacherName: "Frau Lindner",
      gradeLevel: "Q1 • Sek II",
      roomCode: "MUS-Q1-2P7",
      shareCode: "SONA-26",
      livePin: "408-112",
      examDaysLeft: 16,
      weekTitles: {
        1: "Woche 1: Harmonielehre & Kadenzen",
        2: "Woche 2: Sonatenhauptsatzform (Klassik)",
        3: "Woche 3: Romantik & Programmmusik",
      },
      coopRoundsCurrent: 22,
      coopRoundsTarget: 35,
      examChecklist: [
        "Authentische Kadenz (T – S – D – T) vs. Trugschluss (D → Tp, VI. Stufe)",
        "Sonatenhauptsatzform: Exposition (Themendualismus) – Durchführung (Abspaltung/Modulation) – Reprise",
        "Programmmusik (außermusikalisches Programm) vs. Absolute Musik",
      ],
    },
    {
      _id: "course-informatik",
      subjectId: "informatik",
      subjectLabel: "Informatik",
      shortLabel: "Info",
      accentColor: "cyan",
      title: "Informatik LK Q1 (Herr Nguyen)",
      teacherName: "Herr Nguyen",
      gradeLevel: "Q1 • Sek II",
      roomCode: "INF-Q1-8C4",
      shareCode: "ALGO-26",
      livePin: "901-337",
      examDaysLeft: 8,
      weekTitles: {
        1: "Woche 1: Algorithmen & Laufzeit (O-Notation)",
        2: "Woche 2: Datenstrukturen (Stack, Queue, Binärbaum)",
        3: "Woche 3: Datenbanken & SQL",
      },
      coopRoundsCurrent: 48,
      coopRoundsTarget: 50,
      examChecklist: [
        "Binäre Suche benötigt zwingend ein sortiertes Array → Zeitkomplexität O(log n)",
        "Stack = LIFO (Last In, First Out) | Queue = FIFO | Inorder am Binären Suchbaum liefert sortierte Ausgabe",
        "SQL: WHERE filtert Zeilen vor GROUP BY, HAVING filtert Gruppen nach Aggregatfunktionen wie COUNT()",
      ],
    },
    {
      _id: "course-ds",
      subjectId: "ds",
      subjectLabel: "Darstellendes Spiel",
      shortLabel: "DS",
      accentColor: "orange",
      title: "Darstellendes Spiel Q1 (Frau Vogel)",
      teacherName: "Frau Vogel",
      gradeLevel: "Q1 • Sek II",
      roomCode: "DS-Q1-6T1",
      shareCode: "BUEH-26",
      livePin: "274-650",
      examDaysLeft: 21,
      weekTitles: {
        1: "Woche 1: Körper, Raum & Bühnenpräsenz",
        2: "Woche 2: Theatertheorie (Stanislawski vs. Brecht)",
        3: "Woche 3: Statusspiel & Inszenierung",
      },
      coopRoundsCurrent: 19,
      coopRoundsTarget: 30,
      examChecklist: [
        "Neutralhaltung & Plateau-Prinzip (Ausgleich im Bühnenraum ohne Klumpenbildung)",
        "Brecht (Episches Theater, V-Effekt, kritische Distanz) vs. Stanislawski (Einfühlung, Magisches Wenn)",
        "Status nach Keith Johnstone als körperliches Verhalten (Ruhe, Blickkontakt, Raum) statt sozialer Rang",
      ],
    },
    {
      _id: "course-religion",
      subjectId: "religion",
      subjectLabel: "Religion & Ethik",
      shortLabel: "Religion",
      accentColor: "teal",
      title: "Religion / Ethik Q1 (Herr Tal)",
      teacherName: "Herr Tal",
      gradeLevel: "Q1 • Sek II",
      roomCode: "REL-Q1-1R9",
      shareCode: "ETHI-26",
      livePin: "558-921",
      examDaysLeft: 13,
      weekTitles: {
        1: "Woche 1: Menschenbild & Willensfreiheit",
        2: "Woche 2: Pflichtethik (Kant) vs. Utilitarismus",
        3: "Woche 3: Theodizee & Medizinethik",
      },
      coopRoundsCurrent: 27,
      coopRoundsTarget: 40,
      examChecklist: [
        "Imago Dei (Gen 1,27) & Luthers 'simul iustus et peccator' (Gerechtfertigter und Sünder zugleich)",
        "Kant (Deontologie / Pflichtethik / Verallgemeinerbarkeit) vs. Utilitarismus (Folgenethik / größtes Glück)",
        "Theodizee-Dreieck (Allmacht, Allgüte, Leid) & Bioethik (Therapie vs. Enhancement)",
      ],
    },
  ],
  quizzes: [
    {
      _id: "quiz-bio",
      courseId: "course-bio",
      subjectId: "bio",
      title: "Fotosynthese, Calvin-Zyklus & Zellatmung",
      subtitle: "Fortlaufender Kurskatalog • Wochen 1–3",
      sourceFileName: "Biologie_Q1_Stoffwechsel.pdf",
      isPublishedToArchive: true,
      playedInClassToday: true,
      createdAt: "Heute",
      questions: JSON.parse(JSON.stringify(BIO_QUESTIONS)),
    },
    {
      _id: "quiz-mathe",
      courseId: "course-mathe",
      subjectId: "mathe",
      title: "Analysis: Ableitungen, Extrempunkte & Integrale",
      subtitle: "Fortlaufender Kurskatalog • Wochen 1–3",
      sourceFileName: "Mathe_LK_Analysis_Q1.pdf",
      isPublishedToArchive: true,
      playedInClassToday: false,
      createdAt: "Gestern",
      questions: JSON.parse(JSON.stringify(MATHE_QUESTIONS)),
    },
    {
      _id: "quiz-deutsch",
      courseId: "course-deutsch",
      subjectId: "deutsch",
      title: "Goethes Faust I & Epochenumbruch",
      subtitle: "Fortlaufender Kurskatalog • Wochen 1–3",
      sourceFileName: "Deutsch_Q1_Faust_Komplett.pdf",
      isPublishedToArchive: true,
      playedInClassToday: false,
      createdAt: "Vor 2 Tagen",
      questions: JSON.parse(JSON.stringify(DEUTSCH_QUESTIONS)),
    },
    {
      _id: "quiz-englisch",
      courseId: "course-englisch",
      subjectId: "englisch",
      title: "Rhetoric, Shakespeare & Dystopian Fiction",
      subtitle: "Fortlaufender Kurskatalog • Wochen 1–3",
      sourceFileName: "English_LK_Semester1.pdf",
      isPublishedToArchive: true,
      playedInClassToday: false,
      createdAt: "Vor 3 Tagen",
      questions: JSON.parse(JSON.stringify(ENGLISCH_QUESTIONS)),
    },
    {
      _id: "quiz-geschichte",
      courseId: "course-geschichte",
      subjectId: "geschichte",
      title: "Weimarer Republik, 1933 & Kalter Krieg",
      subtitle: "Fortlaufender Kurskatalog • Wochen 1–3",
      sourceFileName: "Geschichte_Q1_Demokratie_Diktatur.pdf",
      isPublishedToArchive: true,
      playedInClassToday: false,
      createdAt: "Letzte Woche",
      questions: JSON.parse(JSON.stringify(GESCHICHTE_QUESTIONS)),
    },
    {
      _id: "quiz-musik",
      courseId: "course-musik",
      subjectId: "musik",
      title: "Kadenzen, Sonatenform & Programmmusik",
      subtitle: "Fortlaufender Kurskatalog • Wochen 1–3",
      sourceFileName: "Musik_Q1_Klassik_Romantik.pdf",
      isPublishedToArchive: true,
      playedInClassToday: false,
      createdAt: "Letzte Woche",
      questions: JSON.parse(JSON.stringify(MUSIK_QUESTIONS)),
    },
    {
      _id: "quiz-informatik",
      courseId: "course-informatik",
      subjectId: "informatik",
      title: "Komplexität, Datenstrukturen & SQL",
      subtitle: "Fortlaufender Kurskatalog • Wochen 1–3",
      sourceFileName: "Informatik_LK_Algorithmen_DB.pdf",
      isPublishedToArchive: true,
      playedInClassToday: false,
      createdAt: "Heute",
      questions: JSON.parse(JSON.stringify(INFORMATIK_QUESTIONS)),
    },
    {
      _id: "quiz-ds",
      courseId: "course-ds",
      subjectId: "ds",
      title: "Präsenz, Brecht vs. Stanislawski & Status",
      subtitle: "Fortlaufender Kurskatalog • Wochen 1–3",
      sourceFileName: "DS_Q1_Theatertheorie_Praxis.pdf",
      isPublishedToArchive: true,
      playedInClassToday: false,
      createdAt: "Vor 4 Tagen",
      questions: JSON.parse(JSON.stringify(DS_QUESTIONS)),
    },
    {
      _id: "quiz-religion",
      courseId: "course-religion",
      subjectId: "religion",
      title: "Menschenbild, Kant vs. Utilitarismus & Bioethik",
      subtitle: "Fortlaufender Kurskatalog • Wochen 1–3",
      sourceFileName: "Religion_Q1_Ethik_Anthropologie.pdf",
      isPublishedToArchive: true,
      playedInClassToday: false,
      createdAt: "Vor 5 Tagen",
      questions: JSON.parse(JSON.stringify(RELIGION_QUESTIONS)),
    },
  ],
  users: [
    {
      _id: "user-brigitte",
      name: "Brigitte",
      age: 18,
      grade: "Q1",
      avatar: "B",
      colorClass: "bg-emerald-600 text-white",
      streakDays: 5,
      xp: 1450,
      streakIncrementedToday: false,
      bookmarkedQuestionIds: ["q-bio-1", "q-bio-5", "q-mat-4", "q-inf-6"],
      wrongQuestionIds: ["q-bio-1", "q-bio-5", "q-mat-4", "q-inf-6"],
      masteredQuestionIds: ["q-bio-2", "q-mat-1"],
      joinedCourseCodes: ["BIO-Q1-7X9", "MAT-Q1-4K2", "INF-Q1-8C4"],
    },
    {
      _id: "user-maja",
      name: "Maja",
      age: 17,
      grade: "Q1",
      avatar: "M",
      colorClass: "bg-indigo-600 text-white",
      streakDays: 7,
      xp: 1620,
      streakIncrementedToday: true,
      bookmarkedQuestionIds: ["q-deu-2", "q-eng-1"],
      wrongQuestionIds: ["q-deu-2", "q-eng-1"],
      masteredQuestionIds: ["q-bio-1"],
      joinedCourseCodes: ["BIO-Q1-7X9", "DEU-Q1-9L1", "ENG-Q1-3M8"],
    },
    {
      _id: "user-leon",
      name: "Leon",
      age: 18,
      grade: "Q1",
      avatar: "L",
      colorClass: "bg-blue-600 text-white",
      streakDays: 3,
      xp: 980,
      streakIncrementedToday: false,
      bookmarkedQuestionIds: ["q-inf-4", "q-ges-2"],
      wrongQuestionIds: ["q-inf-4", "q-ges-2"],
      masteredQuestionIds: ["q-inf-1"],
      joinedCourseCodes: ["MAT-Q1-4K2", "INF-Q1-8C4", "GES-Q1-5H3"],
    },
    {
      _id: "user-yunus",
      name: "Yunus",
      age: 18,
      grade: "Q1",
      avatar: "Y",
      colorClass: "bg-amber-600 text-white",
      streakDays: 9,
      xp: 1890,
      streakIncrementedToday: true,
      bookmarkedQuestionIds: ["q-mus-2", "q-rel-3"],
      wrongQuestionIds: ["q-mus-2", "q-rel-3"],
      masteredQuestionIds: ["q-deu-1"],
      joinedCourseCodes: ["DEU-Q1-9L1", "MUS-Q1-2P7", "DS-Q1-6T1"],
    },
  ],
  duels: [
    {
      _id: "duel-brigitte-maja",
      inviteCode: "DUEL-104",
      player1Id: "user-brigitte",
      player2Id: "user-maja",
      currentRound: 3,
      totalRounds: 6,
      isFinished: false,
      createdAt: "Vor 1 Stunde",
      rounds: [
        {
          roundNumber: 1,
          chooserId: "user-brigitte",
          chosenSubjectId: "bio",
          candidateSubjects: ["bio", "deutsch", "musik"],
          questionIds: ["q-bio-1", "q-bio-2", "q-bio-3"],
          player1Answers: ["correct", "correct", "wrong"],
          player2Answers: ["correct", "wrong", "correct"],
          player1Completed: true,
          player2Completed: true,
        },
        {
          roundNumber: 2,
          chooserId: "user-maja",
          chosenSubjectId: "mathe",
          candidateSubjects: ["mathe", "englisch", "geschichte"],
          questionIds: ["q-mat-1", "q-mat-4", "q-mat-7"],
          player1Answers: ["correct", "correct", "correct"],
          player2Answers: ["correct", "correct", "wrong"],
          player1Completed: true,
          player2Completed: true,
        },
        {
          roundNumber: 3,
          chooserId: "user-brigitte",
          chosenSubjectId: null,
          candidateSubjects: ["bio", "informatik", "geschichte"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
        {
          roundNumber: 4,
          chooserId: "user-maja",
          chosenSubjectId: null,
          candidateSubjects: ["deutsch", "englisch", "religion"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
        {
          roundNumber: 5,
          chooserId: "user-brigitte",
          chosenSubjectId: null,
          candidateSubjects: ["musik", "ds", "mathe"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
        {
          roundNumber: 6,
          chooserId: "user-maja",
          chosenSubjectId: null,
          candidateSubjects: ["bio", "religion", "informatik"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
      ],
    },
    {
      _id: "duel-leon-brigitte",
      inviteCode: "DUEL-208",
      player1Id: "user-leon",
      player2Id: "user-brigitte",
      currentRound: 1,
      totalRounds: 6,
      isFinished: false,
      createdAt: "Vor 20 Min.",
      rounds: [
        {
          roundNumber: 1,
          chooserId: "user-leon",
          chosenSubjectId: "informatik",
          candidateSubjects: ["informatik", "mathe", "ds"],
          questionIds: ["q-inf-1", "q-inf-3", "q-inf-5"],
          player1Answers: ["correct", "correct", "wrong"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: true,
          player2Completed: false,
        },
        {
          roundNumber: 2,
          chooserId: "user-brigitte",
          chosenSubjectId: null,
          candidateSubjects: ["geschichte", "deutsch", "bio"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
        {
          roundNumber: 3,
          chooserId: "user-leon",
          chosenSubjectId: null,
          candidateSubjects: ["musik", "englisch", "religion"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
        {
          roundNumber: 4,
          chooserId: "user-brigitte",
          chosenSubjectId: null,
          candidateSubjects: ["mathe", "ds", "bio"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
        {
          roundNumber: 5,
          chooserId: "user-leon",
          chosenSubjectId: null,
          candidateSubjects: ["deutsch", "informatik", "geschichte"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
        {
          roundNumber: 6,
          chooserId: "user-brigitte",
          chosenSubjectId: null,
          candidateSubjects: ["englisch", "religion", "musik"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
      ],
    },
    {
      _id: "duel-maja-yunus",
      inviteCode: "DUEL-309",
      player1Id: "user-maja",
      player2Id: "user-yunus",
      currentRound: 1,
      totalRounds: 6,
      isFinished: false,
      createdAt: "Gerade eben",
      rounds: [
        {
          roundNumber: 1,
          chooserId: "user-maja",
          chosenSubjectId: "ds",
          candidateSubjects: ["ds", "musik", "religion"],
          questionIds: ["q-ds-1", "q-ds-3", "q-ds-5"],
          player1Answers: ["correct", "wrong", "correct"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: true,
          player2Completed: false,
        },
        {
          roundNumber: 2,
          chooserId: "user-yunus",
          chosenSubjectId: null,
          candidateSubjects: ["musik", "geschichte", "deutsch"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
        {
          roundNumber: 3,
          chooserId: "user-maja",
          chosenSubjectId: null,
          candidateSubjects: ["bio", "englisch", "mathe"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
        {
          roundNumber: 4,
          chooserId: "user-yunus",
          chosenSubjectId: null,
          candidateSubjects: ["informatik", "religion", "ds"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
        {
          roundNumber: 5,
          chooserId: "user-maja",
          chosenSubjectId: null,
          candidateSubjects: ["geschichte", "musik", "bio"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
        {
          roundNumber: 6,
          chooserId: "user-yunus",
          chosenSubjectId: null,
          candidateSubjects: ["deutsch", "englisch", "mathe"],
          questionIds: [],
          player1Answers: ["pending", "pending", "pending"],
          player2Answers: ["pending", "pending", "pending"],
          player1Completed: false,
          player2Completed: false,
        },
      ],
    },
  ],
});

// ==========================================
// CONTEXT INTERFACE
// ==========================================

interface ConvexStoreContextType {
  db: ConvexMockDatabase;
  activeView: DemoView;
  setActiveView: (view: DemoView) => void;
  activeCourseId: string;
  setActiveCourseId: (courseId: string) => void;
  activeSubject: SubjectId;
  setActiveSubject: (subj: SubjectId) => void;
  activeStudentId: string;
  setActiveStudentId: (userId: string) => void;
  activeStudent: StudentUserDoc;
  duelMode: DuelMode;
  setDuelMode: (mode: DuelMode) => void;
  activeDuelId: string;
  setActiveDuelId: (duelId: string) => void;

  // Helpers
  currentCourse: CourseDoc;
  currentQuiz: QuizDoc;
  activeDuel: DuelDoc;
  getQuestionById: (id: string) => QuestionDoc | undefined;
  getCourseBySubject: (subj: SubjectId) => CourseDoc;

  // Teacher Cockpit mutations
  teacherPdfGenerated: boolean;
  setTeacherPdfGenerated: (val: boolean) => void;
  updateQuestionText: (
    quizId: string,
    questionId: string,
    newQuestion: string,
    newOptions?: [string, string, string, string],
    newExplanation?: string
  ) => void;
  deleteQuestion: (quizId: string, questionId: string) => void;
  regenerateQuestionByAI: (quizId: string, questionId: string) => void;
  addCustomQuestion: (
    courseId: string,
    week: number,
    question: string,
    options: [string, string, string, string],
    correctIndex: number,
    aiExplanation: string,
    topicTag?: string
  ) => QuestionDoc;
  addNewWeekToCourse: (courseId: string, weekTitle: string) => number;
  bulkImportQuestionsToCourse: (
    courseId: string,
    parsedList: ParsedBulkQuestion[]
  ) => number;
  createNewTeacherAndCourse: (
    teacherName: string,
    subjectLabel: string,
    courseTitle: string,
    firstWeekTitle?: string
  ) => CourseDoc;
  generateGapFollowUpQuestion: (
    courseId: string,
    gapQuestion: QuestionDoc
  ) => QuestionDoc;
  publishQuizToArchive: (quizId: string) => void;

  // Live Quiz state & mutations
  simulateBadWifi: boolean;
  setSimulateBadWifi: (val: boolean) => void;
  liveStep: number;
  setLiveStep: (step: number) => void;
  claimLiveQuizXpAndChallengeMaja: () => void;

  // Student Home & Multi-Account Duel mutations
  simulateEmptyTeacherWeek: boolean;
  setSimulateEmptyTeacherWeek: (val: boolean) => void;
  enterCourseOrQuizCode: (code: string) => {
    success: boolean;
    message: string;
  };
  createFriendDuelWithOpponent: (opponentUserId: string) => DuelDoc;
  joinDuelByInviteCode: (inviteCode: string) => {
    success: boolean;
    message: string;
    duel?: DuelDoc;
  };
  chooseSubjectForRound: (
    duelId: string,
    roundNumber: number,
    chosenSubject: SubjectId
  ) => void;
  recordPlayerRoundAnswer: (
    duelId: string,
    roundNumber: number,
    questionIndexInRound: number,
    questionId: string,
    isCorrect: boolean,
    bonusXp?: number
  ) => void;
  completePlayerRoundTurn: (duelId: string, roundNumber: number) => void;
  toggleBookmarkQuestion: (questionId: string) => void;
  markFlashcardMastered: (questionId: string, mastered: boolean) => void;
  openDuelPlayScreen: (duelId: string) => void;
  startPracticeMode: (
    mode: "mistakes" | "smartmix",
    subjectOverride?: SubjectId
  ) => void;

  // Reset Demo
  resetDemoState: () => void;
}

const STORAGE_KEY = "unrot_convex_mvp_state_v4";

const ConvexStoreContext = createContext<ConvexStoreContextType | undefined>(
  undefined
);

export function MockConvexProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [db, setDb] = useState<ConvexMockDatabase>(createInitialDatabase);
  const [activeView, setActiveView] = useState<DemoView>("teacher");
  const [activeCourseId, setActiveCourseIdState] =
    useState<string>("course-bio");
  const [activeStudentId, setActiveStudentId] =
    useState<string>("user-brigitte");
  const [duelMode, setDuelMode] = useState<DuelMode>("friend_duel");
  const [activeDuelId, setActiveDuelId] = useState<string>(
    "duel-brigitte-maja"
  );
  const [teacherPdfGenerated, setTeacherPdfGenerated] = useState<boolean>(true);
  const [simulateBadWifi, setSimulateBadWifi] = useState<boolean>(false);
  const [liveStep, setLiveStep] = useState<number>(0);
  const [simulateEmptyTeacherWeek, setSimulateEmptyTeacherWeek] =
    useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.db && parsed.db.courses?.length >= 9) {
          setDb(parsed.db);
        }
        if (parsed.activeView) setActiveView(parsed.activeView);
        if (parsed.activeCourseId) setActiveCourseIdState(parsed.activeCourseId);
        if (parsed.activeStudentId) setActiveStudentId(parsed.activeStudentId);
        if (parsed.activeDuelId) setActiveDuelId(parsed.activeDuelId);
      }
    } catch (e) {
      console.warn("Failed to hydrate state", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          db,
          activeView,
          activeCourseId,
          activeStudentId,
          activeDuelId,
        })
      );
    } catch (e) {
      console.warn("Failed to persist state", e);
    }
  }, [
    db,
    activeView,
    activeCourseId,
    activeStudentId,
    activeDuelId,
    isHydrated,
  ]);

  const currentCourse =
    db.courses.find((c) => c._id === activeCourseId) || db.courses[0];
  const activeSubject = currentCourse.subjectId;

  const setActiveCourseId = (courseId: string) => {
    setActiveCourseIdState(courseId);
  };

  const setActiveSubject = (subj: SubjectId) => {
    const found = db.courses.find((c) => c.subjectId === subj);
    if (found) {
      setActiveCourseIdState(found._id);
    }
  };

  const currentQuiz =
    db.quizzes.find((q) => q.courseId === currentCourse._id) ||
    db.quizzes.find((q) => q.subjectId === activeSubject) ||
    db.quizzes[0];

  const activeStudent =
    db.users.find((u) => u._id === activeStudentId) || db.users[0];
  const activeDuel =
    db.duels.find((d) => d._id === activeDuelId) ||
    db.duels.find(
      (d) =>
        d.player1Id === activeStudentId || d.player2Id === activeStudentId
    ) ||
    db.duels[0];

  const getCourseBySubject = (subj: SubjectId): CourseDoc => {
    return (
      db.courses.find((c) => c.subjectId === subj || c._id === subj) ||
      db.courses[0]
    );
  };

  const getQuestionById = (id: string): QuestionDoc | undefined => {
    for (const qz of db.quizzes) {
      const found = qz.questions.find((q) => q.id === id);
      if (found) return found;
    }
    return undefined;
  };

  // Teacher Cockpit: Update Question
  const updateQuestionText = (
    quizId: string,
    questionId: string,
    newQuestion: string,
    newOptions?: [string, string, string, string],
    newExplanation?: string
  ) => {
    setDb((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((quiz) => {
        if (quiz._id !== quizId) return quiz;
        return {
          ...quiz,
          questions: quiz.questions.map((q) => {
            if (q.id !== questionId) return q;
            return {
              ...q,
              question: newQuestion,
              options: newOptions ?? q.options,
              aiExplanation: newExplanation ?? q.aiExplanation,
            };
          }),
        };
      }),
    }));
  };

  // Teacher Cockpit: Delete Question
  const deleteQuestion = (quizId: string, questionId: string) => {
    setDb((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((quiz) =>
        quiz._id === quizId
          ? {
              ...quiz,
              questions: quiz.questions.filter((q) => q.id !== questionId),
            }
          : quiz
      ),
    }));
  };

  // Teacher Cockpit: Regenerate Question
  const regenerateQuestionByAI = (quizId: string, questionId: string) => {
    setDb((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((quiz) => {
        if (quiz._id !== quizId) return quiz;
        return {
          ...quiz,
          questions: quiz.questions.map((q) => {
            if (q.id !== questionId) return q;
            const suffix = " (Alternative Klausur-Variante)";
            const nextText = q.question.endsWith(suffix)
              ? q.question.replace(suffix, "")
              : `${q.question}${suffix}`;
            return {
              ...q,
              question: nextText,
            };
          }),
        };
      }),
    }));
  };

  // Teacher Cockpit: Add a new Week to a course dynamically
  const addNewWeekToCourse = (courseId: string, weekTitle: string): number => {
    const targetCourse =
      db.courses.find((c) => c._id === courseId) || currentCourse;
    const existingWeeks = Object.keys(targetCourse.weekTitles).map(Number);
    const nextWeekNum =
      existingWeeks.length > 0 ? Math.max(...existingWeeks) + 1 : 1;
    const cleanTitle = weekTitle.trim()
      ? `Woche ${nextWeekNum}: ${weekTitle
          .trim()
          .replace(/^Woche\s*\d+\s*:\s*/i, "")}`
      : `Woche ${nextWeekNum}: Neues Unterrichtsthema`;

    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c._id === courseId
          ? {
              ...c,
              weekTitles: {
                ...c.weekTitles,
                [nextWeekNum]: cleanTitle,
              },
            }
          : c
      ),
    }));

    return nextWeekNum;
  };

  // Teacher Cockpit: Add Custom Question
  const addCustomQuestion = (
    courseId: string,
    week: number,
    question: string,
    options: [string, string, string, string],
    correctIndex: number,
    aiExplanation: string,
    topicTag?: string
  ): QuestionDoc => {
    const course = db.courses.find((c) => c._id === courseId) || currentCourse;
    const weekLabel =
      course.weekTitles[week] || `Woche ${week}: Eigene Schwerpunkt-Fragen`;

    const newQ: QuestionDoc = {
      id: `q-custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      subjectId: course.subjectId,
      week,
      weekTopic: weekLabel,
      question,
      options,
      correctIndex,
      aiExplanation:
        aiExplanation.trim() ||
        `Richtig ist Antwort ${String.fromCharCode(65 + correctIndex)}: ${
          options[correctIndex]
        }.`,
      errorRatePercent: 42,
      topicTag: topicTag?.trim() || "Lehrer-Frage",
      gapDescription: `Schwerpunktfrage aus ${weekLabel}`,
      isCustom: true,
    };

    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c._id === courseId && !c.weekTitles[week]
          ? { ...c, weekTitles: { ...c.weekTitles, [week]: weekLabel } }
          : c
      ),
      quizzes: prev.quizzes.map((qz) =>
        qz.courseId === courseId
          ? { ...qz, questions: [newQ, ...qz.questions] }
          : qz
      ),
    }));

    return newQ;
  };

  // Teacher Cockpit: Bulk Import Questions (auto-creates weeks & assigns everything!)
  const bulkImportQuestionsToCourse = (
    courseId: string,
    parsedList: ParsedBulkQuestion[]
  ): number => {
    if (parsedList.length === 0) return 0;
    const course = db.courses.find((c) => c._id === courseId) || currentCourse;

    const updatedWeekTitles = { ...course.weekTitles };
    const newQuestions: QuestionDoc[] = parsedList.map((item, idx) => {
      if (item.weekTitle) {
        updatedWeekTitles[item.week] = item.weekTitle;
      } else if (!updatedWeekTitles[item.week]) {
        updatedWeekTitles[item.week] = `Woche ${item.week}: ${
          item.topicTag || "Importiertes Thema"
        }`;
      }

      return {
        id: `q-bulk-${Date.now()}-${idx}`,
        subjectId: course.subjectId,
        week: item.week,
        weekTopic: updatedWeekTitles[item.week],
        question: item.question,
        options: item.options,
        correctIndex: item.correctIndex,
        aiExplanation: item.aiExplanation,
        errorRatePercent: Math.floor(35 + Math.random() * 30),
        topicTag: item.topicTag || "Bulk-Import",
        gapDescription: `Importierte Klausurfrage (${
          item.topicTag || `Woche ${item.week}`
        })`,
        isCustom: true,
      };
    });

    setDb((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c._id === courseId ? { ...c, weekTitles: updatedWeekTitles } : c
      ),
      quizzes: prev.quizzes.map((qz) =>
        qz.courseId === courseId
          ? { ...qz, questions: [...newQuestions, ...qz.questions] }
          : qz
      ),
    }));

    return newQuestions.length;
  };

  // Teacher Cockpit: Create a new Teacher & Course (supports duplicate or brand-new subjects!)
  const createNewTeacherAndCourse = (
    teacherName: string,
    subjectLabel: string,
    courseTitle: string,
    firstWeekTitle?: string
  ): CourseDoc => {
    const idSuffix = Date.now().toString().slice(-4);
    const courseId = `course-custom-${idSuffix}`;
    const subjectId = `subj-${subjectLabel
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")}-${idSuffix}`;
    const prefix = subjectLabel
      .slice(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, "KRS");
    const roomCode = `${prefix}-Q1-${idSuffix.slice(0, 3)}`;
    const shareCode = `${prefix}-${idSuffix.slice(-2)}`;
    const livePin = `${Math.floor(100 + Math.random() * 899)}-${Math.floor(
      100 + Math.random() * 899
    )}`;

    const w1Title = firstWeekTitle?.trim()
      ? `Woche 1: ${firstWeekTitle.trim()}`
      : `Woche 1: Einführung in ${subjectLabel}`;

    const newCourse: CourseDoc = {
      _id: courseId,
      subjectId,
      subjectLabel: subjectLabel.trim(),
      shortLabel: subjectLabel.trim().slice(0, 10),
      accentColor: "emerald",
      title:
        courseTitle.trim() ||
        `${subjectLabel.trim()} Q1 (${teacherName.trim()})`,
      teacherName: teacherName.trim() || "Neue Lehrkraft",
      gradeLevel: "Q1 • Sek II",
      roomCode,
      shareCode,
      livePin,
      examDaysLeft: 14,
      weekTitles: {
        1: w1Title,
      },
      coopRoundsCurrent: 12,
      coopRoundsTarget: 30,
      examChecklist: [
        `Grundbegriffe aus ${w1Title} sicher beherrschen`,
        "Fachbegriffe in Klausuraufgaben präzise anwenden",
      ],
    };

    const starterQuestion: QuestionDoc = {
      id: `q-starter-${idSuffix}`,
      subjectId,
      week: 1,
      weekTopic: w1Title,
      question: `Was steht im Mittelpunkt von ${newCourse.title} (${w1Title})?`,
      options: [
        "Verständnis der zentralen Konzepte, Fachbegriffe und Zusammenhänge der Einheit",
        "Reines Auswendiglernen zusammenhangloser Zahlen",
        "Verzicht auf jede Quellen- oder Textanalyse",
        "Ignorieren der Aufgabenstellung in der Klausur",
      ],
      correctIndex: 0,
      aiExplanation: `In ${newCourse.title} geht es um das vernetzte Verständnis der Konzepte aus ${w1Title}.`,
      errorRatePercent: 35,
      topicTag: "Einstieg",
      gapDescription: `35 % verwechseln Grundbegriffe in ${w1Title}`,
      isCustom: true,
    };

    const newQuiz: QuizDoc = {
      _id: `quiz-custom-${idSuffix}`,
      courseId,
      subjectId,
      title: `${subjectLabel.trim()} Kurskatalog (${teacherName.trim()})`,
      subtitle: "Eigener Lehrerkurs • Jederzeit erweiterbar",
      sourceFileName: `${subjectLabel.trim()}_Skript.pdf`,
      isPublishedToArchive: true,
      playedInClassToday: true,
      createdAt: "Gerade angelegt",
      questions: [starterQuestion],
    };

    setDb((prev) => ({
      ...prev,
      courses: [...prev.courses, newCourse],
      quizzes: [...prev.quizzes, newQuiz],
    }));

    setActiveCourseIdState(courseId);
    return newCourse;
  };

  // Teacher Cockpit: 1-Click Follow-Up Question Generator from a Knowledge Gap!
  const generateGapFollowUpQuestion = (
    courseId: string,
    gapQuestion: QuestionDoc
  ): QuestionDoc => {
    const course = db.courses.find((c) => c._id === courseId) || currentCourse;
    const correctOpt = gapQuestion.options[gapQuestion.correctIndex];
    const wrongOpt =
      gapQuestion.options[(gapQuestion.correctIndex + 1) % 4];

    const followUp: QuestionDoc = {
      id: `q-gap-fix-${Date.now()}`,
      subjectId: course.subjectId,
      week: gapQuestion.week,
      weekTopic: gapQuestion.weekTopic,
      question: `[Gezielter Lücken-Check: ${
        gapQuestion.topicTag || "Klausurfalle"
      }] Warum ist die Aussage „${correctOpt}“ korrekt und nicht etwa „${wrongOpt}“?`,
      options: [
        `Weil gilt: ${gapQuestion.aiExplanation}`,
        `Weil „${wrongOpt}“ immer ohne Ausnahme gilt`,
        "Weil beide Aussagen inhaltlich völlig identisch sind",
        "Weil dieser Zusammenhang in der Oberstufe nicht gilt",
      ],
      correctIndex: 0,
      aiExplanation: `Vertiefung zur Wissenslücke (${gapQuestion.errorRatePercent} % Fehlerquote): ${gapQuestion.aiExplanation}`,
      errorRatePercent: 25,
      topicTag: `Vertiefung: ${gapQuestion.topicTag || "Wissenslücke"}`,
      gapDescription: `Nachbesserung zu: ${gapQuestion.gapDescription}`,
      isCustom: true,
    };

    setDb((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((qz) =>
        qz.courseId === courseId
          ? { ...qz, questions: [followUp, ...qz.questions] }
          : qz
      ),
    }));

    return followUp;
  };

  const publishQuizToArchive = (quizId: string) => {
    setDb((prev) => ({
      ...prev,
      quizzes: prev.quizzes.map((quiz) =>
        quiz._id === quizId ? { ...quiz, isPublishedToArchive: true } : quiz
      ),
    }));
  };

  const claimLiveQuizXpAndChallengeMaja = () => {
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u._id === activeStudentId ? { ...u, xp: u.xp + 120 } : u
      ),
    }));
    setActiveView("home");
  };

  const enterCourseOrQuizCode = (code: string) => {
    const clean = code.trim().toUpperCase();

    if (clean.startsWith("DUEL-")) {
      const joined = joinDuelByInviteCode(clean);
      return {
        success: joined.success,
        message: joined.message,
      };
    }

    const matchedCourse = db.courses.find(
      (c) => c.roomCode === clean || c.shareCode === clean
    );

    if (matchedCourse) {
      setActiveCourseIdState(matchedCourse._id);
      setSimulateEmptyTeacherWeek(false);
      setDb((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u._id === activeStudentId &&
          !u.joinedCourseCodes.includes(matchedCourse.roomCode)
            ? {
                ...u,
                joinedCourseCodes: [
                  ...u.joinedCourseCodes,
                  matchedCourse.roomCode,
                ],
              }
            : u
        ),
      }));
      return {
        success: true,
        message: `Kurs freigeschaltet: ${matchedCourse.title} (${clean})`,
      };
    }
    return {
      success: false,
      message:
        "Code nicht gefunden. Tipp: Nutze 'BIO-Q1-7X9' oder einen Duell-Code wie 'DUEL-208'",
    };
  };

  const createFriendDuelWithOpponent = (opponentUserId: string): DuelDoc => {
    const randomNum = Math.floor(400 + Math.random() * 599);
    const inviteCode = `DUEL-${randomNum}`;
    const newDuelId = `duel-${Date.now()}`;

    const rounds: InteractiveRound[] = [1, 2, 3, 4, 5, 6].map((rNum) => ({
      roundNumber: rNum,
      chooserId: rNum % 2 === 1 ? activeStudentId : opponentUserId,
      chosenSubjectId: null,
      candidateSubjects: pick3RandomSubjectsFromCourses(db.courses),
      questionIds: [],
      player1Answers: ["pending", "pending", "pending"],
      player2Answers: ["pending", "pending", "pending"],
      player1Completed: false,
      player2Completed: false,
    }));

    const newDuel: DuelDoc = {
      _id: newDuelId,
      inviteCode,
      player1Id: activeStudentId,
      player2Id: opponentUserId,
      currentRound: 1,
      totalRounds: 6,
      isFinished: false,
      createdAt: "Gerade gestartet",
      rounds,
    };

    setDb((prev) => ({
      ...prev,
      duels: [newDuel, ...prev.duels],
    }));
    setActiveDuelId(newDuelId);
    return newDuel;
  };

  const joinDuelByInviteCode = (inviteCode: string) => {
    const clean = inviteCode.trim().toUpperCase();
    const found = db.duels.find((d) => d.inviteCode === clean);
    if (!found) {
      return {
        success: false,
        message: `Kein Duell mit Code '${clean}' gefunden. Verfügbare Codes: ${db.duels
          .map((d) => d.inviteCode)
          .join(", ")}`,
      };
    }
    if (
      found.player1Id !== activeStudentId &&
      found.player2Id !== activeStudentId
    ) {
      setActiveStudentId(found.player2Id);
    }
    setActiveDuelId(found._id);
    setDuelMode("friend_duel");
    return {
      success: true,
      message: `Duell '${clean}' geöffnet!`,
      duel: found,
    };
  };

  const chooseSubjectForRound = (
    duelId: string,
    roundNumber: number,
    chosenSubject: SubjectId
  ) => {
    setDb((prev) => {
      const targetQuiz =
        prev.quizzes.find((q) => q.subjectId === chosenSubject) ||
        prev.quizzes[0];
      const questionsForRound = targetQuiz.questions
        .slice(0, 3)
        .map((q) => q.id);

      return {
        ...prev,
        duels: prev.duels.map((d) => {
          if (d._id !== duelId) return d;
          return {
            ...d,
            rounds: d.rounds.map((r) => {
              if (r.roundNumber !== roundNumber) return r;
              return {
                ...r,
                chosenSubjectId: chosenSubject,
                questionIds: questionsForRound,
              };
            }),
          };
        }),
      };
    });
    const matchedCourse = db.courses.find((c) => c.subjectId === chosenSubject);
    if (matchedCourse) setActiveCourseIdState(matchedCourse._id);
  };

  const recordPlayerRoundAnswer = (
    duelId: string,
    roundNumber: number,
    questionIndexInRound: number,
    questionId: string,
    isCorrect: boolean,
    bonusXp: number = 20
  ) => {
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u._id !== activeStudentId) return u;
        const updatedXp = isCorrect ? u.xp + bonusXp : u.xp;
        const updatedWrong = !isCorrect
          ? Array.from(new Set([...u.wrongQuestionIds, questionId]))
          : u.wrongQuestionIds;
        return {
          ...u,
          xp: updatedXp,
          wrongQuestionIds: updatedWrong,
        };
      }),
      duels: prev.duels.map((d) => {
        if (d._id !== duelId) return d;
        const isPlayer1 = d.player1Id === activeStudentId;
        return {
          ...d,
          rounds: d.rounds.map((r) => {
            if (r.roundNumber !== roundNumber) return r;
            if (isPlayer1) {
              const next = [...r.player1Answers];
              next[questionIndexInRound] = isCorrect ? "correct" : "wrong";
              return { ...r, player1Answers: next };
            } else {
              const next = [...r.player2Answers];
              next[questionIndexInRound] = isCorrect ? "correct" : "wrong";
              return { ...r, player2Answers: next };
            }
          }),
        };
      }),
    }));
  };

  const completePlayerRoundTurn = (duelId: string, roundNumber: number) => {
    setDb((prev) => {
      const targetDuel = prev.duels.find((d) => d._id === duelId);
      const roundSubj = targetDuel?.rounds.find(
        (r) => r.roundNumber === roundNumber
      )?.chosenSubjectId;

      return {
        ...prev,
        // Increment cooperative course goal!
        courses: prev.courses.map((c) =>
          c.subjectId === roundSubj
            ? {
                ...c,
                coopRoundsCurrent: Math.min(
                  c.coopRoundsTarget,
                  c.coopRoundsCurrent + 1
                ),
              }
            : c
        ),
        users: prev.users.map((u) => {
          if (u._id !== activeStudentId) return u;
          return {
            ...u,
            streakDays: u.streakIncrementedToday
              ? u.streakDays
              : u.streakDays + 1,
            streakIncrementedToday: true,
          };
        }),
        duels: prev.duels.map((d) => {
          if (d._id !== duelId) return d;
          const isPlayer1 = d.player1Id === activeStudentId;
          const updatedRounds = d.rounds.map((r) => {
            if (r.roundNumber !== roundNumber) return r;
            return {
              ...r,
              player1Completed: isPlayer1 ? true : r.player1Completed,
              player2Completed: !isPlayer1 ? true : r.player2Completed,
            };
          });

          const justFinishedRound = updatedRounds.find(
            (r) => r.roundNumber === roundNumber
          )!;
          const bothDone =
            justFinishedRound.player1Completed &&
            justFinishedRound.player2Completed;
          const nextRoundNumber =
            bothDone && roundNumber < d.totalRounds
              ? roundNumber + 1
              : roundNumber;
          const isFinished = bothDone && roundNumber >= d.totalRounds;

          return {
            ...d,
            currentRound: nextRoundNumber,
            isFinished,
            rounds: updatedRounds,
          };
        }),
      };
    });
  };

  const toggleBookmarkQuestion = (questionId: string) => {
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u._id !== activeStudentId) return u;
        const exists = u.bookmarkedQuestionIds.includes(questionId);
        return {
          ...u,
          bookmarkedQuestionIds: exists
            ? u.bookmarkedQuestionIds.filter((id) => id !== questionId)
            : [...u.bookmarkedQuestionIds, questionId],
        };
      }),
    }));
  };

  const markFlashcardMastered = (questionId: string, mastered: boolean) => {
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u._id !== activeStudentId) return u;
        const nextMastered = mastered
          ? Array.from(new Set([...u.masteredQuestionIds, questionId]))
          : u.masteredQuestionIds.filter((id) => id !== questionId);
        return {
          ...u,
          masteredQuestionIds: nextMastered,
          xp: mastered ? u.xp + 10 : u.xp,
        };
      }),
    }));
  };

  const openDuelPlayScreen = (duelId: string) => {
    setActiveDuelId(duelId);
    setDuelMode("friend_duel");
    setActiveView("duel");
  };

  const startPracticeMode = (
    mode: "mistakes" | "smartmix",
    subjectOverride?: SubjectId
  ) => {
    if (subjectOverride) setActiveSubject(subjectOverride);
    setDuelMode(mode);
    setActiveView("duel");
  };

  const resetDemoState = () => {
    const fresh = createInitialDatabase();
    setDb(fresh);
    setActiveCourseIdState("course-bio");
    setActiveStudentId("user-brigitte");
    setActiveDuelId("duel-brigitte-maja");
    setTeacherPdfGenerated(true);
    setSimulateBadWifi(false);
    setLiveStep(0);
    setSimulateEmptyTeacherWeek(false);
    setDuelMode("friend_duel");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return React.createElement(
    ConvexStoreContext.Provider,
    {
      value: {
        db,
        activeView,
        setActiveView,
        activeCourseId,
        setActiveCourseId,
        activeSubject,
        setActiveSubject,
        activeStudentId,
        setActiveStudentId,
        activeStudent,
        duelMode,
        setDuelMode,
        activeDuelId,
        setActiveDuelId,
        currentCourse,
        currentQuiz,
        activeDuel,
        getQuestionById,
        getCourseBySubject,
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
        simulateBadWifi,
        setSimulateBadWifi,
        liveStep,
        setLiveStep,
        claimLiveQuizXpAndChallengeMaja,
        simulateEmptyTeacherWeek,
        setSimulateEmptyTeacherWeek,
        enterCourseOrQuizCode,
        createFriendDuelWithOpponent,
        joinDuelByInviteCode,
        chooseSubjectForRound,
        recordPlayerRoundAnswer,
        completePlayerRoundTurn,
        toggleBookmarkQuestion,
        markFlashcardMastered,
        openDuelPlayScreen,
        startPracticeMode,
        resetDemoState,
      },
    },
    children
  );
}

export function useConvexStore() {
  const ctx = useContext(ConvexStoreContext);
  if (!ctx) {
    throw new Error("useConvexStore must be used within a MockConvexProvider");
  }
  return ctx;
}
