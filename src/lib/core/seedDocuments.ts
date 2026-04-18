/**
 * Seed content handed to first-time users so they can try the product
 * without typing anything. Kept here — not in the DB — so we can tweak
 * the copy without a migration.
 */

export interface SeedSpec {
  title: string;
  language: "python" | "latex" | "csv";
  content: string;
}

const DEMO_CSV = `customer_id,signup_month,total_spend,tenure_months,is_active
1001,2025-03,450.00,12,true
1002,2024-11,1200.50,24,true
1003,2025-07,89.99,3,true
1004,2024-05,2100.00,36,true
1005,2025-05,560.00,6,true
1006,2024-09,312.40,15,false
1007,2025-01,980.00,10,true
1008,2024-06,4050.75,22,true
1009,2025-02,0.00,9,false
1010,2024-12,1725.30,17,true
`;

const DEMO_PY = `# Goal: figure out which customer segments drive lifetime value.
# We have a small transactions export to explore before scaling up.

# Step 1: load the customers.csv and look at the first few rows
# Step 2: clean the obvious issues — missing rows, inactive accounts
# Step 3: segment customers into quartiles by total_spend
# Step 4: plot tenure vs. spend for each segment
# Step 5: test whether segment predicts is_active at p < 0.05
`;

const DEMO_TEX = `\\section{Introduction}

Large language models are rapidly becoming capable collaborators for
technical work, yet most of that collaboration happens in a separate
chat window. Users context-switch from their document, describe their
intent in prose, paste the result back, and try again if it did not
quite fit. We believe this workflow misses the point: the user's
intent is already written down, in the document.

This paper proposes a different approach. We infer intent from
in-document planning text, surface appropriate AI actions inline, and
let the user approve or discard them without leaving the editor.

\\section{Approach}

We classify every line of a source file, or every selected passage of
prose, into one of three semantic types: a goal, a step, or freeform
text. For each type we maintain a small set of suggested actions —
write code, detail a step, fix grammar, and so on. Actions either
produce an artifact that is inserted into the document for approval,
or a summary that is shown only to the user.

Our contribution is threefold. First, we show that a lightweight
classifier is sufficient to surface useful suggestions in practice.
Second, we demonstrate an approve / undo UX that preserves author
agency without blocking the flow of writing. Third, we release a
reference implementation built on Next.js and the Anthropic API.
`;

export const SEED_DOCUMENTS: SeedSpec[] = [
  { title: "demo_plan.py", language: "python", content: DEMO_PY },
  { title: "demo_paper.tex", language: "latex", content: DEMO_TEX },
  { title: "customers.csv", language: "csv", content: DEMO_CSV },
];
