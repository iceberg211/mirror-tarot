# Mirror Tarot 技术方案

## 1. 产品定位

Mirror Tarot 是一个 AI 塔罗情绪日记应用。

它不是“算命工具”，而是用塔罗牌作为象征系统，帮助用户整理困惑、识别情绪、发现盲点，并给出一个现实可执行的小行动。

核心体验是：

用户输入问题 → 选择情绪 → 选择牌阵 → 抽牌 → AI 解读 → 保存日记 → 继续追问。

第一版重点不是功能多，而是让用户觉得这个产品有气质、有陪伴感、有复盘价值。

---

## 2. 技术栈

前端与全栈框架：

* Next.js App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Framer Motion

数据库与用户系统：

* Supabase Auth
* Supabase Postgres
* Supabase Storage
* Supabase Row Level Security

大模型：

* 通义千问，优先使用阿里云百炼 OpenAI-compatible Chat Completions 接口
* 推荐模型：qwen-plus 起步
* 后续可根据成本和质量切换 qwen-max / qwen-turbo

AI 编排：

* LangChain
* LangGraph

部署：

* Vercel
* Supabase Cloud
* 环境变量管理放在 Vercel Project Settings

---

## 3. 整体架构

```txt
Browser
  ↓
Next.js App Router
  ├─ Server Components：页面渲染、读取用户状态
  ├─ Client Components：抽牌动画、交互、流式展示
  ├─ Route Handlers：AI reading / follow-up / share image
  └─ Server Actions：保存、收藏、删除、更新情绪标签
  ↓
LangGraph Reading Workflow
  ├─ validateInput
  ├─ selectCards
  ├─ loadCardMeanings
  ├─ buildPromptContext
  ├─ generateReading
  ├─ normalizeOutput
  ├─ persistReading
  └─ returnResult
  ↓
LangChain Model Adapter
  ↓
Qwen API
  ↓
Supabase Postgres / Storage
```

第一版不用单独拆 NestJS，也不用独立后端服务。Next.js Route Handler 足够。

---

## 4. 核心页面

### 4.1 首页 `/`

首页承担三个动作：

1. 输入问题
2. 选择当前情绪
3. 选择牌阵

页面气质：

* 暗色背景
* 月亮 / 镜子 / 金色线条
* 中间一个问题输入框
* 底部展示常用牌阵

主文案：

```txt
Mirror Tarot

Ask the card.
Meet yourself.

问牌，也是问自己。
```

输入框 placeholder：

```txt
把你现在的困惑写下来……
```

情绪选项：

```txt
迷茫
焦虑
期待
失落
平静
纠结
```

牌阵选项：

```txt
今日一张牌
三牌阵
关系牌阵
职业牌阵
```

第一版默认允许未登录用户体验一次，保存历史和追问需要登录。

---

### 4.2 抽牌页 `/reading/new`

用户提交问题后进入抽牌页。

功能：

* 展示卡组
* 洗牌动画
* 点击抽牌
* 翻牌 reveal
* 展示抽到的牌
* 生成解读按钮

细节：

* 抽牌前只展示卡背
* 抽牌时使用 Framer Motion 做轻微散开动画
* 翻牌时使用 rotateY 动画
* 卡牌背面使用 Mirror Tarot 自定义 SVG，不直接使用 Rider-Waite 卡背
* 正位 / 逆位在抽牌时随机生成

抽牌逻辑放在服务端更好，避免用户刷新或篡改结果。

---

### 4.3 结果页 `/reading/[id]`

这是产品最重要的页面。

页面结构：

```txt
顶部：问题 + 情绪 + 时间
中部：抽到的牌
下方：AI 解读
底部：追问区 / 保存 / 分享
```

AI 解读结构固定为：

```txt
一句话直觉解读
每张牌的解释
这件事真正的矛盾
你可能忽略的现实因素
今天可以做的一步
温柔但直接的提醒
```

结果页要像一封信，不要像 ChatGPT 回复。

