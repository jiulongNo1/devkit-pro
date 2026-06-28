# DevKit Pro

一套现代化的开发者工具箱，集成常用开发工具，提升开发效率。

## ✨ 功能特性

### 🏠 首页仪表盘

- 欢迎语和应用简介
- 所有工具模块的卡片式快捷入口（彩色图标、hover 动效）
- 快捷操作区：当前时间戳一键复制、随机字符串生成器
- 最近使用历史记录（最近 5 条，点击可跳转）
- 响应式网格布局

### 🛠 工具模块

| 模块 | 功能说明 |
|------|----------|
| **首页** | 仪表盘、快捷入口、最近使用 |
| **JSON 格式化** | JSON 格式化、压缩、语法校验、错误提示 |
| **正则表达式测试** | 正则匹配测试、实时高亮、多标志位支持 |
| **编码转换** | Base64 / URL 编码 / HTML 实体 / Unicode 编码解码 |
| **时间戳工具** | 时间戳与日期互转、当前时间展示、时区支持 |
| **颜色工具** | HEX / RGB / HSL 三向互转、调色板生成、随机颜色 |
| **哈希与校验** | MD5/SHA-1/256/512 哈希、CRC-8/16/32、Adler-32、Sum、XOR、AES-CBC/GCM 加解密 |
| **二维码工具** | 文本转二维码、自定义尺寸/颜色、支持 Logo、PNG 下载 |
| **Cron 工具** | Cron 表达式解析、自然语言描述、显示执行时间、常用模板 |
| **代码片段** | 创建/编辑/删除代码片段、搜索筛选、标签管理、语法高亮 |
| **内存布局** | C++ struct 内存对齐可视化、字段详情、padding 计算、32/64位切换 |
| **程序员计算器** | 进制转换（HEX/DEC/OCT/BIN）、位操作、二进制位可视化、BigInt 支持 |
| **CMake 辅助** | CMakeLists.txt 代码编辑、常用命令模板库、依赖关系解析、错误检测 |
| **Enum 生成器** | 枚举定义、多语言代码生成（C++11/C/Qt/C#/JSON）、批量导入、一键复制 |
| **字节序转换** | 十六进制解析、大端/小端解读（uint8/16/32/64、float、double）、一键翻转、示例数据 |
| **位操作可视化** | 位操作可视化（AND/OR/XOR/NOT/移位）、8×8位格子交互、位变化统计、常见操作示例 |
| **JSON转Struct** | JSON解析生成C++ struct、嵌套对象、nlohmann/json序列化、类型映射规则 |
| **Qt信号槽** | 信号槽连接生成、参数匹配检查、模板库、连接关系图展示 |

### 📜 历史记录

- 每个模块独立保存操作历史
- 支持最近 10 条记录展示
- 一键回填历史记录到输入框
- 支持清空当前模块历史
- 数据持久化存储到 localStorage

### 🔔 全局 Toast 提示

- 右下角滑入动画
- 支持 success / error / info 三种类型
- 2 秒自动消失，支持手动关闭
- 同时最多显示 3 条
- 使用 React Portal 渲染，避免 z-index 问题

### ⌨️ 全局快捷键

| 快捷键 | 功能 |
|--------|------|
| `Alt + 0` | 切换到首页仪表盘 |
| `Alt + 1` | 切换到 JSON 格式化模块 |
| `Alt + 2` | 切换到正则表达式测试模块 |
| `Alt + 3` | 切换到编码转换模块 |
| `Alt + 4` | 切换到时间戳工具模块 |
| `Alt + 5` | 切换到颜色工具模块 |
| `Alt + 6` | 切换到哈希计算模块 |
| `Ctrl + Enter` | 执行当前模块的主操作 |
| `Ctrl + Shift + C` | 复制当前输出内容 |

### 💾 数据管理

- 支持导出所有本地数据为 JSON 备份文件
- 支持导入 JSON 备份文件恢复数据
- 支持一键清除所有本地数据
- 备份文件名格式：`devkit-pro-backup-YYYYMMDD-HHmmss.json`

### 🎨 其他特性

- 🌙 深色 / 浅色主题切换
- 📱 响应式布局（适配桌面和移动端）
- 💾 本地存储，数据不丢失
- 🚀 纯前端，无需后端

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 本地预览生产构建

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

## 📁 项目结构

