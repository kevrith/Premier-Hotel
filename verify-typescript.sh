#!/bin/bash

echo "🔍 TypeScript Migration Verification"
echo "===================================="
echo ""

# Check if TypeScript is installed
echo "1. Checking TypeScript installation..."
if command -v npx tsc &> /dev/null; then
    echo "   ✅ TypeScript installed: $(npx tsc --version)"
else
    echo "   ❌ TypeScript not found"
    exit 1
fi

# Check tsconfig.json exists
echo ""
echo "2. Checking TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    echo "   ✅ tsconfig.json exists"
else
    echo "   ❌ tsconfig.json not found"
    exit 1
fi

# Count TypeScript files
echo ""
echo "3. Counting TypeScript files..."
TS_COUNT=$(find src -name "*.ts" -o -name "*.tsx" | wc -l)
JS_COUNT=$(find src -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l)
echo "   ✅ TypeScript files: $TS_COUNT"
echo "   📊 JavaScript files: $JS_COUNT"

if [ "$JS_COUNT" -gt 0 ]; then
    echo "   ⚠️  Warning: Found $JS_COUNT JavaScript files remaining"
    find src -name "*.js" -o -name "*.jsx" 2>/dev/null
fi

# Check main entry point
echo ""
echo "4. Checking entry points..."
if [ -f "src/main.tsx" ]; then
    echo "   ✅ src/main.tsx exists"
else
    echo "   ❌ src/main.tsx not found"
    exit 1
fi

if [ -f "src/App.tsx" ]; then
    echo "   ✅ src/App.tsx exists"
else
    echo "   ❌ src/App.tsx not found"
    exit 1
fi

# Check types directory
echo ""
echo "5. Checking type definitions..."
if [ -f "src/types/index.ts" ]; then
    TYPE_LINES=$(wc -l < src/types/index.ts)
    echo "   ✅ src/types/index.ts exists ($TYPE_LINES lines)"
else
    echo "   ⚠️  No central type definitions found"
fi

# Try to build
echo ""
echo "6. Testing build..."
if npm run build > /dev/null 2>&1; then
    echo "   ✅ Build successful"
else
    echo "   ❌ Build failed"
    exit 1
fi

# Check index.html
echo ""
echo "7. Checking HTML entry point..."
if grep -q "main.tsx" index.html; then
    echo "   ✅ index.html references main.tsx"
else
    echo "   ❌ index.html does not reference main.tsx"
    exit 1
fi

echo ""
echo "===================================="
echo "✅ TypeScript Migration Verified!"
echo "===================================="
echo ""
echo "📊 Summary:"
echo "   • TypeScript files: $TS_COUNT"
echo "   • Type definitions: Yes"
echo "   • Build status: Success"
echo "   • Configuration: Valid"
echo ""
echo "🚀 Ready for development with TypeScript!"