视觉建议：

* 解读内容用卡片承载
* 重要句子可以用引用样式
* 每张牌解释前展示牌名、位置、正逆位
* 行动建议单独做成高亮模块

---

### 4.4 日记页 `/journal`

用于提高留存。

功能：

* 查看历史解读
* 按牌阵筛选
* 按情绪筛选
* 查看某次解读
* 收藏重要解读
* 删除解读

列表卡片展示：

```txt
问题
牌阵类型
情绪
日期
抽到的牌缩略图
一句话总结
```

第一版可以只做列表和详情，不做复杂统计。

---

### 4.5 牌义库 `/deck`

这个页面不是核心，但适合增加产品完整度。

功能：

* 浏览 78 张牌
* 搜索牌名
* 查看正位 / 逆位基础牌义
* 查看不同场景含义：通用、感情、职业、情绪

这个页面也可以帮助 SEO，但第一版优先级低于抽牌和结果页。

---

### 4.6 分享卡片 `/reading/[id]/share`

用于传播。

分享卡片内容：

```txt
Mirror Tarot
用户问题的一句话摘要
抽到的一张主牌
一句短解读
日期
二维码 / 产品名
```

第一版可以前端生成 DOM 卡片，后续再做服务端图片生成。

---

## 5. 数据库设计

### 5.1 profiles

保存用户基础信息。

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

### 5.2 readings

保存一次完整解读。

```sql
create table readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  question text not null,
  question_summary text,
  spread_type text not null,
  mood text,
  language text default 'zh-CN',
  ai_summary text,
  contradiction text,
  overlooked_factor text,
  action_advice text,
  gentle_reminder text,
  raw_output jsonb,
  is_favorite boolean default false,
  created_at timestamptz default now()
);
```

说明：

* `question` 保存用户原始问题
* `question_summary` 保存一句话摘要，用于日记列表和分享卡片
* `raw_output` 保存完整 JSON，方便后续重渲染
* 未登录用户可以先存在 localStorage；登录后再同步

---

### 5.3 reading_cards

保存本次抽到的牌。

```sql
create table reading_cards (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid references readings(id) on delete cascade,
  card_id text not null,
  card_name text not null,
  card_zh_name text not null,
  image_url text not null,
  orientation text not null,
  position_name text not null,
  position_order int not null,
  keywords text[],
  meaning_snapshot jsonb,
  created_at timestamptz default now()
);
```

说明：

* `orientation` 为 `upright` 或 `reversed`
* `meaning_snapshot` 保存当时使用的牌义，避免以后修改牌义库导致历史解读不一致

---

### 5.4 follow_up_messages

保存某次解读后的追问对话。

```sql
create table follow_up_messages (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid references readings(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);
```

---

### 5.5 daily_checkins

后续做每日抽牌时使用。

```sql
create table daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  reading_id uuid references readings(id) on delete set null,
  checkin_date date not null,
  mood text,
  note text,
  created_at timestamptz default now(),
  unique(user_id, checkin_date)
);
```

---

### 5.6 RLS 策略

每张用户相关表都需要开启 Row Level Security。

基本规则：

* 用户只能读取自己的 readings
* 用户只能读取自己的 follow_up_messages
* 用户只能修改自己的收藏状态
* 未登录用户不写入数据库，使用 localStorage 保存临时结果

---

## 6. 塔罗牌素材与数据结构

第一版使用 Rider-Waite-Smith 公有领域牌面。

素材路径：

```txt
/public/cards/rws/
  00-the-fool.jpg
  01-the-magician.jpg
  02-the-high-priestess.jpg
  ...
  swords-08-eight-of-swords.jpg

/public/cards/back/
  mirror-tarot-back.svg
```

卡牌数据：

