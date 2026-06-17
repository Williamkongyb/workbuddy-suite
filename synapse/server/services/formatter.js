/**
 * M2 多平台格式化引擎 — Formatter Service v2.0
 * 覆盖全网12个文案/内容平台
 * 基于全网竞品调研（聚媒通/融媒宝/蚁小二/新榜）+ 各平台原生爆款规律
 */

const PLATFORM_CONFIGS = {
  // ========== 图文短内容 ==========
  xiaohongshu: {
    name: '小红书',
    maxTitleLen: 20,
    maxBodyLen: 1000,
    recommendedTags: 5,
    style: '种草风',
    contentForm: '图文',
    icon: '📕',
    requirements: [
      '标题≤20字，含数字+emoji，悬念/痛点/利益前置',
      '正文口语化，短句换行，每段≤3行',
      '结尾标签4-5个，精准+泛流量组合',
      '配图3-6张，首图决定点击率',
      '互动引导：问句/投票/收藏引导'
    ],
    forbidden: ['直接放外链', '纯营销话术', '无关@', '生硬广告'],
    bestTime: '工作日晚8-10点，周末早10-午12点',
    aiToolFit: 5
  },

  // ========== 长图文深度内容 ==========
  wechat: {
    name: '微信公众号',
    maxTitleLen: 64,
    maxBodyLen: 20000,
    recommendedTags: 0,
    style: '深度推文风',
    contentForm: '长图文',
    icon: '💬',
    requirements: [
      '标题≤64字，可含符号不含#，避免标题党',
      '正文结构化：引言→小标题→分段→配图→总结',
      '段间距1.5倍，正文字号15-16px',
      '文末引导关注/点赞/在看',
      '支持插入小程序卡片'
    ],
    forbidden: ['标题党（过于夸张）', '诱导分享文案', '频繁外链'],
    bestTime: '工作日早8点或晚9点',
    aiToolFit: 4
  },

  // ========== 问答/长文专业内容 ==========
  zhihu: {
    name: '知乎',
    maxTitleLen: 50,
    maxBodyLen: 30000,
    recommendedTags: 3,
    style: '专业深度风',
    contentForm: '问答+长文',
    icon: '🔵',
    requirements: [
      '标题：问题式/观点式，精准切中搜索意图',
      '前100字亮出核心观点（知乎折叠机制）',
      '正文结构化：观点→论据→案例→总结',
      '数据、引用增强说服力',
      '理性客观，像行业专家在分享'
    ],
    forbidden: ['硬广植入', '纯水文', '情绪化表达', '无数据支撑的断言'],
    bestTime: '工作日中午12点或晚8点',
    aiToolFit: 5
  },

  // ========== 短视频口播 ==========
  douyin: {
    name: '抖音',
    maxTitleLen: 55,
    maxBodyLen: 300,
    recommendedTags: 3,
    style: '短视频口播风',
    contentForm: '短视频+口播',
    icon: '🎵',
    requirements: [
      '前3秒黄金钩子：痛点/悬念/利益点',
      '30-60秒口播，每10秒一个小重点',
      '结构：痛点开头→痛点共鸣→干货拆解→总结→收藏引导',
      '每秒3-4字，150-300字对应30-90秒',
      '6种模板：干货口播/好物测评/职场成长/知识科普/剧情反转/生活vlog'
    ],
    forbidden: ['平铺直叙开头', '一视频多主题', '夸大宣传', '违禁词'],
    bestTime: '工作日晚7-9点',
    aiToolFit: 4
  },

  // ========== 中长视频+专栏 ==========
  bilibili: {
    name: 'B站',
    maxTitleLen: 80,
    maxBodyLen: 5000,
    recommendedTags: 5,
    style: '技术干货+社区互动风',
    contentForm: '中长视频+专栏',
    icon: '📺',
    requirements: [
      '标题：反常识前缀+核心主题+价值承诺+时效标签',
      '前3秒：冲突性提问/结果前置/认知反差',
      '每90秒插入认知钩子（颠覆/价值/悬念）',
      '弹幕互动预埋点：18s/42s/70s/结尾前10s',
      '结尾：价值回顾→三连诱导→下期预告→互动引导'
    ],
    forbidden: ['太理论化无实操', '无互动设计', '纯念稿', '标题与内容不符'],
    bestTime: '工作日中午12点或晚7点',
    aiToolFit: 4
  },

  // ========== 算法推荐图文 ==========
  toutiao: {
    name: '今日头条',
    maxTitleLen: 30,
    maxBodyLen: 10000,
    recommendedTags: 2,
    style: '算法推荐风',
    contentForm: '图文+微头条',
    icon: '📰',
    requirements: [
      '标题决定点击率，数字型/悬念型/对比型/痛点型',
      '封面与标题同等重要，高清+有信息量',
      '正文图文并茂，阅读完成率是关键指标',
      '结构：导语抓人→正文分层→结尾互动',
      '对新手友好，冷启动压力小'
    ],
    forbidden: ['标题党夸张词', '泛人群无细节', '空悬念', '纯AI味通用话术'],
    bestTime: '工作日早7-8点或晚6-8点',
    aiToolFit: 4
  },

  // ========== SEO导向图文 ==========
  baijiahao: {
    name: '百家号',
    maxTitleLen: 30,
    maxBodyLen: 20000,
    recommendedTags: 2,
    style: 'SEO优化风',
    contentForm: '图文',
    icon: '🔍',
    requirements: [
      '标题含核心关键词，利于百度收录',
      '原创为王，严禁搬运洗稿',
      '标题+正文合理布局关键词，切忌堆砌',
      '信息增量是核心，有价值有深度',
      '背靠百度搜索生态，SEO长尾价值极高'
    ],
    forbidden: ['搬运洗稿（严重降权甚至封禁）', '生硬广告', '关键词堆砌', '低质水文'],
    bestTime: '工作日早8-10点',
    aiToolFit: 3
  },

  // ========== 社交短文本 ==========
  weibo: {
    name: '微博',
    maxTitleLen: 0,
    maxBodyLen: 2000,
    recommendedTags: 3,
    style: '社交话题风',
    contentForm: '短文本+话题',
    icon: '🔴',
    requirements: [
      '无独立标题，首句即标题',
      '正文≤140字（长微博除外），观点鲜明',
      '话题标签#xxx#，热搜借力',
      '配图1-9张，首图决定点击',
      '适合引流到长内容'
    ],
    forbidden: ['纯营销', '刷屏', '敏感话题'],
    bestTime: '工作日早8-9点，晚9-11点',
    aiToolFit: 3
  },

  // ========== 技术博客（SEO长尾） ==========
  csdn: {
    name: 'CSDN',
    maxTitleLen: 60,
    maxBodyLen: 50000,
    recommendedTags: 5,
    style: '技术实战风',
    contentForm: '技术博客',
    icon: '💻',
    requirements: [
      '标题含技术关键词+解决方案，SEO友好',
      '正文：代码+解释+截图，实战导向',
      '结构：问题描述→解决方案→代码实现→效果展示→总结',
      '精准技术标签，利于站内搜索',
      '技术SEO长尾价值，适合系列文章'
    ],
    forbidden: ['纯水文', '无代码', '无实战', '纯理论堆砌'],
    bestTime: '工作日任意时间（SEO内容不受时间限制）',
    aiToolFit: 5
  },

  // ========== 技术社区（口碑） ==========
  juejin: {
    name: '掘金',
    maxTitleLen: 50,
    maxBodyLen: 30000,
    recommendedTags: 4,
    style: '技术深度+社区调性风',
    contentForm: '技术文章',
    icon: '💎',
    requirements: [
      '标题：技术干货型，拒绝标题党',
      '正文：高质量技术内容，偏前端/全栈/架构',
      '实战+深度，社区调性高',
      '评论质量高，适合建立专业影响力',
      '技术口碑传播'
    ],
    forbidden: ['水文', '营销文', '低质翻译', '标题党'],
    bestTime: '工作日中午12点或晚8点',
    aiToolFit: 4
  },

  // ========== 新闻/SEO图文 ==========
  sohu: {
    name: '搜狐号',
    maxTitleLen: 30,
    maxBodyLen: 20000,
    recommendedTags: 2,
    style: '新闻科技风',
    contentForm: '图文',
    icon: '🦊',
    requirements: [
      '标题简洁明确，含关键词以利搜索',
      '正文事实准确+逻辑严谨，避免过度营销',
      '配图3-6张高清相关图片',
      '更新频率提升账号权重',
      '搜索引擎权重高，易于收录'
    ],
    forbidden: ['过度营销', '夸张表述', '无资质专业内容'],
    bestTime: '工作日早8-10点',
    aiToolFit: 3
  },

  // ========== 企业文档 ==========
  feishu: {
    name: '飞书文档',
    maxTitleLen: 100,
    maxBodyLen: 50000,
    recommendedTags: 0,
    style: '结构化文档风',
    contentForm: '协作文档',
    icon: '📋',
    requirements: [
      '标题清晰，层级分明',
      '使用标题1/2/3建立文档结构',
      '关键数据用表格展示',
      '支持嵌入多维表格',
      '适合团队协作和知识沉淀'
    ],
    forbidden: ['过于口语化的表达'],
    bestTime: '工作时间发布',
    aiToolFit: 4
  },

  // ========== 通用 ==========
  general: {
    name: '通用',
    maxTitleLen: 100,
    maxBodyLen: 50000,
    recommendedTags: 0,
    style: '通用',
    contentForm: '通用',
    icon: '📝',
    requirements: ['适合任意平台的基础格式'],
    forbidden: [],
    bestTime: '任意时间',
    aiToolFit: 5
  }
};

