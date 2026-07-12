# 踩坑记录

本文件记录开发过程中遇到的具体问题及其解法。它是事实档案，不是约束文件。

规则沉淀请写入 `AGENTS.md`，不要写在这里。反之，具体的报错、版本坑、第三方接口异常行为请写在这里，不要追加进 `AGENTS.md`。

条目格式固定为四段，编号只增不重排。

## 1. `import.meta.url` 的 pathname 是 percent-encoded，中文路径下 CLI 入口静默失效

**现象。** 用下面这种常见写法判断脚本是否被直接调用，当仓库路径含非 ASCII 字符时永远为 `false`。脚本被 `node scripts/xxx.mjs` 调用时什么都不做，且退出码为 0，看起来像「通过了」。

```js
const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
```

**根因。** `new URL(import.meta.url).pathname` 返回形如 `/E:/%E5%BA%B7%E5%BA%B7/scripts/x.mjs` 的 percent-encoded 字符串。那段正则只剥掉了前导斜杠，percent-encoding 原样保留。而 `process.argv[1]` 是解码后的真实路径。两者不可能相等。

纯 ASCII 路径下该写法碰巧能工作，所以它在很多项目里活得好好的。一旦路径含非 ASCII 字符就失效，且失效方式是静默的。

**修复。** 用 `node:url` 的 `fileURLToPath` 解码：

```js
import { fileURLToPath } from 'node:url'

const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
```

**验证。**

```bash
node scripts/validate-rules.mjs tests/fixtures/invalid-bare-prohibition; echo $?
```

应打印违规详情并返回 1。修复前返回 0 且无任何输出。

## 2. `node --test tests/` 的尾部斜杠让 Node 把目录当文件

**现象。** `npm test` 报 `Error: Cannot find module '<repo>	ests'`，而单独运行 `node --test tests/xxx.test.mjs` 一切正常。

**根因。** Node 22 在 `--test` 后收到带尾部斜杠的 `tests/` 时，不把它当作要遍历的目录，而是当作一个要 `require` 的模块路径。去掉斜杠写 `tests` 可以工作，但最稳的是完全不给参数，让 Node 自动发现。

**修复。** `package.json` 的 test 脚本改为：

```json
"test": "node --test"
```

自动发现会匹配 `**/*.test.mjs`，不会误抓 `tests/fixtures/` 下的 `.md` 夹具。

**验证。**

```bash
npm test
```

应输出 `# tests 20`、`# pass 20`、`# fail 0`。

这个坑与第 1 条相反：它响亮地失败了。同样是「脚本没跑」，第 1 条静默返回 0 伪装成通过，本条直接崩溃。写工具时若不确定输入是否被正确解释，宁可让它崩，不要让它跳过。

## 3. 文档站的站点绝对路由被误判为死链

**现象。** `check-docs.mjs` 在一个使用 fumadocs 的真实项目上报出 19 个死链，全部形如 `/docs/overview/quick-start`。但这些页面确实存在。

**根因。** fumadocs、VitePress、Docusaurus 的文档索引里写的是**站点路由**，不是文件系统路径。`/docs/overview/quick-start` 对应的实际文件是 `docs/content/docs/overview/quick-start.mdx`。`checkDeadLinks` 拿路由字符串直接去 `fs.existsSync`，必然找不到。

8 个单元测试全部通过，因为夹具里的链接都是相对路径。这个形态在写测试时根本没被想到，只在真实项目上暴露。

**修复。** 跳过以 `/` 开头的链接。解析站点路由需要知道该站点的路由规则，本脚本不做这件事。

```js
if (target.startsWith('/')) continue
```

并补两个测试：一个断言站点绝对路由被放行，一个断言相对路径的死链仍被检出。

**验证。**

```bash
npm test                     # 22 passed
node scripts/check-docs.mjs  # 在含 fumadocs 索引的项目上返回 0
```

**教训。** 夹具反映作者的想象力，真实项目反映世界。验收标准要求跑在真实项目副本上，正是为了这个。

## 4. 管道与前导短横线会吃掉退出码，让检查静默说谎

**现象。** 验收过程中三次遇到同一类问题：

- `(grep -rlE "dark:|..." src | head -1) && echo "找到主题特征"` —— 报告找到了，实际 0 个文件命中。
- `grep -Fqx "$line" AGENTS.md` —— 当 `$line` 以 `-` 开头时，grep 把它当选项，报 `unknown option`，判定全部失效。
- `rm -rf "$dir" && test -d "$dir" && echo 残留 || echo 已清理` —— `rm` 失败时短路到 `||`，打印「已清理」。

