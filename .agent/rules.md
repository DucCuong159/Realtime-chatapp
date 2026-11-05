# UNIVERSAL AI AGENT EXECUTION POLICY & SKILL ROUTING

## 1. NGUYÊN TẮC THỰC THI TỰ ĐỘNG (AUTONOMOUS DIRECTIVE)

- **Tự động đối chiếu kỹ năng (Auto-Discovery)**: Trước khi phân tích, viết code, tối ưu hoặc review, bạn PHẢI tự động quét danh mục kỹ năng tại `.agent/skills/` để tìm các chuẩn mực liên quan.
- **Không yêu cầu người dùng nhắc**: Tuyệt đối không chờ người dùng gõ `@skill` hay nhắc nhở tên quy tắc. Hãy chủ động dùng tool đọc file để nạp file `SKILL.md` hoặc rule con liên quan vào ngữ cảnh làm việc.
- **Nguyên tắc Progressive Disclosure**:
  - KHÔNG nạp toàn bộ thư mục `.agent/skills/` cùng lúc (bảo vệ Context Window và RAM).
  - Chỉ mở đúng file `SKILL.md` hoặc rule nguyên tử thuộc domain đang thao tác.
- **Nguồn sự thật kiến trúc**: Nạp file `.agent/memory.md` trước tiên để nắm chuẩn xác tech stack và quyết định kiến trúc bất biến.

---

## 2. QUY TRÌNH 9 BƯỚC BẮT BUỘC (9-STEP SPECIFICATION-DRIVEN EXECUTION HARNESS)

> Quy trình 9 bước tiêu chuẩn khi giao task cho AI (đặc biệt trong các framework kỹ nghệ agent như ECC, Cursor rules, hay quy trình Specification-Driven Development) được chia làm 3 giai đoạn lớn:
> **Chuẩn bị (Specification & Context) $\rightarrow$ Thực thi (Execution & Planning) $\rightarrow$ Kiểm định & Đóng gói (Verification & Delivery)**.

### Tóm tắt chu trình:
$$\text{Specify} \rightarrow \text{Clarify} \rightarrow \text{Explore} \rightarrow \text{Plan} \rightarrow \text{Test} \rightarrow \text{Implement} \rightarrow \text{Verify} \rightarrow \text{Review} \rightarrow \text{Commit}$$

Mọi tác vụ code/tính năng (trừ câu hỏi lý thuyết thuần túy) BẮT BUỘC phải thực hiện tuần tự qua 3 giai đoạn và hiển thị rõ block tiến trình tương ứng:

---

### Giai đoạn 1: Định hình bài toán (Specification & Context)

- **Bước 1 [Specify - Định tả yêu cầu]**:
  - Xác định rõ bài toán cần giải quyết, mục tiêu đầu ra (User Story / PRD tóm tắt).
  - Xác định các ràng buộc kỹ thuật: bám sát tech stack cố định từ `.agent/memory.md` (React 19, TypeScript, Socket.IO, Zustand, Express 5, MongoDB/Mongoose, Yarn), tuyệt đối không tự ý thay đổi hay cài thêm thư viện khi chưa có yêu cầu.
  - Xác lập các tiêu chí hoàn thành rõ ràng (Definition of Done - DoD ở Mục 5).

- **Bước 2 [Clarify - Làm rõ & Hỏi ngược]**:
  - Yêu cầu AI chủ động đặt câu hỏi làm rõ các điểm mơ hồ, edge cases, hoặc giả định ngầm trước khi bắt tay vào làm (chặn đứng nguy cơ hiểu sai đề bài).
  - Nếu yêu cầu đã rõ ràng 100%, BẮT BUỘC liệt kê ngắn gọn các giả định kỹ thuật (technical assumptions) trước khi chuyển bước.

- **Bước 3 [Explore / Research - Khảo sát hiện trạng]**:
  - Quét codebase và đọc tài liệu: Nạp `.agent/memory.md` và mở file `SKILL.md` liên quan từ Mục 3 (Bản đồ định tuyến kỹ năng).
  - Sử dụng tool tìm kiếm và đọc file để khảo sát codebase, định vị chính xác kiến trúc hiện tại, các hàm/module và luồng dữ liệu bị ảnh hưởng.
  - **Nguyên tắc bất biến**: Đây là giai đoạn Read-Only khảo sát hiện trạng — TUYỆT ĐỐI KHÔNG sửa hay tạo file mới ở bước này.

---

### Giai đoạn 2: Lập kế hoạch & Thực thi (Planning & Implementation)

- **Bước 4 [Plan / Design - Lập kế hoạch hành động & Gate Approval]**:
  - AI đưa ra bản kế hoạch chi tiết (Implementation Plan):
    - Danh sách các file sẽ tạo mới, file sẽ sửa đổi.
    - Pattern kỹ thuật áp dụng (theo skill đã nạp).
    - Các kịch bản kiểm thử (test cases) sẽ viết.
  - **Gate Approval**: Chờ người dùng phê duyệt kế hoạch trước khi tiến hành thực thi mã nguồn (trừ khi chạy với cờ `--yolo` hoặc người dùng yêu cầu bypass rõ ràng).