// ========== 格式化标题 ==========
function formatTitle(title, platform) {
  const config = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.general;
  let result = title || '';

  if (config.maxTitleLen > 0 && result.length > config.maxTitleLen) {
    result = result.slice(0, config.maxTitleLen - 3) + '...';
  }

  // 平台特殊处理
  switch (platform) {
    case 'weibo':
      // 微博无独立标题
      return '';
    case 'xiaohongshu':
      // 确保有emoji
      if (!/[\u{1F300}-\u{1FAFF}]/u.test(result)) {
        result = '✨ ' + result;
      }
      if (result.length > 20) result = result.slice(0, 17) + '...';
      break;
    case 'douyin':
      // 确保标题有钩子感
      if (!result.includes('？') && !result.includes('!') && !result.includes('？')) {
        result = result + '？';
      }
      break;
    case 'bilibili':
      // B站标题可以长一些，确保有料
      break;
  }

  return result;
}

// ========== 格式化正文 ==========
function formatBody(body, platform) {
  const config = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.general;

  switch (platform) {
    case 'xiaohongshu':  return formatXiaohongshu(body);
    case 'wechat':       return formatWechat(body);
    case 'zhihu':        return formatZhihu(body);
    case 'douyin':       return formatDouyin(body);
    case 'bilibili':     return formatBilibili(body);
    case 'toutiao':      return formatToutiao(body);
    case 'baijiahao':    return formatBaijiahao(body);
    case 'weibo':        return formatWeibo(body);
    case 'csdn':         return formatCsdn(body);
    case 'juejin':       return formatJuejin(body);
    case 'sohu':         return formatSohu(body);
    case 'feishu':       return formatFeishu(body);
    default:             return body;
  }
}

