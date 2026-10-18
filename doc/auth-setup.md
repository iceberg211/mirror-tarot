# 邮箱登录（魔法链接）配置说明

本项目使用 Supabase 的邮箱 OTP 登录：输入邮箱 → 收邮件 → 点链接回到 `/auth/callback`。
登录即注册（`shouldCreateUser: true`），没有密码，因此不存在「注册表单」和「找回密码」。

代码已支持两种回调参数，可按需切换：

| 参数 | 说明 | 能否跨设备打开 |
|---|---|---|
| `?code=`（PKCE，当前默认） | 依赖申请链接时浏览器里的 `code_verifier` | 否 |
| `?token_hash=`（推荐） | 链接自带一次性凭据，服务端校验 | 是 |

切换只需改 Supabase 后台的邮件模板，前端代码无需再改。

## 1. 修改邮件模板

Supabase Dashboard → **Authentication → Email Templates → Magic Link**，把正文里的链接替换为：

```html
<h2>登录 Mirror Tarot</h2>
<p>点击下面的链接完成登录，链接只能使用一次。</p>
<p>
  <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">
    进入镜面
  </a>
</p>
```

注意：

- `{{ .SiteURL }}` 取的是 **Authentication → URL Configuration → Site URL**，必须等于应用的生产域名（例如 `https://mirror.example.com`），不要带结尾斜杠。
- 若使用自定义域名或多环境，建议改成
  `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`，
  前端发送时传入的 `emailRedirectTo` 已经是 `<origin>/auth/callback`。
- 生产域名与本地开发地址都要加入 **Redirect URLs** 白名单，否则 Supabase 会回落到 Site URL。

## 2. 关闭可能冲突的自动解析（已完成）

`src/lib/supabaseClient.ts` 中已设置 `detectSessionInUrl: false`。
不要移除这一项：否则 supabase-js 会在初始化时先交换一次 `code` 并消耗 `code_verifier`，
回调页再手动交换就会失败，表现为「已经登录成功，页面却显示链接失效」。

## 3. 验证清单

在真机上按顺序验证，全部通过即可上线：

1. **同设备**：电脑申请 → 电脑打开 → 进入 `/account`，显示已登录与邮箱。
2. **跨设备**：电脑申请 → 手机打开 → 同样登录成功（需要完成第 1 步模板替换）。
3. **重复点击**：同一个链接点第二次 → 提示「链接无效或已被使用」，不出现英文报错。
4. **过期链接**：超过有效期后打开 → 提示「登录链接已过期」，并提供「重新发送」按钮。
5. **冷却**：发送成功后按钮进入 60 秒倒计时，倒计时结束前不可再次发送。
6. **退出登录**：在手机上点退出 → 桌面端仍保持登录（`scope: 'local'`）。
7. **未同步保护**：断网后新增一条解读 → 点退出 → 出现「N 条记录未同步」确认框，取消后仍保持登录。
8. **私密内容清理**：退出后打开 DevTools → Application → Local Storage，确认
   `mirror_tarot_ai_cache`、`mirror_tarot_import_backup:guest-migrate:*`
   以及当前用户作用域的日记 key 都已被清除。

## 4. 已知未覆盖项

- **注销账号**：目前没有自助删除账号入口，需要人工在 Supabase 后台删除用户
  （`profiles` / `readings` / `checkins` 等表已配置 `on delete cascade`）。
- **隐私政策**：应用内没有独立页面，涉及梦境、情绪与出生信息，合规上建议补齐。
- **服务端 401**：`resolveUserIdFromRequest` 目前把「无 token」与「token 失效」都当作游客。
  客户端已通过 `getAuthHeaders` 提前 30 秒刷新来规避，但服务端仍无法区分二者，
  后续如需严格审计，可让接口在「带了 token 但无效」时返回 401。
