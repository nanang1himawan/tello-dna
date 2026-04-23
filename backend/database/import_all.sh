#!/bin/bash

DB_USER="root"
# Leave DB_PASS empty if you want it to prompt, or set it if you prefer
DB_PASS=""
DB_NAME="office_app"

echo "Please enter MySQL password for user $DB_USER:"
read -s DB_PASS

echo "Importing schema..."
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < schema.sql

# Basic features and phases
echo "Importing phases and features..."
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < phase1_features.sql
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < phase2_features.sql
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < phase3_features.sql
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < phase6_features.sql
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < jira_features.sql

# Additional files
echo "Importing additional tweaks and fixes..."
for f in *.sql; do
    if [[ "$f" != "schema.sql" && ! "$f" =~ phase.*_features.sql && "$f" != "jira_features.sql" ]]; then
        echo "Importing $f..."
        mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$f"
    fi
done

echo "Done importing all SQL files!"