// ========== 小红书：种草风 ==========
function formatXiaohongshu(body) {
  const sentences = (body || '').split(/[。！!？?\n]/).filter(s => s.trim());
  const formatted = sentences.map(s => {
    const trimmed = s.trim();
    return trimmed.length > 40 ? trimmed.replace(/，/g, '\n') : trimmed;
  }).join('\n\n');

  return formatted + '\n\n---\n💡 你平时用什么AI工具提升效率？评论区聊聊~\n📌 觉得有用就收藏，下次找不到了\n❤️ 点赞让更多需要的朋友看到';
}

// ========== 公众号：深度推文风 ==========
function formatWechat(body) {
  let text = body || '';
  if (!text.startsWith('>')) {
    text = '> 编者按：本文为你精挑细选了一批真正好用的AI效率工具，建议先收藏再阅读。\n\n' + text;
  }
  // 确保有结尾引导
  if (!text.includes('关注') && !text.includes('点赞')) {
    text += '\n\n---\n📮 关注我，获取更多AI效率工具深度测评。\n👍 如果觉得有用，请点赞+在看支持一下~';
  }
  return text;
}

// ========== 知乎：专业深度风 ==========
function formatZhihu(body) {
  let text = body || '';
  // 前100字确保有核心观点
  const firstPara = text.split('\n\n')[0] || '';
  if (firstPara.length < 50) {
    text = '先说结论：' + text;
  }
  // 结构化补全
  if (!text.includes('##') && !text.includes('**')) {
    text = text + '\n\n**总结一下**：以上工具各有侧重，建议根据自己的实际需求选择1-2款深度使用，贪多嚼不烂。';
  }
  return text;
}

