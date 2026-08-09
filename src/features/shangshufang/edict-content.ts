import type { Memorial } from './types';
import type { BlastRadius } from '@/lib/contracts/governance';

/**
 * 圣旨展示平台(EdictStage)的统一内容契约。
 * 「一个舞台,三路调用」:奏折 / 丞相 / 钦天监 各自把内容适配成 EdictView 投入同一卷轴,
 * 平台只认这一份判别结构,不为任何一路特例化(日后第四路只加一个 seal 类型即可)。
 */

/** 钤印随调用方适配:御览(奏折)/ 辅政(丞相)/ 训诲(钦天监教学)/ 监国(东宫)/ 機密(群臣硬冲突·伏候圣裁) */
export type EdictSeal = 'imperial' | 'chancellor' | 'tutorial' | 'prince' | 'secret';

export interface EdictRow {
  label: string;
  body: string;
}

export interface EdictView {
  /** 切换内容时用于重挂载、重演展卷·落墨·钤印仪式 */
  id: string;
  title: string;
  subtitle?: string;
  /**
   * 卷首文书类型(密奏/奏折/回奏/圣旨…)的**显式**指定。给了就一锤定音,压过 seal 与关键词推断。
   *
   * 为什么要显式:2026-07-11 标题横跳的病根是 documentKindForHeader **嗅探正文关键词**——
   * 同一张卡的 rows 一变(下旨→轮询→回奏),标题就在 奏折/密奏 间来回跳,于是加了"seal=secret 恒密奏"的死规矩。
   * 但「密奏 → 丞相回奏」是一次**有意的、单向的**文书流转(不是抖动),需要一个出口:调用方明说这是回奏,
   * 卷首就认回奏。显式赋值不会自己抖,嗅探才会。密件的回奏仍是密件——seal 保持 secret,機密印与密纸不变。
   */
  documentKind?: string;
  /**
   * 首屏告警条(只在**真有问题**时给,给了就必须显眼)。
   *
   * 为什么需要它:主圣旨首屏刻意只放「来源台 + 建议」,红线/后令在详情页(见 MainMemorialPage)。
   * 2026-07-13 真链实测暴露的缺口:后端质门 blocked 时,用户在首屏读到了户部结论,却读不到
   * 「本次只能补证/复核、不能准奏归档」——结论看得见、不可采纳看不见,这是铁律13.2#3/#6 的诚实性缺口。
   * 徽章(meta.badges)在本卷轴**根本不渲染**(只被 sourceBadge 用来找 LIVE/MIXED),
   * 所以语义必须走这条首屏可见的通道,而不是躺在看不见的 badge 里。
   *
   * 纪律:没问题时**不要给**。每次都挂一条"红线待复核"的套话 = 把告警变成背景噪声,等于没有告警。
   */
  alert?: { tone: 'red' | 'amber'; text: string };
  /** 卷轴抬头，默认"奉天承运"；东宫可传"监国听政"。 */
  headerKicker?: string;
  /** 发文语，默认"皇帝诏曰"；东宫可传"东宫令曰"。 */
  issuerLine?: string;
  /** 皇上原问/下旨原文(raw_command 或 refined_edict):正文 Hero 锚点,即「此折所裁的那一句」。
      区别于 title(折子类型,如「蜂群回奏·质门阻塞」)。缺则不渲染 Hero。 */
  question?: string;
  meta?: {
    petitioner?: string;
    reporter?: string;
    priority?: Memorial['priority'];
    /** 严厉度(blast_radius):风险分级 SSOT，源自 governance gate（御史/尚书省推导，禁自造启发式）。
        裁决责任徽据此判红/中性；缺则徽章保持中性「待人工确认」，不伪造「高风险」。 */
    blastRadius?: BlastRadius;
    /**
     * ⚠️ **本卷轴(MemorialScroll/EdictStage)不把 badges 画成可见徽章**——它只用 badges 找 sourceLabel
     * (`/^(LIVE|LIVE_SWARM|MIXED|FALLBACK|DEMO|来源…)/`)。badges 服务的是别处的面板(任务栏/朝报)。
     *
     * 所以:**任何必须让陛下看见的诚实性(缺证/质门阻断/无实质结论),都不许只写进 badges**——
     * 那等于写进了一个没人渲染的字段。2026-07-13 实测踩过:三态徽做得一丝不苟,单测全绿,用户一个也看不见。
     * 要让人看见 → 用 `view.alert`(首屏告警条,画在结论上方)。
     */
    badges?: Array<{
      label: string;
      tone?: 'green' | 'amber' | 'red' | 'blue';
    }>;
    downloads?: Array<{
      label: string;
      href?: string;
      kind?: 'attachment' | 'evidence_pack' | 'report';
      disabledReason?: string;
    }>;
    /** Optional scroll theme accent. Used by department/court pages without changing the default Shangshufang gold scroll. */
    accent?: string;
    accentSoft?: string;
  };
  rows: EdictRow[];
  sealDate?: string;
  seal: EdictSeal;
}