```ts
export type TarotCard = {
  id: string
  number?: number
  name: string
  zhName: string
  arcana: 'major' | 'minor'
  suit?: 'cups' | 'wands' | 'swords' | 'pentacles'
  image: string
  keywords: string[]
  meanings: {
    upright: {
      general: string
      love: string
      career: string
      emotion: string
      advice: string
    }
    reversed: {
      general: string
      love: string
      career: string
      emotion: string
      advice: string
    }
  }
}
```

不要把牌义完全交给模型生成。模型应该基于结构化牌义进行表达，而不是自由编造。

---

## 7. 牌阵设计

第一版保留 4 个牌阵。

### 7.1 今日一张牌

```ts
{
  type: 'one_card',
  name: '今日一张牌',
  positions: ['今日提示']
}
```

适合每日使用，成本低，体验轻。

---

### 7.2 三牌阵

```ts
{
  type: 'three_cards',
  name: '三牌阵',
  positions: ['现状', '阻碍', '建议']
}
```

这是第一版最核心牌阵。

---

### 7.3 关系牌阵

```ts
{
  type: 'relationship',
  name: '关系牌阵',
  positions: ['我', '对方', '关系状态', '下一步']
}
```

适合感情、朋友、合作关系。

---

### 7.4 职业牌阵

```ts
{
  type: 'career',
  name: '职业牌阵',
  positions: ['机会', '风险', '建议']
}
```

适合求职、转行、项目选择。

---

## 8. LangGraph 编排设计

### 8.1 ReadingGraph

ReadingGraph 用于生成一次完整塔罗解读。

State 设计：

```ts
type ReadingGraphState = {
  userId?: string
  question: string
  mood?: string
  spreadType: SpreadType
  language: 'zh-CN' | 'en-US'

  spread?: Spread
  selectedCards?: SelectedCard[]
  cardMeanings?: CardMeaningContext[]

  promptContext?: string
  llmRawText?: string
  parsedReading?: ParsedReading

  readingId?: string
  errors?: string[]
}
```

节点设计：

```txt
validateInput
  ↓
resolveSpread
  ↓
selectCards
  ↓
loadCardMeanings
  ↓
buildPromptContext
  ↓
generateReading
  ↓
parseAndNormalize
  ↓
persistReading
  ↓
returnResult
```

---

### 8.2 validateInput

职责：

* 校验问题长度
* 校验牌阵类型
* 校验情绪标签
* 做基础敏感内容处理

规则：

```txt
问题不能为空
问题最多 500 字
情绪必须来自预设枚举
牌阵必须来自预设枚举
```

如果用户输入明显想要确定性预测，比如：

```txt
我一定会发财吗？
他一定会回来吗？
明天股票一定涨吗？
```

系统不要拒绝，而是改写解读边界：

```txt
这次解读不会给确定性预测，只会帮助你整理当前处境、风险和可行动作。
```

---

### 8.3 resolveSpread

职责：

* 根据 `spreadType` 读取牌阵配置
* 确定需要抽几张牌
* 确定每张牌的位置名

---

### 8.4 selectCards

职责：

* 从 78 张牌中随机抽取 N 张
* 每张牌随机生成正位或逆位
* 同一次解读内不能重复抽到同一张牌

服务端抽牌，避免前端作弊或状态不一致。

---

### 8.5 loadCardMeanings

职责：

* 根据抽到的卡牌和正逆位读取结构化牌义
* 根据牌阵类型选择更相关的牌义字段

比如：

```txt
关系牌阵优先使用 love 字段
职业牌阵优先使用 career 字段
今日一张牌优先使用 general + advice 字段
```

---

### 8.6 buildPromptContext

职责：

把用户问题、情绪、牌阵、抽到的牌、结构化牌义拼成稳定上下文。

Prompt 方向：

```txt
你是 Mirror Tarot 的 AI 解读助手。

你的任务不是预测未来，也不是宣称神秘力量。
你的任务是基于塔罗牌象征，帮助用户整理情绪、看见盲点、形成现实行动。

用户问题：
{{question}}

用户当前情绪：
{{mood}}

牌阵：
{{spread}}

抽到的牌：
{{cards}}

输出要求：
必须返回 JSON。
不要输出 Markdown。
不要输出确定性预测。
不要使用“命中注定”“百分百”“一定会”等表达。
```