**根因。** 管道的退出码是最后一个命令的（`head` 读到空输入照样返回 0）。`grep` 的位置参数需要 `--` 终止选项解析。`A && B || C` 在 A 失败时执行 C，与直觉相反。

**修复。**

- 判断有无命中用 `grep -c` 或 `wc -l` 取数字，不要用管道后的退出码。
- 传可能以 `-` 开头的参数一律加 `--`：`grep -Fqx -- "$line"`。
- 需要分支时用显式 `if`，不要用 `&&`/`||` 链。

**验证。** 第一个问题若未被发现，`frontend/design-token-consistency` 会被错误选入，生成的 `AGENTS.md` 会告诉未来的 AI「颜色一律取自主题 token」——而那个项目根本没有主题系统。规则措辞完美、语法正确，却是假话。这正是「默认排除」与「路径存在门」要防的东西，而它差点从验收脚本自己溜进来。

## 5. `git log -- <dir>` 看不见工作区里未提交的删除，判活证据会说谎

**现象。** 用 `git log -1 --format=%ci -- <dir>` 判断一个空目录「是被放弃的，还是正在重建的」。文件两年前提交、今天刚被 `rm` 掉但没提交时，该命令照样返回两年前——于是一个正在重建的活目录被报成「废弃两年」。

**根因。** `git log -- <path>` 只读**已提交**历史。工作区里的删除还没进历史，它看不见。而 `find . -type d -empty` 看的是**工作区**。两条命令看的是两个不同的世界，拼在一起就得出了错误结论。

雪上加霜的是：**git 根本不追踪空目录**。所以一个空目录既不会让 `git status` 变脏，也不会在 git 里留下任何痕迹——它对 git 完全隐形。

**修复。** 加一条排除条件，同时看工作区：

```bash
git status --short -- "$dir"   # 非空 = 该目录正在被改动，不是被放弃的
```

`legacy/orphan-abstraction` 的 `Do Not Apply When` 里写死了这条。

**验证。** 造一个回溯提交的靶子：

```bash
git commit --date="2023-01-01" -m x   # repositories/user.py
rm repositories/user.py               # 不提交
git log -1 --format=%ci -- repositories   # → 2023-01-01（说谎）
git status --short -- repositories        # → " D repositories/user.py"（真相）
```

**教训。** 一条规则同时依赖「工作区」与「git 历史」两个数据源时，必须问：它们会不会不一致？不一致时哪个是真的？这个坑不是 `git log` 的 bug，是把两个时间尺度的证据当成同一个来用。

## 6. NTFS 上目录的 `stat` 大小为 0，`[ ! -s ]` 会把目录误判为零字节文件

**现象。** 扫描「只含一个零字节入口文件的目录」（如只有空 `__init__.py` 的 `adapters/`），命令误把一个只含**子目录**的目录也报了出来——一个只含 `components/` 的 `src/` 被报成废弃抽象层。

**根因。**

```bash
n=$(ls -A "$d" | wc -l)
if [ "$n" -eq 1 ] && [ ! -s "$d/$(ls -A "$d")" ]; then echo "$d"; fi
```

`-s` 判断的是「存在且大小非零」。在 NTFS/Git-Bash 上，**目录的 `stat` 大小是 0**，于是 `[ ! -s "$d/components" ]` 为真，`src/` 被判为「只含一个零字节文件」。

**修复。** 加 `-f` 判定，要求那个唯一子项确实是普通文件：

```bash
c=$(ls -A "$d")
if [ "$n" -eq 1 ] && [ -f "$d/$c" ] && [ ! -s "$d/$c" ]; then echo "$d"; fi
```

**验证。** 靶子含 `adapters/__init__.py`（0 字节）、`live/__init__.py`（有内容）、`src/components/Button.tsx`。修复前命中 `./adapters` 与 `./src`，修复后只命中 `./adapters`。

**教训。** `-s` 读起来像「是个非空文件」，实际只是「大小非零」。类型判定要显式写出来，不要指望大小判定捎带完成它。

## 7. `legacy/` 的「至少两条排除条件」在语义上是空的——校验器只数行数

**状态：未修复。触发条件是「有人写一个自动档的 `legacy/` 块」。**

**现象。** `legacy/doc-fork` 的两条 `Do Not Apply When`：

```
Applies When:      同时存在 AGENTS.md 与 CLAUDE.md；CLAUDE.md 非空行 > 1
Do Not Apply When: CLAUDE.md 唯一非空行是 @AGENTS.md   ← 是 Applies When 第 2 条的逻辑否定
                   项目根目录不含 AGENTS.md              ← 是 Applies When 第 1 条的逻辑否定
```

只要 `Applies When` 成立，这两条**必然为假**。它们**恒假，等于零条排除条件**。

