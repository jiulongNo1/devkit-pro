import { useState, useMemo, useRef, useCallback } from 'react';
import { FileCode, Download, Copy, Check, ChevronDown, ChevronRight, AlertTriangle, Package, Code2 } from 'lucide-react';

interface TemplateCategory {
  name: string;
  items: { label: string; code: string }[];
}

const templateCategories: TemplateCategory[] = [
  {
    name: '项目配置',
    items: [
      { label: 'cmake_minimum_required', code: 'cmake_minimum_required(VERSION 3.24)\n' },
      { label: 'project', code: 'project(MyProject VERSION 1.0.0 LANGUAGES CXX)\n' },
      { label: 'CMAKE_CXX_STANDARD', code: 'set(CMAKE_CXX_STANDARD 17)\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\nset(CMAKE_CXX_EXTENSIONS OFF)\n' },
      { label: 'CMAKE_EXPORT_COMPILE_COMMANDS', code: 'set(CMAKE_EXPORT_COMPILE_COMMANDS ON)\n' },
      { label: 'CMAKE_BUILD_TYPE', code: 'if(NOT CMAKE_BUILD_TYPE)\n  set(CMAKE_BUILD_TYPE Release)\nendif()\n' },
    ]
  },
  {
    name: '查找依赖',
    items: [
      { label: 'find_package Qt6', code: 'find_package(Qt6 REQUIRED COMPONENTS Core Widgets)\n' },
      { label: 'find_package Threads', code: 'find_package(Threads REQUIRED)\n' },
      { label: 'find_package Boost', code: 'find_package(Boost REQUIRED COMPONENTS filesystem system)\n' },
      { label: 'find_package OpenCV', code: 'find_package(OpenCV REQUIRED)\n' },
      { label: 'find_package Protobuf', code: 'find_package(Protobuf REQUIRED)\n' },
    ]
  },
  {
    name: '目标定义',
    items: [
      { label: 'add_executable', code: 'add_executable($\{PROJECT_NAME}\n    src/main.cpp\n    src/mainwindow.cpp\n)\n' },
      { label: 'add_library', code: 'add_library($\{PROJECT_NAME}_lib STATIC\n    src/mylib.cpp\n    include/mylib.h\n)\n' },
      { label: 'target_sources', code: 'target_sources($\{PROJECT_NAME}\n    PRIVATE\n        src/main.cpp\n    PUBLIC\n        include/myapp.h\n)\n' },
      { label: 'target_include_directories', code: 'target_include_directories($\{PROJECT_NAME}\n    PUBLIC\n        $<BUILD_INTERFACE:$ \{CMAKE_CURRENT_SOURCE_DIR}/include>\n        $<INSTALL_INTERFACE:include>\n)\n' },
      { label: 'target_link_libraries', code: 'target_link_libraries($\{PROJECT_NAME}\n    PRIVATE\n        Qt6::Core\n        Qt6::Widgets\n)\n' },
    ]
  },
  {
    name: '编译选项',
    items: [
      { label: 'target_compile_options', code: 'target_compile_options($\{PROJECT_NAME}\n    PRIVATE\n        -Wall\n        -Wextra\n        -Wpedantic\n)\n' },
      { label: 'target_compile_features', code: 'target_compile_features($\{PROJECT_NAME} PRIVATE cxx_std_17)\n' },
      { label: 'add_compile_options', code: 'add_compile_options(-Wall -Wextra)\n' },
      { label: 'MSVC 编译选项', code: 'if(MSVC)\n    target_compile_options($\{PROJECT_NAME} PRIVATE /W4)\nendif()\n' },
      { label: 'GCC/Clang 编译选项', code: 'if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")\n    target_compile_options($\{PROJECT_NAME} PRIVATE -Werror)\nendif()\n' },
    ]
  },
  {
    name: '安装打包',
    items: [
      { label: 'install TARGETS', code: 'install(TARGETS $\{PROJECT_NAME}\n    RUNTIME DESTINATION bin\n    LIBRARY DESTINATION lib\n    ARCHIVE DESTINATION lib\n)\n' },
      { label: 'install FILES', code: 'install(FILES $\{CMAKE_CURRENT_SOURCE_DIR}/config.ini\n    DESTINATION etc/$ \{PROJECT_NAME}\n)\n' },
      { label: 'CPack 配置', code: 'set(CPACK_PACKAGE_NAME "$\{PROJECT_NAME}")\nset(CPACK_PACKAGE_VERSION "$\{PROJECT_VERSION}")\nset(CPACK_GENERATOR "ZIP")\ninclude(CPack)\n' },
      { label: 'add_custom_command', code: 'add_custom_command(\n    OUTPUT generated_file.h\n    COMMAND $\{CMAKE_COMMAND} -E copy $\{CMAKE_SOURCE_DIR}/template.h generated_file.h\n    MAIN_DEPENDENCY template.h\n)\n' },
    ]
  },
  {
    name: '测试',
    items: [
      { label: 'enable_testing', code: 'enable_testing()\n' },
      { label: 'add_test', code: 'add_test(NAME $\{PROJECT_NAME}_test\n    COMMAND $\{PROJECT_NAME}_test\n    WORKING_DIRECTORY $\{CMAKE_CURRENT_BINARY_DIR}\n)\n' },
      { label: 'add_subdirectory tests', code: 'add_subdirectory(tests)\n' },
    ]
  },
  {
    name: '条件判断',
    items: [
      { label: 'if/elseif/else/endif', code: 'if(CMAKE_BUILD_TYPE STREQUAL "Debug")\n    message(STATUS "Building debug version")\nelseif(CMAKE_BUILD_TYPE STREQUAL "Release")\n    message(STATUS "Building release version")\nelse()\n    message(STATUS "Building $\{CMAKE_BUILD_TYPE} version")\nendif()\n' },
      { label: 'if(DEFINED)', code: 'if(DEFINED ENV{MY_ENV_VAR})\n    set(MY_VAR $ENV{MY_ENV_VAR})\nendif()\n' },
      { label: 'if(TARGET)', code: 'if(TARGET Qt6::Widgets)\n    target_link_libraries($\{PROJECT_NAME} Qt6::Widgets)\nendif()\n' },
    ]
  },
];

