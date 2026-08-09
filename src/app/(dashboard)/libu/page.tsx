/**
 * 朝堂 OS · 御书房 · 主页
 *
 * 三栏：
 *   左 · 卷宗书架（按经史子集分类）
 *   中 · 卷宗详情（chunks + annotations）
 *   右 · 添加新卷 + 检索
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Search, Trash2, Link2, FileText, Tags } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import {
  searchLibu,
  type LibuSearchResult,
  type Scroll,
  type ScrollCategory,
  useLibuStore,
} from '@/features/libu';
import { toast } from 'sonner';

const CATEGORIES: ScrollCategory[] = ['经', '史', '子', '集', '未分'];
const CATEGORY_DESC: Record<ScrollCategory, string> = {
  经: '经典 · 长青之作',
  史: '史卷 · 旧案教训',
  子: '诸子 · 理论方法',
  集: '集萃 · 随手剪报',
  未分: '未分 · 待归档',
};

export default function LibuPage() {
  const scrolls = useLibuStore((s) => s.scrolls);
  const hydrate = useLibuStore((s) => s.hydrate);
  const addScroll = useLibuStore((s) => s.addScroll);
  const removeScroll = useLibuStore((s) => s.removeScroll);
  const updateScroll = useLibuStore((s) => s.updateScroll);
  const addAnnotation = useLibuStore((s) => s.addAnnotation);

  const [activeCategory, setActiveCategory] = useState<ScrollCategory | 'all'>('all');
  const [activeScrollId, setActiveScrollId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<LibuSearchResult[]>([]);

  useEffect(() => {
    void hydrate().catch((error) =>
      toast.error('卷宗读取失败', { description: String(error) }),
    );
  }, [hydrate]);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return scrolls;
    return scrolls.filter((s) => s.category === activeCategory);
  }, [scrolls, activeCategory]);

  const activeScroll = scrolls.find((s) => s.id === activeScrollId) ?? null;

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchHits([]);
      return;
    }
    const timer = setTimeout(() => {
      void searchLibu(query, 8)
        .then(setSearchHits)
        .catch((error) => {
          setSearchHits([]);
          toast.error('卷宗检索失败', { description: String(error) });
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of scrolls) c[s.category] = (c[s.category] ?? 0) + 1;
    return c;
  }, [scrolls]);

  const totalChars = useMemo(
    () => scrolls.reduce((acc, s) => acc + s.wordCount, 0),
    [scrolls],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1600px] space-y-5 p-6">
        {/* 顶部 banner */}
        <GlassPanel variant="gold" tone="deep" padding="lg" hudCorners>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#F0C66A]">
                Imperial Study · 御书房
              </div>
              <h1
                className="mt-2 text-[28px] font-black tracking-[0.06em] md:text-[34px]"
                style={{
                  color: '#F5E9C9',
                  fontFamily: '"Noto Serif SC", serif',
                  textShadow: '0 0 24px rgba(240,198,106,0.25)',
                }}
              >
                陛下的知识圣殿
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-7 text-[#C8CDD8]">
                上传 PDF/URL/文本 · 自动切分入卷 · 经史子集四部归档。
                AI 答问时主动检索 · 句末脚注援引 · 让每个建议都有出处。
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="font-mono text-[24px] font-black text-[#F0C66A]">
                {scrolls.length}
              </div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#8A92AC]">
                卷宗 · {totalChars.toLocaleString()} 字
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* 检索条 */}
        <GlassPanel tone="deep" padding="md">
          <div className="flex items-center gap-3">
            <Search size={14} className="text-[#F0C66A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索卷宗 · 标题 / 正文 / 注释（≥ 2 字）"
              className="flex-1 bg-transparent text-[13px] text-[#F5E9C9] placeholder:text-[#6A7299] focus:outline-none"
            />
            {searchQuery && (
              <span className="text-[11px] text-[#8A92AC]">
                {searchHits.length} 条命中
              </span>
            )}
          </div>
        </GlassPanel>

        {/* 检索结果 · 仅在搜索时展开 */}
        {searchHits.length > 0 && (
          <GlassPanel tone="elevated" padding="md">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#F0C66A]">
              检索命中 · Hits
            </div>
            <div className="mt-3 space-y-2">
              {searchHits.map((hit, i) => (
                <button
                  key={`${hit.chunk.id}_${i}`}
                  type="button"
                  onClick={() => {
                    setActiveScrollId(hit.scroll.id);
                    setSearchQuery('');
                  }}
                  className="block w-full rounded-md border border-[#F0C66A]/20 bg-[#F0C66A]/5 px-3 py-2 text-left transition hover:bg-[#F0C66A]/10"
                >
                  <div className="flex items-center gap-2 text-[12px] font-bold text-[#F5E9C9]">
                    <span className="font-mono text-[#F0C66A]">[{i + 1}]</span>
                    {hit.scroll.title}
                    <span className="ml-auto text-[11px] font-mono text-[#8A92AC]">
                      第 {hit.chunk.index + 1} 段 · {(hit.score * 100).toFixed(0)}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-[12px] text-[#C8CDD8]">
                    {hit.chunk.text}
                  </div>
                </button>
              ))}
            </div>
          </GlassPanel>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* 左 · 书架 */}
          <div className="lg:col-span-3">
            <GlassPanel tone="elevated" padding="md">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#F0C66A]">
                书架 · Shelves
              </div>
              <nav className="mt-3 space-y-1">
                <ShelfBtn
                  active={activeCategory === 'all'}
                  onClick={() => setActiveCategory('all')}
                  label="全部卷宗"
                  sub="all scrolls"
                  count={scrolls.length}
                />
                {CATEGORIES.map((cat) => (
                  <ShelfBtn
                    key={cat}
                    active={activeCategory === cat}
                    onClick={() => setActiveCategory(cat)}
                    label={cat}
                    sub={CATEGORY_DESC[cat]}
                    count={counts[cat] ?? 0}
                  />
                ))}
              </nav>
            </GlassPanel>
          </div>

          {/* 中 · 卷宗列表 + 详情 */}
          <div className="space-y-3 lg:col-span-6">
            <GlassPanel tone="deep" padding="md">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#F0C66A]">
                  {activeCategory === 'all'
                    ? '全部卷宗'
                    : `${activeCategory} 部 · ${CATEGORY_DESC[activeCategory]}`}
                </div>
                <span className="font-mono text-[11px] text-[#8A92AC]">
                  {filtered.length} 卷
                </span>
              </div>

              {filtered.length === 0 ? (
                <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
                  <BookOpen size={28} className="text-[#6A7299]" />
                  <div className="text-[13px] text-[#9AA3C4]">
                    此架尚空 · 请从右侧上传第一卷
                  </div>
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {filtered.map((scroll) => (
                    <li key={scroll.id}>
                      <button
                        type="button"
                        onClick={() => setActiveScrollId(scroll.id)}
                        className="flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition"
                        style={{
                          borderColor:
                            activeScrollId === scroll.id
                              ? 'rgba(240,198,106,0.55)'
                              : 'rgba(255,255,255,0.08)',
                          background:
                            activeScrollId === scroll.id
                              ? 'rgba(240,198,106,0.08)'
                              : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <span
                          className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border text-[11px] font-bold"
                          style={{
                            borderColor: 'rgba(240,198,106,0.35)',
                            color: '#F0C66A',
                          }}
                        >
                          {scroll.category === '未分' ? '?' : scroll.category}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-[#F5E9C9]">
                            {scroll.title}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#8A92AC]">
                            <FileText size={10} />
                            <span>{scroll.chunks.length} 段</span>
                            <span>· {scroll.wordCount.toLocaleString()} 字</span>
                            {scroll.tags.length > 0 && (
                              <>
                                <Tags size={10} />
                                <span>{scroll.tags.slice(0, 2).join(' · ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>

            {/* 卷宗详情 */}
            {activeScroll && (
              <ScrollDetail
                scroll={activeScroll}
                onClose={() => setActiveScrollId(null)}
                onRemove={(id) => {
                  void removeScroll(id)
                    .then(() => setActiveScrollId(null))
                    .catch((error) => toast.error('删除失败', { description: String(error) }));
                }}
                onCategoryChange={(cat) =>
                  void updateScroll(activeScroll.id, { category: cat })
                    .catch((error) => toast.error('分类更新失败', { description: String(error) }))
                }
                onAnnotate={(text, chunkId) =>
                  addAnnotation(activeScroll.id, text, chunkId).then(() => undefined)
                }
              />
            )}
          </div>

          {/* 右 · 上传 */}
          <div className="lg:col-span-3">
            <IngestForm onIngest={addScroll} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ShelfBtn({
  active,
  onClick,
  label,
  sub,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition"
      style={{
        borderColor: active ? 'rgba(240,198,106,0.45)' : 'rgba(255,255,255,0.06)',
        background: active ? 'rgba(240,198,106,0.08)' : 'rgba(255,255,255,0.01)',
      }}
    >
      <div>
        <div
          className="text-[13px] font-semibold"
          style={{
            color: active ? '#F0C66A' : '#F5E9C9',
            fontFamily: '"Noto Serif SC", serif',
          }}
        >
          {label}
        </div>
        <div className="text-[11px] text-[#8A92AC]">{sub}</div>
      </div>
      <span
        className="font-mono text-[11px]"
        style={{ color: active ? '#F0C66A' : '#6A7299' }}
      >
        {count}
      </span>
    </button>
  );
}

function ScrollDetail({
  scroll,
  onClose,
  onRemove,
  onCategoryChange,
  onAnnotate,
}: {
  scroll: Scroll;
  onClose: () => void;
  onRemove: (id: string) => void;
  onCategoryChange: (cat: ScrollCategory) => void;
  onAnnotate: (text: string, chunkId?: string) => Promise<void>;
}) {
  const [annotationText, setAnnotationText] = useState('');
  const [annotationChunk, setAnnotationChunk] = useState<string | undefined>();

  return (
    <GlassPanel variant="gold" tone="deep" padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#F0C66A]">
            卷宗详情
            {scroll.source && (
              <a
                href={scroll.source}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 normal-case tracking-normal text-[11px] text-[#8AA4FF] hover:underline"
              >
                <Link2 size={9} />
                源
              </a>
            )}
          </div>
          <h2
            className="mt-1 text-[18px] font-bold leading-tight text-[#F5E9C9]"
            style={{ fontFamily: '"Noto Serif SC", serif' }}
          >
            {scroll.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={scroll.category}
            onChange={(e) => onCategoryChange(e.target.value as ScrollCategory)}
            className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-[#F5E9C9] focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (confirm(`确认删除《${scroll.title}》?`)) onRemove(scroll.id);
            }}
            className="rounded-md border border-[#F43F5E]/30 bg-[#F43F5E]/8 px-2 py-1 text-[11px] text-[#F43F5E] transition hover:bg-[#F43F5E]/16"
          >
            <Trash2 size={11} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-[#9AA3C4] transition hover:bg-white/10"
          >
            ×
          </button>
        </div>
      </div>

      {/* 卷宗内容 · 分段 */}
      <div className="mt-4 max-h-[500px] space-y-3 overflow-y-auto pr-1">
        {scroll.chunks.map((c) => (
          <div
            key={c.id}
            className="rounded-md border border-white/8 bg-white/[0.02] px-3 py-2"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[11px] text-[#F0C66A]">
                第 {c.index + 1} 段
              </span>
              <button
                type="button"
                onClick={() => setAnnotationChunk(c.id)}
                className="text-[11px] text-[#8AA4FF] hover:underline"
              >
                批注此段
              </button>
            </div>
            <p
              className="text-[12.5px] leading-7 text-[#D8CFB4]"
              style={{ fontFamily: '"Noto Serif SC", serif' }}
            >
              {c.text}
            </p>
          </div>
        ))}
      </div>

      {/* 批注 */}
      <div className="mt-4 border-t border-white/8 pt-3">
        <div className="text-[11px] uppercase tracking-[0.24em] text-[#F0C66A]">
          陛下批注 · {scroll.annotations.length}
        </div>
        {scroll.annotations.length > 0 && (
          <ul className="mt-2 space-y-1">
            {scroll.annotations.map((a) => (
              <li
                key={a.id}
                className="rounded-md border border-[#F43F5E]/15 bg-[#F43F5E]/[0.04] px-3 py-2 text-[12px] text-[#E6DBBC]"
              >
                {a.chunkId && (
                  <span className="mr-2 font-mono text-[11px] text-[#F43F5E]">
                    @第 {scroll.chunks.find((c) => c.id === a.chunkId)?.index ?? '?'} 段
                  </span>
                )}
                {a.text}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder={annotationChunk ? '为选中段批注...' : '通卷批注...'}
            className="flex-1 rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-[12px] text-[#F5E9C9] placeholder:text-[#6A7299] focus:border-[#F43F5E]/50 focus:outline-none"
          />
          <button
            type="button"
            disabled={!annotationText.trim()}
            onClick={() => {
              void onAnnotate(annotationText.trim(), annotationChunk)
                .then(() => {
                  setAnnotationText('');
                  setAnnotationChunk(undefined);
                  toast.success('批注已落');
                })
                .catch((error) => toast.error('批注失败', { description: String(error) }));
            }}
            className="rounded-md border border-[#F43F5E]/40 bg-[#F43F5E]/12 px-3 text-[12px] font-semibold text-[#F43F5E] transition hover:bg-[#F43F5E]/20 disabled:opacity-40"
          >
            落朱
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}

function IngestForm({
  onIngest,
}: {
  onIngest: (input: {
    title?: string;
    body?: string;
    category?: ScrollCategory;
    type?: 'url' | 'text' | 'pdf';
    source?: string;
    tags?: string[];
  }) => Promise<Scroll>;
}) {
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textBody, setTextBody] = useState('');
  const [category, setCategory] = useState<ScrollCategory>('集');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (mode === 'url') {
      if (!/^https?:\/\//i.test(url)) {
        toast.error('请填合法 http(s) URL');
        return;
      }
      setLoading(true);
      try {
        const created = await onIngest({
          source: url,
          type: 'url',
          category,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        });
        toast.success(`《${created.title}》已入文库`, {
          description: `${created.wordCount.toLocaleString()} 字 · ${category} 部`,
        });
        setUrl('');
        setTags('');
      } catch (err) {
        toast.error('入文库失败', {
          description: err instanceof Error ? err.message : 'unknown',
        });
      } finally {
        setLoading(false);
      }
    } else {
      if (!textBody.trim()) {
        toast.error('正文不能为空');
        return;
      }
      setLoading(true);
      try {
        await onIngest({
        title: textTitle.trim() || '（无题）',
        body: textBody.trim(),
        type: 'text',
        category,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        });
        toast.success('卷宗已入文库');
        setTextTitle('');
        setTextBody('');
        setTags('');
      } catch (error) {
        toast.error('入文库失败', { description: String(error) });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <GlassPanel variant="gold" tone="deep" padding="md">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#F0C66A]">
        <Plus size={12} />
        新增卷宗
      </div>

      {/* 模式切换 */}
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-black/40 p-0.5">
        <button
          type="button"
          onClick={() => setMode('url')}
          className="rounded-sm px-2 py-1.5 text-[12px] font-semibold transition"
          style={{
            background: mode === 'url' ? 'rgba(240,198,106,0.18)' : 'transparent',
            color: mode === 'url' ? '#F0C66A' : '#9AA3C4',
          }}
        >
          URL
        </button>
        <button
          type="button"
          onClick={() => setMode('text')}
          className="rounded-sm px-2 py-1.5 text-[12px] font-semibold transition"
          style={{
            background: mode === 'text' ? 'rgba(240,198,106,0.18)' : 'transparent',
            color: mode === 'text' ? '#F0C66A' : '#9AA3C4',
          }}
        >
          文本
        </button>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="mt-3 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-[#F5E9C9] placeholder:text-[#6A7299] focus:border-[#F0C66A]/50 focus:outline-none"
        />
      ) : (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            placeholder="标题"
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-[#F5E9C9] placeholder:text-[#6A7299] focus:border-[#F0C66A]/50 focus:outline-none"
          />
          <textarea
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            placeholder="粘贴正文..."
            rows={6}
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-[#F5E9C9] placeholder:text-[#6A7299] focus:border-[#F0C66A]/50 focus:outline-none"
          />
        </div>
      )}

      {/* 分类 + 标签 */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ScrollCategory)}
          className="rounded-md border border-white/10 bg-black/40 px-2 py-2 text-[12px] text-[#F5E9C9] focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c} 部
            </option>
          ))}
        </select>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="标签 · 逗号分隔"
          className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-[#F5E9C9] placeholder:text-[#6A7299] focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={loading || (mode === 'url' ? !url : !textBody.trim())}
        className="mt-3 w-full rounded-md border border-[#F0C66A]/45 bg-[#F0C66A]/12 py-2 text-[13px] font-semibold tracking-[0.08em] text-[#F0C66A] transition hover:bg-[#F0C66A]/20 disabled:opacity-40"
      >
        {loading ? '入卷中...' : '入文库'}
      </button>

      <p className="mt-2 text-[11px] leading-5 text-[#8A92AC]">
        URL 提取、正文切分、检索与持久化均在后端完成
      </p>
    </GlassPanel>
  );
}
