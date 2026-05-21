# AI PR Reviewer - Project Context

This project is a guided reimplementation of the core idea behind PR-Agent, built from scratch in Node.js/TypeScript for learning AI engineering, backend architecture, and interview-ready design patterns.

## Long-Term Goal

The main goal is to rewrite the ideas from the original PR-Agent in NestJS so the project becomes a practical learning path for:

- Basic to intermediate NestJS concepts.
- AI engineering patterns that are useful in interviews.
- Writing meaningful test cases.
- Observability in backend systems.
- CI/CD pipeline basics.
- DevOps basics with Docker and Kubernetes.

This should be treated as a production-style learning clone, not a line-by-line port of the Python project.

The preferred target is:

```text
NestJS AI PR Agent
GitHub-first
Production-style
Extensible to more git providers and AI providers
```

Feature depth is more important than shallow support for every platform. Strong GitHub support with clean architecture, tests, evals, observability, Docker, and Kubernetes is better for interviews than incomplete support for many providers.

## MVP Goal

Build a mini AI PR reviewer that can:

- Accept a GitHub pull request URL.
- Fetch PR metadata and changed files.
- Build an AI review prompt from the PR diff.
- Call an AI provider.
- Parse structured AI output.
- Format the result as Markdown.
- Publish the review as a GitHub PR comment.
- Keep the design flexible enough to support more providers, commands, tests, evals, and webhook mode later.

## Current Feature Status

The core `/review` MVP is implemented end to end.

Implemented:

- Domain types: `PullRequest`, `DiffFile`, `ReviewResult`, `ReviewFinding`.
- `GitProvider` interface.
- `GithubProvider` using Octokit.
- `AIProvider` interface.
- `OpenAIProvider`.
- `MockAIProvider`.
- `OllamaProvider`.
- AI provider switching using `AI_PROVIDER`.
- `Command` interface.
- `ReviewCommand`.
- `CommandRegistry`.
- `AgentService`.
- CLI flow.
- Basic diff limiting.
- YAML-focused review prompt.
- YAML parsing with `js-yaml`.
- Schema validation with `zod`.
- Markdown formatting for parsed review results.
- Fallback behavior when YAML parsing fails.
- Real GitHub PR comment publishing.
- Local Ollama support.

Not implemented yet:

- NestJS HTTP/webhook mode.
- `/describe` command.
- `/improve` command.
- Dry-run mode.
- `AppError` clean error handling.
- Unit tests.
- Mock AI failure tests.
- Provider contract tests.
- AI eval runner.
- Observability/metrics.
- Dockerfile.
- GitHub Actions CI.
- Production-grade retries and provider fallbacks.

## Current Architecture

Current request flow:

```text
CLI
  -> AgentService
  -> CommandRegistry
  -> ReviewCommand
  -> GitProvider + AIProvider + DiffService
  -> GithubProvider / OllamaProvider / OpenAIProvider / MockAIProvider
  -> YAML parser + Zod validator
  -> Markdown formatter
  -> GitHub PR comment
```

The important boundary is that `ReviewCommand` does not know about GitHub, OpenAI, or Ollama directly. It depends on interfaces:

```text
ReviewCommand -> GitProvider
ReviewCommand -> AIProvider
```

This keeps the command flexible, testable, and easy to extend.

## Design Patterns Learned

### Adapter Pattern

Used for providers.

Examples:

- `GithubProvider` adapts GitHub API responses into our internal `PullRequest` and `DiffFile` types.
- `OpenAIProvider`, `OllamaProvider`, and `MockAIProvider` adapt different AI systems into the same `AIProvider` interface.

### Factory Pattern

Used when selecting an implementation from config.

Example:

```text
AI_PROVIDER=mock   -> MockAIProvider
AI_PROVIDER=ollama -> OllamaProvider
AI_PROVIDER=openai -> OpenAIProvider
```

### Command Pattern

Used for actions like:

```text
review
describe
improve
ask
```

Currently only `ReviewCommand` exists, but the structure supports more commands.

### Dependency Inversion

High-level logic depends on interfaces, not concrete SDKs.

Good:

```text
ReviewCommand -> AIProvider
```

Avoid:

```text
ReviewCommand -> OpenAI SDK directly
```

### Strategy Pattern

Different AI providers can be swapped without changing review logic.

## GitHub API Lessons

For fine-grained GitHub personal access tokens, repository access alone is not enough. Permissions must also be set.

For the current CLI flow, required permissions are:

```text
Contents: Read-only
Pull requests: Read and write
Issues: Read and write
```

Important detail:

GitHub PR conversation comments use the Issues API:

```ts
octokit.issues.createComment(...)
```

But for a PR, GitHub may still require `Pull requests: Read and write`.

## AI Engineering Lessons

### Temperature

