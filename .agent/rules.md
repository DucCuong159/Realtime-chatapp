# UNIVERSAL AI AGENT EXECUTION POLICY & SKILL ROUTING

## 1. NGUYÊN TẮC THỰC THI TỰ ĐỘNG (AUTONOMOUS DIRECTIVE)

- **Tự động đối chiếu kỹ năng (Auto-Discovery)**: Trước khi phân tích, viết code, tối ưu hoặc review, bạn PHẢI tự động quét danh mục kỹ năng tại `.agent/skills/` để tìm các chuẩn mực liên quan.
- **Không yêu cầu người dùng nhắc**: Tuyệt đối không chờ người dùng gõ `@skill` hay nhắc nhở tên quy tắc. Hãy chủ động dùng tool đọc file để nạp file `SKILL.md` hoặc rule con liên quan vào ngữ cảnh làm việc.
- **Nguyên tắc Progressive Disclosure**:
  - KHÔNG nạp toàn bộ thư mục `.agent/skills/` cùng lúc (bảo vệ Context Window).
  - Chỉ mở đúng file `SKILL.md` hoặc rule nguyên tử thuộc domain đang thao tác.
- **Nguồn sự thật kiến trúc**: Nạp file `.agent/memory.md` trước tiên để nắm chuẩn xác tech stack và quyết định kiến trúc bất biến.

---

## 2. QUY TRÌNH LÀM VIỆC CHUẨN (STANDARD OPERATING PROCEDURE - SOP)

Mỗi khi nhận một yêu cầu từ người dùng, hãy tuân thủ 4 bước:

1. **Phân tích yêu cầu (Context Analysis)**: Đọc `.agent/memory.md`, xác định module chịu tác động (Frontend / Backend / Socket / Database / AI).
2. **Nạp kỹ năng ngầm (Silent Skill Retrieval)**: Tra cứu bảng định tuyến ở Mục 3, mở file `SKILL.md` tương ứng trong `.agent/skills/`.
3. **Thực thi chính xác (Strict Implementation)**: Với task sửa từ 2 file trở lên, xuất Implementation Plan ngắn gọn (3-4 gạch đầu dòng) trước khi code. Tuân thủ TDD khi thêm tính năng mới hoặc sửa bug.
4. **Kiểm tra tiêu chuẩn đầu ra qua Harness (Self-Verification)**: Chạy `yarn run verify` trong `frontend/` (hoặc test tương ứng ở `backend/`), tự sửa lỗi cho đến khi pass toàn bộ.

---

## 3. BẢN ĐỒ ĐỊNH TUYẾN KỸ NĂNG (UNIVERSAL SKILL ROUTING MATRIX)

*Toàn bộ kỹ năng dưới đây đều tồn tại thực tế tại thư mục `.agent/skills/`.*

### A. Frontend, UI & Web Performance
- **React Standards & Conventions**: `.agent/skills/react-best-practices/`
- **UI Architecture & Component Patterns**: `.agent/skills/react-patterns/`
- **Tối ưu Render, Virtualization & Tránh Re-render**: `.agent/skills/react-component-performance/`
- **Tailwind CSS & Design System**: `.agent/skills/tailwind-design-system/`, `.agent/skills/tailwind-patterns/`
- **shadcn/ui Primitives & Styling**: `.agent/skills/shadcn/`
- **Web Vitals & Tối ưu Bundle/Tải trang**: `.agent/skills/web-performance-optimization/`, `.agent/skills/frontend-lighthouse/`

### B. State Management, Data Flow & Realtime
- **Client State (Zustand)**: `.agent/skills/zustand-store-ts/`, `.agent/skills/react-state-management/`
- **Realtime / WebSockets (Socket.IO)**: `.agent/skills/websocket-socketio-patterns/`
- **Optimistic Mutations (Cập nhật giao diện tức thì)**: `.agent/skills/frontend-optimistic-mutations/`
- **Server Cache & Async State**: `.agent/skills/tanstack-query-expert/`
- **Validation & Parsing Schema**: `.agent/skills/zod-validation-expert/`

