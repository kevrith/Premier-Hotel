#!/bin/bash

# Fix imports by removing .jsx and .js extensions
echo "🔧 Fixing imports in TypeScript files..."

# Find all .ts and .tsx files and fix imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
    # Remove .jsx extensions from imports
    sed -i "s/from '\(.*\)\.jsx'/from '\1'/g" "$file"
    sed -i 's/from "\(.*\)\.jsx"/from "\1"/g' "$file"

    # Remove .js extensions from imports (but keep .json)
    sed -i "s/from '\(.*\)\.js'/from '\1'/g" "$file"
    sed -i 's/from "\(.*\)\.js"/from "\1"/g' "$file"

    # Fix dynamic imports
    sed -i "s/import('\(.*\)\.jsx')/import('\1')/g" "$file"
    sed -i "s/import('\(.*\)\.js')/import('\1')/g" "$file"
done

echo "✅ Import fixing complete!"