```
src/
├── components/          # 通用组件
│   ├── HistoryPanel.tsx # 历史记录面板
│   ├── Layout.tsx       # 布局组件
│   ├── SettingsPanel.tsx # 设置面板
│   ├── Sidebar.tsx      # 侧边栏导航
│   ├── ThemeToggle.tsx  # 主题切换
│   └── Toast.tsx        # Toast 提示组件
├── hooks/               # 自定义 Hooks
│   ├── useHistory.tsx   # 历史记录 Hook
│   ├── useShortcuts.tsx # 快捷键 Hook
│   ├── useTheme.ts      # 主题 Hook
│   └── useToast.tsx     # Toast Hook
├── modules/             # 工具模块
│   ├── home/           # 首页仪表盘
│   ├── colorTool/       # 颢色工具
│   ├── cronTool/        # Cron 工具
│   ├── encoder/         # 编码转换
│   ├── hashTool/        # 哈希与校验
│   ├── jsonFormatter/   # JSON 格式化
│   ├── qrTool/          # 二维码工具
│   ├── regexTester/     # 正则表达式测试
│   ├── snippetManager/   # 代码片段
│   ├── memoryLayout/    # 结构体内存布局
│   ├── timestamp/        # 时间戳工具
│   ├── programmerCalc/  # 程序员计算器
│   ├── cmakeHelper/     # CMake 辅助
│   ├── enumGenerator/   # Enum 生成器
│   ├── byteOrder/       # 字节序转换
│   ├── bitVisual/       # 位操作可视化
│   ├── jsonToStruct/    # JSON转Struct
│   └── qtSignals/       # Qt信号槽
├── types/               # TypeScript 类型定义
├── utils/               # 工具函数
├── App.tsx              # 应用入口
└── main.tsx             # 渲染入口
```

## 🛠 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Lucide React** - 图标库
- **highlight.js** - 代码语法高亮
- **qrcode** - 二维码生成
- **cron-parser / cronstrue** - Cron 表达式解析
- **Oxlint** - 代码检查
- **纯 CSS** - 无额外 UI 库依赖

## 📝 使用说明

### 首页仪表盘

1. 打开应用默认显示首页
2. 点击工具卡片可快速跳转到对应工具
3. 快捷操作区：点击「秒级」或「毫秒级」复制当前时间戳
4. 随机字符串生成器：选择类型（字母数字/纯数字/十六进制/强密码）和位数，点击「重新生成」或「复制」
5. 最近使用区域显示最近 5 条操作记录，点击可跳转到对应工具

### JSON 格式化

1. 在左侧输入框粘贴 JSON 数据
2. 点击「格式化」按钮美化 JSON
3. 点击「压缩」按钮压缩 JSON
4. 点击复制按钮复制结果

### 正则表达式测试

1. 输入正则表达式和标志位（如 g、i、m）
2. 输入测试文本
3. 实时查看匹配结果和高亮显示
4. 支持复制所有匹配结果

### 编码转换

1. 选择编码类型（Base64 / URL / HTML / Unicode）
2. 输入待转换内容
3. 点击「编码」或「解码」按钮
4. 查看转换结果并一键复制

### 时间戳工具

1. 输入时间戳，点击「转日期」查看日期时间
2. 输入日期时间，点击「转时间戳」获取时间戳
3. 顶部展示当前时间戳和对应日期时间
4. 支持一键复制

### 颜色工具

1. 输入 HEX / RGB / HSL 任一格式，自动转换显示另外两种
2. 查看实时颜色预览块（120x120px）
3. 一键复制 HEX / RGB / HSL 值
4. 查看调色板：邻近色、互补色、三色方案
5. 点击调色板色块可快速切换颜色
6. 点击「随机颜色」生成随机颜色

### 哈希与校验

1. **密码学哈希 Tab**：
   - 输入文本或十六进制数据
   - 点击「计算哈希」获取 MD5 / SHA-1 / SHA-256 / SHA-512
   - 一键复制任意哈希值
2. **校验和/CRC Tab**：
   - 输入文本或十六进制数据
   - 实时计算所有校验算法结果
   - 支持 CRC-32 (IEEE)、CRC-16 (Modbus/CCITT/IBM)、CRC-8、Adler-32
   - 支持 Sum8/16/32、XOR8 简单校验
   - 自定义 CRC：设置宽度、多项式、初始值、输出异或、输入/输出反转
   - HEX 和 DEC 两种格式显示，一键复制
