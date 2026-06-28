/**
 * DevKit Pro - 开发者工具箱主入口
 * 
 * 【React 概念说明 for C++/Qt 开发者】
 * - React.ComponentType 类似于 Qt 的 QWidget 或 QML 的 Item
 * - Provider 模式类似于 Qt 的 QPlugin 或依赖注入
 * - useState 类似于 Qt 的 Q_PROPERTY + notify
 * - Hooks 类似于 Qt 的 Q_INVOKABLE 或 lambda 回调
 */

import { useState } from 'react';
import Layout from './components/Layout';
import JsonFormatter from './modules/jsonFormatter';
import RegexTester from './modules/regexTester';
import Encoder from './modules/encoder';
import TimestampTool from './modules/timestamp';
import ColorTool from './modules/colorTool';
import HashTool from './modules/hashTool';
import QrTool from './modules/qrTool';
import CronTool from './modules/cronTool';
import SnippetManager from './modules/snippetManager';
import MemoryLayout from './modules/memoryLayout';
import ProgrammerCalc from './modules/programmerCalc';
import CMakeHelper from './modules/cmakeHelper';
import EnumGenerator from './modules/enumGenerator';
import ByteOrder from './modules/byteOrder';
import BitVisual from './modules/bitVisual';
import JsonToStruct from './modules/jsonToStruct';
import QtSignals from './modules/qtSignals';
import QssEditor from './modules/qssEditor';
import CompilerEstimator from './modules/compilerEstimator';
import Home from './modules/home';
import { useTheme } from './hooks/useTheme';
import { HistoryProvider } from './hooks/useHistory';
import { ToastProvider } from './hooks/useToast';
import { ShortcutsProvider, useShortcuts } from './hooks/useShortcuts';

/**
 * 模块配置表 - 类似于 Qt 的插件注册表或工厂模式
 * key: 模块唯一标识
 * value: 对应的 React 组件（类似于 QWidget*）
 */
const MODULES: string[] = ['home', 'json', 'regex', 'encoder', 'timestamp', 'colorTool', 'hashTool', 'qrTool', 'cronTool', 'snippetManager', 'memoryLayout', 'programmerCalc', 'cmakeHelper', 'enumGenerator', 'byteOrder', 'bitVisual', 'jsonToStruct', 'qtSignals', 'qssEditor', 'compilerEstimator'];
type ModuleId = typeof MODULES[number];

/**
 * 模块组件映射表
 * 类似于 Qt 的 QWidgetFactory 或 QML 的 Loader
 * 【注意】home 模块需要 onSelectModule prop，因此在渲染时特殊处理
 */
const moduleComponents: Record<ModuleId, React.ComponentType<any>> = {
  home: Home,
  json: JsonFormatter,
  regex: RegexTester,
  encoder: Encoder,
  timestamp: TimestampTool,
  colorTool: ColorTool,
  hashTool: HashTool,
  qrTool: QrTool,
  cronTool: CronTool,
  snippetManager: SnippetManager,
  memoryLayout: MemoryLayout,
  programmerCalc: ProgrammerCalc,
  cmakeHelper: CMakeHelper,
  enumGenerator: EnumGenerator,
  byteOrder: ByteOrder,
  bitVisual: BitVisual,
  jsonToStruct: JsonToStruct,
  qtSignals: QtSignals,
  qssEditor: QssEditor,
  compilerEstimator: CompilerEstimator,
};

/**
 * 应用主内容组件
 * 类似于 Qt 的 MainWindow 或 QML 的 MainView
 */
function AppContent() {
  // useState - 类似于 Q_PROPERTY 中的成员变量 + onChanged 信号
  // activeModule: 当前激活的模块 ID（类似于当前页面/视图）
  // setActiveModule: 修改当前模块的方法（类似于 Q_INVOKABLE 或 slots）
  const [activeModule, setActiveModule] = useState<ModuleId>('home');
  const { theme, setTheme } = useTheme();

  // 注册全局快捷键 - 类似于 Qt 的 QShortcut 或全局事件过滤器
  useShortcuts(MODULES, setActiveModule);

  // 根据 activeModule 动态选择要渲染的组件
  // 类似于 Qt 的 QStackedWidget::setCurrentIndex() 或 QML 的 StackView
  const ActiveComponent = moduleComponents[activeModule];

  return (
    <Layout
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      theme={theme}
      onThemeChange={setTheme}
    >
      {/* 渲染当前激活的模块组件 */}
      {/* 类似于 QStackedWidget::currentWidget() */}
      {activeModule === 'home' ? (
        <Home onSelectModule={setActiveModule} />
      ) : (
        <ActiveComponent />
      )}
    </Layout>
  );
}

/**
 * 根组件 - 应用入口
 * 
 * 【Provider 模式说明】
 * Provider 类似于 Qt 的 QGraphicsScene 或依赖注入容器
 * 子组件通过 useContext() 获取 Provider 提供的数据
 * 
 * 层级结构（外到内）：
 * 1. ToastProvider - 提供全局 Toast 提示服务
 * 2. ShortcutsProvider - 提供全局快捷键服务
 * 3. HistoryProvider - 提供历史记录服务
 * 4. AppContent - 主内容组件
 */
export default function App() {
  return (
    // ToastProvider 类似于 Qt 的 QMessageBox 全局单例
    // 只不过 React 的方式是通过 Context 传递，而非全局静态方法
    <ToastProvider>
      <ShortcutsProvider>
        <HistoryProvider>
          <AppContent />
        </HistoryProvider>
      </ShortcutsProvider>
    </ToastProvider>
  );
}
