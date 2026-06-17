/**
 * Scheduler — 内容排期系统 v1.0
 * 对标: 聚媒通定时发布 + 小豆芽批量定时
 * 
 * 功能:
 * 1. 内容草稿箱 — 保存待发布内容
 * 2. 定时发布计划 — 选择平台+时间
 * 3. 发布队列可视化 — 今日/本周待发布
 * 4. 暂不做实际API自动发布（需各平台授权）
 */

const fs = require('fs');
const path = require('path');

const SCHEDULE_PATH = path.join(__dirname, '..', 'data', 'schedule-queue.json');

/**
 * 加载排期队列
 */
function loadQueue() {
  try {
    if (fs.existsSync(SCHEDULE_PATH)) {
      return JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return { drafts: [], schedule: [], version: '1.0' };
}

function saveQueue(queue) {
  const dir = path.dirname(SCHEDULE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(queue, null, 2), 'utf-8');
  return queue;
}

/**
 * 保存草稿
 */
function saveDraft(draft) {
  const queue = loadQueue();
  const newDraft = {
    id: `draft-${Date.now()}`,
    title: draft.title || '',
    body: draft.body || '',
    platform: draft.platform || 'xiaohongshu',
    hashtags: draft.hashtags || [],
    keywords: draft.keywords || [],
    category: draft.category || '通用',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 如果传了id，说明是更新
  if (draft.id) {
    const idx = queue.drafts.findIndex(d => d.id === draft.id);
    if (idx >= 0) {
      queue.drafts[idx] = { ...queue.drafts[idx], ...draft, updated_at: new Date().toISOString() };
      saveQueue(queue);
      return queue.drafts[idx];
    }
  }

  queue.drafts.push(newDraft);
  saveQueue(queue);
  return newDraft;
}

/**
 * 获取所有草稿
 */
function getDrafts(options = {}) {
  const { status, platform, category } = options;
  const queue = loadQueue();
  let drafts = queue.drafts;

  if (status) drafts = drafts.filter(d => d.status === status);
  if (platform) drafts = drafts.filter(d => d.platform === platform);
  if (category) drafts = drafts.filter(d => d.category === category);

  return drafts.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

/**
 * 删除草稿
 */
function deleteDraft(id) {
  const queue = loadQueue();
  const idx = queue.drafts.findIndex(d => d.id === id);
  if (idx === -1) return null;
  const removed = queue.drafts.splice(idx, 1)[0];
  saveQueue(queue);
  return removed;
}

/**
 * 添加排期
 */
function addSchedule(item) {
  const queue = loadQueue();

  // 从草稿转过来
  let content = { title: item.title, body: item.body, hashtags: item.hashtags, keywords: item.keywords };
  if (item.draft_id) {
    const draft = queue.drafts.find(d => d.id === item.draft_id);
    if (draft) {
      content = { ...content, ...draft };
      // 标记草稿为已排期
      draft.status = 'scheduled';
      draft.updated_at = new Date().toISOString();
    }
  }

  const scheduled = {
    id: `sched-${Date.now()}`,
    draft_id: item.draft_id || null,
    title: content.title || item.title,
    body: content.body || item.body,
    platform: item.platform || 'xiaohongshu',
    hashtags: content.hashtags || item.hashtags || [],
    keywords: content.keywords || item.keywords || [],
    scheduled_at: item.scheduled_at || new Date(Date.now() + 3600000).toISOString(),
    status: 'pending', // pending | published | cancelled
    recurrence: item.recurrence || null, // 'daily' | 'weekly' | null
    created_at: new Date().toISOString(),
    published_at: null
  };

  queue.schedule.push(scheduled);
  saveQueue(queue);
  return scheduled;
}

/**
 * 获取排期队列
 */
function getScheduleQueue(options = {}) {
  const { status, platform, time_range } = options;
  const queue = loadQueue();
  let items = queue.schedule;

  if (status) items = items.filter(s => s.status === status);
  if (platform) items = items.filter(s => s.platform === platform);

  if (time_range === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    items = items.filter(s => {
      const d = new Date(s.scheduled_at);
      return d >= start && d <= end;
    });
  } else if (time_range === 'this_week') {
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    items = items.filter(s => {
      const d = new Date(s.scheduled_at);
      return d >= start && d <= end;
    });
  } else if (time_range === 'upcoming') {
    const now = new Date();
    items = items.filter(s => new Date(s.scheduled_at) > now);
  }

  return items.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
}

/**
 * 取消/删除排期
 */
function cancelSchedule(id) {
  const queue = loadQueue();
  const idx = queue.schedule.findIndex(s => s.id === id);
  if (idx === -1) return null;

  // 如果是草稿转的，恢复草稿状态
  if (queue.schedule[idx].draft_id) {
    const draft = queue.drafts.find(d => d.id === queue.schedule[idx].draft_id);
    if (draft) {
      draft.status = 'draft';
      draft.updated_at = new Date().toISOString();
    }
  }

  const removed = queue.schedule.splice(idx, 1)[0];
  removed.status = 'cancelled';
  saveQueue(queue);
  return removed;
}

/**
 * 标记为已发布
 */
function markPublished(id) {
  const queue = loadQueue();
  const idx = queue.schedule.findIndex(s => s.id === id);
  if (idx === -1) return null;
  queue.schedule[idx].status = 'published';
  queue.schedule[idx].published_at = new Date().toISOString();
  saveQueue(queue);
  return queue.schedule[idx];
}

/**
 * 获取排期统计
 */
function getStats() {
  const queue = loadQueue();
  const now = new Date();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  return {
    total_drafts: queue.drafts.length,
    active_drafts: queue.drafts.filter(d => d.status === 'draft').length,
    total_scheduled: queue.schedule.length,
    pending: queue.schedule.filter(s => s.status === 'pending').length,
    published: queue.schedule.filter(s => s.status === 'published').length,
    today_scheduled: queue.schedule.filter(s => {
      const d = new Date(s.scheduled_at);
      return d >= todayStart && d <= todayEnd;
    }).length,
    overdue: queue.schedule.filter(s => {
      return s.status === 'pending' && new Date(s.scheduled_at) < now;
    }).length
  };
}

module.exports = {
  saveDraft,
  getDrafts,
  deleteDraft,
  addSchedule,
  getScheduleQueue,
  cancelSchedule,
  markPublished,
  getStats
};
