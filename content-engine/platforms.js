/**
 * Synapse Content Engine v3.0 — 多平台 + 分类 + 热点 + 人设
 * 基于用户《全网AI内容矩阵·终极落地执行手册》
 */

const PLATFORMS = {
  xiaohongshu: {
    key: "xiaohongshu", name: "小红书", icon: "📕", color: "#FF2442",
    description: "场景种草 + 视觉优先", format: "图文笔记",
    rules: {
      style: "网感化、情绪化、口语化。像和朋友聊天一样活泼。多用「绝绝子」「闭眼入」「踩雷」「天呐」等热词和感叹词。营造「向往感」或「实用感」。人称用「姐妹们」「宝子们」。",
      length: "300-800字，内容轻量化",
      title: "关键词 + 情绪词组合。案例：《黄皮女生必入！这5支口红显白到发光》（人群+情绪+数量+效果）",
      structure: "高颜值封面图 → 痛点引入 → 产品/方法推荐 → 效果对比 → 引导互动（点赞收藏评论）",
      format: "清单体 + 视觉化。多短句多换行。每句不超过20字。正文结尾加标签如 #显瘦穿搭 #夏季必备。emoji增强吸引力。",
      tone: "亲切、热情、种草感、真实分享感",
      hashtags: "必须包含3-5个相关话题标签"
    }
  },

  gongzhonghao: {
    key: "gongzhonghao", name: "公众号", icon: "💚", color: "#07C160",
    description: "深度内容 + 私域沉淀", format: "长图文",
    rules: {
      style: "专业感与温度感并重。保持客观分析（多用「建议」「趋势」），同时加入个人经历拉近距离。实用干货、行业洞察与情感共鸣。",
      length: "1500-3000字，系统性知识或深度情感价值",
      title: "激发「分享欲」——标题是社交裂变触发器。案例：《35岁被裁员后，我靠这个技能月入5万》（痛点+结果+身份标签）",
      structure: "引入（痛点场景化）→ 分析原因 → 提供解决方案 → 升华主题 → 引导关注/转发",
      format: "逻辑递进式排版。小标题分段；加粗关键词；每段3-5行，避免大段文字。善用引用/分隔线增强呼吸感。",
      tone: "专业、温暖、有深度的导师感"
    }
  },

  zhihu: {
    key: "zhihu", name: "知乎", icon: "🔵", color: "#0066FF",
    description: "专业解惑 + 观点碰撞", format: "长回答",
    rules: {
      style: "逻辑性 + 权威感。中立客观，多用「数据表明」「根据XX研究」「参考XX报告」。高信息密度和「收藏价值」。",
      length: "1500-5000字，结构化深度解答",
      title: "直接回答或提出深度问题。围绕「如何」「为什么」「是什么」。开头明确亮明观点或结论。",
      structure: "亮明观点 → 分点阐述（1.2.3.）→ 给出具体怎么做 → 总结建议 → 补充说明/争议讨论",
      format: "分点论述为核心。大量使用「1.2.3.」分层。引用块、代码块、表格增强专业性。每段开头用粗体概括要点。",
      tone: "理性、严谨、学术化但可读"
    }
  },

  douyin: {
    key: "douyin", name: "抖音脚本", icon: "🎵", color: "#010101",
    description: "短视频口播 + 前3秒抓人", format: "口播脚本",
    rules: {
      style: "口语化、快节奏、强互动。每句话简洁有力不超过15字。善用悬念、反转、对比等叙事技巧。",
      length: "15-60秒口播脚本，约80-300字。标注语速提示和画面切换。",
      title: "前3秒必须有「钩子」——痛点、悬念、冲突或惊人数据。如「90%的人都做错了这件事」",
      structure: "钩子开场（3秒）→ 问题/痛点展开 → 解决方案/干货 → 行动号召（关注/点赞）",
      format: "纯口语文本。标注【画面：XXX】【音效：XXX】【快/慢/重音】。每句独立成行。",
      tone: "亢奋、直白、有冲击力的短视频风格"
    }
  },

  bilibili: {
    key: "bilibili", name: "B站", icon: "💗", color: "#FB7299",
    description: "中长视频 + 弹幕文化 + 年轻社区", format: "视频脚本",
    rules: {
      style: "深度但不枯燥，专业但有梗。善用「梗文化」和网络流行语。语气真诚不做作，避免「爹味」说教。善用「兄弟们」「家人们」建立亲切感。",
      length: "5-15分钟视频脚本，约1000-3500字",
      title: "信息量 + 趣味性并重。标题党适度但不能过度。常见格式：《硬核拆解：XXX到底有多强》《关于XXX，99%的人不知道的真相》",
      structure: "炸裂开场（前30秒必须抓住）→ 提出问题 → 层层深入展开 → 核心观点/结论 → 三连引导（点赞投币收藏）",
      format: "视频脚本格式。标注【画面/素材建议】【转场效果】【BGM切入】。正文配弹幕预埋点（用[弹幕：]标注）。",
      tone: "真实、有态度、硬核但不枯燥、有网感",
      extras: "结尾必须有「三连暗示」和「关注不迷路」。善用「下次一定」等弹幕梗。"
    }
  },

  shipinhao: {
    key: "shipinhao", name: "微信视频号", icon: "👁️", color: "#FA9D3B",
    description: "社交裂变 + 中老年+中年受众", format: "短视频文案",
    rules: {
      style: "正能量、有温度、接地气。内容偏向实用生活智慧、情感共鸣、正能量激励。语言朴实但有力量。",
      length: "30-90秒视频脚本，约100-400字",
      title: "情感/正能量/实用导向。案例：《人到中年才明白的5个道理》或《这个方法，让你每天省下2小时》",
      structure: "共鸣开场 → 故事/案例 → 道理/感悟 → 正能量升华 → 引导转发（转发给需要的人）",
      format: "直白口播脚本。少用网络热词，多用生活化表达。标注【画面：实拍/素材】。",
      tone: "温暖、真诚、接地气、正能量",
      extras: "引导语用「转发给你关心的人」「点赞收藏给需要的人」。"
    }
  },

  kuaishou: {
    key: "kuaishou", name: "快手", icon: "🧡", color: "#FF4906",
    description: "老铁文化 + 真实接地气", format: "短视频口播",
    rules: {
      style: "极度口语化、真实感拉满。用「老铁」「咱」「整一个」等接地气表达。内容偏向「真实记录」「实用干货」「生活窍门」。",
      length: "15-60秒口播，约80-250字",
      title: "直接、接地气、有烟火气。案例：《老铁们，这个招儿你得学会》《干了10年才知道的窍门》",
      structure: "打招呼（老铁们！）→ 问题/场景 → 实用方法 → 演示/说明 → 互动（双击666/关注走一波）",
      format: "口语纯文本。标注【演示画面】【近景特写】。短句为主，少用书面语。",
      tone: "热情、豪爽、接地气、江湖气",
      extras: "互动引导用「双击屏幕」「关注走一波」「评论区唠唠」。"
    }
  },

  tiktok: {
    key: "tiktok", name: "TikTok", icon: "🎬", color: "#00F2EA",
    description: "国际化短视频 + 潮流文化", format: "Short video script (EN)",
    rules: {
      style: "Fast-paced, trendy, hook-driven. Use trending sounds and formats. Speak directly to camera with high energy. Use 'POV', 'wait for it', 'did you know' patterns.",
      length: "15-60 second script, 50-200 words. Include visual cues in [brackets].",
      title: "Hook in first 1-2 seconds. Use pattern interrupts, bold claims, or visual surprises. Text overlay is essential.",
      structure: "Hook (1-2s) → Context/Problem → Solution/Payoff → CTA (follow/like/comment)",
      format: "English script with [Visual] and [Sound] cues. Include text overlay suggestions. Keep sentences punchy.",
      tone: "Energetic, authentic, trend-savvy, relatable. Avoid corporate-speak.",
      extras: "Always include a strong CTA. Use relevant hashtags (3-5)."
    }
  },

  youtube: {
    key: "youtube", name: "YouTube", icon: "▶️", color: "#FF0000",
    description: "长视频深度内容 + 国际受众", format: "Long-form video script",
    rules: {
      style: "In-depth, well-researched, narrative-driven. Build authority through detailed analysis. Use storytelling frameworks (hero's journey, problem-solution).",
      length: "8-20 minute script, 1500-5000 words (English). Include timestamps/chapters.",
      title: "Searchable + clickable. Use keywords naturally. Format: 'The Truth About [Topic]' or 'How [Topic] Actually Works' or '[Topic] Explained in 10 Minutes'",
      structure: "Hook (30s) → Overview/Preview → Chapter 1 → Chapter 2 → Chapter 3 → Summary → CTA (subscribe/bell/comment)",
      format: "Full script with [B-roll suggestions], [Graphics needed], [Chapter markers]. Include SEO description text.",
      tone: "Authoritative, educational, engaging. Professional but not boring.",
      extras: "Include thumbnail concept suggestion, SEO title, description, and tags."
    }
  }
};

