# 世界小说编辑器（world_novel_editor）

> 一款以"操作世界"推进叙事、由 AI 按作者设定风格生成可编辑小说章节的**世界操作系统型小说编辑器**。
> 核心闭环：**建世界 → 操作台轻操作 → AI 按风格生成章节 → 编辑器审改 → 导出**。

---

## 一、技术栈

- 构建/框架：Vite + React 18 + TypeScript
- UI：MUI v5 + Tailwind CSS（Tailwind 仅用于间距/栅格原子类）
- 状态管理：Zustand（复合 store，5 个 slice，全部以 `worldId` 为键）
- 路由：React Router v6
- 关系图编辑：React Flow（`reactflow`）
- 本地持久化：Dexie（IndexedDB）
- Markdown 编辑器：`@uiw/react-md-editor`
- AI 抽象：`openai` / `@anthropic-ai/sdk`，后端代理持有密钥
- 校验/ID：Zod + nanoid

---

## 二、目录结构（核心）

```
world_novel_editor/
├── index.html / package.json / vite.config.ts / tsconfig*.json
├── tailwind.config.js / postcss.config.js / .env.example
├── src/
│   ├── main.tsx / App.tsx / router.tsx / theme/theme.ts
│   ├── types/            # 共享类型（world/timeline/console/chapter/style/ai）
│   ├── schemas/          # Zod 运行时校验
│   ├── store/            # workStore + 5 个 slice（world/console/chapter/style/generation）
│   ├── services/
│   │   ├── storage/      # Dexie db + 订阅持久化
│   │   ├── narrative/    # 轻量叙事推演引擎（规则+模板，不调 LLM）
│   │   ├── ai/           # provider 抽象 / contextAssembler / promptBuilder
│   │   └── sync/         # 云同步接口（P1 接入，v1 留桩）
│   ├── components/        # world / console / generation / editor / timeline / layout / common
│   ├── pages/            # WorldPage / ConsolePage / ChapterListPage / EditorPage / SettingsPage
│   ├── hooks/            # useWorldState / useAutosave / useGeneration
│   ├── utils/            # id / text / promptTemplates
│   └── constants/        # worldTemplates
├── server/               # 后端轻代理（持有 AI 密钥，POST /api/ai/generate）
└── docs/                # 架构设计 / 类图 / 时序图
```

---

## 三、快速开始

### 1. 前端

```bash
cd world_novel_editor
npm install
npm run dev          # 启动 Vite，默认 http://localhost:5173
```

### 2. 后端 AI 代理（持有密钥，**前端不持有任何密钥**）

```bash
cd server
npm install
cp .env.example .env   # 然后填入至少一个 AI 密钥（见下节）
npm run dev            # 默认 http://localhost:8787
```

> 前端 Vite 已将 `/api` 代理到 `http://localhost:8787`，因此本地开发无需额外配置跨域。

你可以分别启动前后端两个终端；也可用 `concurrently` 等工具统一管理。

---

## 四、配置 AI 密钥（可选，但推荐）

编辑 `server/.env`：

```
# 至少配置其中一项
OPENAI_API_KEY=sk-xxx          # OpenAI
DEEPSEEK_API_KEY=sk-xxx        # DeepSeek（兼容 OpenAI 接口）
CLAUDE_API_KEY=sk-xxx          # Anthropic Claude

# 可选：指定优先提供方 openai | deepseek | claude
AI_PROVIDER=
```

**若全部留空**：后端返回 501，前端自动降级为**离线演示模式**——按规则拼装一段"像样"的示意章节正文，主循环（建世界 → 操作台 → 生成 → 编辑 → 导出）依然可以完整体验。界面会明确提示"当前为离线演示模式，配置 API 密钥后即真实 AI 生成"。

---

## 五、核心闭环演示路径

1. 右上角「新建世界」（自动预置 国力/民心/灵气 变量与全局风格配置）。
2. **世界观页**：用世界树新增实体（地理/势力/种族/人物/时间线/规则），在关系图谱中拖拽连线建立关系（变更会写入时间线事件）。
3. **操作台页**：选择操作（调度势力 / 推进时间 / 触发事件 / 调整变量 / 外交），执行后系统推演叙事、更新变量、推荐走向；选定走向后可点「生成章节」。
4. **章节页**：打开生成的章节，在编辑器审阅/改写 Markdown，保存为人工版本，可追溯版本历史，并导出 TXT / Markdown。
5. 返回操作台继续操作，世界持续演进。

---

## 六、关键约束（红线）

- **密钥绝不进前端**：前端只 `fetch('/api/ai/generate')`；任何 API Key 只在 `server/.env`（运行时）与 `server/.env.example`（示例）。
- **状态唯一真相**：所有视图经 `useWorkStore` 读写，以 `worldId` 为键，禁止组件内私藏世界状态。
- **三段式 prompt**：严格按 `contextBlock`(世界观) + `operationBlock`(操作推演) + `styleBlock`(风格) 组装（见 `src/utils/promptTemplates.ts`）。
- **关系变更即事件**：关系图增删改过 store 并写入 `TimelineEvent`。

---

## 七、已排除的 P2 项（本版不做）

- 世界地图可视化（Inkarnate 类）
- 社区 / 世界广场 / 二创市场
- 多人协作 / 共构世界（`syncService` 仅留桩，P1 接入云同步）
- 一键发布至小说平台
- 拼字 / 成就 / 进度可视化激励层

---

## 八、后续需用户填写的密钥

| 提供方 | 环境变量 | 说明 |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` / `OPENAI_MODEL` | 默认 `gpt-4o-mini` |
| DeepSeek | `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` / `DEEPSEEK_BASE_URL` | 默认 `deepseek-chat`，baseURL `https://api.deepseek.com/v1` |
| Claude | `CLAUDE_API_KEY` / `CLAUDE_MODEL` | 默认 `claude-3-5-sonnet-20241022` |

未填写任何密钥时，应用以离线演示模式运行（无需任何外部依赖即可体验主循环）。
