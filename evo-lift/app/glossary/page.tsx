import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BookMarked } from "lucide-react";
import { PageShell } from "@/app/components/page-shell";

export const metadata: Metadata = {
  title: "Glossary",
  description: "Definitions for the words EvoLift uses.",
};

const terms: Array<{ term: string; definition: ReactNode }> = [
  {
    term: "1RM",
    definition:
      "A one-rep max: the heaviest weight for a single rep. EvoLift estimates it from working sets of 12 reps or fewer, using Total (kg), which includes base weight. The estimate uses the Epley formula. It is not a tested max.",
  },
  {
    term: "Base weight",
    definition:
      "Optional weight for an exercise on a session, such as the bar. You set it once for that exercise. Total (kg) adds it to Loaded (kg).",
  },
  {
    term: "Compound",
    definition:
      "A barbell exercise that moves more than one joint. Lift comparison places your compounds next to each other, and next to published standards. The coaching ratios cover Back Squat, Deadlift, Barbell Bench Press, Overhead Press, Barbell Bent Over Row, Romanian Deadlift, Close-Grip Bench Press, and Barbell Hip Thrust. Machine, dumbbell, and leg-press loads stay out of those ratios.",
  },
  {
    term: "Day",
    definition:
      "A named step in a plan, such as Day A or Push. It has its own exercises and targets. Days repeat in order.",
  },
  {
    term: "Exercise",
    definition: "A movement inside a workout session, such as Back Squat.",
  },
  {
    term: "ExRx",
    definition: (
      <>
        Published strength standards from{" "}
        <a
          href="https://exrx.net"
          className="underline underline-offset-2 hover:text-sky-800"
          target="_blank"
          rel="noreferrer"
        >
          ExRx.net
        </a>
        . Lift comparison uses the ages 18–39 tables, separate for women and men, at your bodyweight.
        They apply to Back Squat, Barbell Bench Press, Deadlift, and Overhead Press when sex, date of
        birth, and bodyweight are saved.
      </>
    ),
  },
  {
    term: "Goal",
    definition:
      "A strength target for one exercise. Progress uses working sets you have already logged. You can aim for a Total (kg) or a multiple of your bodyweight, with a minimum number of reps.",
  },
  {
    term: "Insights",
    definition:
      "Charts and notes for a date range: training volume, working sets, and Lift comparison.",
  },
  {
    term: "Lift",
    definition:
      "On Insights, Lift comparison places an exercise next to your other exercises and next to published standards. In that view, lift means that exercise.",
  },
  {
    term: "Loaded (kg)",
    definition:
      "The external weight on a set, such as plates or a dumbbell. Base weight stays separate.",
  },
  {
    term: "Plan",
    definition:
      "An ordered cycle of days. One plan can be active. Starting a day copies its exercises and targets into a new workout session. Later edits do not change sessions you already started.",
  },
  {
    term: "Planned session",
    definition:
      "A workout session dated after today. It stays under Planned workouts until that day. A template or a plan day can prefill one.",
  },
  {
    term: "Reps",
    definition:
      "How many times you complete the movement in a set. Written as a number plus reps, for example 5 reps.",
  },
  {
    term: "Set",
    definition: "One logged line for an exercise: the weight and the reps.",
  },
  {
    term: "Suggested target",
    definition:
      "A Loaded (kg) offered for Target weight (kg), from recent working sets for that exercise. The field changes only when you apply it.",
  },
  {
    term: "Target reps",
    definition:
      "How many reps you plan on each working set, written as 8 reps. Warmup sets do not count.",
  },
  {
    term: "Target sets",
    definition:
      "How many working sets you plan. Warmup sets do not count toward this number.",
  },
  {
    term: "Target weight (kg)",
    definition:
      "The weight you plan for working sets. Warmup sets do not use this target.",
  },
  {
    term: "Template",
    definition:
      "A saved list of exercises, with optional targets. Use it to start a workout session or prefill a planned session.",
  },
  {
    term: "Total (kg)",
    definition: "Loaded (kg) plus the base weight for that exercise on the session.",
  },
  {
    term: "Warmup",
    definition:
      "A set you log before the working sets. Warmup sets are extra. They do not count toward target sets, target reps, volume, or goals. The log labels it Warmup.",
  },
  {
    term: "Working set",
    definition:
      "A set that counts toward targets, volume, and goals. The log labels it Working.",
  },
  {
    term: "Workout session",
    definition:
      "A record of one workout: the date, the exercises, and the sets you log.",
  },
];

export default function GlossaryPage() {
  return (
    <PageShell>
      <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <BookMarked className="h-6 w-6 text-sky-700" aria-hidden />
        Glossary
      </h1>
      <p className="max-w-prose text-sm text-zinc-600">
        Short definitions for the words EvoLift uses.
      </p>
      <dl className="panel divide-y divide-zinc-200">
        {terms.map((entry) => (
          <div key={entry.term} className="px-4 py-3 sm:px-5">
            <dt className="text-sm font-medium text-zinc-900">{entry.term}</dt>
            <dd className="mt-1 text-sm leading-snug text-zinc-600">{entry.definition}</dd>
          </div>
        ))}
      </dl>
    </PageShell>
  );
}
