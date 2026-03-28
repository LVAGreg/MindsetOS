# ECOS Frontend

Modern Next.js frontend for the Expert Consulting Operating System (ECOS).

## 🚀 Features

### ✅ Chat Interface
- **Real-time streaming** responses from AI agents
- **Markdown rendering** for rich formatting
- **Auto-scrolling** and message animations
- **Typing indicators** during agent responses

### ✅ Agent System
- **6 ECOS agents** with unique personalities and frameworks
- **Agent selector** with visual cards and descriptions
- **Conversation history** per agent with search
- **Multi-conversation support** for each agent

### ✅ Authentication
- **User registration** with email verification
- **Login/logout** with JWT tokens
- **Password reset** flow
- **Session management** with automatic token refresh

### ✅ Document Management
- **Drag-and-drop** file upload
- **Multi-format support** (PDF, DOCX, TXT, MD)
- **Real-time processing status** with progress indicators
- **Document library** with search and filtering

### ✅ UI/UX
- **Dark mode** support
- **Responsive design** (mobile, tablet, desktop)
- **Collapsible sidebar** for more screen space
- **Custom scrollbars** and animations
- **Accessible components**

---

## 📦 Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Axios** for API calls
- **React Markdown** for message rendering
- **Lucide React** for icons
- **date-fns** for date formatting

---

## 🛠️ Installation

### 1. Install Dependencies

```bash
cd apps/frontend
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# App Configuration
NEXT_PUBLIC_APP_NAME=ECOS
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Development Server

```bash
npm run dev
```

The frontend will be available at **http://localhost:3000**

---

## 📁 Project Structure

```
apps/frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── dashboard/page.tsx        # Main dashboard
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   └── page.tsx                  # Home (redirects to dashboard)
│
├── components/                   # React components
│   ├── ChatWindow.tsx            # Main chat interface with streaming
│   ├── AgentSelector.tsx         # Agent selection grid
│   ├── ConversationHistory.tsx   # Sidebar with conversation list
│   └── DocumentUploader.tsx      # File upload and document management
│
├── lib/                          # Utilities and services
│   ├── api-client.ts             # API service with auth handling
│   └── store.ts                  # Zustand state management
│
├── public/                       # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## 🎯 Key Components

### ChatWindow Component
**File**: `components/ChatWindow.tsx`

Features:
- Streaming message responses
- Markdown rendering for assistant messages
- Auto-resizing textarea
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Message animations
- Typing indicators

### AgentSelector Component
**File**: `components/AgentSelector.tsx`

Features:
- Visual grid of 6 ECOS agents
- Icon, name, and description for each agent
- Active state highlighting
- Creates new conversation on agent switch

### ConversationHistory Component
**File**: `components/ConversationHistory.tsx`

Features:
- Lists conversations per agent
- Shows message count and last updated
- Delete conversation functionality
- New conversation button
- Sorts by most recent

### DocumentUploader Component
**File**: `components/DocumentUploader.tsx`

Features:
- Drag-and-drop zone
- File type validation (PDF, DOCX, TXT, MD)
- Size validation (10MB max)
- Upload progress tracking
- Processing status indicators
- Document deletion

---

## 🔌 API Integration

### API Client Service
**File**: `lib/api-client.ts`

The `apiClient` provides methods for:

**Authentication**:
- `register(data)` - Create new account
- `login(email, password)` - Sign in
- `logout()` - Sign out
- `verifyEmail(token)` - Verify email address
- `getCurrentUser()` - Get logged-in user

**Chat**:
- `sendMessage(agentId, message)` - Send message (non-streaming)
- `streamMessage(agentId, message)` - Send message (streaming)
- `getConversationHistory(agentId)` - Get past messages

**Documents**:
- `uploadDocument(file, agentId)` - Upload file
- `listDocuments(agentId)` - Get document list
- `deleteDocument(documentId)` - Delete document
- `getDocumentStatus(documentId)` - Check processing status

**Token Management**:
- Automatically adds JWT to request headers
- Refreshes tokens on 401 responses
- Redirects to login on auth failure