**根因。** `AGENTS.md`、`reference/rule-block-spec.md`、`validateRemediation` 三处都强制「`legacy/` 块的 `Do Not Apply When` 至少两条」，理由写的是「腐烂与健康常常同形，误杀的代价远大于漏报，一条排除条件挡不住同形误判」。

但校验器的实现是：

```js
const exclusions = (block.sections['Do Not Apply When'] || []).filter((l) => /^-\s/.test(l))
if (exclusions.length < 2) { ... }
```

**它只数行数，不看语义。**把 `Applies When` 抄一遍再取反，就能凑够两行、通过校验，而防误杀能力为零。

**为什么今天不炸。** `doc-fork` 现在是报告档，它不动任何文件，恒假的排除条件没有后果。危险的是未来任何一个**自动档**的 `legacy/` 块照这个样子写——它会真的动手，而它的「防误杀机制」是空的。

**修复方向（未做）。** 校验器无法判定「这条排除是不是 `Applies When` 的取反」——那需要语义理解。可行的替代：要求 `Do Not Apply When` 中至少有一条**引用了 `Applies When` 里没有出现过的证据源**（`git log`、`.gitignore`、import 引用、文件内容特征）。这个可以机械判定：取两个字段的 token 集合，要求差集非空。

## 8. 阶段 1 的反查机制与 `INIT.md` 的路径替换要求互斥，注定恒失败

**状态：未修复。触发条件是「给任何一个非 `legacy/` 的规则块补 `Legacy Scan` 字段」。**

**现象。** `REFACTOR.md` 阶段 1 要反查「`AGENTS.md` 里实际选入了哪些规则块」，方法是把规则块 `Rule` 字段的每一条，拿去在 `AGENTS.md` 里做逐字全等的整行匹配：

```bash
grep -Fqx -- "<条目原文>" AGENTS.md
```

**根因。** `INIT.md` 阶段 6 的路径存在门明令：

> 规则块正文中的路径是**通用写法**，写入目标项目时**必须替换**为该项目的真实路径。例如 `services/` 在某个项目里是 `backend/app/services/`。**不做替换就无法通过本门。**

于是：凡是 `Rule` 里含路径的规则块，生成的 `AGENTS.md` 里必然**不是原文** → 逐字匹配必然落空 → 该块永远反查不出来。

两条要求各自都对，接在一起互斥。

**为什么今天不炸。** 当前只有 `legacy/` 的 5 个块带 `Legacy Scan`，而它们由阶段 1 的第 2 部分**无条件纳入**，不走反查。反查的交集恒为空。

**更糟的是它被提前免检了。** `REFACTOR.md` 阶段 1 写着「交集为空是**正常结果**，不要因此停下来告诉用户手册有缺陷」——这句话是为了避免误报而写的，但它同时把这个 bug 的唯一症状（交集为空）宣布为正常，于是它永远不会被发现。

**修复方向（未做）。** 让 `INIT.md` 在生成 `AGENTS.md` 时，把选入的规则块 id 写进文件尾部的 HTML 注释（`<!-- rules: frontend/anti-over-abstraction, core/mandatory-test-gate -->`）。反查改为读这个注释，不再靠文本匹配。代价是改动 `INIT.md` 的生成契约。

## 9. 「有 `Legacy Scan` 无 `Remediation`」的块能通过校验，但阶段 3 无法给它分组

**状态：未修复。触发条件同第 8 条。**

**现象。** `validateRemediation` 只强制「有 `Remediation` 必须有 `Legacy Scan`」，**反向不管**。一个只写 `Legacy Scan`、不写 `Remediation` 的块，`node scripts/validate-rules.mjs` 返回 0，通过。

但 `REFACTOR.md` 阶段 3 是「按各块 `Remediation` 的 `可逆性` 分成【自动】与【报告】两组」——这种块**既不属于【自动】也不属于【报告】**，阶段 2 偏离清单的 `可逆性` 那一列没有值可填。

**根因。** 「只扫不改」当初被当成合法用法放行了（`rule-block-spec.md` 至今仍写着「同一条规则可以同时有两者」，并示范 `frontend/anti-over-abstraction` 的 `Legacy Scan` 就是同一条 grep 去掉「新增」二字）。但 `REFACTOR.md` 的分组算法假定每个进入扫描集的块都有 `可逆性`。

**为什么今天不炸。** 当前 5 个 `legacy/` 块全都有 `Remediation`。

**修复方向（未做）。** 二选一：① 校验器强制「有 `Legacy Scan` 必须有 `Remediation`」，并更新 `rule-block-spec.md` 的示范；② `REFACTOR.md` 阶段 3 增加第三组【仅扫描】，只在阶段 6 报告命中，不做任何动作。②更符合「只扫不改是合法的」这个原意。