- **Bước 5 [Test First / Spec Test - Viết bài test trước (TDD)]**:
  - Viết các test case (Unit/Integration: `*.test.ts`) mô tả hành vi đúng của tính năng trước khi code logic.
  - Chạy test và xác nhận kết quả kiểm thử đang **FAIL (Red Phase)** (chứng minh test case có hiệu lực thực tế, bắt đúng yêu cầu bài toán và tránh false-positive).

- **Bước 6 [Implement - Hiện thực hóa mã nguồn]**:
  - AI tiến hành viết code logic chính để thỏa mãn các test case đã định nghĩa ở Bước 5.
  - Tuân thủ nghiêm ngặt **Thang 7 bậc Ponytail** (Mục 4) để chống over-engineering, chỉ viết lượng code tối thiểu vừa đủ để thỏa mãn spec.

---

### Giai đoạn 3: Kiểm định & Bàn giao (Verification & Delivery)

- **Bước 7 [Verify / Self-Correction - Tự động xác thực & Sửa lỗi]**:
  - Kích hoạt Harness xác thực dự án (BẮT BUỘC tuân thủ nguyên tắc **Bảo toàn lỗi - Preserve Failures**, không để lệnh kiểm tra sau che giấu/mask mã lỗi của lệnh trước):
    - **Cross-Stack (cả Frontend & Backend)**: Chạy `yarn verify` từ root monorepo (Fail-Fast: dừng ngay lập tức nếu Frontend fail), hoặc chạy Status Aggregator gom mã lỗi nếu cần audit đầy đủ cả hai stack.
    - **Scoped Frontend**: Chạy `yarn verify:frontend` (hoặc `yarn --cwd frontend run verify` gồm `type-check`, `lint`, `test:fast`).
    - **Scoped Backend**: Chạy `yarn verify:backend` (hoặc `yarn --cwd backend test && yarn --cwd backend run build`).
  - Nếu có lỗi phát sinh, AI tự động đọc log/stack trace, phân tích nguyên nhân gốc rễ (Root Cause Analysis - RCA) và tự sửa code cho đến khi exit code = 0 (tối đa 3 vòng lặp tự sửa).
  - Tuân thủ nghiêm ngặt **Quy tắc chống gian lận (Anti-Tampering ở Mục 6.3)**: Tuyệt đối KHÔNG sửa file test hoặc chèn comment tắt cảnh báo type/lint để pass giả tạo.

- **Bước 8 [Review / Diff Audit - Rà soát thay đổi]**:
  - AI tự rà soát lại toàn bộ `git diff` theo checklist nghiêm ngặt:
    - Có sót `console.log`, file rác, hoặc mã debug thừa không?
    - Có rò rỉ bộ nhớ (leak listener/timer/subscriptions) không?
    - Có vi phạm an ninh bảo mật (XSS, input sanitization qua Zod, IDOR) không?
    - Có vi phạm Type Safety (dùng `any`, ép kiểu mù quáng `as unknown as T`) không?

- **Bước 9 [Document & Commit - Tài liệu hóa & Đóng gói]**:
  - Cập nhật tài liệu (nếu có thay đổi kiến trúc/API/memory hoặc README).
  - Viết Git Commit message chuẩn Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `perf:`, `chore:`, `docs:`) theo Mục 6.4 hoặc tạo Pull Request tóm tắt các thay đổi.

---

## 3. BẢN ĐỒ ĐỊNH TUYẾN KỸ NĂNG (UNIVERSAL SKILL ROUTING MATRIX)

_Toàn bộ kỹ năng dưới đây đều tồn tại thực tế tại thư mục `.agent/skills/`._

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
   _Trước khi viết thêm bất kỳ dòng code, hàm mới hay cài thêm package nào, BẮT BUỘC tự vấn theo thứ tự:_
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

> Quy chuẩn vận hành bắt buộc để Agent hoạt động ở Level 3 (Autonomous).
> Type, Lint và Commit Message sẽ được Husky Git hooks cưỡng chế cơ học trên máy local.

### 6.1 Vòng lặp tự kiểm tra & Bảo toàn lỗi (Automated Self-Correction & Preserve Failures)

Sau khi hoàn thành Bước 6 (Implement), **BẮT BUỘC** gọi terminal tool chạy pipeline kiểm định.

> ⚠️ **NGUYÊN TẮC BẢO TOÀN LỖI (PRESERVE FAILURES / ANTI-MASKING)**:
> Khi kiểm tra các thay đổi liên quan đến cả hai stack (cross-stack change), tuyệt đối không chạy các lệnh kiểm tra tuần tự rời rạc mà không kiểm tra exit code. Nếu kiểm tra Frontend thất bại nhưng Backend thành công, shell script sẽ kết thúc bằng mã exit code 0 của Backend $\rightarrow$ lỗi của Frontend sẽ bị **che giấu (masked)** hoàn toàn!
> Bắt buộc áp dụng một trong hai cơ chế sau:

#### Phương án 1: Fail-Fast (Khuyến nghị cho Automation / Monorepo CI)
Dừng thực thi ngay lập tức tại bước bị lỗi đầu tiên và bảo toàn nguyên vẹn mã exit code:

