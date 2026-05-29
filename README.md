# AI PR Reviewer

A production-style learning project built with NestJS and TypeScript that reviews GitHub pull requests using AI.

Inspired by tools like PR-Agent, this project focuses on modular architecture, structured AI output validation, CI/CD, Docker workflows, and DevSecOps practices.

---

# Features

- AI-powered pull request reviews
- GitHub PR integration
- OpenAI, Ollama, and mock AI providers
- Structured YAML AI responses validated with Zod
- Markdown review generation
- Dry-run mode for safe local testing
- Diff size limiting
- Provider-based architecture
- Docker support
- GitHub Actions CI pipeline
- Security scanning with Trivy, TruffleHog, and CodeQL
- Unit testing with Vitest
- Coverage enforcement support

---

# Tech Stack

- TypeScript
- NestJS
- Vitest
- Zod
- Docker
- GitHub Actions
- Trivy
- TruffleHog
- CodeQL
- Ollama
- OpenAI API

---

# What It Does

This tool accepts a GitHub pull request URL, fetches PR metadata and changed files, sends the diff to an AI provider, validates structured YAML output, formats the result as Markdown, and can publish the review as a GitHub PR comment.

---

# Architecture

```text
CLI
 └── AgentService
      └── CommandRegistry
           └── ReviewCommand
                ├── GitProvider
                ├── AIProvider
                ├── DiffService
                ├── YAML Parser + Zod Validator
                └── Markdown Formatter
```

---

# Current Status

## Implemented

- CLI review flow
- GitHub provider
- Mock, Ollama, and OpenAI AI providers
- Diff limiting
- token-aware diff budgeting
- prompt versioning with external prompt templates
- YAML parsing with Zod validation
- Markdown review formatting
- Dry-run mode
- Clean error handling
- Unit testing setup
- Docker multi-stage build
- GitHub Actions CI pipeline
- CodeQL security scanning
- TruffleHog secret scanning
- Trivy container vulnerability scanning
- test coverage enforcement


## Planned Roadmap

- GitHub webhook mode
- GitLab support
- Jira context integration
- Repository rules context
- Structured output repair step
- AI evaluation runner
- Observability and metrics
- Kubernetes manifests
- Multi-repository configuration support

---

# Requirements

- Node.js 24+
- npm
- GitHub personal access token
- Optional: Ollama for local AI inference
- Optional: OpenAI API key

---

# Local Development

```bash
npm install
cp .env.example .env
npm run build
npm test
```

---

# Environment Variables

```env
GITHUB_TOKEN=
AI_PROVIDER=mock
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
DEBUG=false
```

## Supported AI_PROVIDER values

```text
mock
ollama
openai
```

---

# GitHub Token Permissions

For a fine-grained GitHub token, enable:

- Contents: Read-only
- Pull requests: Read and write
- Issues: Read and write

GitHub PR comments are published through GitHub's Issues API, so Issues permission is required.

---

# Running With Mock AI

```bash
AI_PROVIDER=mock npm run cli -- https://github.com/owner/repo/pull/1 review --dry-run
```

---

# Running With Ollama

## Start Ollama

```bash
ollama serve
ollama pull llama3.1:8b
```

## Environment Configuration

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

## Run Review

```bash
npm run cli -- https://github.com/owner/repo/pull/1 review --dry-run
```

---

# Running With OpenAI

## Environment Configuration

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key
```

## Run Review

```bash
npm run cli -- https://github.com/owner/repo/pull/1 review --dry-run
```

---

# Dry Run Mode

Dry-run mode executes the full review pipeline without publishing a GitHub PR comment.

```bash
npm run cli -- https://github.com/owner/repo/pull/1 review --dry-run
```

---

# Publishing A Review Comment

Omit `--dry-run` to publish a real GitHub PR comment.

```bash
npm run cli -- https://github.com/owner/repo/pull/1 review
```

WARNING: Only run this against repositories where you are authorized to publish PR comments.

---

# Docker

## Build Docker Image

```bash
docker build -t ai-pr-reviewer .
```

## Run Container

```bash
docker run --env-file .env ai-pr-reviewer
```

The Docker image uses a multi-stage build to:

- separate dependency installation and runtime stages
- reduce final image size
- exclude development dependencies from production
- improve container security

---

# CI/CD

The GitHub Actions pipeline includes:

- linting
- unit tests
- coverage enforcement
- npm dependency audit
- TruffleHog secret scanning
- Docker image build
- Trivy container vulnerability scanning
- CodeQL static analysis

The pipeline validates both application code and container security before merge/deployment workflows.

---

# Testing

## Run Tests

```bash
npm test
```

## Run Tests With Coverage

```bash
npm test -- --coverage
```

Coverage reports are generated in the `coverage/` directory.

---

# Example Review Output

```md
## AI Review Summary

### Findings
- Possible null handling issue in `ReviewService`
- Consider extracting validation logic into separate utility
- Large method may benefit from smaller composable functions

### Risk Level
Medium
```

---

# Security Notes

- Ollama support allows fully local AI reviews without sending code to third-party APIs.
- Structured YAML validation helps reduce malformed AI output risks.
- CI includes secret scanning, dependency auditing, and container vulnerability scanning.
- Multi-stage Docker builds reduce attack surface by excluding development tooling from the runtime image.

---

# Engineering Notes

This project is designed as a production-style learning clone rather than a line-by-line port of PR-Agent.

Key engineering decisions:

- The review flow depends on interfaces like `GitProvider` and `AIProvider`, allowing providers to be swapped without changing command logic.
- AI output is requested as structured YAML, then parsed with `js-yaml` and validated using `zod` before Markdown formatting.
- AI prompts are versioned and stored as external templates rather than embedded in source code.
- Prompt templates use runtime variable substitution for pull request metadata and diffs.
- Token-aware diff budgeting is used to control context size and prevent oversized LLM requests.
- Ollama support enables fully local/private AI inference where source code should not leave the machine or company network.
- `--dry-run` mode allows validating the entire review pipeline safely without publishing PR comments.
- Low temperature settings are used for structured AI output to reduce randomness and improve parsing reliability.
- GitHub PR comments are published through the Issues API, which affects required fine-grained token permissions.
- The CI pipeline follows a DevSecOps-style workflow with testing, dependency scanning, secret scanning, container scanning, and static analysis.

See `PROJECT_CONTEXT.md` for the full engineering journal, roadmap, architecture evolution, and lessons learned.