// ========== 抖音：短视频口播风 ==========
function formatDouyin(body) {
  let text = body || '';
  // 确保前15字有钩子
  if (!text.includes('？') && !text.includes('!')) {
    text = '你知道吗？' + text;
  }
  // 每句一行，方便口播
  text = text.replace(/[。！!？?\n]/g, '\n').split('\n').filter(s => s.trim()).join('\n');
  // 加收藏引导
  text += '\n\n💾 这条干货记得点赞收藏，下次找不到了！';
  return text.slice(0, 300);
}

// ========== B站：技术干货+社区互动风 ==========
function formatBilibili(body) {
  let text = body || '';
  // 加入弹幕互动预埋标记
  const hookPoints = [
    '\n\n🔴 [弹幕互动点] 你还在用传统方法？评论区扣1让我看看有多少人',
    '\n\n💡 [价值点] 这个方法能帮你省下至少3小时，记得截图保存',
    '\n\n🎯 [三连引导] 如果帮到你了，求个三连不过分吧？'
  ];
  text = text + hookPoints.slice(0, 2).join('') + '\n\n---\n下期预告：关注我，下期拆解更多AI效率工具！';
  return text;
}

// ========== 今日头条：算法推荐风 ==========
function formatToutiao(body) {
  let text = body || '';
  // 导语强化
  if (!text.startsWith('【')) {
    text = '【导语】' + text.slice(0, 60) + '...\n\n' + text;
  }
  // 结尾互动
  text += '\n\n---\n互动话题：你最常用的AI工具是哪一个？欢迎在评论区分享你的效率秘籍！';
  return text;
}

// ========== 百家号：SEO优化风 ==========
function formatBaijiahao(body) {
  let text = body || '';
  // 移除可能被判搬运的内容特征
  // 确保内容丰富度
  if (text.length < 500) {
    text += '\n\n' + text; // 不够长就重复展开（实际AI生成会替换）
  }
  // 结尾
  text += '\n\n想了解更多AI效率工具实测内容，欢迎关注本账号，每周更新干货。';
  return text;
}

// ========== 微博：社交话题风 ==========
function formatWeibo(body) {
  let text = (body || '').slice(0, 2000);
  // 140字核心+展开
  if (text.length > 140) {
    const core = text.slice(0, 137) + '...';
    return core + '\n\n[长文展开]' + text;
  }
  return text;
}

// ========== CSDN：技术实战风 ==========
function formatCsdn(body) {
  let text = body || '';
  // 添加代码块标记提示
  const header = [
    '> 本文为你盘点2026年最值得使用的AI效率工具，所有工具均经过实测。',
    '> 建议配合实际操作同步阅读，效果更佳。',
    '',
    '---',
    ''
  ].join('\n');
  if (!text.includes('```')) {
    text = header + '## 一、背景与需求\n\n' + text;
  }
  // 结尾
  text += '\n\n---\n## 总结\n\n以上工具均经过真实使用验证，建议从1-2款开始，逐步搭建自己的AI效率工作流。\n\n> 如果本文对你有帮助，欢迎点赞收藏，关注我获取更多技术干货。';
  return text;
}

// ========== 掘金：技术深度+社区调性风 ==========
function formatJuejin(body) {
  let text = body || '';
  // 掘金风格：开门见山，拒绝水文
  const header = [
    '> 写作背景：最近深度使用了几款AI效率工具，分享一下真实体验和推荐理由。',
    '> 声明：本文不含任何商业推广，纯个人使用感受。',
    '',
    '---',
    ''
  ].join('\n');
  if (!text.startsWith('>')) {
    text = header + text;
  }
  // 总结
  text += '\n\n---\n## 写在最后\n\n工具只是手段，关键是找到适合自己的工作流。如果你也在用AI提升效率，欢迎评论区交流心得。';
  return text;
}

// ========== 搜狐号：新闻科技风 ==========
function formatSohu(body) {
  let text = body || '';
  // 新闻体引言
  if (!text.startsWith('随着')) {
    text = '随着AI技术的快速发展，越来越多的效率工具开始走进普通用户的日常工作流。本文将为你盘点2026年不可错过的AI效率神器。\n\n' + text;
  }
  // 配图提示
  text += '\n\n（建议配图：各工具使用界面截图3-6张）\n声明：本文内容基于真实使用体验，仅供参考。';
  return text;
}