Temperature controls randomness.

Use low temperature for structured output:

```text
temperature: 0
```

This is useful for:

- YAML/JSON generation.
- Classification.
- Extraction.
- Deterministic transformations.

Higher temperature is better for brainstorming and creative writing, but worse for strict machine-readable output.

### Structured Output Pattern

Current pattern:

```text
Prompt asks for YAML
  -> Parse with js-yaml
  -> Validate with Zod
  -> Format Markdown ourselves
```

Do not trust the model just because the prompt asks for YAML. Always validate.

### Repair Step Concept

Production AI systems often use:

```text
Generate
  -> Validate
  -> Repair if invalid
  -> Validate again
  -> Fallback gracefully
```

If the model returns Markdown instead of YAML, the app can send that bad output back to the model and ask:

```text
Convert this review into valid YAML matching this schema.
Return only YAML.
```

This repair call is easier because it only converts format; it does not need to review code again.

## Engineering Journal

This section captures the story of the project: issues we hit, decisions we made, and what we learned. Keep adding to it as the project grows.

### 1. CommonJS vs ESM With Octokit

Problem:

The project used TypeScript `import/export`, but the editor warned that `@octokit/rest` is an ECMAScript module and could not safely be imported from a CommonJS module.

What we learned:

- TypeScript source syntax and Node runtime module format are different concepts.
- A file can use `import/export` in TypeScript and still compile to CommonJS.
- With `"module": "nodenext"`, Node decides ESM vs CommonJS based on `package.json`.
- Without `"type": "module"`, `.ts` files are treated as CommonJS under NodeNext rules.

Decision:

Because the goal includes interview readiness and modern Node.js knowledge, we converted the project to ESM by adding:

```json
"type": "module"
```

Result:

Static imports like this became appropriate:

```ts
import { Octokit } from '@octokit/rest';
```

Interview takeaway:

Be able to explain CommonJS, ESM, TypeScript emit settings, `nodenext`, and why some modern packages are ESM-only.

### 2. GitHub Fine-Grained Token Permissions

Problem:

Fetching a private PR failed with 404. After adding repository permissions, posting a PR comment failed with:

```text
Resource not accessible by personal access token
```

What we learned:

- GitHub often returns 404 for private resources when the token lacks access.
- Fine-grained tokens need both repository access and explicit permissions.
- PR conversation comments use the Issues API:

  ```ts
  octokit.issues.createComment(...)
  ```

- Even though the endpoint is under Issues, GitHub may require `Pull requests: Read and write` when commenting on a PR.

Working permissions:

```text
Contents: Read-only
Pull requests: Read and write
Issues: Read and write
```

Interview takeaway:

External API failures are often permission/configuration issues, not code bugs. Good systems need clear setup docs, clean errors, and least-privilege guidance.

### 3. OpenAI Quota Failure

Problem:

OpenAI returned:

```text
429 insufficient_quota
```

What we learned:

- A valid API key can still fail if billing/quota is unavailable.
- Production systems should not assume one AI provider is always available.
- Mock and local providers are valuable for development.

Decision:

We added multiple AI providers:

```text
MockAIProvider
OpenAIProvider
OllamaProvider
```

And made provider selection config-driven:

```env
AI_PROVIDER=mock
AI_PROVIDER=openai
AI_PROVIDER=ollama
```

Interview takeaway:

Provider abstraction is not theoretical. It helps with cost, quota, local development, tests, and resilience.

### 4. Ollama Returned Markdown Instead Of YAML

Problem:

The parser expected YAML, but Ollama returned Markdown:

```md
**Code Review**
```

`js-yaml` failed with errors such as:

```text
unidentified alias "*Code"
```

What we learned:

- AI output is probabilistic.
- Prompting alone is not enough.
- Structured output must be validated.
- Local models may need stricter prompts than cloud models.

Fixes:

- Strengthened the system prompt:

  ```text
  You must output only valid YAML.
  Do not output Markdown.
  Do not output explanations.
  Do not output code fences.
  Your entire response must be parseable by js-yaml.
  ```

- Lowered Ollama temperature:

  ```ts
  options: {
    temperature: 0,
  }
  ```

Result:

Ollama started returning parseable YAML.

Interview takeaway:

For structured AI output, use low temperature, strict prompts, validation, and fallback handling.

### 5. Structured Output Validation

Problem:

Even if a model returns valid YAML, the shape may still be wrong.

What we learned:

- `js-yaml` only validates syntax.
- `zod` validates application schema.

Current pattern:

```text
AI output
  -> js-yaml parse
  -> Zod schema validation
  -> Markdown formatter
```

Interview takeaway:

Never trust AI output directly. Parse it, validate it, and only then use it.

### 6. Repair Step Design

Problem:

Sometimes the model may still return invalid structured output.

