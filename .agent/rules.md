# UNIVERSAL AI AGENT EXECUTION POLICY & SKILL ROUTING

## 1. NGUYÊN TẮC THỰC THI TỰ ĐỘNG (AUTONOMOUS DIRECTIVE)

- **Tự động đối chiếu kỹ năng (Auto-Discovery)**: Trước khi phân tích, viết code, tối ưu hoặc review, bạn PHẢI tự động quét danh mục kỹ năng tại `.agent/skills/` để tìm các chuẩn mực liên quan.
- **Không yêu cầu người dùng nhắc**: Tuyệt đối không chờ người dùng gõ `@skill` hay nhắc nhở tên quy tắc. Hãy chủ động dùng tool đọc file (`read_file`) để nạp file `SKILL.md` hoặc rule con liên quan vào ngữ cảnh làm việc.
- **Nguyên tắc Progressive Disclosure**:
  - KHÔNG nạp toàn bộ thư mục `.agent/skills/` cùng lúc (để bảo vệ Context Window và bộ nhớ RAM).
  - Chỉ mở đúng file `SKILL.md` hoặc rule nguyên tử thuộc domain đang thao tác.

---

## 2. QUY TRÌNH LÀM VIỆC CHUẨN (STANDARD OPERATING PROCEDURE - SOP)

Mỗi khi nhận một yêu cầu từ người dùng, hãy tuân thủ 4 bước:

1. **Phân tích yêu cầu (Context Analysis)**: Xác định tech stack, domain bài toán (UI render, State, API, DB query, Auth, Security, Testing, hay Performance).
2. **Nạp kỹ năng ngầm (Silent Skill Retrieval)**: Tra cứu bảng định tuyến ở Mục 3, mở file `SKILL.md` tương ứng trong `.agent/skills/` để nắm vững tiêu chuẩn và ràng buộc.
3. **Thực thi chính xác (Strict Implementation)**: Viết mã nguồn/cấu hình bám sát 100% các design patterns và best practices đã định nghĩa trong skill.
4. **Kiểm tra tiêu chuẩn đầu ra (Self-Verification)**: Tự rà soát lại kết quả theo Bảng Checklist (Mục 5) trước khi bàn giao cho người dùng.

---

## 3. BẢN ĐỒ ĐỊNH TUYẾN KỸ NĂNG (UNIVERSAL SKILL ROUTING MATRIX)

Tự động tra cứu vào các thư mục tương ứng trong `.agent/skills/` khi gặp bài toán liên quan:

### A. Frontend, UI & Web Performance

- **React Standards & Component Conventions**: `.agent/skills/react-best-practices/`
- **UI Architecture & Component Patterns**: `.agent/skills/react-patterns/`
- **Tối ưu Render, Virtualization & Tránh Re-render**: `.agent/skills/react-component-performance/`
- **Web Vitals, Tối ưu Bundle & Tải trang**: `.agent/skills/web-performance-optimization/`, `.agent/skills/frontend-lighthouse/`

### B. State Management, Data Flow & Realtime

- **Global / Client State (Zustand, Redux, Context)**: `.agent/skills/zustand-store-ts/`, `.agent/skills/react-state-management/`
- **Realtime / Optimistic Updates (Cập nhật tức thì)**: `.agent/skills/frontend-optimistic-mutations/`
- **Server Cache, Async State & Phân trang**: `.agent/skills/tanstack-query-expert/`
- **Validation & Parsing Schema**: `.agent/skills/zod-validation-expert/`

### C. TypeScript & Type Safety

- **Strict Typing & Quy chuẩn TypeScript**: `.agent/skills/typescript-expert/`
- **Kiểu dữ liệu nâng cao (Generics, Discriminated Unions)**: `.agent/skills/typescript-advanced-types/`

### D. Backend, API & Asynchronous Jobs

- **Kiến trúc phân tầng Backend (Clean Architecture)**: `.agent/skills/backend-architect/`, `.agent/skills/backend-dev-guidelines/`, `.agent/skills/nodejs-best-practices/`
- **API Contract & Schemas**: `.agent/skills/openapi-spec-generator/`
- **Xác thực (Auth), JWT & Session Management**: `.agent/skills/auth-implementation-patterns/`, `.agent/skills/broken-authentication/`
- **Xử lý hàng đợi & Tác vụ nền (Background Jobs/Queues)**: `.agent/skills/bullmq-specialist/`
- **Upload File & Xử lý Media an toàn**: `.agent/skills/file-uploads/`

### E. Database, SQL, Indexing & Caching

- **SQL Nâng cao & Tối ưu Query**: `.agent/skills/sql-pro/`, `.agent/skills/sql-optimization-patterns/`, `.agent/skills/database-optimizer/`
- **PostgreSQL / MySQL Best Practices & Indexing**: `.agent/skills/postgresql/`, `.agent/skills/postgresql-optimization/`, `.agent/skills/postgres-best-practices/`
- **Thiết kế Schema & Migration không downtime**: `.agent/skills/database-design/`, `.agent/skills/database-migrations-sql-migrations/`, `.agent/skills/database-migration/`
- **ORM Guidelines**: `.agent/skills/prisma-expert/` (hoặc Drizzle ORM)
- **Redis Caching & Pub/Sub (Socket Scale)**: `.agent/skills/redis-cli/`