// ========== 五大内容方向 + 人设系统 ==========
const CATEGORIES = {
  hot_news: {
    key: "hot_news", name: "社会热点深度解析", icon: "🔥",
    persona: "全网情报官", personaTrait: "理性、客观、深度",
    contentElements: "事件导火索 + 发展脉络 + 深层归因 + 独家锐评",
    primaryPlatforms: ["douyin", "kuaishou", "shipinhao"],
    styleNotes: "新闻评论风格，客观理性但有锐度，引用权威数据和多方观点",
    hotSources: ["微博热搜", "今日头条热榜", "知乎热榜", "抖音热榜"],
    templates: {
      hooks: [
        "事件引爆型：「刚刚发生的{事件}，背后没那么简单」",
        "独家视角型：「关于{事件}，有一个重要角度被忽略了」",
        "争议切入型：「{事件}引发全网争议，我的观点是...」",
        "时间线梳理型：「{数字}分钟带你理清{事件}完整真相」"
      ],
      structures: [
        "深度复盘型：事件全貌 → 各方反应 → 深层归因 → 趋势预判 → 总结观点",
        "锐评型：事件简述 → 争议焦点 → 独家观点 → 论据支撑 → 读者互动"
      ],
      endings: [
        "观点引导：「你怎么看？评论区理性讨论」",
        "持续关注：「事件还在发展，关注我持续追踪」"
      ]
    }
  },
  ming_history: {
    key: "ming_history", name: "明朝历史与国学", icon: "🏯",
    persona: "大明穿越者", personaTrait: "风趣、考据严谨、民族自豪",
    contentElements: "颠覆认知的提问 + 历史故事 + 中西同期对比 + 现代启示",
    primaryPlatforms: ["bilibili", "youtube", "douyin"],
    styleNotes: "历史科普风格，幽默风趣但不失严谨，善用中西对比制造反差感",
    hotSources: ["知乎历史高赞", "B站历史区热门", "豆瓣历史小组"],
    templates: {
      hooks: [
        "颠覆认知型：「你可能想不到，明朝的{事物}比欧洲早了{数字}年」",
        "穿越代入型：「如果你穿越回{朝代}{年份}，你会看到...」",
        "中西对比型：「同时期的欧洲在{做什么}，而明朝已经在{做什么}」",
        "冷知识型：「关于{历史人物}，有{数字}件事历史书不会告诉你」"
      ],
      structures: [
        "故事叙事型：悬念提问 → 历史故事还原 → 中西同期对比 → 现代启示 → 趣味互动",
        "人物传记型：人物标签 → 颠覆性事实 → 成就与争议 → 历史评价 → 个人感悟",
        "制度解读型：制度简介 → 运作机制 → 优劣分析 → 中西对比 → 对今天的影响"
      ],
      endings: [
        "趣味提问：「如果你穿越回明朝，最想改变哪件事？」",
        "知识拓展：「下期想看哪个朝代？评论区点题」"
      ]
    }
  },
  urban_geo: {
    key: "urban_geo", name: "城市人文地理", icon: "🏙️",
    persona: "城市灵魂捕手", personaTrait: "温情、有底蕴、导游视角",
    contentElements: "热点/影视切入 + 地理决定性格 + 历史底蕴 + 烟火气",
    primaryPlatforms: ["xiaohongshu", "douyin", "shipinhao"],
    styleNotes: "人文旅行风格，温暖治愈，用影视/文学激发共鸣，注重画面感描述",
    hotSources: ["小红书同城热搜", "抖音同城榜", "马蜂窝/携程热门"],
    templates: {
      hooks: [
        "影视切入型：「看完{影视作品}，我终于去了趟{城市}」",
        "反差揭示型：「{城市}，一个被严重低估/高估的地方」",
        "地理密码型：「{城市}为什么会成为{特征}？答案在地图上」",
        "烟火气型：「在{城市}待了{数字}天，我找到了真正的{体验}」"
      ],
      structures: [
        "沉浸式游记：影视/热点切入 → 城市初印象 → 地理密码解读 → 人文底蕴 → 烟火气体验 → 攻略彩蛋",
        "对比解读型：两城对比引入 → 地理差异 → 人文差异 → 各自魅力 → 适合人群"
      ],
      endings: [
        "种草引导：「{城市}的{季节}最美，收藏起来到时候用」",
        "互动提问：「你的城市有什么隐藏宝藏？评论区安利给大家」"
      ]
    }
  },
  tech_frontier: {
    key: "tech_frontier", name: "全球科技前沿", icon: "🚀",
    persona: "未来科技观察员", personaTrait: "硬核、数据详实、前瞻性",
    contentElements: "硬核参数/突破点 + 行业颠覆性影响 + 全球技术对比 + 未来畅想",
    primaryPlatforms: ["bilibili", "youtube", "douyin"],
    styleNotes: "科技评论风格，数据驱动，逻辑严密，关注技术本质而非营销话术",
    hotSources: ["36氪热榜", "虎嗅", "IT之家", "B站科技区"],
    templates: {
      hooks: [
        "颠覆认知型：「{数字}%的人不知道，{技术}已经彻底改变了{行业}」",
        "悬念破题型：「{公司}刚刚发布的{产品}，可能让{对手}睡不着觉」",
        "趋势预判型：「2026年最值得关注的{数量}大科技突破，第{数字}个将改变一切」",
        "对比冲击型：「{中国技术} vs {国外技术}：差距还有多大？」"
      ],
      structures: [
        "数据炸弹型：惊人数据开场 → 技术原理拆解 → 行业影响分析 → 未来趋势预测 → 互动讨论",
        "故事叙事型：小故事引入 → 技术突破细节 → 对比全球水平 → 中国机会 → 个人观点",
        "硬核评测型：产品/技术参数 → 上手体验 → 优劣对比 → 适合人群 → 购买建议"
      ],
      endings: [
        "讨论引导：「你最看好哪个方向？评论区聊聊」",
        "信息增量：「关注我，每周拆解一个前沿科技」",
        "行动号召：「转发给你身边做科技的朋友」"
      ]
    }
  },
  ai_special: {
    key: "ai_special", name: "AI人工智能专版", icon: "🤖",
    persona: "AI情报局长", personaTrait: "新奇特展示、实操演示",
    contentElements: "最新AI工具/突破展示 + 实操演示 + 行业颠覆性 + 提效方法",
    primaryPlatforms: ["douyin", "xiaohongshu", "bilibili"],
    styleNotes: "科技实操风格，重演示轻说教，用「新奇特」吸引眼球，强调可操作性",
    hotSources: ["Product Hunt", "Hacker News", "机器之心", "量子位", "GitHub Trending"],
    templates: {
      hooks: [
        "效率震撼型：「这个AI工具，让我{职业}效率翻了{数字}倍」",
        "焦虑制造型：「{职业}注意，AI已经能替代你的{比例}%工作了」",
        "捡漏推荐型：「刚刚发现的{数量}个免费AI神器，先收藏再看」",
        "实操展示型：「{数字}分钟，用AI做完{任务}的全过程」",
        "对比测评型：「实测{数量}款AI{工具类型}，只有这{数字}款值得用」"
      ],
      structures: [
        "工具推荐型：痛点场景 → AI工具亮相 → 实操演示 → 效果对比 → 获取方式",
        "教程教学型：问题引入 → 分步教学(1/2/3) → 关键技巧 → 常见坑 → 进阶建议",
        "趋势解读型：最新动态 → 技术突破 → 行业影响 → 个人机会 → 行动建议"
      ],
      endings: [
        "资源分享：「工具链接放评论区了，自取」",
        "持续追踪：「关注局长，每天带你解锁一个AI神器」",
        "实操引导：「现在就打开试试，5分钟就能上手」"
      ]
    }
  },
  business: {
    key: "business", name: "商业财经", icon: "💼",
    persona: "财经评论专家", personaTrait: "犀利、有商业洞察力",
    contentElements: "商业案例 + 市场分析 + 投资逻辑 + 趋势预判",
    primaryPlatforms: ["zhihu", "gongzhonghao", "bilibili"],
    styleNotes: "专业财经分析风格，数据驱动，逻辑严谨",
    hotSources: ["36氪", "虎嗅", "华尔街见闻"],
    templates: { hooks: [], structures: [] }
  },
  career: {
    key: "career", name: "职场成长", icon: "📈",
    persona: "职业发展顾问", personaTrait: "务实、鼓励、有方法论",
    contentElements: "职场技能 + 晋升策略 + 行业洞察 + 成长故事",
    primaryPlatforms: ["xiaohongshu", "douyin", "zhihu"],
    styleNotes: "实用主义风格，可操作性强，有温度",
    hotSources: ["LinkedIn", "脉脉"],
    templates: { hooks: [], structures: [] }
  },
  emotion: {
    key: "emotion", name: "情感心理", icon: "💜",
    persona: "情感心理导师", personaTrait: "温暖、专业、有共情力",
    contentElements: "情感分析 + 心理洞察 + 关系建议 + 自我成长",
    primaryPlatforms: ["xiaohongshu", "douyin", "gongzhonghao"],
    styleNotes: "温柔治愈风，心理学专业视角",
    hotSources: ["壹心理", "简单心理"],
    templates: { hooks: [], structures: [] }
  },
  local_life: {
    key: "local_life", name: "本地生活", icon: "🏪",
    persona: "本地生活推荐官", personaTrait: "接地气、实用、有烟火气",
    contentElements: "探店测评 + 生活攻略 + 吃喝玩乐 + 本地资讯",
    primaryPlatforms: ["xiaohongshu", "douyin", "kuaishou"],
    styleNotes: "亲切接地气风格，种草感强，实用导向",
    hotSources: ["大众点评", "小红书本地", "抖音同城"],
    templates: { hooks: [], structures: [] }
  },
  education: {
    key: "education", name: "教育培训", icon: "📚",
    persona: "教育领域专家顾问", personaTrait: "专业、系统、有启发性",
    contentElements: "学习方法 + 考试干货 + 知识科普 + 成长路径",
    primaryPlatforms: ["zhihu", "bilibili", "gongzhonghao"],
    styleNotes: "专业但不枯燥，知识密度高，循循善诱",
    hotSources: ["得到", "樊登读书", "B站知识区"],
    templates: { hooks: [], structures: [] }
  }
};

