import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { exerciseProgressPaceBuckets } from "@/app/components/exercise-progress-pace";
import { quietLinkClassName } from "@/app/components/inline-link-class";
import { muscleAreaCoverage } from "@/lib/muscle-area-coverage";
import { APP_DOCUMENT_TITLE } from "@/lib/page-title";
import { STARTER_PLANS } from "@/lib/starter-plans";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-app-origin";
import {
  PUBLIC_HOME_AREAS,
  PUBLIC_HOME_FREE_LINE,
  PUBLIC_HOME_CLOSE_LINES,
  PUBLIC_HOME_CTA_HREF,
  PUBLIC_HOME_CTA_LABEL,
  PUBLIC_HOME_DESCRIPTION,
  PUBLIC_HOME_EXAMPLE,
  PUBLIC_HOME_HEADING,
  PUBLIC_HOME_HEADING_LINES,
  PUBLIC_HOME_INSIGHTS_LIFT,
  PUBLIC_HOME_INSIGHTS_LIFTS,
  PUBLIC_HOME_INSIGHTS_PACE,
  PUBLIC_HOME_PLAN_EXAMPLE,
  PUBLIC_HOME_LEGAL_LABEL,
  PUBLIC_HOME_PRIVACY_LABEL,
  PUBLIC_HOME_SUBHEAD,
  PUBLIC_HOME_TERMS_LABEL,
  publicHomeMetadata,
} from "./public-home";

const appDir = dirname(fileURLToPath(import.meta.url));

