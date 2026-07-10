# EasyRyde — Agent Configuration

## Global Team System (MANDATORY)
This project is registered with the global team orchestration system at `C:\team`.

### Team ID
- Project hash: `proj-9d69ee28e788`
- Database: `C:\team\database\proj-9d69ee28e788\`

### On Session Start
1. Read `C:\team\SYSTEM.md` — coordination rules
2. Read `C:\team\LEADER.md` — orchestrator manual (if you are the Leader)
3. Check `C:\team\state\DASHBOARD.md` — current health
4. Run `node C:\team\scripts\validate.mjs` to validate state
5. Run `node C:\team\scripts\recover.mjs` to check for stale sessions

### Task Workflow
- Create tasks: `node C:\team\scripts\create-task.mjs --project proj-9d69ee28e788 --title "..." --type <type>`
- Get routing advice: `node C:\team\scripts\route-task.mjs --project proj-9d69ee28e788 "description"`
- Spawn members: `node C:\team\scripts\route-task.mjs --spawn <type> --project proj-9d69ee28e788`
- Close tasks: `node C:\team\scripts\close-task.mjs --project proj-9d69ee28e788 <task-id>`

### Member Types
ceo, eng-manager, designer, builder, reviewer, debugger, qa-lead, release-engineer, doc-engineer, dev-ops

## Coverage Setup
- PHP 8.4.22 NTS VS17 with pcov: `C:\php84\php.exe`
- Run coverage: `backend\coverage.cmd` or `C:\php84\php.exe artisan test --coverage`
- Config: `backend\phpunit.xml` (main) / `backend\phpunit.coverage.xml` (coverage variant)
- Reports: `backend/coverage/clover.xml`, `backend/coverage/html/`, `backend/coverage/coverage.txt`
- Coverage: 46.0% overall (285/285 pass, 555 assertions)
