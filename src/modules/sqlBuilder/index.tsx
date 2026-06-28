/**
 * SqlBuilder - SQL 查询构建器
 *
 * 【功能说明】
 * - 可视化 SQL 查询构建
 * - 实时预览 SQL 语句
 * - 一键生成 Qt C++ 代码
 * - 常用 SQL 模板
 */

import { useState, useCallback, useMemo } from 'react';
import { Database, Plus, Trash2, Copy, Check, ChevronDown, ChevronRight, Code2 } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';

// 查询列
interface SelectColumn {
  id: number;
  table: string;
  column: string;
  alias?: string;
}

// WHERE 条件
interface WhereCondition {
  id: number;
  field: string;
  operator: string;
  value: string;
  connector: 'AND' | 'OR';
}

// ORDER BY 字段
interface OrderByField {
  id: number;
  field: string;
  direction: 'ASC' | 'DESC';
}

// GROUP BY 字段
interface GroupByField {
  id: number;
  field: string;
}

// HAVING 条件
interface HavingCondition {
  id: number;
  field: string;
  operator: string;
  value: string;
}

// SQL 模板
const SQL_TEMPLATES = [
  {
    name: '简单查询',
    sql: `SELECT id, name, email
FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;`,
  },
  {
    name: 'INSERT 语句',
    sql: `INSERT INTO users (name, email, status)
VALUES ('张三', 'zhangsan@example.com', 'active');`,
  },
  {
    name: 'UPDATE 语句',
    sql: `UPDATE users
SET status = 'inactive', updated_at = NOW()
WHERE id = 1;`,
  },
  {
    name: 'DELETE 语句',
    sql: `DELETE FROM users
WHERE status = 'inactive'
AND updated_at < '2024-01-01';`,
  },
  {
    name: 'JOIN 查询',
    sql: `SELECT u.name, o.order_id, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
ORDER BY o.total DESC;`,
  },
  {
    name: '聚合查询',
    sql: `SELECT status, COUNT(*) as count, AVG(age) as avg_age
FROM users
GROUP BY status
HAVING count > 10
ORDER BY count DESC;`,
  },
  {
    name: '子查询',
    sql: `SELECT u.name, u.email
FROM users u
WHERE u.id IN (
    SELECT user_id
    FROM orders
    WHERE total > 1000
);`,
  },
  {
    name: '分页查询',
    sql: `SELECT * FROM products
WHERE category = 'electronics'
ORDER BY price DESC
LIMIT 20 OFFSET 40;`,
  },
];

// 运算符选项
const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'BETWEEN', 'IS NULL', 'IS NOT NULL'];

// SQL 关键字高亮
function highlightSql(sql: string): string {
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
    'ORDER', 'BY', 'ASC', 'DESC', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
    'INSERT', 'UPDATE', 'DELETE', 'INTO', 'SET', 'VALUES',
    'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT',
    'AS', 'NULL', 'IS', 'NOW', 'CREATE', 'TABLE', 'INDEX',
  ];

  let highlighted = sql;
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    highlighted = highlighted.replace(regex, `<span style="color: #3b82f6; font-weight: 500;">${keyword.toUpperCase()}</span>`);
  });

  // 字符串高亮
  highlighted = highlighted.replace(/'([^']*)'/g, `<span style="color: #22c55e;">'$1'</span>`);
  highlighted = highlighted.replace(/"([^"]*)"/g, `<span style="color: #22c55e;">"$1"</span>`);

  // 数字高亮
  highlighted = highlighted.replace(/\b(\d+)\b/g, `<span style="color: #f59e0b;">$1</span>`);

  return highlighted;
}

// 生成 Qt C++ 代码
function generateQtCode(sql: string): string {
  // 提取参数占位符
  const params: string[] = [];
  const paramRegex = /:(\w+)/g;
  let match;
  while ((match = paramRegex.exec(sql)) !== null) {
    params.push(match[1]);
  }

  let code = `QString sql = "${sql.replace(/\n/g, '\\n')}";
\nQSqlQuery query;
query.prepare(sql);\n`;

  if (params.length > 0) {
    params.forEach(param => {
      code += `query.bindValue(":${param}", ${param});\n`;
    });
  }

  code += `\nif (query.exec()) {
    while (query.next()) {
        // 处理结果
        // int id = query.value(0).toInt();
        // QString name = query.value(1).toString();
    }
} else {
    qDebug() << "Query failed:" << query.lastError().text();
}`;

  return code;
}

