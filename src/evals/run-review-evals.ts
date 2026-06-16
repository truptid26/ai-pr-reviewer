import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { createAIProvider } from '../ai/ai-provider.factory.js';
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
} from '../commands/review/review.prompt.js';
import { parseReviewResult } from '../commands/review/review.parser.js';
import { REVIEW_PROMPT_VERSION } from '../constants/prompt.constants.js';
import { ReviewResult } from '../domain/pr.types.js';

const PullRequestSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  number: z.number(),
  title: z.string(),
  body: z.string(),
  url: z.string(),
  baseBranch: z.string(),
  headBranch: z.string(),
});

const DiffFileSchema = z.object({
  filename: z.string(),
  status: z.enum(['added', 'modified', 'removed', 'renamed']),
  patch: z.string().optional(),
  additions: z.number(),
  deletions: z.number(),
  changes: z.number(),
});

const EvalCaseSchema = z.object({
  name: z.string(),
  pullRequest: PullRequestSchema,
  files: z.array(DiffFileSchema),
  expectations: z.object({
    mustParse: z.boolean().default(true),
    expectedFiles: z.array(z.string()).default([]),
    expectedKeywords: z.array(z.string()).default([]),
    forbiddenFiles: z.array(z.string()).default([]),
    minFindings: z.number().optional(),
    maxFindings: z.number().optional(),
  }),
});

type EvalCase = z.infer<typeof EvalCaseSchema>;

type EvalResult = {
  name: string;
  passed: boolean;
  score: number;
  checks: string[];
  failures: string[];
  parseSucceeded: boolean;
  findingCount: number;
};

async function main() {
  const casesDir = path.join(process.cwd(), 'evals/cases');
  const caseFiles = (await fs.readdir(casesDir))
    .filter((file) => file.endsWith('.json'))
    .sort();

  if (caseFiles.length === 0) {
    throw new Error(`No eval cases found in ${casesDir}`);
  }

  const aiProvider = createAIProvider();
  const results: EvalResult[] = [];

  console.log('\n=== Review Eval Run ===');
  console.table({
    provider: aiProvider.getName(),
    promptVersion: REVIEW_PROMPT_VERSION,
    cases: caseFiles.length,
    strict: process.env.EVAL_STRICT === 'true',
  });

  for (const file of caseFiles) {
    const evalCase = await loadEvalCase(path.join(casesDir, file));
    const result = await runEvalCase(evalCase, aiProvider);
    results.push(result);
    printEvalResult(result);
  }

  const passed = results.filter((result) => result.passed).length;
  const averageScore =
    results.reduce((sum, result) => sum + result.score, 0) / results.length;

  console.log('\n=== Eval Summary ===');
  console.table({
    passed,
    failed: results.length - passed,
    total: results.length,
    averageScore: Number(averageScore.toFixed(2)),
  });

  if (process.env.EVAL_STRICT === 'true' && passed !== results.length) {
    process.exitCode = 1;
  }
}

async function loadEvalCase(filePath: string): Promise<EvalCase> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  return EvalCaseSchema.parse(parsed);
}

async function runEvalCase(
  evalCase: EvalCase,
  aiProvider: ReturnType<typeof createAIProvider>,
): Promise<EvalResult> {
  const messages = [
    {
      role: 'system' as const,
      content: buildReviewSystemPrompt(),
    },
    {
      role: 'user' as const,
      content: buildReviewUserPrompt(evalCase.pullRequest, evalCase.files),
    },
  ];

  const rawReview = await aiProvider.chat(messages);

  let parsedReview: ReviewResult | undefined;
  const checks: string[] = [];
  const failures: string[] = [];

  try {
    parsedReview = parseReviewResult(rawReview);
    checks.push('parsed YAML and matched schema');
  } catch (error) {
    if (evalCase.expectations.mustParse) {
      failures.push(
        `review did not parse as expected: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } else {
      checks.push('parse failure was allowed');
    }
  }

  if (parsedReview) {
    scoreParsedReview(evalCase, parsedReview, checks, failures);
  }

  const totalChecks = checks.length + failures.length;
  const score = totalChecks === 0 ? 0 : checks.length / totalChecks;

  return {
    name: evalCase.name,
    passed: failures.length === 0,
    score: Number(score.toFixed(2)),
    checks,
    failures,
    parseSucceeded: Boolean(parsedReview),
    findingCount: parsedReview?.findings.length ?? 0,
  };
}

function scoreParsedReview(
  evalCase: EvalCase,
  review: ReviewResult,
  checks: string[],
  failures: string[],
) {
  const reviewText = [
    review.summary,
    ...review.findings.flatMap((finding) => [
      finding.file ?? '',
      finding.message,
      finding.suggestion ?? '',
    ]),
  ]
    .join('\n')
    .toLowerCase();

  for (const expectedFile of evalCase.expectations.expectedFiles) {
    const found = review.findings.some(
      (finding) => finding.file === expectedFile,
    );
    if (found) {
      checks.push(`mentioned expected file ${expectedFile}`);
    } else {
      failures.push(`did not mention expected file ${expectedFile}`);
    }
  }

  for (const keyword of evalCase.expectations.expectedKeywords) {
    if (reviewText.includes(keyword.toLowerCase())) {
      checks.push(`mentioned keyword ${keyword}`);
    } else {
      failures.push(`did not mention keyword ${keyword}`);
    }
  }

  for (const forbiddenFile of evalCase.expectations.forbiddenFiles) {
    const found = review.findings.some(
      (finding) => finding.file === forbiddenFile,
    );
    if (found) {
      failures.push(`hallucinated forbidden file ${forbiddenFile}`);
    } else {
      checks.push(`did not hallucinate forbidden file ${forbiddenFile}`);
    }
  }

  if (evalCase.expectations.minFindings !== undefined) {
    if (review.findings.length >= evalCase.expectations.minFindings) {
      checks.push(`finding count >= ${evalCase.expectations.minFindings}`);
    } else {
      failures.push(
        `finding count ${review.findings.length} < ${evalCase.expectations.minFindings}`,
      );
    }
  }

  if (evalCase.expectations.maxFindings !== undefined) {
    if (review.findings.length <= evalCase.expectations.maxFindings) {
      checks.push(`finding count <= ${evalCase.expectations.maxFindings}`);
    } else {
      failures.push(
        `finding count ${review.findings.length} > ${evalCase.expectations.maxFindings}`,
      );
    }
  }
}

function printEvalResult(result: EvalResult) {
  console.log(`\n--- ${result.passed ? 'PASS' : 'FAIL'}: ${result.name} ---`);
  console.table({
    score: result.score,
    parseSucceeded: result.parseSucceeded,
    findingCount: result.findingCount,
  });

  if (result.checks.length > 0) {
    console.log('Checks:');
    for (const check of result.checks) {
      console.log(`  - ${check}`);
    }
  }

  if (result.failures.length > 0) {
    console.log('Failures:');
    for (const failure of result.failures) {
      console.log(`  - ${failure}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
