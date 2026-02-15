# Personaliz Desktop Assistant

A production-style MVP desktop web app wrapper for OpenClaw-like automations, built for non-technical users.

It includes:

- Chat assistant (normal + stream)
- Voice assistant (record → STT → chat → browser TTS)
- Agent management (create/list/toggle/run-now)
- Agent template gallery (one-click create)
- Analytics dashboard with charts
- News scout + article crawl/extract
- System logs + run logs
- Floating assistant popup + Assistant page tab
- Premium purple-white gradient glassmorphism UI

---

## Tech Stack

### Backend
- Django 5
- Django REST Framework
- django-cors-headers
- SQLite (MVP)
- APScheduler (service placeholder)
- Requests + BeautifulSoup + feedparser
- Groq API (chat + STT via REST)

### Frontend
- React 18 + TypeScript
- Vite
- Axios
- Framer Motion
- GSAP
- Recharts

---

## Features

- **Settings**
  - Save Groq key (secure response with `has_key`, key never re-exposed)
  - Select model from catalog
  - Set default sandbox mode
- **Assistant**
  - Stream + non-stream chat
  - Quick actions for setup/templates
  - Voice flow: MediaRecorder → `/stt` → `/chat` → speechSynthesis
  - News search + URL text extraction
  - Status tab for settings/catalog snapshot
- **Agents**
  - Create manual agents
  - Create from template
  - Create from chat prompt
  - Toggle active/sandbox
  - Run now (logs run + webhook flow)
- **Analytics**
  - Trend line by day
  - Status totals bar chart
  - 7/14/30-day filters
- **Logs**
  - Run logs
  - System logs

---

## Project Structure

```txt
personaliz-desktop/
  README.md
  .gitignore
  backend/
    manage.py
    requirements.txt
    .env.example
    core/
      settings.py
      urls.py
      asgi.py
      wsgi.py
    app/
      models.py
      serializers.py
      urls.py
      views.py
      migrations/
      services/
        groq_client.py
        stt_service.py
        news_service.py
        make_service.py
        scheduler_service.py
        openclaw_bridge.py
        agent_translator.py
  desktop/
    package.json
    .env.example
    src/
      App.tsx
      components/AssistantPanel.tsx
      pages/
      lib/api.ts
      hooks/useTheme.ts
      styles/theme.css
  docs/
    ARCHITECTURE.md
    API.md
    DEMO_FLOW.md
    TROUBLESHOOTING.md