describe("public home", () => {
  it("uses the product name as the title and the subhead as the search snippet", () => {
    assert.equal(PUBLIC_HOME_HEADING, "Log the load and the reps...");
    assert.deepEqual(PUBLIC_HOME_HEADING_LINES, ["Log the load and the reps..."]);
    assert.equal(PUBLIC_HOME_FREE_LINE, "EvoLift is free.");
    assert.equal(PUBLIC_HOME_SUBHEAD, "Quick to write down while you train.");
    assert.equal(PUBLIC_HOME_DESCRIPTION, PUBLIC_HOME_SUBHEAD);
    assert.doesNotMatch(PUBLIC_HOME_DESCRIPTION, /\.\.\./);
    assert.deepEqual(publicHomeMetadata, {
      title: { absolute: APP_DOCUMENT_TITLE },
      description: PUBLIC_HOME_DESCRIPTION,
      alternates: { canonical: PUBLIC_APP_ORIGIN },
      openGraph: {
        title: APP_DOCUMENT_TITLE,
        description: PUBLIC_HOME_DESCRIPTION,
        url: PUBLIC_APP_ORIGIN,
        siteName: APP_DOCUMENT_TITLE,
        type: "website",
      },
    });
    assert.equal(APP_DOCUMENT_TITLE, "EvoLift");
    assert.equal(PUBLIC_APP_ORIGIN, "https://evolift.at");
  });

  it("opens Register from Start lifting", () => {
    assert.equal(PUBLIC_HOME_CTA_LABEL, "Start lifting");
    assert.equal(PUBLIC_HOME_CTA_HREF, "/login?register=1");
    assert.equal(PUBLIC_HOME_TERMS_LABEL, "Terms of use");
    assert.equal(PUBLIC_HOME_PRIVACY_LABEL, "Privacy policy");
    assert.equal(PUBLIC_HOME_LEGAL_LABEL, "Legal notice");
  });

  it("renders one heading outside the signed-in shell", () => {
    const page = readFileSync(join(appDir, "page.tsx"), "utf8");

    assert.equal(page.match(/<h1\b/g)?.length, 1);
    assert.match(page, /PUBLIC_HOME_HEADING/);
    assert.match(page, /pt-8 pb-12 sm:pt-10/);
    assert.match(page, /text-balance text-3xl font-semibold text-zinc-900/);
    assert.match(page, /PUBLIC_HOME_SUBHEAD/);
    assert.match(page, /PUBLIC_HOME_FREE_LINE/);
    assert.match(page, /PUBLIC_HOME_CTA_LABEL}\s*<span[^>]*>\*<\/span>/);
    assert.doesNotMatch(page, /href="#free"/);
    assert.match(page, /id="free"/);
    assert.match(page, /text-right/);
    assert.doesNotMatch(page, /The account is free/);
    assert.match(page, /PublicHomeFigure/);
    assert.match(page, /PublicHomePlanExample/);
    assert.match(page, /PublicHomeInsightsExample/);
    assert.match(page, /PUBLIC_HOME_AREAS/);
    assert.equal(page.match(/<PublicHomeCta\b/g)?.length, 2);
    assert.match(page, /<header\b/);
    assert.match(page, /<footer\b/);
    assert.match(page, /gap-x-4 gap-y-1/);
    assert.match(page, /Skip to content/);
    assert.match(page, /from-sky-200 via-sky-100 to-sky-50/);
    assert.match(page, /markClassName="h-12 w-12"/);
    assert.doesNotMatch(page, /PageFrame/);
    assert.match(page, /EvoLiftBrand/);
    assert.match(page, /ActionLink/);
    assert.match(page, /variant="primary"/);
    assert.match(page, /className="public-home-cta"/);
    assert.match(page, /@media \(prefers-reduced-motion: no-preference\) \{\s*\.public-home-cta \{/);
    assert.match(page, /transition: transform 160ms cubic-bezier\(0\.23, 1, 0\.32, 1\)/);
    assert.match(page, /\.public-home-cta:active \{\s*transform: scale\(0\.97\);/);
    assert.doesNotMatch(page, /transition:\s*all/);
    assert.match(page, /PUBLIC_HOME_CTA_LABEL/);
    assert.match(page, /prefetch=\{false\}/);
    assert.doesNotMatch(page, /max-w-\[28rem\]|mt-auto|PUBLIC_HOME_REGISTER/);
    assert.doesNotMatch(page, /HeaderActions|header-actions|PageShell|AppFooter/);
    assert.doesNotMatch(page, /openGraph/);
    assert.doesNotMatch(page, /asHeading/);
  });

  it("keeps marketing controls named, focusable, and free of extra roles", () => {
    const page = readFileSync(join(appDir, "page.tsx"), "utf8");
    const logo = readFileSync(join(appDir, "components", "evo-lift-logo.tsx"), "utf8");
    const actionLink = readFileSync(join(appDir, "components", "action-button.tsx"), "utf8");
    const globals = readFileSync(join(appDir, "globals.css"), "utf8");
    const login = readFileSync(join(appDir, "login", "page.tsx"), "utf8");

    assert.equal(page.match(/<h1\b/g)?.length, 1);
    assert.match(page, /PUBLIC_HOME_CTA_LABEL/);
    assert.match(page, /PUBLIC_HOME_TERMS_LABEL/);
    assert.match(page, /PUBLIC_HOME_PRIVACY_LABEL/);
    assert.match(page, /PUBLIC_HOME_LEGAL_LABEL/);
    assert.match(page, /<ActionLink/);
    assert.match(page, /<Link/);
    assert.match(page, /quietLinkClassName/);
    assert.match(page, /EvoLiftBrand/);
    assert.doesNotMatch(page, /<button\b/);
    assert.doesNotMatch(page, /\brole=/);
    assert.doesNotMatch(page, /aria-label/);

    assert.equal(PUBLIC_HOME_CTA_LABEL, "Start lifting");
    assert.equal(PUBLIC_HOME_CTA_HREF, "/login?register=1");
    assert.equal(PUBLIC_HOME_TERMS_LABEL, "Terms of use");
    assert.equal(PUBLIC_HOME_PRIVACY_LABEL, "Privacy policy");
    assert.equal(PUBLIC_HOME_LEGAL_LABEL, "Legal notice");
    assert.match(login, /label: "Register"/);
    assert.match(login, /label: "Log in"/);

    assert.match(logo, /aria-hidden/);
    assert.match(quietLinkClassName, /focus-visible:ring-2/);
    assert.match(quietLinkClassName, /focus-visible:ring-sky-700/);
    assert.match(quietLinkClassName, /focus-visible:ring-offset-2/);
    assert.doesNotMatch(quietLinkClassName, /ring-sky-500\/60/);
    assert.doesNotMatch(actionLink, /focus-visible:outline-none/);
    assert.match(globals, /:focus-visible \{\s*outline: 2px solid var\(--accent\);/);
  });

  it("names the plan and Insights beside one example bar", () => {
    const page = readFileSync(join(appDir, "page.tsx"), "utf8");
    const figure = readFileSync(join(appDir, "public-home-figure.tsx"), "utf8");
    const visible = [
      PUBLIC_HOME_HEADING,
      PUBLIC_HOME_SUBHEAD,
      PUBLIC_HOME_FREE_LINE,
      PUBLIC_HOME_CTA_LABEL,
      PUBLIC_HOME_EXAMPLE.caption,
      PUBLIC_HOME_EXAMPLE.exercise,
      PUBLIC_HOME_EXAMPLE.load,
      PUBLIC_HOME_EXAMPLE.reps,
      ...PUBLIC_HOME_EXAMPLE.earlier.flatMap((point) => [point.date, point.load]),
      ...PUBLIC_HOME_AREAS.flatMap((area) => [area.title, area.detail]),
      PUBLIC_HOME_PLAN_EXAMPLE.name,
      ...PUBLIC_HOME_INSIGHTS_LIFTS.map((lift) => lift.exercise),
      ...PUBLIC_HOME_CLOSE_LINES,
    ].join("\n");
    const plan = STARTER_PLANS.find((item) => item.name === PUBLIC_HOME_PLAN_EXAMPLE.name);
    const slugs = plan?.days.flatMap((day) => day.exercises.map((item) => item.slug)) ?? [];
    const pace = exerciseProgressPaceBuckets(PUBLIC_HOME_INSIGHTS_PACE.map((read) => ({ read })));

    assert.deepEqual(
      PUBLIC_HOME_AREAS.map((area) => area.title),
      ["Plan", "Insights"],
    );
    assert.equal(
      PUBLIC_HOME_AREAS[0].detail,
      "Set the week up once. Open it on training day and work through the session you planned.",
    );
    assert.equal(
      PUBLIC_HOME_AREAS[1].detail,
      "Look through the loads and reps you logged. The numbers show how each lift is moving.",
    );
    assert.deepEqual(
      [...PUBLIC_HOME_CLOSE_LINES],
      ["...keep your plan and your pace."],
    );
    assert.match(page, /PUBLIC_HOME_CLOSE_LINES/);
    assert.match(page, /flex flex-1 flex-col justify-center/);
    assert.doesNotMatch(page, /You leave with the numbers/);
    assert.match(page, /size="lg"/);
    assert.equal(PUBLIC_HOME_INSIGHTS_LIFT.exercise, PUBLIC_HOME_EXAMPLE.exercise);
    assert.deepEqual(
      PUBLIC_HOME_INSIGHTS_LIFTS.map((lift) => lift.exercise),
      ["Barbell Bench Press", "Barbell Deadlift"],
    );
    assert.deepEqual(
      PUBLIC_HOME_INSIGHTS_LIFTS.map((lift) => lift.read),
      ["ahead", "room"],
    );
    assert.ok(PUBLIC_HOME_INSIGHTS_LIFTS.every((lift) => PUBLIC_HOME_INSIGHTS_PACE.includes(lift.read)));
    assert.ok(plan);
    assert.ok(slugs.includes("barbell-bench-press"));
    assert.ok(muscleAreaCoverage(slugs).includedCount > 4);
    assert.deepEqual(
      pace.map((bucket) => bucket.label),
      ["Room to gain", "On track", "Ahead", "No pace yet"],
    );
    assert.match(figure, /exampleChartInsetClassName/);
    assert.match(figure, /justify-center/);
    assert.match(figure, /<SampleWeek[^>]*stacked/);
    assert.match(figure, /flex flex-col items-start gap-4 sm:flex-row sm:items-center/);
    assert.match(figure, /shrink-0 self-center sm:ml-auto sm:self-auto/);
    assert.doesNotMatch(figure, /lg:flex-row/);
    assert.match(figure, /MuscleAreaCoverageBodies/);
    assert.match(figure, /ExerciseProgressPaceChart/);
    assert.match(figure, /PUBLIC_HOME_PLAN_EXAMPLE/);
    assert.match(figure, /PUBLIC_HOME_INSIGHTS_LIFTS/);
    assert.match(figure, /PUBLIC_HOME_INSIGHTS_PACE/);
    assert.match(figure, /StatusBadge/);
    assert.doesNotMatch(visible, /[—–-]/);
    assert.doesNotMatch(visible, /revolutionize|supercharge|cutting edge|effortless|world class/i);
    assert.match(figure, /prefers-reduced-motion: no-preference/);
    assert.match(figure, /public-home-shaft/);
    assert.doesNotMatch(page, /<details\b|FAQPage/);
  });
});
