# Frontend feature ownership

This registry defines one implementation owner for each frontend business domain.
It prevents product names, legacy directories, and route names from creating parallel feature owners.

## Placement rules

| Code kind | Canonical location | Rule |
| --- | --- | --- |
| Next.js route adapter | `src/app/**` | Routes compose feature public entries; no domain business logic. |
| Domain UI, view state, domain adapters | `src/features/<domain>/**` | One directory is the only implementation owner for a domain. |
| Reusable visual primitives | `src/components/{ui,chaotang}/**` | Must not depend on a feature. |
| Cross-domain product composition | `src/features/shared/**` | May depend on public feature entries only, not feature internals. |
| HTTP transport and backend clients | `src/lib/api/**` | No page-specific state or presentation logic. |

## Domain registry

| Domain | Canonical owner | Public entry | Legacy or product alias | Status |
| --- | --- | --- | --- | --- |
| 史馆归档 | `src/features/shiguan` | `components/ShiguanPage` | `shiguan-ui` | Consolidated 2026-07-19. |
| 情报中心 | `src/features/intel` | `index.ts` (`IntelPage`) | 锦衣卫 / `jinyiwei` | Consolidated 2026-07-19. |

`src/lib/architecture/feature-ownership-scan.ts` 的 `FEATURE_REGISTRY` 是顶层目录的机器可读 SSOT。
每个条目必须包含：

- `owner`：负责该领域评审与迁移决策的代码所有者队列；当前统一采用 `frontend:<domain>` 标识。
- `publicEntry`：路由和其他领域可依赖的稳定入口；`route-owned` 表示历史领域尚未完成入口标准化。
- `status`：`active`、`legacy` 或 `shared`。
- `migrationTarget`：仅 `legacy` 必填，说明要建立哪个 public entry 或并入哪个 canonical owner。
- `deadlineVersion`：仅 `legacy` 必填，说明最晚收敛版本。

新增 `src/features/<name>` 前必须登记这三项；登记本身就是一次明确的领域归属评审。

## Dependency rules

- A route imports a feature public entry or a documented subcomponent only.
- A feature must not import another feature's `lib`, `hooks`, or private components directly.
- New business code must be placed under the canonical owner in this registry before it is imported by a route.
- A new alias directory requires a registry entry and a migration deadline; aliases are not new owners.

## Import guard

`src/lib/architecture/feature-ownership.nodetest.ts` is part of `pnpm test:guards`.
It rejects static imports, re-exports, and dynamic imports from retired aliases:

- `@/features/shiguan-ui/**`
- `@/features/jinyiwei/**`

It also rejects every unregistered top-level directory under `src/features`, including empty and hidden directories.
It rejects registry entries with an empty `owner` or `publicEntry`, or an unsupported `status`.
It rejects `legacy` entries without a migration target and deadline version.

## v0.2 migration batches

| Batch | Scope | Exit condition | Status |
| --- | --- | --- | --- |
| A | `auth`, `learning`, `libu`, `court-console`, `operating-loop` | Each has `index.ts`; all known consumers use it. | Complete 2026-07-19. |
| B | `hanlin`, `command-center`, `governance` | Public entries replace route imports of feature internals without exporting private `lib`. | Complete 2026-07-19. |
| C | `reports` probe | Public entry for report views and report DTOs; no private `lib` exposed. | Complete 2026-07-19. |
| C.1 | `shangshufang`, `throne`, `imperial` | High-dependency public-entry migration, one domain at a time after dependency audit. | Planned. |
| D | `departments`, `zhuangyuan`, `scribe` | Move the departments hall to its manor owner; expose department views; move the shared Canvas utility and retire the false `scribe` owner. | Complete 2026-07-19. |
| Cleanup | Empty legacy shells | Remove 3–5 empty directories per change and delete their registry entries. | Planned. |