---

### 8.7 generateReading

职责：

* 调用通义千问
* 生成结构化 JSON
* 支持 streaming 的话，优先流式返回给前端
* 如果 JSON 解析失败，进入一次 retry

推荐输出结构：

```ts
type ParsedReading = {
  questionSummary: string
  intuitiveSummary: string
  cardReadings: {
    positionName: string
    cardName: string
    cardZhName: string
    orientation: 'upright' | 'reversed'
    interpretation: string
  }[]
  contradiction: string
  overlookedFactor: string
  actionAdvice: string
  gentleReminder: string
  followUpSuggestions: string[]
}
```

---

### 8.8 parseAndNormalize

职责：

* 解析模型输出
* 校验字段完整性
* 对过长内容截断
* 对空字段 fallback
* 统一中文标点和语气

如果模型输出不合规，执行一次修复 Prompt：

```txt
请把以下内容修复为合法 JSON，不要改变原意。
```

---

### 8.9 persistReading

职责：

* 如果用户已登录，保存 readings 和 reading_cards
* 如果用户未登录，返回完整结果给前端，由前端存在 localStorage
* 保存本次牌义快照

---

## 9. FollowUpGraph 追问编排

用户在结果页可以继续追问。

追问入口建议做成按钮，而不是只给一个空输入框。

快捷追问：

```txt
说人话一点
结合我的感情问题解释
结合我的职业问题解释
我是不是在自欺欺人？
给我一个更现实的建议
这组牌的反面提醒是什么？
```

FollowUpGraph 流程：

```txt
loadReadingContext
  ↓
loadPreviousMessages
  ↓
classifyFollowUpIntent
  ↓
buildFollowUpPrompt
  ↓
generateAnswer
  ↓
persistMessage
  ↓
returnAnswer
```

追问回答必须基于原始牌阵，不能重新抽牌，除非用户主动点击“重新抽牌”。

---

## 10. Qwen 接入方式

推荐使用 OpenAI-compatible 方式接入百炼。

环境变量：

```env
DASHSCOPE_API_KEY=xxx
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

如果部署区域使用国际站，需要根据阿里云账号区域切换 base_url。

模型封装：

```ts
import OpenAI from 'openai'

export const qwenClient = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.QWEN_BASE_URL,
})
```

调用：

```ts
const completion = await qwenClient.chat.completions.create({
  model: process.env.QWEN_MODEL ?? 'qwen-plus',
  messages,
  temperature: 0.8,
})
```

LangChain 层可以封装一个 model adapter，避免业务代码直接依赖 OpenAI SDK。

---

## 11. Next.js 目录结构

```txt
src/
  app/
    page.tsx
    reading/
      new/page.tsx
      [id]/page.tsx
      [id]/share/page.tsx
    journal/page.tsx
    deck/page.tsx
    login/page.tsx

    api/
      reading/route.ts
      reading/[id]/follow-up/route.ts
      reading/[id]/favorite/route.ts
      reading/[id]/share/route.ts

  components/
    layout/
      AppShell.tsx
      BottomNav.tsx

    tarot/
      TarotCard.tsx
      CardDeck.tsx
      SpreadSelector.tsx
      MoodSelector.tsx
      ReadingResult.tsx
      FollowUpChat.tsx
      ShareCard.tsx

    ui/
      ...

  lib/
    supabase/
      client.ts
      server.ts
      middleware.ts

    tarot/
      cards.ts
      spreads.ts
      drawCards.ts
      types.ts

    ai/
      qwen.ts
      prompts/
        readingPrompt.ts
        followUpPrompt.ts
      graphs/
        readingGraph.ts
        followUpGraph.ts
      schemas/
        readingOutput.ts

    db/
      readings.ts
      followUps.ts
      profiles.ts