export const EDICT_SCROLL_THEME = {
  shangshufang: { accent: '#D4A84B', accentSoft: '#F0C66A' },
  junjichu: { accent: '#D4A84B', accentSoft: '#F0C66A' },
  donggong: { accent: '#7A3F1F', accentSoft: '#F0C66A' },
  jinyiwei: { accent: '#9B3A4D', accentSoft: '#E8A3B0' },
  tianyiyuan: { accent: '#3E8E9C', accentSoft: '#86D5DE' },
} as const;

/**
 * 卷轴**纸面**色板(SSOT · 2026-07-13 立)。
 *
 * 卷轴是浅色宣纸,任何投进卷轴的组件都必须用这套**深墨色**;
 * 暗色驾驶舱那套(帝金 #F0C66A / 米色 #C6BB9D)一放上纸面就是浅字压浅纸——
 * 实见:FinanceCascadeSpine 的四站脊与御前裁决按钮在密奏里几乎不可读。
 * 墨色已按 WCAG AA 在暗纸区校过(原 #3a2e1a/#5b4a30 不达标),改前先量对比度。
 */
export const SCROLL_PAPER = {
  ink: '#2e2410',
  inkSoft: '#3f2c12',
  /** 次要/未激活文字:纸上"淡墨"(AA:对两种纸均 ≥4.5:1)。 */
  inkMuted: '#4a3a1e',
  hairline: 'rgba(120,90,40,0.30)',
  wash: 'rgba(255,248,224,0.35)',
  // 语义色 = MemorialScroll 徽章沿用至今的原值,本轮**不动**(它们在奏折里已在用、观感认可)。
  // 注意:这几个当**小字正文**时对密旨纸只有 2.9~4.5:1,勉强;所以纸上正文一律走 ink/inkSoft,
  // 语义色只承担图标/描边/底色(UI 元件门 3:1)。要动它们得单独一刀,别混进别的改动里。
  tone: {
    // 绿只压深了一档(#176b45→#15613e:密旨纸 2.92→3.35:1,刚过图标门):肉眼几乎同一支绿,
    // 但在最暗的密旨纸上不再糊掉。其余三支原值未动。
    green: { color: '#15613e', bg: 'rgba(23,107,69,0.08)', border: 'rgba(23,107,69,0.35)' },
    amber: { color: '#7a4a08', bg: 'rgba(180,111,18,0.10)', border: 'rgba(180,111,18,0.38)' },
    red: { color: '#7a241e', bg: 'rgba(150,40,32,0.09)', border: 'rgba(150,40,32,0.34)' },
    blue: { color: '#274d7a', bg: 'rgba(39,77,122,0.08)', border: 'rgba(39,77,122,0.32)' },
  },
  /** 纸面底色取样(渐变的最暗常见区域)——对比度门禁按它算,不按最亮处自欺。 */
  sample: { secret: '#c2ab7e', regular: '#ead6a8' },
} as const;

/** 纸面主行动按钮(准奏级):奶金实底 + 深墨字。纸上唯一够权重又不刺眼的实心按钮。 */
export const SCROLL_ACTION_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-[#8a6a2a]/55 bg-[#fff3c9]/90 px-3.5 py-1.5 text-[12.5px] font-bold text-[#251806] shadow-[inset_0_1px_0_rgba(255,250,235,0.76),0_5px_14px_rgba(58,33,8,0.14)] transition-all hover:bg-[#ffe6a3] hover:text-[#1b1306] disabled:cursor-not-allowed disabled:opacity-50';

/**
 * 各钤印的字样(中央水印 + 角印)与印色。
 * color 为朱砂/暗红印泥色,EdictStage 据此参数化印章描边、角印与纸面基调。
 * secret(機密)用暗血红 + 深色封缄纸,以肃穆区别于朱砂三印。
 */
export const EDICT_SEAL: Record<EdictSeal, { glyph: string; a: string; b: string; color: string }> = {
  imperial: { glyph: '御览', a: '御', b: '览', color: '#962820' },
  chancellor: { glyph: '辅政', a: '辅', b: '政', color: '#962820' },
  tutorial: { glyph: '训诲', a: '训', b: '诲', color: '#962820' },
  prince: { glyph: '监国', a: '监', b: '国', color: '#7a3f1f' },
  secret: { glyph: '機密', a: '機', b: '密', color: '#6b2d27' },
};
