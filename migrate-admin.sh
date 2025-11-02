#!/bin/bash

# ✅ Set your old dashboard path (update if needed)
OLD_ADMIN_PATH="/c/Users/User/tibacare-old/src/app/manage"

# ✅ Target new admin structure
NEW_ADMIN_PATH="/c/Users/User/tibacare/src/app/manage"

# ✅ List of all sections to migrate
SECTIONS=(
  dashboard provider clients appointments analytics forms tools users
  consultations billing logs feedback compliance messages notifications settings
)

# ✅ Loop through and copy files from old to new folders
for SECTION in "${SECTIONS[@]}"; do
  if [ -d "$OLD_ADMIN_PATH/$SECTION" ]; then
    cp -r "$OLD_ADMIN_PATH/$SECTION/"* "$NEW_ADMIN_PATH/$SECTION/" 2>/dev/null
    echo "✅ Migrated: $SECTION"
  else
    echo "⚠️  Skipped: $SECTION (no source folder found)"
  fi
done

echo "✅ Migration complete."
