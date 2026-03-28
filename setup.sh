#!/bin/bash

echo "🚀 ECOS Frontend Setup"
echo "======================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cp .env.local.example .env.local
    echo "✅ Created .env.local (using default values)"
    echo ""
    echo "   You can edit .env.local to customize:"
    echo "   - NEXT_PUBLIC_API_URL (default: http://localhost:3001)"
    echo "   - NEXT_PUBLIC_WS_URL (default: ws://localhost:3001)"
    echo ""
else
    echo "✅ .env.local already exists"
    echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Ensure backend is running on http://localhost:3001"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
echo ""
echo "Happy building! 🎉"
