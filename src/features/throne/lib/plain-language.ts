/**
 * 陛下视图 · 白话翻译器
 *
 * 把技术化的状态字符串翻译成决策者听得懂的话。
 * 所有面向 /throne 的组件都应该走这里，避免直接暴露 enum value。
 */

import type { TaskStatus } from '@/types/task';

/* ==========================================================================
   Task status
   ========================================================================== */

export function taskStateInPlainWords(status: TaskStatus): string {
  switch (status) {
    case 'draft':         return '尚未发出';
    case 'submitted':     return '已呈上';
    case 'interpreting':  return '丞相正在研判意图';
    case 'planning':      return '丞相正在分派差事';
    case 'assigned':      return '各部已就位';
    case 'running':       return '六部正在办理';
    case 'aggregating':   return '丞相正在汇总结论';
    case 'report_ready':  return '呈报已备好 · 待陛下过目';
    case 'reviewed':      return '陛下已批示';
    case 'archived':      return '已入史馆';
    case 'failed':        return '庄园暂时无响应';
  }
}

export function taskStateEmoji(status: TaskStatus): string {
  switch (status) {
    case 'draft':
    case 'submitted':
      return '📜';
    case 'interpreting':
    case 'planning':
      return '🤔';
    case 'assigned':
    case 'running':
      return '⚙️';
    case 'aggregating':
      return '📊';
    case 'report_ready':
      return '📨';
    case 'reviewed':
      return '✅';
    case 'archived':
      return '📚';
    case 'failed':
      return '⚠️';
  }
}

/* ==========================================================================
   Confidence
   ========================================================================== */

export function confidenceInPlainWords(c: number): {
  label: string;
  tone: 'green' | 'gold' | 'red';
  advice: string;
} {
  const pct = c * 100;
  if (pct >= 85) {
    return {
      label: '十分有把握',
      tone: 'green',
      advice: '臣以为可直接准奏',
    };
  }
  if (pct >= 70) {
    return {
      label: '大致有把握',
      tone: 'green',
      advice: '细节稳妥，请陛下过目无误后批示',
    };
  }
  if (pct >= 55) {
    return {
      label: '有待斟酌',
      tone: 'gold',
      advice: '存在若干不确定，建议与丞相细议',
    };
  }
  return {
    label: '尚无定论',
    tone: 'red',
    advice: '把握不足，不宜仓促定夺',
  };
}

/* ==========================================================================
   Time
   ========================================================================== */

export function timeAgoInPlainWords(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 个时辰前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 日前`;
  if (days < 30) return `${Math.floor(days / 7)} 旬前`;
  return `${Math.floor(days / 30)} 月前`;
}