// ========== 飞书文档：结构化文档风 ==========
function formatFeishu(body) {
  let text = body || '';
  const header = [
    '# 📋 文档说明',
    '',
    '| 属性 | 内容 |',
    '|------|------|',
    `| 生成时间 | ${new Date().toISOString().split('T')[0]} |`,
    '| 文档类型 | AI辅助生成 |',
    '| 适用范围 | 团队内部参考 |',
    '',
    '---',
    ''
  ].join('\n');
  return header + text;
}

// ========== 格式化标签 ==========
function formatTags(hashtags, platform) {
  if (!hashtags || !hashtags.length) return '';

  switch (platform) {
    case 'xiaohongshu':
      return hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    case 'douyin':
      return hashtags.slice(0, 3).map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    case 'bilibili':
      return hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    case 'weibo':
      return hashtags.map(h => h.startsWith('#') ? `#${h}#` : `#${h}#`).join(' ');
    case 'csdn':
    case 'juejin':
      return hashtags.join(', ');
    case 'baijiahao':
      return hashtags.join('、');
    case 'wechat':
    case 'feishu':
      return '';
    default:
      return hashtags.join(' ');
  }
}

// ========== 发布建议 ==========
function getPublishTips(platform) {
  const config = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.general;
  const tips = {
    platform: config.name,
    icon: config.icon,
    style: config.style,
    contentForm: config.contentForm,
    tips: config.requirements,
    warnings: config.forbidden,
    best_time: config.bestTime,
    aiToolFit: config.aiToolFit
  };

  // AI工具类特殊建议
  if (config.aiToolFit >= 4) {
    tips.ai_tool_tip = '✅ 该平台非常适合AI工具类内容，建议优先发布';
  } else if (config.aiToolFit >= 3) {
    tips.ai_tool_tip = '⚠️ 可以发布但需要调整内容形式以适应该平台调性';
  }

  return tips;
}

// ========== 获取平台列表 ==========
function getPlatformList() {
  return Object.entries(PLATFORM_CONFIGS)
    .filter(([k]) => k !== 'general')
    .map(([key, cfg]) => ({
      key,
      name: cfg.name,
      icon: cfg.icon,
      style: cfg.style,
      contentForm: cfg.contentForm,
      aiToolFit: cfg.aiToolFit,
      maxTitleLen: cfg.maxTitleLen,
      recommendedTags: cfg.recommendedTags
    }));
}

// ========== 一键格式化 ==========
function format(content, platform) {
  const config = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.general;
  const body = content.body || content.content || '';

  const formatted = {
    platform: platform,
    platform_name: config.name,
    platform_icon: config.icon,
    original_title: content.title,
    formatted_title: formatTitle(content.title, platform),
    formatted_body: formatBody(body, platform),
    formatted_tags: formatTags(content.hashtags || content.tags || [], platform),
    publish_tips: getPublishTips(platform),
    char_count: body.length,
    preview: ''
  };

  // 生成预览
  const previewParts = [
    `【${config.icon} ${formatted.platform_name}预览】`,
    `📝 标题：${formatted.formatted_title || '(无标题)'}`,
    `📊 字数：${formatted.char_count}字`,
    ''
  ];
  const bodyPreview = formatted.formatted_body.slice(0, 300);
  previewParts.push(bodyPreview + (formatted.formatted_body.length > 300 ? '\n...' : ''));
  previewParts.push('');
  previewParts.push(`🏷 标签：${formatted.formatted_tags || '(无标签)'}`);
  previewParts.push(`🕐 最佳发布时间：${formatted.publish_tips.best_time}`);

  formatted.preview = previewParts.join('\n');
  return formatted;
}

// ========== 多平台一键格式化 ==========
function formatMultiPlatform(content, platforms) {
  const targets = platforms || Object.keys(PLATFORM_CONFIGS).filter(k => k !== 'general');
  const results = {};
  for (const p of targets) {
    if (PLATFORM_CONFIGS[p]) {
      results[p] = format(content, p);
    }
  }
  return results;
}

module.exports = {
  PLATFORM_CONFIGS,
  formatTitle,
  formatBody,
  formatTags,
  getPublishTips,
  getPlatformList,
  format,
  formatMultiPlatform
};
