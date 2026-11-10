# INS LAND · Campaign Planner

INS 年度活动规划工作台。Next.js、TypeScript 和 Supabase。预算看板、活动规划与年度资源分析共用同一份计划。

- **管理者**：查看和修改费用、项目与备注，使用 Excel / CSV / JSON 导出、JSON 导入和恢复初始计划。跨设备变更通过云端版本号防止静默覆盖。
- **浏览者**：用姓名和分享人提供的注册密码开户。可查看只读规划与粗略图表，费用字段显示 `****`。服务端省略真实预算、费用及备注，拒绝浏览者保存或恢复。
- 金额以整数分保存，季度按项目开始日期归属。卡片计划预算和搭建 / 体验细分独立计算。

## 开发与发布

需要 Node.js 24、pnpm 11。复制 `.env.example` 到 `.env.local`，填写 Supabase URL 与 publishable key（不要使用 secret key）。

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm dev
pnpm build
pnpm typecheck
```

GitHub Pages 项目站点用 `PLANNER_BASE_PATH=/ins-y27-campaign-planner pnpm build`，发布 `out/` 到 `gh-pages` 分支，保留 `.nojekyll`。如部署在独立域名根目录，留空该变量。代码仓库不包括真实预算、初始计划和密码。

## 数据库

部署到新 Supabase 项目时，在 `extensions` schema 启用 `pgcrypto`，依次执行 `supabase/001_planner.sql` 与 `supabase/003_role_access.sql`，随后由管理员私下初始化以下数据：

- `public.y27_planner`：年度计划（id 2027），使用管理方提供的预算数据。
- `y27_private.accounts`：唯一的 owner 账号，密码为与 pgcrypto 兼容的 bcrypt 哈希。
- `y27_private.settings`：登记浏览注册密码的 bcrypt 哈希、基准预算（分）和恢复用计划快照。

所有业务调用通过 `y27_access`。后端验证角色和到期时间，数据库仅保存会话令牌的散列。浏览者看不到真实金额，浏览会话不能执行任何计划写操作。管理者的实际凭据由项目拥有者保管。

登录页背景可选。执行 `supabase/006_login_backdrop.sql` 后，由管理员把登录页专用 WebP 拼图以 Base64 写入 `public.y27_login_backdrop` 的 `campaign-collage` 行。该行允许访客读取，登录后的七张封面继续走会话验证。未配置拼图时，登录页使用纯色背景。