3. **AES 加解密 Tab**：
   - 选择 CBC 或 GCM 模式
   - 输入密钥和 IV（可随机生成）
   - 输入明文点击「加密」获取密文（十六进制）
   - 输入密文点击「解密」还原明文

### 二维码工具

1. 输入文本或 URL
2. 自定义二维码尺寸（128px ~ 512px）
3. 设置前景色和背景色
4. 可选：上传 Logo 图片（本地文件）
5. 调整 Logo 大小比例
6. 点击「下载」按钮保存 PNG 图片

### Cron 工具

1. 输入 Cron 表达式（格式：分 时 日 月 周）
2. 实时查看自然语言描述（中文）
3. 显示接下来 5 次执行时间（含日期、星期）
4. 常用模板快速选择：每分钟、每小时、每天、每周、每月、工作日等
5. 一键复制表达式
6. 支持历史记录回填

### 代码片段

1. 点击「新建片段」创建代码片段
2. 填写标题、选择语言（支持 JavaScript、TypeScript、C++、Qt/C++、Python 等 17 种语言）
3. 添加标签分类（支持预设标签：前端、后端、工具函数等）
4. 粘贴代码内容，自动进行语法高亮
5. 支持搜索和按标签筛选
6. 点击卡片上的按钮可复制、编辑或删除片段
7. 所有数据保存在本地 localStorage

### 内存布局可视化

1. 输入 C++ struct 定义代码（或使用示例模板）
2. 选择 32位或 64位模式（影响指针和 long 的大小）
3. 自动解析字段：类型、名称、数组大小
4. 查看内存布局可视化：
   - 彩色横条显示每个字段（8种颜色区分）
   - Padding 区域用灰色斜线纹理标识
   - 色块上标注字段名和大小
   - 下方标注偏移量刻度（如 0、10、12、16...）
5. 查看详情表格：字段名、类型、大小、对齐要求、偏移量
6. 统计汇总：总大小、有效数据、padding 量、padding 占比、最大对齐
7. 支持深色主题预览开关
8. 5个示例模板：学生信息、数据包头、点坐标、链表节点、混合类型

### 程序员计算器

1. 选择数据类型：BYTE（8位）、WORD（16位）、DWORD（32位）、QWORD（64位）
2. 选择进制：HEX（十六进制）、DEC（十进制）、OCT（八进制）、BIN（二进制）
3. 输入数值，实时显示所有进制的转换结果
4. 点击二进制位格子可切换 0/1，支持 BigInt 精度
5. 位操作：AND、OR、XOR、NOT、左移、右移、循环移位
6. 常用运算：加、减、乘、除、取模、幂运算
7. 支持括号和键盘输入
8. 响应式布局，移动端进制框自动换行显示

### CMake 辅助

1. 左侧代码编辑区编写 CMakeLists.txt（等宽字体）
2. 右侧辅助面板：
   - 常用命令模板库（7 个分类，点击自动插入到光标位置）
     - 项目配置类：cmake_minimum_required、project、set(CMAKE_CXX_STANDARD)
     - 查找依赖类：find_package(Qt6)、find_package(Threads)、find_package(Boost)
     - 目标定义类：add_executable、add_library、target_sources、target_link_libraries
     - 编译选项类：target_compile_options、target_compile_features
     - 安装打包类：install、CPack 配置
     - 测试类：enable_testing、add_test
     - 条件判断类：if/elseif/else/endif
   - 实时辅助信息：
     - 解析 find_package 的依赖关系
     - 解析 target_link_libraries 的链接库
     - 检测常见错误：大小写敏感、if/endif 匹配、foreach/endforeach 匹配
     - 显示所有 ${XXX} 变量名
3. 3 个完整项目模板：Qt6 最小项目、C++17 库项目、CMake 子目录项目
4. 支持复制内容或下载为 CMakeLists.txt 文件

### Enum 生成器

1. 输入枚举名称（如 Status、Color、FileType）
2. 动态添加枚举值：
   - 名称：枚举值标识符
   - 值：可选整数值，不填则自动从 0 递增
   - 注释：可选的中文/英文注释
