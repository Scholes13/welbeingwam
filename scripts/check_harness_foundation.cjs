const fs = require('fs')
const path = require('path')

const root = process.cwd()

const requiredFiles = [
  'AGENTS.md',
  '.mcp.json',
  'docs/architecture.md',
  'docs/coding_standards.json',
  'docs/exec_plans.md',
  'docs/agentic/README.md',
  'docs/agentic/task-template.md',
  'docs/agentic/qa-playbook.md',
  'docs/agentic/reviewer-playbook.md',
  'docs/agentic/mcp-playbook.md',
  'docs/agentic/future-enforcement-roadmap.md',
]

const requiredAgentMarkers = [
  'Architecture and repository boundaries',
  'Strict coding constraints and review gates',
  'Active execution plans, delivery history, and known tech debt',
]

const requiredArchitectureMarkers = [
  '# Architecture',
  '## Team Structure',
  '## Directory Boundaries',
  '## Completion Criteria',
]

const requiredExecMarkers = [
  '# Execution Plans',
  '## Active Tasks',
  '## Known Tech Debt',
  '## Task Template',
]

const requiredStandardsTopLevelKeys = [
  'review_policy',
  'knowledge_sources',
  'roles',
  'harness_agent_mapping',
  'verification',
]

const requiredMcpServers = [
  'supabase',
  'context7',
  'openaiDeveloperDocs',
  'github',
  'chrome-devtools',
]

let hasError = false

function fail(message) {
  hasError = true
  console.error(`ERROR: ${message}`)
}

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(root, relativePath)
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required harness file: ${relativePath}`)
  }
}

function readFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

if (!hasError) {
  const agents = readFile('AGENTS.md')
  const architecture = readFile('docs/architecture.md')
  const execPlans = readFile('docs/exec_plans.md')

  for (const marker of requiredAgentMarkers) {
    if (!agents.includes(marker)) {
      fail(`AGENTS.md is missing marker: ${marker}`)
    }
  }

  for (const marker of requiredArchitectureMarkers) {
    if (!architecture.includes(marker)) {
      fail(`docs/architecture.md is missing marker: ${marker}`)
    }
  }

  for (const marker of requiredExecMarkers) {
    if (!execPlans.includes(marker)) {
      fail(`docs/exec_plans.md is missing marker: ${marker}`)
    }
  }

  try {
    const standards = JSON.parse(readFile('docs/coding_standards.json'))
    for (const key of requiredStandardsTopLevelKeys) {
      if (!(key in standards)) {
        fail(`docs/coding_standards.json is missing key: ${key}`)
      }
    }
  } catch (error) {
    fail(`docs/coding_standards.json is not valid JSON: ${error.message}`)
  }

  try {
    const mcpConfig = JSON.parse(readFile('.mcp.json'))
    if (!mcpConfig.mcpServers || typeof mcpConfig.mcpServers !== 'object') {
      fail('.mcp.json is missing the mcpServers object')
    } else {
      for (const serverName of requiredMcpServers) {
        if (!(serverName in mcpConfig.mcpServers)) {
          fail(`.mcp.json is missing MCP server: ${serverName}`)
        }
      }
    }
  } catch (error) {
    fail(`.mcp.json is not valid JSON: ${error.message}`)
  }
}

if (hasError) {
  process.exit(1)
}

console.log('Harness foundation check passed.')