---

## 🗂️ State Management

### Zustand Store
**File**: `lib/store.ts`

**State Sections**:

1. **User State**
   - `user` - Current user object
   - `isAuthenticated` - Auth status
   - `setUser()` / `clearUser()`

2. **Agent State**
   - `currentAgent` - Selected agent ID
   - `setCurrentAgent()`

3. **Conversation State**
   - `conversations` - All conversations (by ID)
   - `currentConversationId` - Active conversation
   - `addMessage()` - Add message to conversation
   - `createConversation()` - Start new conversation
   - `getConversationsByAgent()` - Filter by agent

4. **Document State**
   - `documents` - Uploaded documents
   - `setDocuments()` / `addDocument()` / `updateDocument()`

5. **UI State**
   - `isSidebarOpen` - Sidebar visibility
   - `toggleSidebar()`
   - `isStreamingResponse` - Loading state

**Persistence**:
- User, conversations, and UI state persist to localStorage
- Automatically rehydrates on page load

---

## 🎨 Styling

### Tailwind Configuration
**File**: `tailwind.config.ts`

Custom colors:
- `ecos-primary`: #2563eb (Blue)
- `ecos-secondary`: #7c3aed (Purple)
- `ecos-accent`: #0ea5e9 (Sky)

### Global Styles
**File**: `app/globals.css`

Includes:
- Dark mode support
- Custom scrollbars
- Message animations (fadeIn)
- Typing indicator animations
- Responsive utilities

---

## 🔒 Authentication Flow

1. **Registration**:
   - User submits registration form
   - Backend creates account
   - Verification email sent
   - Redirects to "Check Your Email" screen

2. **Email Verification**:
   - User clicks link in email
   - Backend verifies token
   - Account activated

3. **Login**:
   - User submits credentials
   - Backend returns access + refresh tokens
   - Access token stored in localStorage
   - User object stored in Zustand

4. **Authenticated Requests**:
   - Access token added to headers automatically
   - 401 responses trigger token refresh
   - Failed refresh redirects to login

5. **Logout**:
   - Backend invalidates session
   - Tokens cleared from localStorage
   - Zustand state reset

---

## 📱 Responsive Design

**Breakpoints** (Tailwind defaults):
- `sm`: 640px (tablet)
- `md`: 768px (small desktop)
- `lg`: 1024px (desktop)
- `xl`: 1280px (large desktop)

**Mobile Optimizations**:
- Agent selector grid: 2 columns on mobile, 6 on desktop
- Sidebar: Collapsible on mobile
- Document panel: Slides over on mobile
- Hamburger menu for user dropdown

---

## 🚦 Development Workflow

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Lint Code
```bash
npm run lint
```

---

## 🐛 Troubleshooting

### "API request failed"
- Ensure backend is running on http://localhost:3001
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- Verify CORS is enabled in backend

### "Token expired"
- Token refresh should happen automatically
- If persistent, clear localStorage and re-login
- Check backend `/api/auth/refresh` endpoint

### "Document upload stuck at 'processing'"
- Check backend logs for processing errors
- Verify Redis is running (required for queue processing)
- Ensure file format is supported (PDF, DOCX, TXT, MD)

### "Dark mode not working"
- Browser must support `prefers-color-scheme` media query
- Check system theme settings
- Try toggling system dark mode

---

## 🔮 Future Enhancements

- [ ] Dark mode toggle (currently follows system preference)
- [ ] Conversation search and filtering
- [ ] Export conversation as PDF/TXT
- [ ] Voice input for messages
- [ ] Agent performance analytics
- [ ] Multi-language support
- [ ] Collaborative features (share conversations)
- [ ] Mobile app (React Native)

---

## 📄 License

Part of the ECOS project. See root LICENSE file.

---

## 🤝 Contributing

This is the frontend for ECOS. See main project README for contribution guidelines.

---

**Version**: 1.0.0
**Last Updated**: October 2025
**Status**: ✅ Production Ready
