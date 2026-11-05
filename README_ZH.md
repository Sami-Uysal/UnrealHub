# UnrealHub 简体中文版

上游仓库：https://github.com/Sami-Uysal/UnrealHub

基于上游 1.6.1（提交 `7467409323055cbaff62383be0704e0d5b03534f`）添加简体中文支持，保留英文和土耳其语。

## 运行

- 免安装版：`release/1.6.1-zh.1/UnrealHub-Windows-1.6.1-zh.1-zh-CN-Portable.exe`，双击运行即可。
- 安装版：`release/1.6.1-zh.1/UnrealHub-Windows-1.6.1-zh.1-Setup.exe`，支持选择中文安装界面和安装目录。
- 解包版本：`release/1.6.1-zh.1/win-unpacked/UnrealHub.exe`，需保留整个 `win-unpacked` 文件夹。

以上均为 Windows x64 程序，运行时无需安装 Node.js 或开发依赖。

打开 **Settings → Language → 简体中文** 即可切换，选择会在重启后保留。浏览器语言为中文且没有已有语言选择时，会自动启用简体中文；部分 Electron 环境默认报告英文，此时手动切换一次即可。

在“设置”中添加引擎和项目搜索文件夹，或者使用项目页面的加号导入 `.uproject`。

## 中文支持

- 新增 `src/locales/zh-CN.json`，共 285 条翻译，覆盖项目、引擎、设置、资源商城、Git 历史、任务看板、配置编辑、确认对话框等界面。
- 在 `src/i18n.ts` 注册中文资源，将中文语言标识归一化为 `zh-CN`，并同步 HTML 文档语言。
- 在设置页面增加“简体中文”，补齐加载提示、确定按钮、商城排序/筛选/刷新/取消文字。
- 为字体列表加入微软雅黑等中文字体。
- 防止默认小窗口下“项目”标题逐字换行。
- 明确使用 `electron-builder.json5` 打包，新增免安装目标和安装语言选择。
- 移除 `src/main.tsx` 中调用未暴露的 `window.ipcRenderer` 的模板日志监听，修复点击资源商城后整个界面灰屏的问题。

项目名、文件路径、插件名称、第三方资源说明及原始错误消息保留其原有内容。

## 从源码编译

```powershell
npm.cmd ci --no-audit --no-fund
npx.cmd tsc --noEmit
npm.cmd run build -- --publish never
```

安装包输出至 `release/1.6.1-zh.1/`。`--publish never` 用于本地构建。

如果 electron-builder 24 的 winCodeSign 工具解压提示无法创建 `darwin` 下的符号链接，可仅解压其 Windows 工具至本机 electron-builder 缓存的 `winCodeSign/winCodeSign-2.6.0` 目录，再重新构建。本次构建已通过此方式解决，无需调整系统权限。

## 本次验证

- TypeScript 检查和生产构建通过，生成安装版和免安装版。
- 中、英、土三种语言的 285 个键及插值占位符一致。
- 9 组语言检测场景、语言切换和 localStorage 保存检查通过。
- 已启动实际免安装 exe，验证中文设置、引擎页面及重启后语言选择。
- 灰屏修复后，实际免安装 exe 连续完成 3 轮资源商城/设置切换，无未捕获异常且 React 根节点保持挂载。可用 Node.js 22+ 执行 `node scripts/check-marketplace.mjs` 重跑本地打包回归检查；测试会启动独立应用实例并在结束后关闭。
- 原仓库 lint 有 71 个错误、5 个警告；与上游源码比较，本次没有新增 lint 问题。
- 未执行真实项目删除、缓存清理、Git 提交、Epic 登录或资源下载等操作；安装版未执行安装测试。

此修改版版本号为 `1.6.1-zh.1`，更新源已指向 [GoldenDragons/UnrealHub](https://github.com/GoldenDragons/UnrealHub/releases)，与上游官方发行版区分。
