/**
 * 锦衣卫情报板异步状态推导。
 *
 * 从 `useIntelSignals()` 的三个原始信号（isLoading / isError / board）推导出
 * 唯一合法的 `AsyncState<IntelBoard>`，供 `<StateSwitch>` 消费。
 *
 * 2026-07-20 B4 零兜底红线修复背景：旧实现在 `!isLoading && !isError` 时
 * 无条件 `asyncReady(board)`，从不检查 `board` 是否真的到手。
 * 后端对该端点存在合法的"成功但无内容"透传路径——
 * `src/lib/courtos/server-backend.ts` 的 `proxyBackendJsonRequest` 对上游
 * 204 原样放行、body 置 null；`src/lib/api/index.ts` 的 `apiFetch` 遇到空
 * body 时 `if (!rawBody) return undefined as T`，不抛错。于是 SWR 的
 * `isLoading`/`error` 都会是「成功」，但 `data`（进而 `board`）仍是
 * `undefined`/`null`。旧代码这时会走进 `ready` 分支，靠
 * `board?.stats.total ?? 0` 把"没拿到数据"悄悄显示成"0 条情报"——
 * 这正是 AGENTS.md B4 要拦的：假事实比缺失更危险，缺失会让人去找，
 * 假事实会让人停止寻找。"0 条情报"和"还没拿到情报"在情报台上是两件
 * 完全不同的事。
 *
 * 修复：board 缺失时显式落入已存在的 `asyncEmpty()` 分支（`AsyncState`
 * 本就设计了 loading/error/empty/ready 四态，只是这个页面从未用过 empty），
 * 而不是伪造一个"看起来正常"的 ready+0。
 */
import { asyncEmpty, asyncError, asyncLoading, asyncReady } from '@/types/async-state';
import type { AsyncState } from '@/types/async-state';
import type { IntelBoard } from '@/lib/contracts/intel';

export interface IntelBoardAsyncInput {
  board: IntelBoard | null;
  isLoading: boolean;
  isError: boolean;
}

export function resolveIntelBoardState({
  board,
  isLoading,
  isError,
}: IntelBoardAsyncInput): AsyncState<IntelBoard> {
  if (isLoading) return asyncLoading();
  if (isError) return asyncError('后端锦衣卫情报板加载失败', { retryable: true });
  if (board) return asyncReady(board);
  return asyncEmpty('后端未返回情报板', '锦衣卫情报板暂时没有数据，请稍后重试或联系后端。');
}
