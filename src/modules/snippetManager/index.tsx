/**
 * SnippetManager - 代码片段管理模块
 * 
 * 【功能说明】
 * - 创建、编辑、删除代码片段
 * - 搜索和筛选（标题、标签、内容）
 * - 代码语法高亮显示
 * - 一键复制代码内容
 * - 数据持久化存储到 localStorage
 */

import { useState, useEffect, useMemo, memo, Component, type ReactNode } from 'react';
import { BookMarked, Plus, Search, Copy, Edit2, Trash2, X, Check, Tag } from 'lucide-react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { useToast } from '../../hooks/useToast';

const STORAGE_KEY = 'devkit-snippets';

/**
 * 错误边界组件 - 捕获子组件渲染错误，防止整个页面崩溃
 * 【设计说明 for C++/Qt 开发者】
 * - 类似于 Qt 的 QWidget::event() 中的异常捕获 或 try-catch 包裹
 * - 当子组件抛出错误时，显示降级 UI 而不是让整个应用崩溃
 * - 这对于 dangerouslySetInnerHTML 等可能与外部 DOM 交互的场景很重要
 */
class SnippetErrorBoundary extends Component<{ children: ReactNode; snippetId: string }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; snippetId: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('SnippetErrorBoundary caught an error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <pre
          style={{
            margin: 0,
            padding: 16,
            fontSize: 13,
            color: 'var(--danger)',
            background: '#0d1117',
            fontFamily: 'var(--font-mono)'
          }}
        >
          渲染出错，请刷新页面重试
        </pre>
      );
    }
    return this.props.children;
  }
}

const LANGUAGES = [
  'javascript', 'typescript', 'html', 'css', 'json',
  'python', 'java', 'cpp', 'c', 'go', 'rust',
  'sql', 'bash', 'yaml', 'markdown', 'plaintext', 'qt'
];

// 语言显示名称映射 - 存储时用 key，显示时用 label
const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  rust: 'Rust',
  sql: 'SQL',
  bash: 'Bash',
  yaml: 'YAML',
  markdown: 'Markdown',
  plaintext: '纯文本',
  qt: 'Qt/C++'
};

const PRESET_TAGS = ['前端', '后端', '工具函数', '算法', 'CSS', 'React', 'Vue'];

