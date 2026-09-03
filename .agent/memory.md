# ARCHITECTURE DECISIONS & PROJECT MEMORY

> File này là **nguồn sự thật duy nhất** (Single Source of Truth) về kiến trúc dự án.
> Agent PHẢI nạp file này trước khi viết code cho bất kỳ task nào.

## 1. Stack cố định (KHÔNG được tự ý thay đổi)

### Frontend (`/frontend`)
- **Framework**: React 19 + TypeScript 6 (Strict mode via `tsc -b`)
- **Styling**: Tailwind CSS 4 + shadcn/ui (Base UI)
- **State Management**: Zustand (client state only)
- **Routing**: React Router DOM v7
- **Form**: React Hook Form + Zod validation
- **Realtime**: Socket.IO Client
- **HTTP Client**: Axios (custom instance tại `src/lib/axios-client.ts`)
- **Build Tool**: Vite 8
- **Testing**: Vitest + @vitest/coverage-v8
- **Linting**: ESLint 10 (flat config) + typescript-eslint

### Backend (`/backend`)
- **Runtime**: Node.js + TypeScript 7
- **Framework**: Express 5
- **Realtime**: Socket.IO
- **Database**: MongoDB (via Mongoose 9) — KHÔNG phải PostgreSQL, KHÔNG phải Prisma
- **Auth**: Passport.js + passport-jwt + jsonwebtoken (JWT strategy)
- **Validation**: Zod
- **AI Integration**: Vercel AI SDK + @ai-sdk/google (Gemini)
- **File Upload**: Cloudinary
- **Security**: Helmet, CORS, express-rate-limit
- **Dev Tool**: tsx (watch mode)

## 2. Cấu trúc thư mục (Directory Conventions)

```text
backend/src/
├── @types/          # Custom type declarations
├── config/          # App configuration (env, cloudinary, etc.)
├── controllers/     # Route handlers (thin — delegate to services)
├── lib/             # Shared libraries & utilities
├── middlewares/     # Express middlewares (auth, error handler)
├── models/          # Mongoose schemas & models
├── routes/          # Express route definitions
├── script/          # One-off scripts (seed, migration)
├── services/        # Business logic layer
├── utils/           # Pure utility functions
└── validators/      # Zod schemas for request validation

frontend/src/
├── assets/          # Static images, icons
├── components/      # Reusable UI components
│   ├── call/        # WebRTC call components
│   ├── conversation/# Chat conversation components
│   ├── logo/        # Branding
│   └── ui/          # shadcn/ui primitives (DO NOT manually edit)
├── config/          # Frontend config constants
├── constants/       # App-wide constants & enums
├── hooks/           # Custom React hooks
├── layouts/         # Page layout wrappers
├── lib/             # Axios client, utils
├── pages/           # Route-level page components
├── routes/          # Route definitions
├── stores/          # Zustand stores (sliced pattern)
├── types/           # Shared TypeScript types
└── validators/      # Zod schemas (shared with backend khi cần)
```

## 3. Quy tắc kiến trúc bất biến (Invariant Rules)

### State Management
- **KHÔNG** lưu server state (API response cache) trong Zustand.
- Zustand chỉ cho client state: UI flags, theme, current user session.
- Data fetching dùng custom hooks (`src/hooks/use-*.ts`).

### Realtime (Socket.IO)
- Mọi socket event listener PHẢI có cleanup function khi component unmount.
- Socket connection được quản lý tập trung, KHÔNG tạo connection mới trong component.

### Validation
- 100% request body / socket payload PHẢI parse qua Zod schema trước khi vào Controller/Service.
- Frontend form validation dùng `@hookform/resolvers` + Zod.

### TypeScript
- KHÔNG dùng `any`.
- KHÔNG dùng `as unknown as T` trừ khi tương tác với thư viện third-party không có type.
- Mọi function parameter và return type phải được khai báo tường minh.

### Database (MongoDB/Mongoose)
- ID dùng ObjectId mặc định của MongoDB.
- Index cho foreign key fields và các trường hay query/filter.
- Phân trang dùng cursor-based (sort by `_id` hoặc `createdAt`), KHÔNG dùng `skip()` với offset lớn.

### Security
- KHÔNG render HTML/Markdown thô từ user input mà không sanitize.
- KHÔNG ghép chuỗi vào query — luôn dùng Mongoose query builder.
- Rate limiting đã cấu hình via `express-rate-limit`.

## 4. Package Manager & Setup

- **Toàn dự án (Root, Frontend, Backend)**: Thống nhất 100% sử dụng **Yarn 1 (classic)** với `yarn.lock`.
- **Onboarding / Setup**: Khi clone dự án mới, bắt buộc chạy `yarn install` ở root để cài đặt tooling và kích hoạt Husky git hooks:
  ```bash
  yarn install              # Cài tooling root & kích hoạt Husky hooks
  yarn --cwd frontend install
  yarn --cwd backend install
  # hoặc dùng lệnh tổng hợp:
  yarn install:all
  ```
- Root quản lý Git tooling (Husky, lint-staged, commitlint).
- Frontend & Backend quản lý dependencies ứng dụng riêng biệt.
- **KHÔNG** sử dụng `npm` hoặc tạo file `package-lock.json`.

## 5. Harness Scripts (Verify Pipeline)

```bash
# Frontend — chạy từ /frontend
yarn run verify    # = type-check → lint → test:fast

# Các lệnh con:
yarn run type-check      # tsc -b (project build mode traversing tsconfig references)
yarn run lint            # eslint . --cache --max-warnings=0
yarn run test:fast       # vitest run --changed
yarn run test:coverage   # vitest run --coverage
```
