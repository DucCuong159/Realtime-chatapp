# 🤝 Contributing to Realtime Chat App

First off, thank you for considering contributing to **Realtime Chat App**! It's people like you that make open-source software such a great tool for everyone.

Following these guidelines helps to communicate that you respect the time of the developers managing and developing this open source project. In return, they should reciprocate that respect in addressing your issue or assessing patches and features.

---

## 📖 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [How Can I Contribute?](#-how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Development Setup](#-development-setup)
- [Branching Strategy](#-branching-strategy)
- [Git Commit Guidelines](#-git-commit-guidelines)
- [Code Style & Best Practices](#-code-style--best-practices)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by a welcoming, inclusive, and harassment-free standard. By participating, you are expected to uphold this standard.

---

## 🛠 How Can I Contribute?

### Reporting Bugs
Before creating bug reports, please check existing issues to ensure the bug hasn't already been reported.

When creating a bug report using our [Bug Report Template](https://github.com/DucCuong159/Realtime-chatapp/issues/new?template=bug_report.yml), please include:
- A clear, descriptive title.
- Step-by-step instructions to reproduce the problem.
- Expected vs. actual behavior.
- Screenshots, console error logs, or network payloads if applicable.

### Suggesting Enhancements
Enhancement suggestions are tracked as GitHub Issues. Use our [Feature Request Template](https://github.com/DucCuong159/Realtime-chatapp/issues/new?template=feature_request.yml) or [Improvement & Refactor Template](https://github.com/DucCuong159/Realtime-chatapp/issues/new?template=improvement.yml).

### Pull Requests
1. Fork the repository and create your branch from `main`.
2. Ensure dependencies are installed and builds pass without errors.
3. Keep changes focused and minimal—avoid combining multiple unrelated changes in a single PR.
4. Link any related issues using `Closes #<issue-number>` in your PR description.

---

## 💻 Development Setup

1. **Clone your fork:**
   ```bash
   git clone https://github.com/DucCuong159/Realtime-chatapp.git
   cd Realtime-chatapp
   ```

2. **Install dependencies:**
   ```bash
   # Install frontend dependencies
   yarn --cwd frontend install

   # Install backend dependencies
   yarn --cwd backend install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `backend/.env` and `frontend/.env` with your development credentials.

4. **Seed Gemini AI profile:**
   ```bash
   yarn --cwd backend run seed:ai
   ```

5. **Start development servers:**
   ```bash
   # Terminal 1 - Backend (Port 8080)
   yarn --cwd backend dev

   # Terminal 2 - Frontend (Port 5173)
   yarn --cwd frontend dev
   ```

---

## 🌿 Branching Strategy

Always create a descriptive branch name adhering to the following prefixes:

| Branch Prefix | Purpose | Example |
| :--- | :--- | :--- |
| `feat/` | New user-facing feature | `feat/emoji-reactions` |
| `fix/` | Bug fix | `fix/streaming-placeholder-timeout` |
| `refactor/` | Code refactoring / performance optimization | `refactor/socket-event-handlers` |
| `docs/` | Documentation changes | `docs/update-api-reference` |
| `chore/` | Maintenance, dependencies, or tooling | `chore/update-dependencies` |
| `ci/` | GitHub Actions / CI/CD pipeline | `ci/add-lint-workflow` |

---

## 📝 Git Commit Guidelines

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification for structured, human- and machine-readable commit history:

```text
<type>(<scope>): <short description>
```

### Types:
- **`feat`**: A new feature (e.g., `feat(conversation): add message reaction bar`)
- **`fix`**: A bug fix (e.g., `fix(socket): prevent duplicate online status emit`)
- **`refactor`**: Code change that neither fixes a bug nor adds a feature (e.g., `refactor(auth): simplify passport strategy`)
- **`security`**: Security patches (e.g., `security(backend): configure strict CSP in Helmet`)
- **`docs`**: Documentation only (e.g., `docs: update deployment instructions in README`)
- **`chore`**: Maintenance or tooling updates (e.g., `chore(deps): upgrade vite to v8.2.0`)
- **`ci`**: CI/CD configuration (e.g., `ci: configure CodeRabbit review triggers`)

---

## 🎨 Code Style & Best Practices

- **TypeScript**: Use strict types; avoid `any`. Define interfaces in `src/types/`.
- **React 19**: Use functional components with hooks, Zustand stores for global state, and Base UI / Radix primitives.
- **Styling**: Use Tailwind CSS v4 utility classes. Keep styles modular.
- **Validation**: Validate all incoming API payloads and forms using **Zod**.
- **Verification**: Run local builds before committing:
  ```bash
  yarn --cwd frontend build && yarn --cwd backend build
  ```

---

Thank you for contributing to Realtime Chat App! 🚀