interface Snippet {
  id: string;
  title: string;
  content: string;
  language: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

function loadSnippets(): Snippet[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSnippets(snippets: Snippet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 代码高亮显示组件 - 使用 memo 避免不必要的重渲染
 * 【设计说明 for C++/Qt 开发者】
 * - React.memo 类似于 Qt 的 QStaticWidget 或 setCacheMode(QGraphicsView::CacheBackground)
 * - 只有当 props 变化时才会重新渲染，提高列表渲染性能
 * - 独立组件也能避免 dangerouslySetInnerHTML 对父组件协调的干扰
 */
const SnippetCodeBlock = memo(function SnippetCodeBlock({
  code,
  language
}: {
  code: string;
  language: string;
}) {
  // 使用 useMemo 缓存高亮结果，避免每次渲染都重新计算
  const highlightedHtml = useMemo(() => {
    try {
      const result = hljs.highlight(code, { language, ignoreIllegals: true });
      return result.value;
    } catch {
      return code;
    }
  }, [code, language]);

  return (
    <div style={{ display: 'contents' }}>
      <pre
        style={{
          margin: 0,
          padding: 16,
          overflowX: 'auto',
          fontSize: 13,
          lineHeight: 1.6,
          maxHeight: 300,
          background: '#0d1117'
        }}
      >
        <code
          className={`hljs language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>
    </div>
  );
});

export default function SnippetManager() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    language: 'javascript',
    tags: [] as string[],
    newTag: ''
  });

  const toast = useToast();

  useEffect(() => {
    setSnippets(loadSnippets());
  }, []);

  useEffect(() => {
    if (snippets.length > 0 || localStorage.getItem(STORAGE_KEY)) {
      saveSnippets(snippets);
    }
  }, [snippets]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    snippets.forEach(s => s.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [snippets]);

  const filteredSnippets = useMemo(() => {
    return snippets.filter(snippet => {
      const matchesSearch = !searchQuery ||
        snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTag = !selectedTag || snippet.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [snippets, searchQuery, selectedTag]);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({ title: '', content: '', language: 'javascript', tags: [], newTag: '' });
    setShowForm(true);
  };

  const handleEdit = (snippet: Snippet) => {
    setEditingId(snippet.id);
    setFormData({
      title: snippet.title,
      content: snippet.content,
      language: snippet.language,
      tags: [...snippet.tags],
      newTag: ''
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定要删除这个代码片段吗？')) return;
    // 使用 requestAnimationFrame 延迟删除，避免与浏览器 DOM 操作冲突
    // 【设计说明】某些浏览器环境（如内置浏览器、带插件的浏览器）可能会在 React 提交阶段外部修改 DOM
    // 延迟一帧删除可以确保 React 协调过程与外部 DOM 操作不会在同一个 tick 中冲突
    requestAnimationFrame(() => {
      setSnippets(prev => prev.filter(s => s.id !== id));
      toast.success('已删除');
    });
  };

  const handleAddTag = () => {
    const tag = formData.newTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag], newTag: '' }));
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error('请输入标题');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('请输入代码内容');
      return;
    }

    const now = Date.now();
    if (editingId) {
      setSnippets(prev => prev.map(s =>
        s.id === editingId
          ? { ...s, ...formData, updatedAt: now }
          : s
      ));
      toast.success('已更新');
    } else {
      const newSnippet: Snippet = {
        id: generateId(),
        title: formData.title,
        content: formData.content,
        language: formData.language,
        tags: formData.tags,
        createdAt: now,
        updatedAt: now
      };
      setSnippets(prev => [newSnippet, ...prev]);
      toast.success('已创建');
    }
    setShowForm(false);
  };

  return (
    <div>
      <div className="module-header">
        <h2>代码片段管理</h2>
        <p>保存、搜索和管理你的代码片段</p>
      </div>

      <div className="tool-panel">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索标题、内容或标签..."
              style={{ width: '100%', paddingLeft: 36 }}
            />
          </div>
          <select
            value={selectedTag}
            onChange={e => setSelectedTag(e.target.value)}
            style={{ minWidth: 120 }}
          >
            <option value="">全部分类</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <button onClick={handleNew}>
            <Plus size={16} />
            新建片段
          </button>
        </div>

        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {allTags.map(tag => (
              <span
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: 'pointer',
                  background: selectedTag === tag ? 'var(--accent)' : 'var(--bg3)',
                  color: selectedTag === tag ? '#fff' : 'var(--muted)',
                  transition: 'all 0.2s'
                }}
              >
                <Tag size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {filteredSnippets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
            <BookMarked size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <p>{snippets.length === 0 ? '还没有代码片段' : '没有匹配的结果'}</p>
            {snippets.length === 0 && (
              <button onClick={handleNew} style={{ marginTop: 12 }}>
                <Plus size={16} />
                创建第一个片段
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredSnippets.map(snippet => (
              <div
                key={snippet.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  background: 'var(--bg2)'
                }}
              >
                <div style={{
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{snippet.title}</h4>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'var(--bg3)',
                        color: 'var(--muted)'
                      }}>
                        {LANGUAGE_LABELS[snippet.language] || snippet.language}
                      </span>
                      {snippet.tags.map(tag => (
                        <span key={tag} style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: 'var(--accent)'
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="secondary"
                      onClick={() => handleCopy(snippet.content)}
                      title="复制"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="secondary"
                      onClick={() => handleEdit(snippet)}
                      title="编辑"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="secondary"
                      onClick={() => handleDelete(snippet.id)}
                      title="删除"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <SnippetErrorBoundary snippetId={snippet.id}>
                  <SnippetCodeBlock
                    code={snippet.content}
                    language={snippet.language}
                  />
                </SnippetErrorBoundary>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }} onClick={() => setShowForm(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: 600,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{editingId ? '编辑片段' : '新建片段'}</h3>
              <button className="secondary" onClick={() => setShowForm(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="输入片段标题..."
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>语言</label>
                <select
                  value={formData.language}
                  onChange={e => setFormData(prev => ({ ...prev, language: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{LANGUAGE_LABELS[lang] || lang}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
                  标签
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {formData.tags.map(tag => (
                    <span key={tag} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: 'var(--accent)',
                      borderRadius: 4,
                      fontSize: 12
                    }}>
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={formData.newTag}
                    onChange={e => setFormData(prev => ({ ...prev, newTag: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="输入标签后按回车添加..."
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="secondary" onClick={handleAddTag}>
                    <Plus size={14} />
                    添加
                  </button>
                </div>
                {PRESET_TAGS.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                    快捷标签：
                    {PRESET_TAGS.filter(t => !formData.tags.includes(t)).map(tag => (
                      <button
                        key={tag}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          tags: [...prev.tags, tag]
                        }))}
                        style={{
                          marginLeft: 6,
                          background: 'none',
                          border: '1px solid var(--border)',
                          color: 'var(--muted)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 11
                        }}
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>代码内容</label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="粘贴你的代码..."
                  rows={12}
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    lineHeight: 1.6,
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button className="secondary" onClick={() => setShowForm(false)}>取消</button>
                <button onClick={handleSubmit}>
                  <Check size={14} />
                  {editingId ? '保存修改' : '创建'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