// ========== 热点来源配置 ==========
const HOT_SOURCES = {
  weibo: { name: "微博热搜", url: "https://weibo.com/ajax/side/hotSearch", type: "api" },
  toutiao: { name: "今日头条热榜", url: "https://www.toutiao.com/hot-event/hot-board/", type: "web" },
  zhihu_hot: { name: "知乎热榜", url: "https://www.zhihu.com/hot", type: "web" },
  douyin_hot: { name: "抖音热榜", url: "https://www.douyin.com/hot", type: "web" },
  _36kr: { name: "36氪热榜", url: "https://36kr.com/hot-list", type: "web" },
  huxiu: { name: "虎嗅", url: "https://www.huxiu.com/", type: "web" },
  ithome: { name: "IT之家", url: "https://www.ithome.com/", type: "web" },
  bilibili_hot: { name: "B站热门", url: "https://api.bilibili.com/x/web-interface/popular", type: "api" },
  producthunt: { name: "Product Hunt", url: "https://api.producthunt.com/v2/api/graphql", type: "api" },
  hackernews: { name: "Hacker News", url: "https://hacker-news.firebaseio.com/v0/topstories.json", type: "api" },
  github_trending: { name: "GitHub Trending", url: "https://github.com/trending", type: "web" },
  jiqizhixin: { name: "机器之心", url: "https://www.jiqizhixin.com/", type: "web" },
  liangziwei: { name: "量子位", url: "https://www.qbitai.com/", type: "web" }
};

// 导出
module.exports = { PLATFORMS, CATEGORIES, HOT_SOURCES };