const projectTemplates = [
  {
    name: 'Qt6 最小项目',
    code: `cmake_minimum_required(VERSION 3.24)
project(Qt6Minimal VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 REQUIRED COMPONENTS Core Widgets)
qt_standard_project_setup()

add_executable($\{PROJECT_NAME}
    src/main.cpp
    src/mainwindow.cpp
    src/mainwindow.h
)

target_link_libraries($\{PROJECT_NAME}
    PRIVATE
        Qt6::Core
        Qt6::Widgets
)

set_target_properties($\{PROJECT_NAME} PROPERTIES
    WIN32_EXECUTABLE ON
    MACOSX_BUNDLE ON
)
`
  },
  {
    name: 'C++17 库项目',
    code: `cmake_minimum_required(VERSION 3.24)
project(MyLibrary VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library($\{PROJECT_NAME} STATIC
    src/mylibrary.cpp
    include/mylibrary/mylibrary.h
)

target_include_directories($\{PROJECT_NAME}
    PUBLIC
        $<BUILD_INTERFACE:$ \{CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_compile_options($\{PROJECT_NAME}
    PRIVATE
        -Wall
        -Wextra
        -Wpedantic
)

if(MSVC)
    target_compile_options($\{PROJECT_NAME} PRIVATE /W4)
endif()

install(TARGETS $\{PROJECT_NAME}
    EXPORT $\{PROJECT_NAME}Targets
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
    RUNTIME DESTINATION bin
)

install(DIRECTORY include/
    DESTINATION include
)

install(EXPORT $\{PROJECT_NAME}Targets
    FILE $\{PROJECT_NAME}Targets.cmake
    NAMESPACE $\{PROJECT_NAME}::
    DESTINATION lib/cmake/$ \{PROJECT_NAME}
)
`
  },
  {
    name: 'CMake 子目录项目',
    code: `cmake_minimum_required(VERSION 3.24)
project(SuperProject VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_subdirectory(libs/mylib)
add_subdirectory(apps/myapp)
add_subdirectory(tests)

message(STATUS "Build type: $\{CMAKE_BUILD_TYPE}")
message(STATUS "Project version: $\{PROJECT_VERSION}")
`
  }
];

interface ParsedInfo {
  dependencies: string[];
  linkLibraries: string[];
  errors: { line: number; message: string; type: 'error' | 'warning' }[];
  variables: string[];
}

