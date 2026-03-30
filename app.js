'use strict';

const form = document.getElementById('generator-form');
const output = document.getElementById('output');
const outputStatus = document.getElementById('output-status');
const generateBtn = document.getElementById('generate-btn');
const copyBtn = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');

const SYSTEM_PROMPT = `You are an expert at writing CLAUDE.md files for Claude Code projects.

CLAUDE.md is a special context file that tells Claude Code everything it needs to know to work effectively in a project. It lives at the project root and is automatically loaded into every Claude Code session.

Generate a complete, production-ready CLAUDE.md based on the project information provided. The file should be:
- Specific to the project (not generic boilerplate)
- Actionable (tell Claude Code what to actually do, not vague guidelines)
- Concise (every line should add value — no padding)

Include these sections, populating each with specific, relevant content:

## Project Overview
Brief description of what the project does, who uses it, current status.

## Tech Stack
Languages, frameworks, key libraries, runtime versions. Be specific.

## Key Files
The most important files/directories Claude should know about. Not everything — just what matters.

## Run Commands
How to run tests, start dev server, build, deploy. Exact commands.

## Working Style
How the developer wants Claude to approach tasks in this project. Communication preferences.

## Security Rules
What must never be committed (secrets, credentials, tokens). Project-specific security concerns.

## Session Rules
How long sessions should be, when to commit, what to do at end of session.

## Current State
Active work, known issues, recent changes, what's in progress.

Keep each section focused. Avoid generic advice like "write clean code" — if you can't say something specific to this project, skip it.`;

function buildUserPrompt(data) {
  return `Project name: ${data.projectName}
Tech stack: ${data.techStack}
Main purpose: ${data.purpose}
Team size: ${data.teamSize}
${data.notes ? `Additional context: ${data.notes}` : ''}

Generate a complete CLAUDE.md for this project.`;
}

async function generate(apiKey, formData) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-request-allowed': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(formData) }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  return response;
}

async function streamResponse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const event = JSON.parse(data);
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          result += event.delta.text;
          output.textContent = result;
          output.scrollTop = output.scrollHeight;
        }
      } catch {
        // Ignore malformed SSE lines
      }
    }
  }

  return result;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const apiKey = document.getElementById('api-key').value.trim();
  if (!apiKey) {
    setStatus('error', 'API key required');
    return;
  }

  const formData = {
    projectName: document.getElementById('project-name').value.trim(),
    techStack: document.getElementById('tech-stack').value.trim(),
    purpose: document.getElementById('purpose').value.trim(),
    teamSize: document.getElementById('team-size').value,
    notes: document.getElementById('notes').value.trim(),
  };

  output.textContent = '';
  setStatus('generating', 'Generating...');
  generateBtn.disabled = true;
  copyBtn.disabled = true;
  downloadBtn.disabled = true;

  // Store key in sessionStorage only — never persisted
  sessionStorage.setItem('ak', apiKey);

  try {
    const response = await generate(apiKey, formData);
    await streamResponse(response);
    setStatus('done', 'Done');
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
  } catch (err) {
    setStatus('error', err.message);
    output.textContent = `Error: ${err.message}\n\nCommon issues:\n- Invalid API key\n- Insufficient credits\n- Network error (check browser console)`;
  } finally {
    generateBtn.disabled = false;
    sessionStorage.removeItem('ak');
  }
});

copyBtn.addEventListener('click', async () => {
  const text = output.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = 'Copied';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
  } catch {
    copyBtn.textContent = 'Failed';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
  }
});

downloadBtn.addEventListener('click', () => {
  const text = output.textContent;
  if (!text) return;
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'CLAUDE.md';
  a.click();
  URL.revokeObjectURL(url);
});

function setStatus(type, message) {
  outputStatus.className = `status status-${type}`;
  outputStatus.textContent = message;
  outputStatus.style.display = 'inline-block';
}