### C. TypeScript & Type Safety
- **Strict Typing & Quy chuẩn TypeScript**: `.agent/skills/typescript-expert/`
- **Kiểu dữ liệu nâng cao (Generics, Discriminated Unions)**: `.agent/skills/typescript-advanced-types/`

### D. Backend, API, Realtime & Auth
- **Domain Architecture & Design**: `.agent/skills/domain-driven-design/`
- **Socket.IO Realtime Patterns**: `.agent/skills/websocket-socketio-patterns/`
- **Xác thực JWT & Bảo mật Auth**: `.agent/skills/jwt-auth-security/`
- **Upload File & Xử lý Media (Cloudinary)**: `.agent/skills/file-uploads/`
- **Hàng đợi & Tác vụ nền (Queues/Jobs)**: `.agent/skills/bullmq-specialist/`
- **API Spec & Contracts**: `.agent/skills/openapi-spec-generator/`, `.agent/skills/api-documentation-generator/`

### E. AI Features & LLM Integration
- **LLM Application Patterns & Streaming**: `.agent/skills/llm-app-patterns/`
- **Prompt Engineering**: `.agent/skills/prompt-engineering/`
- **RAG & Context Retrieval**: `.agent/skills/rag-implementation/`

### F. Database, MongoDB & Caching
- **MongoDB & Mongoose Best Practices**: `.agent/skills/mongodb-mongoose-patterns/`
- **Thiết kế Database Schema**: `.agent/skills/database-design/`
- **Tối ưu Index & Query Profiling**: `.agent/skills/database-optimizer/`
- **Database Migration & Data Scripts**: `.agent/skills/database-migration/`

### G. Kiểm thử, Giám sát & Gỡ lỗi (Testing & Observability)
- **Unit & Integration Testing (Vitest)**: `.agent/skills/vitest-skill/`
- **End-to-End Browser Testing (Playwright)**: `.agent/skills/playwright-skill/`
- **Gỡ lỗi & Phân tích nguyên nhân gốc rễ (RCA)**: `.agent/skills/systematic-debugging/`
- **Kiểm thử tải (Stress / Load Test với k6)**: `.agent/skills/k6-load-testing/`
- **Profiling hiệu năng & Phân tích Memory Leak**: `.agent/skills/performance-profiling/`, `.agent/skills/performance-engineer/`, `.agent/skills/performance-optimization/`
- **Error Tracking & Telemetry (Sentry)**: `.agent/skills/sentry-automation/`, `.agent/skills/frontend-observability/`

### H. An ninh & Bảo mật Web (Security & Hardening)
- **Chống XSS / HTML Injection & Sanitization**: `.agent/skills/xss-html-injection/`
- **Kiểm thử & Rà soát an ninh ứng dụng Web**: `.agent/skills/web-security-testing/`

### I. Quy chuẩn Mã nguồn, CI/CD & DevOps
- **Clean Code & Review Gate**: `.agent/skills/clean-code/`, `.agent/skills/code-review-checklist/`
- **Git Flow, Conventional Commits & Versioning**: `.agent/skills/git-workflow-and-versioning/`, `.agent/skills/changelog-automation/`
- **Cấu hình Pipeline CI/CD**: `.agent/skills/github-actions-templates/`
- **Containerization (Docker)**: `.agent/skills/docker-containerization/`
- **Triển khai ứng dụng (Deployments)**: `.agent/skills/deploy-to-vercel/`, `.agent/skills/render-automation/`, `.agent/skills/vercel-deployment/`
- **Ghi nhận quyết định kiến trúc (ADR)**: `.agent/skills/architecture-decision-records/`

---

## 4. CÁC NGUYÊN TẮC KỸ THUẬT BẤT BIẾN (INVARIANT GUARDRAILS)

