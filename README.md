# AI PR Reviewer

A learning-focused NestJS/TypeScript implementation of an AI pull request reviewer inspired by PR-Agent.

## What It Does

This tool accepts a GitHub pull request URL, fetches PR metadata and changed files, sends the diff to an AI provider, validates structured YAML output, formats the result as Markdown, and can publish the review as a PR comment.

## Current Status

Implemented:
- CLI review flow
- GitHub provider
- Mock, Ollama, and OpenAI AI providers
- diff limiting
- YAML parsing with Zod validation
- Markdown review formatting
- dry-run mode
- basic clean error handling
- unit test setup

Not yet implemented:
- GitHub webhook mode
- GitLab support
- Jira context
- repository rules context
- Docker/Kubernetes
- observability

## Architecture

Current flow:

CLI
  -> AgentService
  -> CommandRegistry
  -> ReviewCommand
  -> GitProvider + AIProvider + DiffService
  -> YAML parser + Zod validator
  -> Markdown formatter
  -> GitHub PR comment or dry-run output

## Requirements

Node.js
npm
GitHub personal access token
Optional: Ollama for local AI
Optional: OpenAI API key

## Setup

npm install
cp .env.example .env

## Environment Variables

GITHUB_TOKEN=
AI_PROVIDER=mock
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
DEBUG=false

# Supported AI_PROVIDER values:

mock
ollama
openai

## GitHub Token Permissions

For a fine-grained GitHub token, enable:

- Contents: Read-only
- Pull requests: Read and write
- Issues: Read and write

PR comments are published through GitHub's Issues API, so Issues permission is required.

## Running With Mock AI

AI_PROVIDER=mock npm run cli -- https://github.com/owner/repo/pull/1 review --dry-run

## Running With Ollama

# start ollama
ollama serve
ollama pull llama3.1:8b

# env config
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# command
npm run cli -- https://github.com/owner/repo/pull/1 review --dry-run

## Running With OpenAI

# env config
AI_PROVIDER=openai
OPENAI_API_KEY=your_key

# command
npm run cli -- https://github.com/owner/repo/pull/1 review --dry-run

## Dry Run Mode

Dry-run mode runs the full review pipeline but does not publish a GitHub comment.
npm run cli -- https://github.com/owner/repo/pull/1 review --dry-run

## Publishing A Review Comment

Omit `--dry-run` to publish a real PR comment.
npm run cli -- https://github.com/owner/repo/pull/1 review
WARNING: Only run this against repos/PRs where you are allowed to post comments.

## Testing

npm test

## Roadmap

GitHub webhook mode
GitLab provider
repository-aware reviews using AGENTS.md, .cursorrules, and .cursor/rules
Jira story compliance checks
structured output repair step
token-based diff limiting
eval runner for AI review quality
structured logging and metrics
Dockerfile and docker-compose
GitHub Actions CI
Kubernetes manifests

## Engineering Notes

## Engineering Notes

This project is designed as a production-style learning clone rather than a line-by-line port of PR-Agent.

Key decisions:

- The review flow depends on interfaces like `GitProvider` and `AIProvider`, so GitHub/OpenAI/Ollama can be swapped without changing command logic.
- AI output is requested as YAML, then parsed with `js-yaml` and validated with `zod` before being formatted as Markdown.
- Ollama is supported for local/private development where code should not leave the machine or company network.
- `--dry-run` mode is used to test the full pipeline safely without publishing PR comments.
- Low temperature is used for structured AI output to reduce randomness and improve parse reliability.
- GitHub PR comments are published through the Issues API, which affects fine-grained token permissions.

See `PROJECT_CONTEXT.md` for the full engineering journal, roadmap, and lessons learned.