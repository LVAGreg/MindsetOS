#!/bin/bash

# ============================================
# Update Agent System Prompts Shell Script
# ============================================
# Created: 2025-01-09
# Purpose: Load agent instructions from /agents/instructions/ into database
#
# USAGE:
#   bash /home/equalsfiveai/ECOS/database/migrations/update-agent-prompts.sh
#
# Prerequisites:
#   - PostgreSQL client (psql) installed
#   - ECOS environment variables set (or default localhost:5432)
#   - Agent instruction files exist in /agents/instructions/
# ============================================

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}ECOS Agent Prompt Update Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Base directory
ECOS_DIR="/home/equalsfiveai/ECOS"
INSTRUCTIONS_DIR="${ECOS_DIR}/agents/instructions"

# Database connection (default to Railway proxy if environment variables not set)
PGHOST="${PGHOST:-hopper.proxy.rlwy.net}"
PGPORT="${PGPORT:-54254}"
PGUSER="${PGUSER:-ecos_user}"
PGDATABASE="${PGDATABASE:-ecos_production}"
# Password should be set via PGPASSWORD environment variable

# Agent mapping: agent_id → instruction_file
declare -A AGENT_MAP=(
  ["money-model-mapper"]="money-model-mapper-instructions.md"
  ["money-model-maker"]="money-model-maker-instructions.md"
  ["fast-fix-finder"]="fast-fix-finder-instructions.md"
  ["offer-promo-printer"]="offer-promo-printer-instructions.md"
  ["promo-planner"]="promo-planner-instructions.md"
  ["qualification-call-builder"]="qualification-call-builder-instructions.md"
  ["linkedin-events-builder-buddy"]="linkedin-events-builder-instructions.md"
)

# Check if instructions directory exists
if [ ! -d "$INSTRUCTIONS_DIR" ]; then
  echo -e "${RED}❌ Error: Instructions directory not found: ${INSTRUCTIONS_DIR}${NC}"
  exit 1
fi

echo -e "${YELLOW}📁 Instructions directory: ${INSTRUCTIONS_DIR}${NC}"
echo -e "${YELLOW}🔌 Database: ${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}${NC}\n"

# Function to update agent prompt
update_agent_prompt() {
  local agent_id=$1
  local filename=$2
  local filepath="${INSTRUCTIONS_DIR}/${filename}"

  echo -e "${BLUE}📝 Updating ${agent_id}...${NC}"

  # Check if file exists
  if [ ! -f "$filepath" ]; then
    echo -e "${RED}   ❌ File not found: ${filepath}${NC}"
    return 1
  fi

  # Get file size for reporting
  local filesize=$(wc -c < "$filepath")
  echo -e "   📄 File: ${filename} (${filesize} bytes)"

  # Read file content
  local content=$(cat "$filepath")

  # Execute UPDATE using dollar-quoted string to handle special characters
  PGPASSWORD="${PGPASSWORD}" psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" <<-EOSQL
		UPDATE agents
		SET
		  system_prompt = \$PROMPT\$${content}\$PROMPT\$,
		  updated_at = NOW()
		WHERE id = '${agent_id}'
		RETURNING id, name, LENGTH(system_prompt) as prompt_length, updated_at;
	EOSQL

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Updated successfully${NC}\n"
  else
    echo -e "${RED}   ❌ Update failed${NC}\n"
    return 1
  fi
}

# Update all agents
echo -e "${BLUE}Starting agent prompt updates...${NC}\n"

for agent_id in "${!AGENT_MAP[@]}"; do
  update_agent_prompt "$agent_id" "${AGENT_MAP[$agent_id]}"
done

# Summary query
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Update Summary${NC}"
echo -e "${BLUE}========================================${NC}\n"

PGPASSWORD="${PGPASSWORD}" psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" <<-EOSQL
	SELECT
	  id,
	  name,
	  LENGTH(system_prompt) as prompt_length,
	  TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as last_updated
	FROM agents
	WHERE id IN (
	  'money-model-mapper',
	  'money-model-maker',
	  'fast-fix-finder',
	  'offer-promo-printer',
	  'promo-planner',
	  'qualification-call-builder',
	  'linkedin-events-builder-buddy'
	)
	ORDER BY id;
EOSQL

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ All agent prompts updated successfully${NC}"
echo -e "${GREEN}========================================${NC}"