### F. Kỹ thuật Hiệu năng, Profiling & Kiểm thử tải (Performance & Load Testing)

- **Performance Profiling & Memory Analysis**: `.agent/skills/performance-profiling/`, `.agent/skills/performance-engineer/`
- **Kiểm thử tải & Chịu tải hệ thống (Stress / Load Test với k6)**: `.agent/skills/k6-load-testing/`
- **Tối ưu hóa thuật toán & Hiệu năng hệ thống**: `.agent/skills/performance-optimization/`

### G. An ninh & Bảo mật (Security & Hardening)

- **Chống XSS / HTML Injection**: `.agent/skills/xss-html-injection/`
- **Kiểm thử & Rà soát an ninh ứng dụng Web**: `.agent/skills/web-security-testing/`
- **Bảo mật Backend, Rate Limiting & Chống IDOR**: `.agent/skills/backend-security-coder/`, `.agent/skills/api-security-best-practices/`
- **Chống SQL Injection**: `.agent/skills/sql-injection-testing/`, `.agent/skills/sql-sentinel/`

### H. Kiểm thử & Đo lường (Testing & Observability)

- **Unit & Integration Testing**: `.agent/skills/vitest-skill/`
- **End-to-End (E2E) Browser Testing**: `.agent/skills/playwright-skill/`
- **Bắt lỗi tập trung & Telemetry (Sentry, Tracing)**: `.agent/skills/sentry-automation/`, `.agent/skills/frontend-observability/`
- **Gỡ lỗi & Phân tích nguyên nhân gốc rễ (RCA)**: `.agent/skills/systematic-debugging/`

### I. Quy chuẩn Mã nguồn, CI/CD & Tài liệu

- **Clean Code & Review Gate**: `.agent/skills/clean-code/`, `.agent/skills/code-review-checklist/`
- **Git Flow, Conventional Commits & Changelog**: `.agent/skills/git-workflow-and-versioning/`, `.agent/skills/changelog-automation/`
- **Cấu hình Pipeline CI/CD**: `.agent/skills/github-actions-templates/`
- **Containers (Docker) & Quản lý Secrets**: `.agent/skills/docker-expert/`, `.agent/skills/secrets-management/`
- **Ghi nhận quyết định kiến trúc (ADR)**: `.agent/skills/architecture-decision-records/`

---

## 4. CÁC NGUYÊN TẮC KỸ THUẬT BẤT DI BẤT DỊCH (CORE GUARDRAILS)

1. **Type Safety tuyệt đối**: Không sử dụng `any` hoặc ép kiểu tùy tiện (`as unknown as Type`). Mọi object dữ liệu phải có interface/type rõ ràng.
2. **Không để rò rỉ tài nguyên (Zero Memory Leak)**:
   - Mọi kết nối WebSocket, DOM Event Listener, Timer (`setTimeout`, `setInterval`) hoặc Subscription bắt buộc phải có logic Cleanup khi hủy (Unmount / Disconnect).
3. **Bảo mật đầu vào & Truy vấn**:
   - Không tin tưởng dữ liệu từ client: Parse qua Zod schema ở server.
   - Không render trực tiếp chuỗi HTML/Markdown thô từ người dùng: Luôn khử trùng (sanitize qua DOMPurify) trước khi hiển thị.
   - 100% sử dụng Parameterized Query hoặc ORM an toàn, không bao giờ ghép chuỗi SQL.
4. **Hiệu năng & Tối ưu hóa tải (Performance First)**:
   - **Frontend**: Bắt buộc dùng ảo hóa danh sách (Virtual List) khi render danh sách dài (>50 items). Dùng selective store subscriptions (`useStore(state => state.value)`) để chặn re-render dây chuyền.
   - **Network/Socket**: Throttle/Debounce các sự kiện tần suất cao (typing, mousemove, scroll) tối thiểu 300ms. Chỉ gửi payload tối giản, không gửi object thừa.
   - **Backend**: Không block Node.js Event Loop bằng tác vụ CPU-intensive đồng bộ. Đóng/giải phóng kết nối DB & Socket zombie kịp thời.
   - **Database**: Phân trang bằng con trỏ (Cursor-based) thay vì `OFFSET` lớn. Đánh Composite Index theo đúng thứ tự lọc (`WHERE`) và sắp xếp (`ORDER BY`).

---

## 5. CHECKLIST ĐỊNH NGHĨA HOÀN THÀNH (DEFINITION OF DONE)

Trước khi kết thúc bất kỳ tác vụ nào, tự động xác nhận các mục sau:

- [ ] **Type-check**: Mã nguồn biên dịch sạch sẽ, không có lỗi (`tsc --noEmit`).
- [ ] **Clean Code**: Không còn `console.log` debug, biến rác, imports thừa hoặc code chết.
- [ ] **Testing**: Đã bổ sung / cập nhật test case (Unit/Integration) và pass toàn bộ.
- [ ] **Memory & Cleanup**: Đã dọn dẹp đầy đủ event listeners, timers, subscriptions.
- [ ] **Security**: Đã validate schema đầu vào và kiểm soát các nguy cơ XSS, SQLi, IDOR.
- [ ] **Performance**: Đã kiểm tra re-render, ảo hóa danh sách lớn và đánh index database tương ứng.
- [ ] **Git Message**: Tuân thủ chuẩn Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `perf:`, `chore:`).