> Chi tiết kỹ thuật đầy đủ được lưu tại `.agent/memory.md`. Dưới đây là 6 rào chắn bắt buộc:

1. **Type Safety tuyệt đối**: Không dùng `any`, không dùng `as unknown as T` (trừ third-party không type). Khai báo rõ interface/types cho mọi request/response/socket payload.
2. **Zero Memory Leak (Realtime & Subscriptions)**: Mọi WebSocket listener, DOM Event Listener, Timer (`setTimeout`, `setInterval`) bắt buộc phải có cleanup khi component unmount.
3. **Validation Gate 100%**: Tất cả request body, query params và socket events đều phải validate qua Zod schemas trước khi vào Service/Controller.
4. **Hiệu năng & Virtualization**: Dùng Virtual List khi render danh sách dài (>50 messages/items). Phân trang bằng con trỏ (Cursor-based) qua `_id`/`createdAt`, không dùng `skip()` lớn trong MongoDB.
5. **Khử trùng dữ liệu hiển thị (Sanitization)**: Tuyệt đối không render chuỗi HTML/Markdown thô từ user mà không qua bộ lọc an toàn (DOMPurify).
6. **Triết lý Ponytail (Chống Over-Engineering & Thang quyết định 7 bậc)**:
   *Trước khi viết thêm bất kỳ dòng code, hàm mới hay cài thêm package nào, BẮT BUỘC tự vấn theo thứ tự:*
   - **Bậc 1 (YAGNI):** Đoạn code này có thực sự cần cho spec hiện tại không? Nếu chỉ là "đề phòng tương lai", HÃY BỎ QUA.
   - **Bậc 2 (Reuse):** Codebase hiện tại đã có hàm/component này chưa? (Tìm kiếm kỹ trước khi tạo mới).
   - **Bậc 3 (Native First):** JavaScript / TypeScript / Web API native có sẵn không? (Ưu tiên native thay vì thư viện ngoài).
   - **Bậc 4 (Existing Dependencies):** Thư viện đã cài (`date-fns`, `zustand`, `lucide-react`...) có giải quyết được không? **TUYỆT ĐỐI KHÔNG tự ý cài thêm npm package mới** khi chưa có yêu cầu từ người dùng.
   - **Bậc 5 (Keep It Short):** Có thể viết gọn gàng, sáng sủa trong vài dòng thay vì bọc nhiều tầng abstraction không?
   - **Bậc 6 (Minimal Code):** Chỉ viết lượng code tối thiểu vừa đủ để thỏa mãn test case và acceptance criteria.
   - **Bậc 7 (No Premature Complexity):** Không tạo generics phức tạp, không dynamic factory pattern khi bài toán chỉ có 1 trường hợp cụ thể.

---

## 5. CHECKLIST ĐỊNH NGHĨA HOÀN THÀNH (DEFINITION OF DONE)

Trước khi kết thúc bất kỳ tác vụ nào, tự động xác nhận các mục sau:

- [ ] **Type-check**: Mã nguồn biên dịch sạch sẽ, không có lỗi (`tsc -b`).
- [ ] **Clean Code**: Không còn `console.log` debug, biến rác, imports thừa hoặc code chết.
- [ ] **Testing**: Đã bổ sung / cập nhật test case (Unit/Integration) và pass toàn bộ.
- [ ] **Memory & Cleanup**: Đã dọn dẹp đầy đủ event listeners, timers, subscriptions.
- [ ] **Security**: Đã validate schema đầu vào và kiểm soát các nguy cơ XSS, IDOR.
- [ ] **Performance**: Đã kiểm tra re-render, ảo hóa danh sách lớn và đánh index database tương ứng.
- [ ] **Git Message**: Tuân thủ chuẩn Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `perf:`, `chore:`).

---

## 6. HARNESS PROTOCOL & VERIFICATION LOOP