```

---

## 12. UI 样式方向

继续沿用之前生图里的方向，但要更克制。

关键词：

```txt
dark
moon
mirror
gold line
soft glow
paper texture
tarot card
private journal
```

主色：

```txt
背景：#07090F
卡片：#11131A
金色：#C9A76A
文字：#E8DCC2
弱文字：#8F8576
边框：rgba(201, 167, 106, 0.35)
```

不要大量使用紫色渐变、水晶球、星座贴纸。那些元素容易让产品变廉价。

首页风格：

* 背景有细微星空噪点
* 中间是问题输入卡片
* 卡片有金色细边框
* CTA 是“开始抽牌”
* 底部是四个牌阵卡片

抽牌页风格：

* 卡牌在中心展开
* 卡背是自定义 Mirror Tarot SVG
* 点击后卡牌翻转
* 翻牌时出现轻微金色 glow

结果页风格：

* 顶部展示问题
* 中间展示牌阵
* 解读像一封信
* 行动建议单独高亮
* 追问按钮做成小 chips

日记页风格：

* 列表像私密笔记
* 每条日记右侧展示卡牌缩略图
* 支持按情绪和牌阵筛选

---

## 13. 关键组件实现细节

### 13.1 TarotCard

Props：

```ts
type TarotCardProps = {
  card?: SelectedCard
  faceDown?: boolean
  revealed?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}
```

能力：

* 展示卡背
* 展示牌面
* 支持正逆位旋转
* 支持翻牌动画
* 支持 hover glow

---

### 13.2 CardDeck

能力：

* 展示一组卡背
* 洗牌动画
* 抽牌动画
* 抽牌完成后回调

注意：

* 动画只负责展示
* 真正抽牌结果来自服务端

---

### 13.3 SpreadSelector

能力：

* 展示牌阵名称
* 展示牌阵说明
* 展示牌阵位置
* 选中状态高亮

---

### 13.4 ReadingResult

能力：

* 展示一句话总结
* 展示每张牌解释
* 展示矛盾、盲点、行动建议、提醒
* 支持 loading skeleton
* 支持流式更新

---

### 13.5 FollowUpChat

能力：

* 展示快捷追问
* 支持自由输入
* 追问时带上 readingId
* 保存对话历史
* 不重新抽牌

---

## 14. API 设计

### 14.1 创建解读

```txt
POST /api/reading
```

Request：

```ts
{
  question: string
  mood?: string
  spreadType: 'one_card' | 'three_cards' | 'relationship' | 'career'
  language?: 'zh-CN' | 'en-US'
}
```

Response：

```ts
{
  readingId?: string
  cards: SelectedCard[]
  reading: ParsedReading
}
```

---

### 14.2 追问

```txt
POST /api/reading/:id/follow-up
```

Request：

```ts
{
  message: string
}
```

Response：

```ts
{
  answer: string
}
```

---

### 14.3 收藏

```txt
POST /api/reading/:id/favorite
```

Request：

```ts
{
  isFavorite: boolean
}
```

---

### 14.4 分享卡片

```txt
GET /api/reading/:id/share
```

后续可以返回图片，第一版可以先返回分享页 URL。

---

## 15. Prompt 设计

### 15.1 Reading Prompt

```txt
你是 Mirror Tarot 的 AI 解读助手。

你的任务不是预测未来，也不是宣称神秘力量。
你的任务是基于塔罗牌象征，帮助用户整理情绪、看见盲点、形成现实行动。

请遵守：
1. 不要说“你一定会”“命中注定”“百分百”。
2. 不要制造恐惧。
3. 不要替用户做重大决定。
4. 不要直接给医疗、法律、投资确定建议。
5. 语言要温暖、清醒、直接，有一点神秘感，但不要神棍。
6. 必须结合用户问题、情绪、牌阵位置和牌义。
7. 必须返回合法 JSON。

用户问题：
{{question}}

用户情绪：
{{mood}}