function parseCMakeContent(content: string): ParsedInfo {
  const lines = content.split('\n');
  const dependencies: string[] = [];
  const linkLibraries: string[] = [];
  const errors: { line: number; message: string; type: 'error' | 'warning' }[] = [];
  const variables: string[] = [];

  const cmakeCommands = new Set([
    'cmake_minimum_required', 'project', 'set', 'option', 'find_package',
    'add_executable', 'add_library', 'add_subdirectory',
    'target_sources', 'target_include_directories', 'target_link_libraries',
    'target_compile_options', 'target_compile_features',
    'add_compile_options', 'add_custom_command', 'add_custom_target',
    'install', 'enable_testing', 'add_test',
    'if', 'elseif', 'else', 'endif', 'foreach', 'endforeach', 'while', 'endwhile',
    'message', 'include', 'find_path', 'find_library',
    'configure_file', 'file', 'list', 'string', 'math',
    'execute_process', 'return', 'break', 'continue'
  ]);

  const ifStack: string[] = [];
  const foreachStack: string[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const match = trimmed.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (match) {
      const cmd = match[1];
      if (!cmakeCommands.has(cmd) && !cmd.startsWith('_') && !cmd.match(/^[A-Z_]+$/)) {
        const lowerCmd = cmd.toLowerCase();
        if (cmakeCommands.has(lowerCmd)) {
          errors.push({
            line: index + 1,
            message: `命令 "${cmd}" 应为小写 "${lowerCmd}"`,
            type: 'warning'
          });
        }
      }
    }

    if (trimmed.match(/^\s*if\s*\(/i)) {
      ifStack.push('if');
    }
    if (trimmed.match(/^\s*endif/i)) {
      if (ifStack.length === 0) {
        errors.push({
          line: index + 1,
          message: 'endif 没有匹配的 if',
          type: 'error'
        });
      } else {
        ifStack.pop();
      }
    }

    if (trimmed.match(/^\s*foreach\s*\(/i)) {
      foreachStack.push('foreach');
    }
    if (trimmed.match(/^\s*endforeach/i)) {
      if (foreachStack.length === 0) {
        errors.push({
          line: index + 1,
          message: 'endforeach 没有匹配的 foreach',
          type: 'error'
        });
      } else {
        foreachStack.pop();
      }
    }

    const findPackageMatch = trimmed.match(/find_package\s*\(\s*(\w+)/i);
    if (findPackageMatch) {
      dependencies.push(findPackageMatch[1]);
    }

    const linkLibMatch = trimmed.match(/target_link_libraries\s*\(\s*(\w+)/i);
    if (linkLibMatch) {
      const target = linkLibMatch[1];
      const libs = trimmed.slice(trimmed.indexOf(target) + target.length).match(/[\w:]+/g) || [];
      linkLibraries.push(...libs.filter(l => l !== target && l !== 'PRIVATE' && l !== 'PUBLIC' && l !== 'INTERFACE'));
    }

    const varMatches = trimmed.match(/\$\{([^}]+)\}/g);
    if (varMatches) {
      varMatches.forEach(v => {
        const varName = v.slice(2, -1);
        if (!variables.includes(varName)) {
          variables.push(varName);
        }
      });
    }
  });

  if (ifStack.length > 0) {
    errors.push({
      line: lines.length,
      message: `${ifStack.length} 个 if 没有匹配的 endif`,
      type: 'error'
    });
  }

  if (foreachStack.length > 0) {
    errors.push({
      line: lines.length,
      message: `${foreachStack.length} 个 foreach 没有匹配的 endforeach`,
      type: 'error'
    });
  }

  return { dependencies, linkLibraries, errors, variables };
}

export default function CMakeHelper() {
  const [content, setContent] = useState<string>(`cmake_minimum_required(VERSION 3.24)
project(MyProject VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 REQUIRED COMPONENTS Core Widgets)
find_package(Threads REQUIRED)

add_executable($\{PROJECT_NAME}
    src/main.cpp
    src/mainwindow.cpp
)

target_include_directories($\{PROJECT_NAME}
    PUBLIC
        $\{CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries($\{PROJECT_NAME}
    PRIVATE
        Qt6::Core
        Qt6::Widgets
        Threads::Threads
)

if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_definitions($\{PROJECT_NAME} PRIVATE DEBUG_MODE)
endif()
`);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['项目配置', '目标定义']));
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parsedInfo = useMemo(() => parseCMakeContent(content), [content]);

  const insertAtCursor = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const newContent = before + text + after;

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content]);

  const handleTemplateInsert = useCallback((code: string) => {
    insertAtCursor(code);
  }, [insertAtCursor]);

  const handleProjectTemplate = useCallback((code: string) => {
    setContent(code);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CMakeLists.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  const toggleCategory = useCallback((name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="module-header">
        <h2>CMake 语法辅助</h2>
        <p>代码编辑 · 命令模板 · 实时解析</p>
      </div>

      <div className="tool-panel" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {projectTemplates.map((template, index) => (
            <button
              key={index}
              onClick={() => handleProjectTemplate(template.code)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#8b5cf6',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'}
            >
              {template.name}
            </button>
          ))}
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--bg2)',
              color: 'var(--ink)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg2)'}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '已复制' : '复制'}
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--accent)',
              color: '#fff',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.85)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
          >
            <Download size={14} />
            下载
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '70% 30%',
          gap: 16,
          minHeight: 500
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100%'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
              padding: '4px 8px',
              background: 'var(--bg3)',
              borderRadius: 4
            }}>
              <FileCode size={14} color="var(--accent)" />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>CMakeLists.txt</span>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{
                flex: 1,
                width: '100%',
                padding: 12,
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                resize: 'vertical',
                color: 'var(--ink)',
                lineHeight: 1.5,
                tabSize: 2
              }}
              placeholder="在此输入 CMakeLists.txt 内容..."
              spellCheck={false}
            />
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: '100%'
          }}>
            <div style={{
              background: 'var(--bg3)',
              borderRadius: 6,
              overflow: 'hidden',
              flex: '1 1 auto',
              minHeight: 200
            }}>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg2)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 500
              }}>
                <Code2 size={14} color="var(--accent)" />
                常用命令模板
              </div>
              <div style={{ padding: 8, maxHeight: 500, overflowY: 'auto' }}>
                {templateCategories.map((category, catIndex) => {
                  const isExpanded = expandedCategories.has(category.name);
                  return (
                    <div key={catIndex} style={{ marginBottom: 4 }}>
                      <div
                        onClick={() => toggleCategory(category.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 8px',
                          cursor: 'pointer',
                          background: 'var(--bg2)',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                          userSelect: 'none'
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        {category.name}
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: 10,
                          color: 'var(--muted)'
                        }}>
                          {category.items.length}
                        </span>
                      </div>
                      {isExpanded && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          marginTop: 4,
                          paddingLeft: 12
                        }}>
                          {category.items.map((item, itemIndex) => (
                            <button
                              key={itemIndex}
                              onClick={() => handleTemplateInsert(item.code)}
                              style={{
                                padding: '4px 8px',
                                textAlign: 'left',
                                fontSize: 11,
                                borderRadius: 4,
                                border: 'none',
                                cursor: 'pointer',
                                background: 'var(--bg2)',
                                color: 'var(--ink)',
                                transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg2)'}
                              title={item.code}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{
              background: 'var(--bg3)',
              borderRadius: 6,
              overflow: 'hidden',
              flex: '1 1 auto',
              minHeight: 150
            }}>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg2)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 500
              }}>
                <Package size={14} color="var(--accent)" />
                实时辅助信息
              </div>
              <div style={{ padding: 8, maxHeight: 400, overflowY: 'auto' }}>
                {parsedInfo.errors.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--muted)',
                      marginBottom: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <AlertTriangle size={12} />
                      检测到问题 ({parsedInfo.errors.length})
                    </div>
                    {parsedInfo.errors.map((err, i) => (
                      <div
                        key={i}
                        style={{
                          padding: 6,
                          fontSize: 11,
                          borderRadius: 4,
                          marginBottom: 4,
                          background: err.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                          color: err.type === 'error' ? '#ef4444' : '#f97316'
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>行 {err.line}:</span> {err.message}
                      </div>
                    ))}
                  </div>
                )}

                {parsedInfo.dependencies.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--muted)',
                      marginBottom: 6
                    }}>
                      已查找依赖 ({parsedInfo.dependencies.length})
                    </div>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 4
                    }}>
                      {parsedInfo.dependencies.map((dep, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '2px 6px',
                            fontSize: 10,
                            borderRadius: 4,
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#3b82f6'
                          }}
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedInfo.linkLibraries.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--muted)',
                      marginBottom: 6
                    }}>
                      链接库 ({parsedInfo.linkLibraries.length})
                    </div>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 4
                    }}>
                      {parsedInfo.linkLibraries.map((lib, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '2px 6px',
                            fontSize: 10,
                            borderRadius: 4,
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: '#22c55e'
                          }}
                        >
                          {lib}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedInfo.variables.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--muted)',
                      marginBottom: 6
                    }}>
                      使用的变量 ({parsedInfo.variables.length})
                    </div>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 4
                    }}>
                      {parsedInfo.variables.map((v, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '2px 6px',
                            fontSize: 10,
                            borderRadius: 4,
                            background: 'rgba(139, 92, 246, 0.2)',
                            color: '#8b5cf6',
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          ${v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedInfo.errors.length === 0 && parsedInfo.dependencies.length === 0 &&
                 parsedInfo.linkLibraries.length === 0 && parsedInfo.variables.length === 0 && (
                  <div style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    textAlign: 'center',
                    padding: 16
                  }}>
                    输入 CMakeLists.txt 内容后显示解析结果
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}