> Đây là **quy trình bắt buộc** để Agent hoạt động đáng tin cậy ở Level 3 (Autonomous).
> Mọi vi phạm sẽ bị Husky pre-commit hook chặn lại.

### 6.1 Nguyên tắc Nghiên cứu trước (Research-First)

- **Trước mọi task**, nạp file `.agent/memory.md` để nắm tech stack & kiến trúc.
- Đối với task sửa **từ 2 file trở lên**: Phải nạp thêm 1 skill liên quan từ `.agent/skills/`, sau đó xuất ra **Kế hoạch triển khai (Implementation Plan)** ngắn gọn 3-4 gạch đầu dòng trước khi viết code.
- Đối với task đơn giản (1 file, < 20 dòng): Có thể bỏ qua bước lập kế hoạch, nhưng vẫn phải nạp `memory.md`.

### 6.2 Kỷ luật Test-Driven Development (TDD)

- Khi **thêm tính năng mới** hoặc **sửa bug**: Bắt buộc viết file `*.test.ts` mô tả hành vi đúng **TRƯỚC**.
- Chạy test thấy **FAIL** → rồi mới viết mã nguồn thực thi → chạy lại thấy **PASS**.
- File test đặt cạnh file source: `foo.ts` → `foo.test.ts` (cùng thư mục).

### 6.3 Vòng lặp tự kiểm tra (Automated Self-Correction Loop)

Sau khi viết xong code, **BẮT BUỘC** chạy:

```bash
cd frontend && yarn run verify
```

Nếu lệnh trả về exit code ≠ 0:
1. Đọc kỹ stack trace / error output.
2. Phân tích nguyên nhân gốc rễ (root cause).
3. Sửa trực tiếp tại **implementation code** (KHÔNG phải test code).
4. Chạy lại `yarn run verify` cho đến khi exit code = 0.

Số lần retry tối đa: **3 vòng**. Nếu sau 3 vòng vẫn fail → dừng lại, báo cáo lỗi cho người dùng kèm stack trace.

### 6.4 Quy tắc chống gian lận (Anti-Tampering)

**TUYỆT ĐỐI KHÔNG** được thực hiện các hành vi sau để làm test pass giả tạo:
- ❌ Sửa logic hoặc assertion trong file test (`expect()`, `toEqual()`, `toBe()`...).
- ❌ Thêm `.skip()`, `.todo()`, hoặc `xit()` vào test case đang fail.
- ❌ Chèn `/* eslint-disable */`, `// @ts-ignore`, `// @ts-expect-error` để tắt lỗi.
- ❌ Xóa hoặc comment out test case.
- ❌ Hạ thấp ngưỡng ESLint rule (ví dụ: tăng `max-lines-per-function` chỉ để pass).

**CHỈ ĐƯỢC PHÉP** sửa test khi:
- ✅ Requirement thay đổi (người dùng yêu cầu rõ ràng).
- ✅ Test case viết sai logic so với spec ban đầu.

### 6.5 Git Delivery (Conventional Commits)

Khi `yarn run verify` thành công, tạo commit theo chuẩn:

```
<type>(<scope>): <mô tả ngắn>

<body — giải thích why, không phải what>
```

**Các type hợp lệ:**
| Type | Khi nào dùng |
|------|-------------|
| `feat` | Thêm tính năng mới |
| `fix` | Sửa bug |
| `refactor` | Cải thiện code mà không thay đổi behavior |
| `perf` | Tối ưu hiệu năng |
| `test` | Thêm / sửa test |
| `chore` | Cập nhật tooling, config, dependencies |
| `docs` | Cập nhật tài liệu |

**Scope** = tên module bị ảnh hưởng: `auth`, `chat`, `call`, `ui`, `api`, `socket`, `db`.

Ví dụ:
```
feat(chat): add message read receipts with socket broadcast
fix(auth): prevent token refresh race condition on concurrent requests
refactor(call): extract WebRTC peer connection into dedicated hook
```
