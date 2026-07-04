# Weekly Report Generator

## Description

自动收集 Git 提交记录、汇总工作内容，生成格式化的周报文档。

## 触发条件

当用户提到以下关键词时调用此技能：
- "生成周报"、"写周报"、"周报"
- "weekly report"、"generate weekly report"
- `/weekly-report`

## 执行流程

### 第 1 步：确定时间范围

询问用户需要生成哪个时间段的周报（默认：最近 7 天）。

### 第 2 步：收集 Git 提交记录

使用以下命令收集指定时间范围内的 Git 提交：

```bash
git log --since="<开始日期>" --until="<结束日期>" --all --oneline --no-merges --format="%h %ad %an: %s" --date=short
```

同时获取按作者统计和按日期统计：

```bash
# 按作者统计提交次数
git shortlog --since="<开始日期>" --until="<结束日期>" --all --no-merges -sn

# 按日期统计
git log --since="<开始日期>" --until="<结束日期>" --all --no-merges --format="%ad" --date=short | sort | uniq -c
```

### 第 3 步：分析提交内容

对收集到的提交进行分析：
- 按功能模块或主题对提交进行分组
- 识别每个分组的关键工作内容
- 提取重要的里程碑或成果

### 第 4 步：生成周报

生成格式化的中文周报，包含以下部分：

```markdown
# 周报 — YYYY/MM/DD ~ YYYY/MM/DD

## 一、本周工作概览
- 总提交数：X 次
- 参与人数：X 人
- 主要工作方向：[简述]

## 二、工作详情

### 按模块/主题分类
#### [模块名称]
- [工作项 1]（[提交者]）
- [工作项 2]（[提交者]）

## 三、统计数据
| 日期 | 提交次数 | 主要工作 |
|------|---------|---------|
| YYYY-MM-DD | X | [简述] |

## 四、下周计划
- [基于本周工作自然延伸的建议]

## 五、风险与问题
- [如适用，记录当前遇到的阻塞或问题]
```

### 第 5 步：输出周报

将周报保存为文件（默认路径：`weekly-reports/周报-YYYY-MM-DD~YYYY-MM-DD.md`），并展示给用户确认。

用户确认后可选择：
- 直接保存
- 修改后保存
- 复制到剪贴板
- 发送到指定渠道

## 注意事项

1. 如果仓库在指定时间段内没有提交，提示用户并询问是否需要调整时间范围。
2. 如果用户未指定输出路径，默认保存到 `weekly-reports/` 目录。
3. 周报语言跟随用户输入语言（中文/英文）。
4. 当提交信息不清晰时，可询问用户补充说明。
5. 支持 monorepo 场景：如果检测到多个子项目，可按项目分组展示。

## 参数

用户可以通过以下参数自定义行为：
- `--since` / `--until`：指定起止日期
- `--author`：只包含指定作者的提交
- `--format simple|detailed`：输出格式（简洁版/详细版）
- `--output <path>`：指定输出文件路径
- `--no-file`：不保存文件，仅输出到终端
- | name        | frontend-design                                              |
  | ----------- | ------------------------------------------------------------ |
  | description | Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics. |
  | license     | Complete terms in LICENSE.txt                                |

  This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

  The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

  ## Design Thinking

  

  Before coding, understand the context and commit to a BOLD aesthetic direction:

  - **Purpose**: What problem does this interface solve? Who uses it?
  - **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
  - **Constraints**: Technical requirements (framework, performance, accessibility).
  - **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

  **CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

  Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:

  - Production-grade and functional
  - Visually striking and memorable
  - Cohesive with a clear aesthetic point-of-view
  - Meticulously refined in every detail

  ## Frontend Aesthetics Guidelines

  

  Focus on:

  - **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
  - **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
  - **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
  - **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
  - **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

  NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

  Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

  **IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

  Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.
