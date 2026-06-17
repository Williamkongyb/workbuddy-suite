/**
 * Rewriter — 改写/润色/降重引擎 v1.0
 * 对标: 秘塔写作猫 (¥99/月 核心功能)
 * 
 * 三种模式:
 * - rewrite: 保留原意，换表达方式（输出3种风格变体）
 * - polish: 优化语句流畅度 + 增加网感
 * - dedup: 同义替换 + 结构调整（降重/抄袭规避）
 */

const generator = require('./generator');

/**
 * 改写模式 — 输出3种风格变体
 */
async function rewrite(content, options = {}) {
  const { style = 'auto', platform = 'xiaohongshu' } = options;
  const text = typeof content === 'string' ? content : content.body || JSON.stringify(content);
  const title = typeof content === 'object' ? content.title : '';

  const systemPrompt = `你是一位资深文案改写专家，擅长用不同风格表达同一核心内容。
你的改写要求：
- 保留原文核心信息和关键卖点
- 换一种全新的表达方式，不要只是替换几个词
- 保持${platform}平台的内容调性
- 输出3种不同风格的变体`;

  const userPrompt = `${title ? `【原标题】${title}\n\n` : ''}【原文案】
${text}

请将以上内容改写成3种不同风格（每种风格独立完整）：

风格1: «网感爆款风» — 短句、emoji、口语化、节奏快、适合小红书/抖音
风格2: «专业干货风» — 逻辑清晰、有数据/案例支撑、适合知乎/公众号
风格3: «温暖走心风» — 故事感、情感共鸣、适合情感/生活类内容

每种变体需包含标题和正文，对应用${platform}平台的格式规范。
请严格按JSON格式输出：
{
  "variants": [
    {"style": "网感爆款", "title": "...", "body": "..."},
    {"style": "专业干货", "title": "...", "body": "..."},
    {"style": "温暖走心", "title": "...", "body": "..."}
  ]
}`;

  try {
    const response = await generator.callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.8);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { variants: [{ style: '原始', title, body: response }] };

    return {
      mode: 'rewrite',
      original: { title, body: text.substring(0, 200) + '...' },
      variants: result.variants || [],
      generated_at: new Date().toISOString()
    };
  } catch (e) {
    throw new Error(`改写失败: ${e.message}`);
  }
}

/**
 * 润色模式 — 优化流畅度 + 增加网感
 */
async function polish(content, options = {}) {
  const { platform = 'xiaohongshu', intensity = 'medium' } = options;
  const text = typeof content === 'string' ? content : content.body || JSON.stringify(content);
  const title = typeof content === 'object' ? content.title : '';

  const intensityMap = {
    light: '轻度润色：修正语病、优化不通顺的句子，保持原文风格',
    medium: '中度润色：优化句式结构、增加阅读节奏、适度增加网感表达',
    heavy: '重度润色：大幅改写句式、注入强烈网感、增加emoji和互动元素'
  };

  const systemPrompt = `你是一位资深文案润色师，擅长让文字更有"人味"和可读性。

润色原则：
1. 消灭长句 - 超过20字的句子拆成短句
2. 增加节奏 - 长短句交替，像在说话
3. 适度网感 - 口语化但不油腻
4. 保留干货 - 核心信息和数据不能丢
5. 平台适配 - 符合${platform}平台的风格

${intensityMap[intensity] || intensityMap.medium}`;

  const userPrompt = `请润色以下内容：

${title ? `【标题】${title}\n\n` : ''}【待润色内容】
${text}

请按JSON格式输出：
{
  "title": "润色后的标题",
  "body": "润色后的正文",
  "improvements": ["优化点1", "优化点2", "优化点3"],
  "changes_summary": "一句话总结做了什么改动"
}`;

  try {
    const response = await generator.callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.6);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { title, body: response, improvements: [], changes_summary: 'AI润色完成' };

    return {
      mode: 'polish',
      intensity,
      original: { title, body_preview: text.substring(0, 200) + '...' },
      polished: result,
      generated_at: new Date().toISOString()
    };
  } catch (e) {
    throw new Error(`润色失败: ${e.message}`);
  }
}

/**
 * 降重模式 — 同义替换 + 结构重组（对标论文查重规避）
 */
async function dedup(content, options = {}) {
  const { platform = 'xiaohongshu' } = options;
  const text = typeof content === 'string' ? content : content.body || JSON.stringify(content);
  const title = typeof content === 'object' ? content.title : '';

  const systemPrompt = `你是一位内容降重专家，专门对已有文案进行深度改写以规避抄袭检测。

降重策略（按优先级）：
1. 同义替换 — 关键词换成同义词（如"提升"→"拉高"、"效果"→"成效"）
2. 句式重组 — 把"因为...所以..."改成"...，这意味着..."
3. 结构重排 — 调整段落顺序和数据组织方式
4. 视角转换 — 把"你应该"改成"我建议"、把说法改成问句
5. 案例替换 — 保留观点，换一个新的例子

重要：保留原文的核心观点和信息量，只改变"怎么说"，不改变"说什么"。
平台风格：${platform}`;

  const userPrompt = `请对以下内容进行降重处理：

${title ? `【原标题】${title}\n\n` : ''}【待降重内容】
${text}

请按JSON格式输出：
{
  "title": "降重后的标题",
  "body": "降重后的正文",
  "dedup_ratio": "预估降重率（如 75%）",
  "changes": ["具体改了哪里1", "具体改了哪里2"],
  "keywords_replaced": {"原词1": "替换为", "原词2": "替换为"}
}`;

  try {
    const response = await generator.callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.7);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { title, body: response, dedup_ratio: '未知', changes: [], keywords_replaced: {} };

    return {
      mode: 'dedup',
      original: { title, body_preview: text.substring(0, 200) + '...' },
      deduped: result,
      generated_at: new Date().toISOString()
    };
  } catch (e) {
    throw new Error(`降重失败: ${e.message}`);
  }
}

module.exports = {
  rewrite,
  polish,
  dedup
};