牌阵：
{{spread}}

抽到的牌和牌义：
{{cardMeanings}}

返回 JSON 格式：
{
  "questionSummary": "",
  "intuitiveSummary": "",
  "cardReadings": [
    {
      "positionName": "",
      "cardName": "",
      "cardZhName": "",
      "orientation": "upright",
      "interpretation": ""
    }
  ],
  "contradiction": "",
  "overlookedFactor": "",
  "actionAdvice": "",
  "gentleReminder": "",
  "followUpSuggestions": []
}
```

---

### 15.2 Follow-up Prompt

```txt
你是 Mirror Tarot 的 AI 解读助手。

用户正在基于一次已有塔罗解读继续追问。
你必须基于原始问题、原始牌阵、抽到的牌、已有解读和对话历史回答。
不要重新抽牌。
不要编造新的牌。

原始问题：
{{question}}

原始牌阵：
{{spread}}

原始牌：
{{cards}}

已有解读：
{{reading}}

历史对话：
{{messages}}

用户追问：
{{message}}

回答要求：
1. 回答要自然，不要机械分点。
2. 可以直接指出用户可能忽略的问题。
3. 不要做确定性预测。
4. 最后给一个很小的现实行动。
```

---

## 16. MVP 范围

第一版必须做：

```txt
首页输入问题
情绪选择
牌阵选择
服务端抽牌
抽牌动画
AI 解读
结果页
登录
保存历史
日记列表
追问
```

第一版可以不做：

```txt
付费
社区
复杂 Agent
用户画像
AI 生成牌面
多牌组
真人塔罗师
复杂统计
每日推送
移动端 App
```

---

## 17. 开发优先级

### P0

```txt
Next.js 项目初始化
Supabase Auth 接入
cards.ts 牌义数据
spreads.ts 牌阵数据
drawCards 服务端抽牌
/api/reading
ReadingGraph
Qwen 调用
结果页
```

### P1

```txt
抽牌动画
日记列表
追问功能
收藏功能
RLS 策略
移动端适配
```

### P2

```txt
分享卡片
牌义库页面
每日一牌
英文版
多模型切换
```

---

## 18. 简历可写亮点

项目名称：

Mirror Tarot - AI Tarot Journal

项目描述：

基于 Next.js、Supabase、LangGraph、LangChain 和通义千问独立开发 AI 塔罗情绪日记应用。项目通过结构化塔罗牌义库和 LangGraph 编排流程，实现用户问题输入、服务端抽牌、牌义上下文构建、AI 结构化解读、历史日记保存和追问对话。产品定位为自我探索与情绪复盘工具，而不是确定性预测工具。

技术亮点：

```txt
1. 使用 Next.js App Router 构建全栈 AI 应用。
2. 使用 Supabase Auth + Postgres + RLS 实现用户系统和数据隔离。
3. 使用 LangGraph 将一次塔罗解读拆分为 validate、draw、context、generate、parse、persist 多节点流程。
4. 使用结构化牌义库约束模型输出，避免纯 LLM 幻觉式解读。
5. 使用通义千问 OpenAI-compatible API 接入国产大模型。
6. 使用 Framer Motion 实现抽牌、洗牌、翻牌等核心交互。
7. 支持历史日记、追问和后续分享卡片，形成完整产品闭环。
```

---

## 19. 判断

Mirror Tarot 第一版不应该做成复杂 Agent 产品。

它更应该是一个轻量但完成度高的 AI 情绪应用。

技术重心：

```txt
AI 解读质量
产品气质
抽牌体验
历史沉淀
追问体验
```

代码重心：

```txt
Next.js 全栈结构清晰
Supabase 数据模型稳定
LangGraph 编排可维护
Prompt 输出稳定
UI 组件复用度高
```

第一版只要把“问问题 → 抽牌 → 解读 → 保存 → 追问”做顺，就已经是一个可以展示、可以写进简历、可以继续商业化验证的作品。