Planned production pattern:

```text
Generate
  -> Validate
  -> Repair if invalid
  -> Validate again
  -> Fallback gracefully
```

What we learned:

The first model call has two jobs:

```text
review code
format as YAML
```

The repair call has one easier job:

```text
convert this review into valid YAML
```

Interview takeaway:

Reliable AI systems often use validate-and-repair loops instead of trusting a single model response.

## Production-Grade Testing Plan

AI systems need layered testing.

### 1. Deterministic Unit Tests

Test normal code:

- PR URL parsing.
- `CommandRegistry`.
- `DiffService`.
- YAML parser.
- Markdown formatter.
- AI provider factory.

These should run on every commit.

### 2. Mock AI Failure Tests

Use fake providers:

- Valid YAML provider.
- Invalid YAML provider.
- Throwing provider.
- Slow provider.

Test:

- Valid YAML parses and publishes formatted review.
- Invalid YAML triggers repair/fallback.
- AI failure becomes a clean app error.

### 3. Provider Contract Tests

Each provider must satisfy:

```ts
interface AIProvider {
  chat(messages: ChatMessage[]): Promise<string>;
}
```

Live provider tests should be optional, for example:

```bash
RUN_LIVE_AI_TESTS=true npm test
```

### 4. Evals

AI quality should be tested with eval cases, not exact string matching.

Example eval expectations:

- Output must parse as YAML.
- Output must match Zod schema.
- Output must mention a known file.
- Output must detect a known issue.
- Output must not hallucinate files.

Example future folder:

```text
evals/
  cases/
    no-issues.json
    missing-null-check.json
    security-risk.json
  review-eval-runner.ts
```

### 5. Observability

Track production metrics:

- Provider name.
- Model name.
- Latency.
- Parse success/failure.
- Repair attempted.
- Repair success/failure.
- Fallback used.
- GitHub API failures.
- Cost or token usage when available.

### 6. Fallbacks

Future production flow:

```text
Primary AI provider
  -> retry once
  -> repair invalid structured output
  -> fallback provider
  -> raw output fallback
  -> clean error if all fail
```

## Recommended Next Steps

1. Convert the current plain TypeScript implementation into proper NestJS modules.

   Suggested modules:

   ```text
   AgentModule
   CommandsModule
   GitModule
   AiModule
   DiffModule
   AppConfigModule
   WebhooksModule
   ObservabilityModule
   ```

   This teaches NestJS dependency injection, modules, providers, controllers, and configuration.

2. Add dry-run mode:

   ```bash
   npm run cli -- <pr-url> review --dry-run
   ```

   Dry-run should fetch PR data, call AI, parse/format review, print Markdown, and skip publishing.

3. Add `AppError` for clean error handling.

4. Add Vitest.

5. Add unit tests for deterministic code.

6. Add mock AI failure tests.

7. Add repair step tests.

8. Add provider factory tests.

9. Add eval runner.

10. Add observability logs.

11. Add Docker and GitHub Actions CI.

12. Add basic Kubernetes manifests.

## Full Learning Roadmap

### Phase 1: Core CLI MVP

Mostly implemented.

Feature goals:

- GitHub PR fetch.
- `/review` command.
- AI provider abstraction.
- Ollama/OpenAI/mock providers.
- YAML output parsing.
- Markdown publishing.

Remaining additions:

- dry-run mode.
- `AppError`.
- cleaner config.

### Phase 2: Proper NestJS Structure

Move current plain classes into NestJS modules:

```text
AgentModule
CommandsModule
GitModule
AiModule
DiffModule
AppConfigModule
```

Learn:

- `@Module`.
- `@Injectable`.
- providers.
- dependency injection.
- custom provider tokens.
- config service.
- exception filters.
- health controller.

### Phase 3: Webhook Mode

Add GitHub webhook API:

```text
POST /webhooks/github
```

Support:

- PR opened/synchronized -> auto review.
- issue comment `/review` -> run review.
- GitHub webhook signature verification.
- basic idempotency.

Learn:

- controllers.
- DTO validation.
- guards.
- request headers.
- webhook security.
- background execution basics.

### Phase 4: More Commands

Implement original-agent-inspired commands one by one:

```text
/review
/describe
/improve
/ask
/config
/help
/generate-labels
/update-changelog
```

Each command should reuse:

- `GitProvider`.
- `AIProvider`.
- diff service.
- structured output parser.
- Markdown formatter.
- command registry.

### Phase 5: Advanced AI Engineering

Add production AI patterns:

- token-aware diff compression.
- repository-aware review context.
- structured output repair.
- model fallback.
- provider fallback.
- eval runner.
- prompt versioning.
- hallucination checks.
- output schema validation.
- optional model-specific settings such as temperature.

### Repository-Aware Reviews

