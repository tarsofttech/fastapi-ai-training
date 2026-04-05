# Rebuild Instructions - CSS and Chat Fixes

## What Was Fixed

### ✅ Phase 1: Tailwind CSS Configuration
- Created `tailwind.config.js` for both frontends
- Created `postcss.config.js` for both frontends
- Added `.dockerignore` files to optimize builds

### ✅ Phase 2: Chat Streaming Improvements
- Updated CORS to include Docker network origins
- Added proper SSE headers to streaming responses
- Enhanced nginx configs for SSE support (disabled buffering)
- Added error handling and logging for Ollama connection issues

### ✅ Phase 3: Docker Optimization
- Created `.dockerignore` files to exclude node_modules and build artifacts

## How to Rebuild and Test

### Step 1: Stop Current Containers
```bash
cd /Users/aqiliman/Developer/tarsoft/AI-training_april_2026/chatbot-rag-poc
docker-compose down
```

### Step 2: Rebuild All Containers
```bash
docker-compose up --build
```

This will:
- Rebuild frontend-user with Tailwind CSS properly configured
- Rebuild frontend-admin with Tailwind CSS properly configured
- Rebuild backend with updated CORS and SSE headers

### Step 3: Verify Ollama is Running (IMPORTANT!)

The chat functionality requires Ollama to be running on your host machine:

```bash
# Check if Ollama is running
ollama list

# If not installed, install Ollama from https://ollama.ai

# Pull the required model
ollama pull llama3.2:1b

# Pull the embedding model
ollama pull nomic-embed-text
```

### Step 4: Test the Applications

**User App (http://localhost:3000):**
1. Login with your user credentials
2. Check that the dark theme loads properly (gradients, colors, icons)
3. Send a test message in the chat
4. Verify AI responds with streaming text
5. Check browser console for any errors

**Admin App (http://localhost:3001):**
1. Login with admin credentials (admin@company.com / Admin1234!)
2. Check that the CRM-style UI loads (stats cards, tables)
3. Navigate to Users and Documents pages
4. Verify all styling is correct

## Troubleshooting

### CSS Still Not Loading
- Check browser console for 404 errors on CSS files
- Verify the build completed successfully in Docker logs
- Try hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

### Chat Not Working
Check the backend logs for Ollama connection errors:
```bash
docker-compose logs backend | grep ERROR
```

Common issues:
- **"Cannot connect to Ollama"**: Ollama is not running on host
- **"Timeout"**: Ollama is slow or model not pulled
- **"Model not found"**: Run `ollama pull llama3.2:1b`

### Verify Ollama Connectivity from Docker
```bash
# Enter the backend container
docker-compose exec backend sh

# Test Ollama connection
curl http://host.docker.internal:11434/api/tags

# Should return JSON with available models
```

## Expected Results

### ✅ User App Should Show:
- Dark gradient login page with glassmorphism
- Dark chat interface (gray-950 background)
- Emerald/teal gradient buttons
- Avatar-based message bubbles
- Smooth animations
- Streaming AI responses

### ✅ Admin App Should Show:
- Split-screen login with blue gradient
- Dark CRM dashboard (slate-900/950)
- Stats cards with icons
- Modern data tables
- Blue/indigo gradient accents
- Professional sidebar navigation

## Files Modified

### New Files Created:
- `frontend-user/tailwind.config.js`
- `frontend-user/postcss.config.js`
- `frontend-user/.dockerignore`
- `frontend-admin/tailwind.config.js`
- `frontend-admin/postcss.config.js`
- `frontend-admin/.dockerignore`

### Files Updated:
- `backend/main.py` - CORS configuration
- `backend/routers/chat.py` - SSE headers
- `backend/services/rag.py` - Error handling
- `frontend-user/nginx.conf` - SSE support
- `frontend-admin/nginx.conf` - SSE support

## Next Steps After Rebuild

1. **Test CSS Loading**: Visit both apps and verify styling
2. **Test Chat**: Send a message and wait for AI response
3. **Check Logs**: Monitor for any errors
4. **Upload Documents**: Test document upload in admin panel
5. **Test RAG**: Ask questions about uploaded documents

## Need Help?

If issues persist:
1. Check Docker logs: `docker-compose logs -f`
2. Check browser console (F12)
3. Verify Ollama is running: `ollama list`
4. Check network tab for failed requests
