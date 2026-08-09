/**
 * 演示模式独立 layout
 *
 * 不含 dashboard shell（sidebar + topbar），全屏沉浸
 */

export default function PresentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#04060E]">
      {children}
    </div>
  );
}