A strong AI reviewer should not only check whether code is generally good. It should check whether code fits the repository's own conventions.

The reviewer should eventually read repo-specific rule and documentation files such as:

```text
AGENTS.md
.cursor/rules/*
.cursorrules
CONTRIBUTING.md
README.md
docs/architecture.md
docs/*
.eslintrc*
eslint.config.*
.prettierrc*
tsconfig.json
package.json
nest-cli.json
```

Cursor-specific files to support:

```text
.cursor/rules/*.mdc
.cursorrules
```

Why this matters:

- Reviews become specific to the team and repository.
- The AI can catch architecture violations, not just generic bugs.
- The AI can enforce local coding conventions.
- The AI can avoid giving advice that conflicts with the repo's chosen patterns.

Example:

```text
Repo rule:
All services must use NestJS dependency injection.

PR change:
new GithubProvider() is called directly inside another service.

Expected review:
Flag this because it violates the repository's dependency injection convention.
```

Future design:

```text
src/context/
  repo-context.service.ts
  repo-rule-file.ts
```

Possible types:

```ts
export type RepoContext = {
  instructions: {
    source: string;
    content: string;
  }[];
};
```

Possible service:

```ts
class RepoContextService {
  async collect(pullRequest: PullRequest): Promise<RepoContext> {}
}
```

The `ReviewCommand` flow would become:

```text
fetch PR
fetch diff files
collect repo rules
limit diff/context size
build prompt with diff + repo rules
call AI
parse/format/publish
```

The prompt should include a section like:

```text
Repository-specific rules:
<content from AGENTS.md / Cursor rules / CONTRIBUTING.md>

When reviewing, check whether the PR follows these rules.
If a finding is based on a repo rule, mention the source file.
```

Provider impact:

The `GitProvider` interface will need a method for reading files from the repository:

```ts
getFileContent(pullRequest: PullRequest, path: string): Promise<string | null>;
```

GitHub and GitLab providers would each implement this using their own APIs.

Safety and quality rules:

- Do not blindly dump huge docs into prompts.
- Limit total repo-context size.
- Include source filenames so findings can cite the rule source.
- Read from the PR base branch by default.
- Avoid reading secrets or environment files.
- Later, summarize long rule files before including them.

Recommended implementation timing:

Add this after:

1. dry-run mode.
2. clean error handling.
3. basic unit tests.

This feature is highly interview-worthy because it shows the AI system is repository-aware rather than only doing generic code review.

### Phase 6: Testing

Add:

- unit tests.
- mocked GitHub provider tests.
- mocked AI provider tests.
- provider contract tests.
- webhook integration tests.
- eval tests.

Testing split:

```text
Many deterministic unit tests
Some integration tests
Few optional live provider tests
Separate AI evals
```

### Phase 7: Observability

Add:

- structured logging with Pino.
- request IDs.
- command execution logs.
- AI provider/model logs.
- AI latency.
- parse success/failure metrics.
- repair attempted/succeeded/failed metrics.
- fallback-used metrics.
- Prometheus `/metrics`.
- OpenTelemetry basics later.

### Phase 8: DevOps

Add:

- Dockerfile.
- docker-compose for local development.
- GitHub Actions CI.
- lint/test/build workflow.
- Docker image build workflow.
- Kubernetes Deployment.
- Kubernetes Service.
- Kubernetes ConfigMap.
- Kubernetes Secret example.
- health/readiness endpoints.

## Full-Clone Scope Guidance

The original PR-Agent has many providers and deployment modes. The learning clone should prioritize depth:

Recommended interview-ready target:

```text
Production-grade GitHub support
Multiple AI providers
Core command set
Strong tests and evals
Observability
Docker
Basic Kubernetes
CI/CD
```

Only after this is strong should we add GitLab, Bitbucket, Azure DevOps, or Gitea.

## Interview Story

A strong way to explain this project:

> I built an AI PR reviewer in TypeScript. It uses provider interfaces for Git and AI systems, a command registry for slash-command style actions, and adapter implementations for GitHub, OpenAI, Ollama, and mock AI. The review command fetches PR metadata and diffs, limits the diff context, builds a structured prompt, validates YAML output with Zod, formats Markdown, and publishes a PR comment. I also designed the next production layers: dry-run mode, deterministic unit tests, provider contract tests, AI evals, structured logging, repair prompts, and fallback providers.

Future stronger version:

> I rebuilt a PR-Agent-style system in NestJS. I designed modules for commands, git providers, AI providers, diff processing, config, webhooks, and observability. The system supports GitHub PR review through CLI and webhook modes, local Ollama and cloud AI providers, structured AI output validation and repair, deterministic tests, provider contract tests, evals for AI behavior, structured logs and metrics, Dockerized deployment, CI/CD, and basic Kubernetes manifests.