export default function SqlBuilder() {
  const [mode, setMode] = useState<'visual' | 'text'>('visual');
  const [rawSql, setRawSql] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    select: true,
    from: true,
    where: true,
    orderBy: true,
    groupBy: false,
    having: false,
    limit: true,
  });

  // 查询参数
  const [tableName, setTableName] = useState('users');
  const [selectColumns, setSelectColumns] = useState<SelectColumn[]>([
    { id: 1, table: 'users', column: '*', alias: '' },
  ]);
  const [whereConditions, setWhereConditions] = useState<WhereCondition[]>([]);
  const [orderByFields, setOrderByFields] = useState<OrderByField[]>([]);
  const [groupByFields, setGroupByFields] = useState<GroupByField[]>([]);
  const [havingConditions, setHavingConditions] = useState<HavingCondition[]>([]);
  const [limitValue, setLimitValue] = useState<number | ''>('');
  const [offsetValue, setOffsetValue] = useState<number | ''>('');

  const [nextId, setNextId] = useState(100);
  const [copied, setCopied] = useState<'sql' | 'qt' | ''>('');
  const toast = useToast();

  // 切换展开状态
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // 生成 SQL
  const generatedSql = useMemo(() => {
    if (mode === 'text') {
      return rawSql;
    }

    let sql = '';

    // SELECT
    if (selectColumns.length > 0) {
      const cols = selectColumns.map(col => {
        const fullCol = col.table ? `${col.table}.${col.column}` : col.column;
        return col.alias ? `${fullCol} AS ${col.alias}` : fullCol;
      }).join(', ');
      sql += `SELECT ${cols}`;
    } else {
      sql += `SELECT *`;
    }

    // FROM
    sql += `\nFROM ${tableName}`;

    // WHERE
    if (whereConditions.length > 0) {
      const conditions = whereConditions.map((cond, idx) => {
        let condStr = '';
        if (idx > 0) {
          condStr = `${cond.connector} `;
        }

        if (cond.operator === 'IS NULL' || cond.operator === 'IS NOT NULL') {
          condStr += `${cond.field} ${cond.operator}`;
        } else if (cond.operator === 'IN' || cond.operator === 'NOT IN') {
          condStr += `${cond.field} ${cond.operator} (${cond.value})`;
        } else if (cond.operator === 'BETWEEN') {
          condStr += `${cond.field} BETWEEN ${cond.value}`;
        } else {
          // 使用参数占位符
          const paramName = cond.field.toLowerCase().replace(/\./g, '_');
          condStr += `${cond.field} ${cond.operator} :${paramName}`;
        }

        return condStr;
      }).join(' ');
      sql += `\nWHERE ${conditions}`;
    }

    // GROUP BY
    if (groupByFields.length > 0) {
      const fields = groupByFields.map(f => f.field).join(', ');
      sql += `\nGROUP BY ${fields}`;

      // HAVING
      if (havingConditions.length > 0) {
        const conditions = havingConditions.map(cond => {
          if (cond.operator === 'IS NULL' || cond.operator === 'IS NOT NULL') {
            return `${cond.field} ${cond.operator}`;
          }
          return `${cond.field} ${cond.operator} ${cond.value}`;
        }).join(' AND ');
        sql += `\nHAVING ${conditions}`;
      }
    }

    // ORDER BY
    if (orderByFields.length > 0) {
      const fields = orderByFields.map(f => `${f.field} ${f.direction}`).join(', ');
      sql += `\nORDER BY ${fields}`;
    }

    // LIMIT / OFFSET
    if (limitValue !== '') {
      sql += `\nLIMIT ${limitValue}`;
      if (offsetValue !== '') {
        sql += ` OFFSET ${offsetValue}`;
      }
    }

    sql += ';';

    return sql;
  }, [mode, rawSql, selectColumns, tableName, whereConditions, orderByFields, groupByFields, havingConditions, limitValue, offsetValue]);

  // 生成 Qt 代码
  const qtCode = useMemo(() => generateQtCode(generatedSql), [generatedSql]);

  // 添加 SELECT 列
  const handleAddSelectColumn = useCallback(() => {
    setSelectColumns(prev => [...prev, { id: nextId, table: tableName, column: 'id', alias: '' }]);
    setNextId(prev => prev + 1);
    toast.success('已添加查询列');
  }, [nextId, tableName, toast]);

  // 删除 SELECT 列
  const handleDeleteSelectColumn = useCallback((id: number) => {
    setSelectColumns(prev => prev.filter(c => c.id !== id));
  }, []);

  // 更新 SELECT 列
  const handleUpdateSelectColumn = useCallback((id: number, updates: Partial<SelectColumn>) => {
    setSelectColumns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  // 添加 WHERE 条件
  const handleAddWhereCondition = useCallback(() => {
    setWhereConditions(prev => [...prev, { id: nextId, field: `${tableName}.id`, operator: '=', value: '', connector: 'AND' }]);
    setNextId(prev => prev + 1);
    toast.success('已添加条件');
  }, [nextId, tableName, toast]);

  // 删除 WHERE 条件
  const handleDeleteWhereCondition = useCallback((id: number) => {
    setWhereConditions(prev => prev.filter(c => c.id !== id));
  }, []);

  // 更新 WHERE 条件
  const handleUpdateWhereCondition = useCallback((id: number, updates: Partial<WhereCondition>) => {
    setWhereConditions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  // 添加 ORDER BY 字段
  const handleAddOrderByField = useCallback(() => {
    setOrderByFields(prev => [...prev, { id: nextId, field: `${tableName}.id`, direction: 'ASC' }]);
    setNextId(prev => prev + 1);
    toast.success('已添加排序字段');
  }, [nextId, tableName, toast]);

  // 删除 ORDER BY 字段
  const handleDeleteOrderByField = useCallback((id: number) => {
    setOrderByFields(prev => prev.filter(f => f.id !== id));
  }, []);

  // 更新 ORDER BY 字段
  const handleUpdateOrderByField = useCallback((id: number, updates: Partial<OrderByField>) => {
    setOrderByFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  // 添加 GROUP BY 字段
  const handleAddGroupByField = useCallback(() => {
    setGroupByFields(prev => [...prev, { id: nextId, field: `${tableName}.status` }]);
    setNextId(prev => prev + 1);
    toast.success('已添加分组字段');
  }, [nextId, tableName, toast]);

  // 删除 GROUP BY 字段
  const handleDeleteGroupByField = useCallback((id: number) => {
    setGroupByFields(prev => prev.filter(f => f.id !== id));
  }, []);

  // 更新 GROUP BY 字段
  const handleUpdateGroupByField = useCallback((id: number, updates: Partial<GroupByField>) => {
    setGroupByFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  // 添加 HAVING 条件
  const handleAddHavingCondition = useCallback(() => {
    setHavingConditions(prev => [...prev, { id: nextId, field: 'COUNT(*)', operator: '>', value: '0' }]);
    setNextId(prev => prev + 1);
    toast.success('已添加 HAVING 条件');
  }, [nextId, toast]);

  // 删除 HAVING 条件
  const handleDeleteHavingCondition = useCallback((id: number) => {
    setHavingConditions(prev => prev.filter(c => c.id !== id));
  }, []);

  // 更新 HAVING 条件
  const handleUpdateHavingCondition = useCallback((id: number, updates: Partial<HavingCondition>) => {
    setHavingConditions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  // 加载模板
  const handleLoadTemplate = useCallback((template: typeof SQL_TEMPLATES[0]) => {
    setRawSql(template.sql);
    setMode('text');
    toast.success(`已加载模板：${template.name}`);
  }, [toast]);

  // 复制
  const handleCopy = useCallback(async (type: 'sql' | 'qt') => {
    const text = type === 'sql' ? generatedSql : qtCode;
    await copyToClipboard(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
    toast.success('已复制');
  }, [generatedSql, qtCode, toast]);

  // 清空
  const handleClear = useCallback(() => {
    setSelectColumns([{ id: 1, table: 'users', column: '*', alias: '' }]);
    setTableName('users');
    setWhereConditions([]);
    setOrderByFields([]);
    setGroupByFields([]);
    setHavingConditions([]);
    setLimitValue('');
    setOffsetValue('');
    setNextId(100);
    toast.success('已清空');
  }, [toast]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="module-header">
        <h2>SQL 查询构建器</h2>
        <p>可视化构建 · 实时预览 · Qt 代码生成</p>
      </div>

      {/* 模式切换 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <div className="tool-row">
          <label>构建模式</label>
          <div className="field btn-group">
            <button
              className={mode === 'visual' ? '' : 'secondary'}
              onClick={() => setMode('visual')}
            >
              可视化
            </button>
            <button
              className={mode === 'text' ? '' : 'secondary'}
              onClick={() => setMode('text')}
            >
              <Code2 size={14} style={{ marginRight: 4 }} />
              直接编辑
            </button>
          </div>
        </div>
      </div>

      {mode === 'visual' ? (
        /* 可视化构建 */
        <div style={{ marginBottom: 16 }}>
          {/* FROM */}
          <div className="tool-panel" style={{ marginBottom: 12 }}>
            <button
              onClick={() => toggleSection('from')}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg2)',
                border: 'none',
                borderRadius: 6,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} color="var(--accent)" />
                FROM — 表名
              </span>
              {expandedSections.from ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedSections.from && (
              <div style={{ padding: 12 }}>
                <input
                  type="text"
                  value={tableName}
                  onChange={e => setTableName(e.target.value)}
                  placeholder="表名"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            )}
          </div>

          {/* SELECT */}
          <div className="tool-panel" style={{ marginBottom: 12 }}>
            <button
              onClick={() => toggleSection('select')}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg2)',
                border: 'none',
                borderRadius: 6,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} color="var(--accent)" />
                SELECT — 查询列 ({selectColumns.length})
              </span>
              {expandedSections.select ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedSections.select && (
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectColumns.map(col => (
                    <div
                      key={col.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr auto',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        value={col.table}
                        onChange={e => handleUpdateSelectColumn(col.id, { table: e.target.value })}
                        placeholder="表名"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                      />
                      <input
                        type="text"
                        value={col.column}
                        onChange={e => handleUpdateSelectColumn(col.id, { column: e.target.value })}
                        placeholder="字段名"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                      />
                      <input
                        type="text"
                        value={col.alias || ''}
                        onChange={e => handleUpdateSelectColumn(col.id, { alias: e.target.value })}
                        placeholder="别名"
                        style={{ fontSize: 12 }}
                      />
                      <button
                        className="ghost"
                        onClick={() => handleDeleteSelectColumn(col.id)}
                        style={{ padding: 4, color: 'var(--error)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button onClick={handleAddSelectColumn} style={{ fontSize: 12 }}>
                    <Plus size={14} />
                    添加列
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* WHERE */}
          <div className="tool-panel" style={{ marginBottom: 12 }}>
            <button
              onClick={() => toggleSection('where')}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg2)',
                border: 'none',
                borderRadius: 6,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} color="var(--accent)" />
                WHERE — 条件 ({whereConditions.length})
              </span>
              {expandedSections.where ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedSections.where && (
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {whereConditions.map((cond, idx) => (
                    <div
                      key={cond.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: idx === 0 ? '1fr 120px 1fr auto' : '60px 1fr 120px 1fr auto',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      {idx > 0 && (
                        <select
                          value={cond.connector}
                          onChange={e => handleUpdateWhereCondition(cond.id, { connector: e.target.value as 'AND' | 'OR' })}
                          style={{ fontSize: 12 }}
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      )}
                      <input
                        type="text"
                        value={cond.field}
                        onChange={e => handleUpdateWhereCondition(cond.id, { field: e.target.value })}
                        placeholder="字段名"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                      />
                      <select
                        value={cond.operator}
                        onChange={e => handleUpdateWhereCondition(cond.id, { operator: e.target.value })}
                        style={{ fontSize: 12 }}
                      >
                        {OPERATORS.map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                      {(cond.operator !== 'IS NULL' && cond.operator !== 'IS NOT NULL') && (
                        <input
                          type="text"
                          value={cond.value}
                          onChange={e => handleUpdateWhereCondition(cond.id, { value: e.target.value })}
                          placeholder="值"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                        />
                      )}
                      <button
                        className="ghost"
                        onClick={() => handleDeleteWhereCondition(cond.id)}
                        style={{ padding: 4, color: 'var(--error)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button onClick={handleAddWhereCondition} style={{ fontSize: 12 }}>
                    <Plus size={14} />
                    添加条件
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ORDER BY */}
          <div className="tool-panel" style={{ marginBottom: 12 }}>
            <button
              onClick={() => toggleSection('orderBy')}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg2)',
                border: 'none',
                borderRadius: 6,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} color="var(--accent)" />
                ORDER BY — 排序 ({orderByFields.length})
              </span>
              {expandedSections.orderBy ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedSections.orderBy && (
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orderByFields.map(field => (
                    <div
                      key={field.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px auto',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        value={field.field}
                        onChange={e => handleUpdateOrderByField(field.id, { field: e.target.value })}
                        placeholder="字段名"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                      />
                      <select
                        value={field.direction}
                        onChange={e => handleUpdateOrderByField(field.id, { direction: e.target.value as 'ASC' | 'DESC' })}
                        style={{ fontSize: 12 }}
                      >
                        <option value="ASC">ASC</option>
                        <option value="DESC">DESC</option>
                      </select>
                      <button
                        className="ghost"
                        onClick={() => handleDeleteOrderByField(field.id)}
                        style={{ padding: 4, color: 'var(--error)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button onClick={handleAddOrderByField} style={{ fontSize: 12 }}>
                    <Plus size={14} />
                    添加排序
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* GROUP BY */}
          <div className="tool-panel" style={{ marginBottom: 12 }}>
            <button
              onClick={() => toggleSection('groupBy')}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg2)',
                border: 'none',
                borderRadius: 6,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} color="var(--accent)" />
                GROUP BY — 分组 ({groupByFields.length})
              </span>
              {expandedSections.groupBy ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedSections.groupBy && (
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {groupByFields.map(field => (
                    <div
                      key={field.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        value={field.field}
                        onChange={e => handleUpdateGroupByField(field.id, { field: e.target.value })}
                        placeholder="字段名"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                      />
                      <button
                        className="ghost"
                        onClick={() => handleDeleteGroupByField(field.id)}
                        style={{ padding: 4, color: 'var(--error)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button onClick={handleAddGroupByField} style={{ fontSize: 12 }}>
                    <Plus size={14} />
                    添加分组
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* HAVING */}
          <div className="tool-panel" style={{ marginBottom: 12 }}>
            <button
              onClick={() => toggleSection('having')}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg2)',
                border: 'none',
                borderRadius: 6,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} color="var(--accent)" />
                HAVING — 分组条件 ({havingConditions.length})
              </span>
              {expandedSections.having ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedSections.having && (
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {havingConditions.map(cond => (
                    <div
                      key={cond.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 120px 1fr auto',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        value={cond.field}
                        onChange={e => handleUpdateHavingCondition(cond.id, { field: e.target.value })}
                        placeholder="聚合函数"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                      />
                      <select
                        value={cond.operator}
                        onChange={e => handleUpdateHavingCondition(cond.id, { operator: e.target.value })}
                        style={{ fontSize: 12 }}
                      >
                        {OPERATORS.filter(op => op !== 'LIKE' && op !== 'IN' && op !== 'IS NULL').map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={cond.value}
                        onChange={e => handleUpdateHavingCondition(cond.id, { value: e.target.value })}
                        placeholder="值"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                      />
                      <button
                        className="ghost"
                        onClick={() => handleDeleteHavingCondition(cond.id)}
                        style={{ padding: 4, color: 'var(--error)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button onClick={handleAddHavingCondition} style={{ fontSize: 12 }}>
                    <Plus size={14} />
                    添加条件
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LIMIT / OFFSET */}
          <div className="tool-panel" style={{ marginBottom: 12 }}>
            <button
              onClick={() => toggleSection('limit')}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg2)',
                border: 'none',
                borderRadius: 6,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} color="var(--accent)" />
                LIMIT / OFFSET — 分页
              </span>
              {expandedSections.limit ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedSections.limit && (
              <div style={{ padding: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>LIMIT</label>
                    <input
                      type="number"
                      value={limitValue}
                      onChange={e => setLimitValue(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="数量"
                      min={0}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>OFFSET</label>
                    <input
                      type="number"
                      value={offsetValue}
                      onChange={e => setOffsetValue(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="偏移"
                      min={0}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="tool-panel" style={{ marginBottom: 16 }}>
            <div className="tool-row">
              <label></label>
              <div className="field">
                <button onClick={handleClear} style={{ fontSize: 12 }}>
                  <Trash2 size={14} />
                  清空
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 直接编辑模式 */
        <div className="tool-panel" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>直接编辑 SQL</h3>
          <textarea
            value={rawSql}
            onChange={e => setRawSql(e.target.value)}
            placeholder="输入 SQL 语句..."
            rows={15}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
        </div>
      )}

      {/* SQL 模板 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={16} color="var(--accent)" />
          SQL 模板
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {SQL_TEMPLATES.map(template => (
            <button
              key={template.name}
              className="secondary"
              onClick={() => handleLoadTemplate(template)}
              style={{ fontSize: 12 }}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* SQL 预览 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>生成的 SQL</h3>
          <button onClick={() => handleCopy('sql')}>
            {copied === 'sql' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'sql' ? '已复制' : '复制'}
          </button>
        </div>
        <pre
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            padding: 12,
            background: 'var(--bg3)',
            borderRadius: 6,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
          }}
          dangerouslySetInnerHTML={{ __html: highlightSql(generatedSql) }}
        />
      </div>

      {/* Qt C++ 代码 */}
      <div className="tool-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Code2 size={16} color="var(--accent)" />
            Qt C++ 代码
          </h3>
          <button onClick={() => handleCopy('qt')}>
            {copied === 'qt' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'qt' ? '已复制' : '复制'}
          </button>
        </div>
        <pre
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            padding: 12,
            background: 'var(--bg3)',
            borderRadius: 6,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
          }}
        >
          {qtCode}
        </pre>
      </div>
    </div>
  );
}