"use client";

import React from "react";
import { useConvexStore } from "@/lib/mockConvexStore";
import { DemoControlBar } from "@/components/DemoControlBar";
import { TeacherCockpitView } from "@/components/TeacherCockpitView";
import { LiveClassroomView } from "@/components/LiveClassroomView";
import { StudentHomeView } from "@/components/StudentHomeView";
import { ActiveDuelView } from "@/components/ActiveDuelView";
import { AnimatePresence, motion } from "framer-motion";

export default function UnrotMvpPage() {
  const { activeView } = useConvexStore();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <DemoControlBar />

      <main className="flex-1 pb-16">
        <AnimatePresence mode="wait">
          {activeView === "teacher" && (
            <motion.div
              key="view-teacher"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              <TeacherCockpitView />
            </motion.div>
          )}

          {activeView === "live" && (
            <motion.div
              key="view-live"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              <LiveClassroomView />
            </motion.div>
          )}

          {activeView === "home" && (
            <motion.div
              key="view-home"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              <StudentHomeView />
            </motion.div>
          )}

          {activeView === "duel" && (
            <motion.div
              key="view-duel"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              <ActiveDuelView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
