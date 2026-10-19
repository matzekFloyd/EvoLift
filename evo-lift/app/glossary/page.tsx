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
    term: "Assistance (kg)",
    definition:
      "On Assisted Dip and Assisted Pull-Up, the counterweight help you used. Enter it as a positive number (for example 7). Blank or 0 means unassisted bodyweight. It is not Loaded (kg), and it is not used for estimated 1RM or training volume.",
  },
  {
    term: "Base weight",
    definition:
      "Optional weight for an exercise on a session, such as the bar. You set it once for that exercise. Total (kg) adds it to Loaded (kg). It is not bodyweight. Assisted Dip and Assisted Pull-Up do not use base weight.",
  },
  {
    term: "Bodyweight log",
    definition:
      "Dated bodyweight entries. The latest entry is the current bodyweight. An open bodyweight goal and Lift comparison use the latest entry on or before the workout session date.",
  },
  {
    term: "Compound",
    definition:
      "A barbell exercise that moves more than one joint. Lift comparison places your compounds next to each other, and next to published standards. The coaching ratios cover Barbell Back Squat, Barbell Deadlift, Barbell Bench Press, Barbell Overhead Press, Barbell Bent Over Row, Barbell Romanian Deadlift, Close-Grip Bench Press, and Barbell Hip Thrust. Machine, dumbbell, and leg-press loads stay out of those ratios.",
  },
  {
    term: "Day",
    definition:
      "A named step in a plan, such as Day A or Push. It has its own exercises and targets. Days repeat in order.",
  },
  {
    term: "Exercise",
    definition: "A movement inside a workout session, such as Barbell Back Squat.",
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
        They apply to Barbell Back Squat, Barbell Bench Press, Barbell Deadlift, and Barbell Overhead
        Press when sex, date of birth, and bodyweight are saved.
      </>
    ),
  },
  {
    term: "Goal",
    definition:
      "A strength target for one exercise. Progress uses working sets you have already logged. You can aim for a Total (kg) or a multiple of your bodyweight, with a minimum number of reps. New accounts start with bodyweight goals on Barbell Back Squat, Barbell Bench Press, Barbell Deadlift, and Barbell Overhead Press. You can edit or delete them. Progress on a bodyweight goal needs a bodyweight entry on Account.",
  },
  {
    term: "Insights",
    definition:
      "Charts and notes for a date range: training volume, working sets, Lift comparison, and personal bests.",
  },
  {
    term: "Lift",
    definition:
      "On Insights, Lift comparison places an exercise next to your other exercises and next to published standards. In that view, lift means that exercise.",
  },
  {
    term: "Loaded (kg)",
    definition:
      "The external weight on a set, such as plates or a dumbbell. Base weight stays separate. On Assisted Dip and Assisted Pull-Up, use Assistance (kg) instead.",
  },
  {
    term: "Personal best",
    definition:
      "On Insights, your strongest working sets in the selected date range. Best set is the highest Total (kg), then reps. Heaviest load is the highest Loaded (kg). Each mark shows the date it was first hit. Warmups do not count. Assisted Dip and Assisted Pull-Up list assistance, not strength load.",
  },
  {
    term: "Plan",
    definition:
      "An ordered cycle of days. One plan can be active. Starting a day copies its exercises and targets into a new workout session. Later edits do not change sessions you already started.",
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
    term: "Skipped",
    definition:
      "A mark on an exercise in a session when you did not do it, such as when you ran out of time. Targets, sets, and history stay on screen under a cover until you clear the mark.",
  },
  {
    term: "Suggested target",
    definition:
      "A Loaded (kg) or Assistance (kg) offered for the matching target field, from recent working sets for that exercise. The field changes only when you apply it.",
  },
  {
    term: "Target assistance (kg)",
    definition:
      "On Assisted Dip and Assisted Pull-Up, the assistance you plan for working sets. Enter it as a positive number. Blank or 0 means unassisted bodyweight. Warmup sets do not use this target.",
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
      "The weight you plan for working sets. Warmup sets do not use this target. On Assisted Dip and Assisted Pull-Up, the field is Target assistance (kg).",
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
    term: "Upcoming session",
    definition:
      "A workout session dated after today. It stays under Upcoming workouts until that day. A template or a plan day can prefill one.",
  },
  {
    term: "Warmup",
    definition:
      "A set you log before the working sets. Warmup sets are extra. They do not count toward target sets, target reps, volume, or goals. The log labels it Warmup.",
  },
  {
    term: "Warmup ladder",
    definition:
      "Suggested warmup sets that step up in Loaded (kg) toward the target weight. A heavier target gets more steps, and a maximum keeps the heaviest of them.",
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
