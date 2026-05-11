# 代码规范

> 不需要全部背下来——配好 ESLint + Prettier + EditorConfig,保存时自动格式化即可。本文是**口径文档**(吵起来时按这本)。

---

## 一、自动化(优先)

工具链:

| 工具 | 用途 | 配置 |
|---|---|---|
| **EditorConfig** | 跨编辑器统一缩进 / 编码 | `.editorconfig`(根) |
| **ESLint** | TS / JS 静态检查 | 各子项目 `.eslintrc.js` |
| **Prettier** | 格式化 | 各子项目 `.prettierrc` |
| **Husky** + **lint-staged** | pre-commit 钩子 | 根 `package.json` |
| **commitlint** | commit message 检查 | `.commitlintrc.js` |

### IDE 自动格式化

VSCode `.vscode/settings.json`(本地不入库,放在 `docs/07-contribution/vscode-settings.example.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[vue]": {
    "editor.defaultFormatter": "Vue.volar"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## 二、缩进 / 换行 / 引号

| 项 | 值 |
|---|---|
| 缩进 | **2 空格** |
| 换行 | **LF**(`\n`) |
| 编码 | **UTF-8** |
| 行尾分号 | **是** |
| 引号 | **单引号** `'` |
| Trailing comma | **all**(数组 / 对象 / 函数参数都加) |
| 行宽 | **100** |

`.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "endOfLine": "lf"
}
```

---

## 三、TypeScript

### 严格模式

`tsconfig.json` 必开:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

### 类型,不要 any

```ts
// ❌
function foo(data: any) { ... }

// ✅
function foo(data: Pig) { ... }

// 必要时用 unknown
function parse(input: unknown): Pig {
  // 收窄
}
```

### 接口 vs 类型

- **业务实体** 用 `interface`(可扩展)
- **联合类型 / 工具类型** 用 `type`

```ts
// ✅ 业务实体
interface Pig {
  id: string;
  breed: 'blackpig' | 'changbai' | 'huazhu';
}

// ✅ 联合
type Status = 'pending' | 'active' | 'mature';

// ✅ 工具
type PartialPig = Partial<Pig>;
```

### 枚举:**不要用 enum**

```ts
// ❌
enum Status { Pending, Active, Mature }

// ✅ 字符串 union(更小、更可读)
type Status = 'pending' | 'active' | 'mature';

// 如果需要常量集合:
const STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
} as const;
```

---

## 四、命名

### 通用

| 类型 | 风格 | 例 |
|---|---|---|
| 变量 / 函数 | camelCase | `userOrders`, `findActiveOrders` |
| 类 / 接口 / 类型 | PascalCase | `OrderService`, `interface Pig` |
| 常量 | UPPER_SNAKE | `MAX_RETRY = 3` |
| 文件 | kebab-case | `order.service.ts` |
| Vue 组件文件 | PascalCase | `PigCard.vue` |
| 文件夹 | kebab-case | `pig-detail/` |

### 函数

- **动词开头**:`createOrder`, `findPigById`, `validateInput`
- **布尔判断 `is/has/can/should`**:`isLoggedIn`, `hasUnreadMessages`, `canCancelOrder`

### 集合 / 数组

复数:`orders`, `pigs`, `selectedFarmerIds`

### 私有

NestJS 用 TypeScript `private` 关键字,不用 `_` 前缀:

```ts
// ❌ private _userRepo
// ✅
constructor(private readonly userRepo: Repository<User>) {}
```

---

## 五、代码结构

### NestJS 模块文件顺序

```ts
// 1. 装饰器
@Injectable()
export class OrderService {
  // 2. 静态属性
  static readonly MAX_DAILY_FEE = 20;

  // 3. 注入(constructor)
  constructor(
    private readonly orderRepo: Repository<Order>,
    private readonly walletService: WalletService,
  ) {}

  // 4. 公开方法
  async create(...) { ... }
  async findOne(...) { ... }

  // 5. 私有方法(在用到的地方下面)
  private validateOrder(...) { ... }
}
```

### Vue SFC 顺序

```vue
<template>
  <!-- HTML -->
</template>

<script setup lang="ts">
// 1. import
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/store/user';

// 2. props / emits
const props = defineProps<{...}>();
const emit = defineEmits<{...}>();

// 3. composable
const userStore = useUserStore();

// 4. state
const loading = ref(false);
const pigs = ref<Pig[]>([]);

// 5. computed

// 6. lifecycle
onMounted(async () => { ... });

// 7. methods
async function load() { ... }
</script>

<style scoped lang="scss">
/* 样式 */
</style>
```

---

## 六、注释

### 何时写

| 写 | 不写 |
|---|---|
| **为什么这么做**(非显而易见) | 描述代码做了什么(读得懂代码) |
| 复杂业务规则 | 显而易见的赋值 |
| 临时妥协 + 关联 Issue | 自我表扬 |
| 公共 API(JSDoc) | `// 这里是循环` |

```ts
// ✅ 好注释
// 微信 jscode2session 有缓存 5 分钟,这里再发 1 次是为了防并发场景下
// session_key 不一致 —— 详见 #142
const fresh = await wxClient.code2Session(code);

// ❌ 废话
// 创建一个变量 i
let i = 0;

// ✅ 公共 API JSDoc
/**
 * 生成拼猪邀请码
 *
 * @param orderId 订单 ID,必须是当前用户为主认领人的 active 订单
 * @returns 6 位短码,30 天 TTL
 * @throws BusinessException(40004) 非主认领人调用
 */
async generateShareCode(orderId: string): Promise<string> { ... }
```

### TODO / FIXME

```ts
// TODO(2026-Q3): 接腾讯云直播 SDK,目前用 mock 数据
// FIXME: 这里有个边界 bug,issue #87
```

- **必带署名 / 日期 / Issue 号**
- 不要留三个月以上,过期变成代码异味

---

## 七、Vue / 小程序

### 模板

```vue
<!-- ✅ -->
<view class="pig-card" @tap="goDetail(pig.id)">
  <text class="name">{{ pig.name }}</text>
</view>

<!-- 长 prop 换行 -->
<live-player
  :pig-id="pig.id"
  :auto-play="true"
  :show-mask="false"
  @ready="onReady"
/>
```

### 事件命名

- 小程序的 `@tap` 不用 `@click`
- 自定义事件 kebab-case:`@select-pig`

### Class

```vue
<view
  class="pig-card"
  :class="{ 'pig-card--active': active, 'pig-card--dead': pig.status === 'dead' }"
>
```

BEM 思路,但不强求严格 BEM。

### Style scoped

```vue
<style scoped lang="scss">
.pig-card {
  &__name { ... }
  &--active { ... }
}
</style>
```

---

## 八、Service 层

### 单一职责

```ts
// ❌ 一个 service 干太多
class OrderService {
  async createOrder() {}
  async sendSms() {}        // 不该在这
  async uploadAvatar() {}   // 不该在这
}

// ✅
class OrderService {
  constructor(
    private smsService: SmsService,
    private uploadService: UploadService,
  ) {}
  async createOrder() {
    // 用 smsService / uploadService
  }
}
```

### 事务

```ts
// 业务原子性必须用事务
async createOrderWithPayment(...) {
  await this.dataSource.transaction(async (manager) => {
    const order = await manager.save(Order, { ... });
    await manager.update(Wallet, walletId, { balance: ... });
    await manager.save(WalletTransaction, { ... });
  });
}
```

### 异常 vs 返回

- **业务校验失败** → 抛 `BusinessException(code, message)`
- **数据找不到** → 抛 `NotFoundException()`
- **系统级错误** → 抛 `InternalServerErrorException()`
- **不要用 boolean 表示成功 / 失败**

---

## 九、导入顺序

ESLint `import/order` 规则强制:

```ts
// 1. Node 内置
import * as path from 'path';

// 2. 第三方
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';

// 3. 项目别名(@/)
import { Order } from '@/modules/order/entities/order.entity';
import { logger } from '@/utils/logger';

// 4. 相对路径
import { CreateOrderDto } from './dto/create-order.dto';

// 5. 样式(前端)
import './style.scss';
```

每组之间空一行。

---

## 十、SQL / TypeORM

```ts
// ❌ 拼接
const users = await this.dataSource.query(`SELECT * FROM users WHERE name = '${name}'`);

// ✅ 参数化
const users = await this.dataSource.query(
  'SELECT id, nickname FROM users WHERE name = ? LIMIT 10',
  [name],
);

// ✅ QueryBuilder
const users = await this.userRepo.createQueryBuilder('u')
  .where('u.name = :name', { name })
  .andWhere('u.status = :status', { status: 'active' })
  .orderBy('u.created_at', 'DESC')
  .limit(10)
  .getMany();
```

**绝不用 `SELECT *`** —— 列出真正需要的字段。

---

## 十一、错误处理

### NestJS 异常

```ts
// ✅ 业务异常
if (order.user_id !== userId) {
  throw new BusinessException(40004, '你不是主认领人');
}

// ✅ Not Found
const pig = await this.pigRepo.findOneBy({ id });
if (!pig) throw new NotFoundException();

// ❌ 不要 swallow
try {
  await something();
} catch {}    // 永远不要!
```

### Async / Await

```ts
// ❌ Promise chain
this.api.fetch().then(...).catch(...);

// ✅ async/await + try/catch
try {
  const data = await this.api.fetch();
} catch (err) {
  this.logger.error({ msg: 'fetch fail', err });
  throw err;
}
```

---

## 十二、写测试

### 单元测试

```ts
describe('OrderService', () => {
  let service: OrderService;
  let walletService: jest.Mocked<WalletService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: WalletService, useValue: createMock<WalletService>() },
      ],
    }).compile();
    service = module.get(OrderService);
    walletService = module.get(WalletService);
  });

  describe('create', () => {
    it('钱包余额不足时抛 InsufficientBalance', async () => {
      walletService.getBalance.mockResolvedValue(0);
      await expect(service.create('usr_1', { ... })).rejects.toThrow('钱包余额不足');
    });
  });
});
```

测试覆盖优先级:
- 钱 / 支付 / 钱包(P0,必须 100%)
- 鉴权 / 权限(P0)
- 拼猪逻辑(P1)
- 普通 CRUD(P3,可省)

---

## 十三、不写的代码

- 过度抽象(YAGNI)
- "可能将来要用"的接口
- 装饰器套娃(可读性差)
- 8 层嵌套 if(展开成 early return / 拆函数)
- 一个函数 200 行(拆)
- 自己造工具函数(date / lodash / uuid 用现成库)

---

## 十四、Checklist(写完代码自检)

- [ ] ESLint 全绿
- [ ] 类型完整,没 any
- [ ] 命名清晰
- [ ] 没注释掉的死代码
- [ ] 异常都有处理
- [ ] 日志带 trace_id
- [ ] DTO 校验完整
- [ ] 不暴露敏感字段
- [ ] 关键路径有测试
- [ ] 文档同步更新
