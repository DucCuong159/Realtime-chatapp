# AGENTIC SKILLS FRAMEWORK & SYSTEM ARCHITECTURE MANUAL

> **Tài liệu tổng hợp thiết lập, quản trị kỹ năng và quy chuẩn thực thi tự động cho AI Agent (Antigravity) trong môi trường Production.**

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG (SYSTEM OVERVIEW)

Hệ thống Agent được xây dựng theo mô hình **Local Control Plane** dựa trên kho tri thức `agentic-awesome-skills` (AAS).

### Cấu trúc thư mục chuẩn (Flat Structure - Depth = 1)

Tuyệt đối giữ cấu trúc phẳng một cấp trong `.agent/skills/` để đảm bảo tính tương thích với các công cụ parser và MCP của Agent:

```text
my-project/
├── .antigravityrules          # Con trỏ định tuyến hoặc Rule thực thi tự động ở Root
├── .agent/
│   ├── rules.md               # [Single Source of Truth] Toàn bộ quy chuẩn & ma trận kỹ năng
│   ├── context.md             # Hồ sơ kiến trúc riêng của dự án (Tech stack, ports, endpoints)
│   ├── task.md                # Scratchpad bộ nhớ ngắn hạn cho task phức tạp nhiều bước
│   └── skills/                # Thư mục chứa các Atomic Skills độc lập (Flat structure)
│       ├── clean-code/
│       ├── react-best-practices/
│       ├── react-component-performance/
│       ├── typescript-expert/
│       ├── zustand-store-ts/
│       ├── frontend-optimistic-mutations/
│       ├── zod-validation-expert/
│       ├── postgres-best-practices/
│       ├── sql-optimization-patterns/
│       ├── web-security-testing/
│       ├── xss-html-injection/
│       ├── k6-load-testing/
│       ├── playwright-skill/
│       ├── vitest-skill/
│       └── ...
```