3. 支持上下移动调整顺序、删除枚举值
4. 批量导入：粘贴逗号或换行分隔的文本自动填充
5. Tab 切换查看不同格式：
   - C++11 enum class：包含 to_string 和 from_string 函数
   - C enum：typedef enum 格式
   - Qt enum：带 Q_ENUM 宏
   - C# enum：public enum 格式
   - JSON Schema：带 descriptions 字段
6. 一键复制生成的代码

### 字节序转换

1. 输入十六进制字节序列（支持多种格式）：
   - 空格分隔：`01 02 03 04`
   - 0x 前缀：`0x01 0x02 0x03`
   - 无分隔：`01020304`
   - C 数组格式：`{0x01, 0x02, 0x03, 0x04}`
2. 实时显示数据类型解读（按数据类型分组表格）：
   - uint8_t / int8_t（每个字节）
   - uint16_t / int16_t（每2字节）
   - uint32_t / int32_t / float（每4字节，IEEE 754）
   - uint64_t / int64_t / double（每8字节，IEEE 754）
3. 每种类型显示大端序（BE）和小端序（LE）值
4. 一键翻转字节序（反转整个序列）
5. 示例数据：TCP 头部、UDP 头部、IPv4 地址、浮点数、32位整数
6. 点击复制按钮复制 HEX 和 DEC 值

### 位操作可视化

1. 选择位宽：8位 / 16位 / 32位 / 64位
2. 选择运算符：AND / OR / XOR / NOT / <<（左移）/ >>（右移）
3. 输入数值 A 和数值 B（支持 DEC/HEX 模式切换）
4. 移位运算时，数值 B 变为移位位数输入
5. 可视化区域显示：
   - 上方：数值 A 的二进制位格子（8×8 网格）
   - 中间：运算符图标或移位位数
   - 下方：运算结果的二进制位格子
   - 变化的位高亮标注（加粗边框 + 发光 + 闪烁动画）
6. 交互操作：
   - 点击位格子切换 0/1（实时更新数值）
   - 悬停显示位号（0-63）和权重（2^n）
7. 结果显示：DEC / HEX / OCT / BIN 四种格式，一键复制
8. 位变化统计：0→1 数量、1→0 数量、总变化数
9. 常见操作示例：提取位、设置位、清除位、取反位、掩码操作

### JSON转Struct

1. 左侧 JSON 编辑器粘贴或输入 JSON 数据
2. 选择代码风格：现代 C++ / Qt 风格 / C 结构体
3. 配置生成选项：
   - 使用 nlohmann/json 库
   - 生成 to_json / from_json 序列化函数
   - 使用 std::optional 处理可空字段
   - 字符串类型选择（std::string / QString / const char*）
4. 点击「格式化」自动美化 JSON
5. 右侧实时生成对应的 C++ struct 定义代码
6. 支持嵌套 JSON 对象自动生成嵌套 struct
7. 一键复制生成的代码
8. 类型映射规则表格清晰展示各类型的映射关系
9. 3 个示例模板：用户信息、API 响应、配置文件

### Qt信号槽

1. 选择 Qt 版本：Qt5 或 Qt6
2. 输入发送者对象类型（如 QPushButton）和信号（如 clicked）
3. 输入接收者对象类型（如 MainWindow）和槽函数（如 onButtonClicked）
4. 输入信号和槽的参数列表
5. 实时检查参数匹配状态（绿色✓/红色✗图标）
6. 预览生成的 connect() 代码
7. 支持使用 Lambda 连接方式
8. 点击「添加连接」保存到连接列表
9. 模板库支持分类快速选择：
   - QPushButton: clicked, pressed, released, toggled
   - QLineEdit: textChanged, editingFinished, returnPressed
   - QComboBox: currentIndexChanged, currentTextChanged
   - QSlider: valueChanged, sliderMoved, sliderPressed
   - QTimer: timeout
   - QNetworkAccessManager: finished, authenticationRequired, sslErrors
10. 连接关系图展示当前所有 connect 关系
11. 支持复制和删除连接记录

### 数据管理

1. 点击左侧侧边栏底部的「设置」按钮
2. **导出数据**：点击「导出数据」按钮，下载 JSON 备份文件
3. **导入数据**：点击「导入数据」按钮，选择备份 JSON 文件
4. **清除数据**：点击「清除所有数据」按钮，二次确认后清空

## 📄 License

MIT