```bash
# Lựa chọn 1.1: Sử dụng root script chuẩn của Monorepo (đã tích hợp Fail-Fast qua &&)
yarn verify

# Lựa chọn 1.2: Chạy trực tiếp từ root với cờ --cwd và toán tử && (Fail-Fast)
yarn --cwd frontend run verify && \
yarn --cwd backend test && \
yarn --cwd backend run build
```

#### Phương án 2: Status Aggregator (Kiểm tra toàn diện 2 stack mà KHÔNG nuốt mã lỗi)
Sử dụng khi bạn muốn chạy cả Frontend và Backend để thu thập đầy đủ toàn bộ log lỗi trước khi bắt tay vào sửa, nhưng vẫn đảm bảo block script trả về mã lỗi (exit code ≠ 0) nếu có bất kỳ stack nào thất bại:

```bash
# Chạy kiểm tra cả 2 stack và tổng hợp exit code
FE_EXIT=0
BE_EXIT=0

yarn --cwd frontend run verify || FE_EXIT=$?
(yarn --cwd backend test && yarn --cwd backend run build) || BE_EXIT=$?

if [ $FE_EXIT -ne 0 ] || [ $BE_EXIT -ne 0 ]; then
  echo "❌ Verification FAILED: Frontend exit code = $FE_EXIT, Backend exit code = $BE_EXIT"
  exit 1
fi
```

#### Đối với tác vụ đơn lẻ (Single-Stack Scoped Task)
```bash
# Chỉ Frontend
yarn verify:frontend   # hoặc: yarn --cwd frontend run verify

# Chỉ Backend
yarn verify:backend    # hoặc: yarn --cwd backend test && yarn --cwd backend run build
```

Nếu lệnh trả về exit code ≠ 0:
1. Đọc kỹ stack trace / error output.
2. Phân tích nguyên nhân gốc rễ (Root Cause Analysis).
3. Sửa trực tiếp tại implementation code (KHÔNG sửa test code).
4. Chạy lại verify/test cho đến khi exit code = 0 (tối đa 3 vòng lặp).

### 6.2 Xử lý sự cố & Đóng băng phạm vi (Incident Escalation)

- **Giới hạn tự sửa (3-Attempt Cap)**: Nếu sau 3 vòng lặp mà verify vẫn thất bại:
  1. DỪNG THỰC THI NGAY LẬP TỨC. Không đoán mò hoặc patch bừa.
  2. In ra bản tóm tắt nguyên nhân gốc rễ (RCA) kèm 3 giải pháp đã thử và xin ý kiến người dùng.
- **Đóng băng phạm vi (Scope Containment)**:
  - Tuyệt đối KHÔNG tự ý mở rộng sửa sang các file/module nằm ngoài danh sách đã định nghĩa ở Bước 4 [Plan].
  - Nếu việc sửa lỗi đòi hỏi thay đổi kiến trúc hoặc thư viện khác, phải xin phép người dùng trước.

### 6.3 Quy tắc chống gian lận (Anti-Tampering)

**TUYỆT ĐỐI KHÔNG** được thực hiện các hành vi sau để làm test pass giả tạo:
- ❌ Sửa logic hoặc assertion trong file test (`expect()`, `toEqual()`, `toBe()`...).
- ❌ Thêm `.skip()`, `.todo()`, hoặc `xit()` vào test case đang fail.
- ❌ Chèn `/* eslint-disable */`, `// @ts-ignore`, `// @ts-expect-error` để tắt lỗi.
- ❌ Xóa hoặc comment out test case.
- ❌ Hạ thấp ngưỡng ESLint rule (ví dụ: tăng `max-lines-per-function` chỉ để pass).

**CHỈ ĐƯỢC PHÉP** sửa test khi:
- ✅ Requirement thay đổi (người dùng yêu cầu rõ ràng).
- ✅ Test case viết sai logic so với spec ban đầu.

### 6.4 Git Delivery (Conventional Commits)

Khi toàn bộ pipeline kiểm định (verify) thành công (exit code = 0), tạo commit theo chuẩn:

```text
<type>(<scope>): <mô tả ngắn>

<body — giải thích why, không phải what>
```

**Các type hợp lệ:**

| Type       | Khi nào dùng                              |
| ---------- | ----------------------------------------- |
| `feat`     | Thêm tính năng mới                        |
| `fix`      | Sửa bug                                   |
| `refactor` | Cải thiện code mà không thay đổi behavior |
| `perf`     | Tối ưu hiệu năng                          |
| `test`     | Thêm / sửa test                           |
| `chore`    | Cập nhật tooling, config, dependencies    |
| `docs`     | Cập nhật tài liệu                         |

**Scope** = tên module bị ảnh hưởng: `auth`, `chat`, `call`, `ui`, `api`, `socket`, `db`.

Ví dụ:

```text
feat(chat): add message read receipts with socket broadcast
fix(auth): prevent token refresh race condition on concurrent requests
refactor(call): extract WebRTC peer connection into dedicated hook
```
