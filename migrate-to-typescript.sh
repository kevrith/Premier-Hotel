#!/bin/bash

# Premier Hotel - TypeScript Migration Script
# This script converts all .js and .jsx files to .ts and .tsx

echo "🚀 Starting TypeScript migration for Premier Hotel..."
echo ""

# Function to rename files
rename_files() {
    local from_ext=$1
    local to_ext=$2
    local description=$3

    echo "📝 Converting $description files..."

    # Find and rename files
    find src -type f -name "*.$from_ext" | while read file; do
        new_file="${file%.$from_ext}.$to_ext"
        mv "$file" "$new_file"
        echo "  ✓ Converted: $file → $new_file"
    done

    echo ""
}

# Rename .jsx files to .tsx
rename_files "jsx" "tsx" "JSX"

# Rename .js files to .ts (but skip .tsx files to avoid double conversion)
find src -type f -name "*.js" | while read file; do
    # Check if this file has JSX content
    if grep -q "return.*<" "$file" || grep -q "React" "$file"; then
        # Has JSX, convert to .tsx
        new_file="${file%.js}.tsx"
        mv "$file" "$new_file"
        echo "  ✓ Converted (JSX detected): $file → $new_file"
    else
        # No JSX, convert to .ts
        new_file="${file%.js}.ts"
        mv "$file" "$new_file"
        echo "  ✓ Converted: $file → $new_file"
    fi
done

echo ""
echo "✅ File renaming complete!"
echo ""
echo "📦 Next steps:"
echo "  1. Update imports in all files (remove .jsx/.js extensions)"
echo "  2. Add type annotations"
echo "  3. Run 'npm run build' to check for errors"
echo "  4. Fix any TypeScript errors that appear"
echo ""
echo "🎉 Migration preparation complete!"
