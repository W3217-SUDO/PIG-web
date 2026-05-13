/**
 * 开发期 seed 数据 · S1
 * 跑法:cd backend && npm run seed:dev
 * 幂等:每次跑会先 truncate 相关表(只在 development 跑)
 */
import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { ulid } from 'ulid';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed in production');
  }

  await AppDataSource.initialize();
  console.log('🔌 DataSource initialized');

  // 清空(子表 → 父表的顺序;不动 user / wallet)
  // FK 没强制,所以可以并行清
  await AppDataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  await AppDataSource.query('TRUNCATE TABLE `feeding_record`');
  await AppDataSource.query('TRUNCATE TABLE `health_record`');
  await AppDataSource.query('TRUNCATE TABLE `pig`');
  await AppDataSource.query('TRUNCATE TABLE `farmer`');
  await AppDataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('🧹 Truncated: feeding_record, health_record, pig, farmer');

  // ─── 农户 ─────────────────────────────────────────────────
  const farmer1Id = ulid();
  const farmer2Id = ulid();

  await AppDataSource.query(
    `INSERT INTO farmer (id, name, region, years, avatar_url, story, video_url) VALUES
       (?, '老李', '广元', 18, ?, ?, ''),
       (?, '老王', '绵阳', 12, ?, ?, '')`,
    [
      farmer1Id,
      '',
      '广元市朝天区临溪乡养猪 18 年,只用粗粮 + 山泉。家里 3 代都是养猪人。',
      farmer2Id,
      '',
      '绵阳市平武县白马藏族乡,海拔 1800 米山区散养。',
    ],
  );
  console.log(`✓ Seeded 2 farmers: ${farmer1Id} / ${farmer2Id}`);

  // ─── 猪 ─────────────────────────────────────────────────
  // 5 头,用 Unsplash 真实猪图;每只猪挂一个农户;状态全部 listed 可认领
  const merchantPlaceholder = ulid(); // v1 不强制商家,占位

  const pigs: Array<[string, string, string, string, string, string, number, number, number, number, string]> = [
    // [name, breed, farmer_id, region, weight, expected, pricePerShare, totalShares, soldShares, age(月), cover]
    [
      '黑土豚 · 老李一号',
      '黑土猪',
      farmer1Id,
      '广元',
      '38.50',
      '170.00',
      830,
      10,
      2,
      4,
      '',
    ],
    [
      '香猪 · 老王村口',
      '香猪',
      farmer2Id,
      '绵阳',
      '32.00',
      '150.00',
      830,
      10,
      0,
      3,
      '',
    ],
    [
      '藏香猪 · 白马藏寨',
      '藏香猪',
      farmer2Id,
      '绵阳',
      '28.00',
      '140.00',
      830,
      10,
      5,
      3,
      '',
    ],
    [
      '川北黑猪 · 朝天散养',
      '川北黑猪',
      farmer1Id,
      '广元',
      '45.00',
      '180.00',
      830,
      10,
      7,
      5,
      '',
    ],
    [
      '内江猪 · 第二头',
      '内江猪',
      farmer1Id,
      '广元',
      '40.00',
      '175.00',
      830,
      10,
      10,
      4,
      '',
    ],
  ];

  const pigIds: string[] = [];
  for (const [title, breed, farmerId, region, weight, expected, price, total, sold, _age, cover] of pigs) {
    const pigId = ulid();
    pigIds.push(pigId);
    const status = sold >= total ? 'sold_out' : 'listed';
    // 演示用视频(腾讯云公开 sample,各端都能播)
    const mockVideo = 'https://media.w3.org/2010/05/sintel/trailer.mp4';
    await AppDataSource.query(
      `INSERT INTO pig (
        id, merchant_id, title, description, breed, farmer_id, region,
        weight_kg, expected_weight_kg, price_per_share,
        total_shares, sold_shares, cover_image, mock_video_url, status, listed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        pigId,
        merchantPlaceholder,
        title,
        `${breed} · 来自${region}山区散养农户。10-12 个月慢养,粗粮 + 山泉,无催肥饲料。每天三餐打卡上传,健康档案全程开放。`,
        breed,
        farmerId,
        region,
        weight,
        expected,
        price.toFixed(2),
        total,
        sold,
        cover,
        mockVideo,
        status,
      ],
    );
    console.log(`  ✓ ${title}  (${sold}/${total} shares · ${status})`);
  }

  // ─── 喂养打卡 mock ─────────────────────────────────────────
  // 每只猪 5 条记录,跨越过去 3 天(早/中/晚循环)
  const mealCycle = ['breakfast', 'lunch', 'dinner', 'breakfast', 'lunch'];
  const foodOptions: Record<string, string> = {
    breakfast: '玉米粉 + 苕藤 + 鲜南瓜 · 山泉水',
    lunch: '甘薯 + 麦麸 + 嫩绿草 · 矿物盐',
    dinner: '粗粮 + 萝卜青菜 + 玉米粒 · 山泉水',
    snack: '甘蔗碎 + 苕藤',
  };
  let feedCount = 0;
  for (const pigId of pigIds) {
    for (let i = 0; i < 5; i++) {
      const meal = mealCycle[i];
      const hoursAgo = (4 - i) * 12 + (meal === 'breakfast' ? 0 : meal === 'lunch' ? 4 : 9);
      const checkedAt = new Date(Date.now() - hoursAgo * 3600 * 1000);
      await AppDataSource.query(
        `INSERT INTO feeding_record (id, pig_id, meal_type, food_desc, image_url, checked_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          ulid(),
          pigId,
          meal,
          foodOptions[meal],
          '',
          checkedAt,
        ],
      );
      feedCount++;
    }
  }
  console.log(`✓ Seeded ${feedCount} feeding records (5 per pig)`);

  // ─── 健康档案 mock ─────────────────────────────────────────
  const healthRecords: Array<[string, string]> = [
    ['checkup', '入栏体检 · 体温 38.7℃ · 体况评分 4/5 · 一切正常'],
    ['vaccine', '猪瘟疫苗(C 株冻干) · 第一针 · 兽医站存档'],
    ['weight', '称重打卡 · 当前 38.5 kg · 比上次 +2.1 kg'],
  ];
  let healthCount = 0;
  for (const pigId of pigIds) {
    for (let i = 0; i < healthRecords.length; i++) {
      const [type, detail] = healthRecords[i];
      const daysAgo = (healthRecords.length - i) * 7;
      const recordedAt = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);
      await AppDataSource.query(
        `INSERT INTO health_record (id, pig_id, record_type, detail, image_url, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ulid(), pigId, type, detail, '', recordedAt],
      );
      healthCount++;
    }
  }
  console.log(`✓ Seeded ${healthCount} health records (3 per pig)`);

  // ─── 代养人任务 & 收益 ──────────────────────────────────────
  await AppDataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  await AppDataSource.query('TRUNCATE TABLE `farmer_task`');
  await AppDataSource.query('TRUNCATE TABLE `farmer_earning`');
  await AppDataSource.query('SET FOREIGN_KEY_CHECKS = 1');

  // 用本地时间日期，避免 UTC 时区差导致日期变昨天
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const todayStart = new Date(); todayStart.setHours(7, 30, 0, 0); // 早餐已打卡时间

  // 老李的任务(早餐已完成,午餐进行中,晚餐待完成)
  await AppDataSource.query(
    `INSERT INTO farmer_task (id, farmer_id, meal_type, food_desc, area, time_slot, scheduled_date, checked_at) VALUES
     (?, ?, 'breakfast', '玉米面粥+青菜', 'A区-01栏', '07:00-08:00', ?, ?),
     (?, ?, 'lunch',     '红薯+豆类',    'A区-01栏', '12:00-13:00', ?, NULL),
     (?, ?, 'dinner',    '粗粮+蔬菜',    'A区-01栏', '18:00-19:00', ?, NULL)`,
    [
      ulid(), farmer1Id, today, todayStart,
      ulid(), farmer1Id, today,
      ulid(), farmer1Id, today,
    ],
  );

  // 老王的任务(全部待完成)
  await AppDataSource.query(
    `INSERT INTO farmer_task (id, farmer_id, meal_type, food_desc, area, time_slot, scheduled_date, checked_at) VALUES
     (?, ?, 'breakfast', '苕藤+玉米粉', 'B区-02栏', '07:00-08:00', ?, NULL),
     (?, ?, 'lunch',     '甘薯+麦麸',  'B区-02栏', '12:00-13:00', ?, NULL),
     (?, ?, 'dinner',    '粗粮+萝卜',  'B区-02栏', '18:00-19:00', ?, NULL)`,
    [
      ulid(), farmer2Id, today,
      ulid(), farmer2Id, today,
      ulid(), farmer2Id, today,
    ],
  );
  console.log('✓ Seeded farmer_task (6 tasks for today)');

  // 收益数据(过去 6 个月)
  const earningData: Array<[string, number, number, number]> = [
    [farmer1Id, 2026, 4, 8650],  [farmer1Id, 2026, 3, 7820],
    [farmer1Id, 2026, 2, 9120],  [farmer1Id, 2026, 1, 8300],
    [farmer1Id, 2025, 12, 9500], [farmer1Id, 2025, 11, 7600],
    [farmer2Id, 2026, 4, 7200],  [farmer2Id, 2026, 3, 6800],
    [farmer2Id, 2026, 2, 7500],  [farmer2Id, 2026, 1, 6500],
    [farmer2Id, 2025, 12, 8100], [farmer2Id, 2025, 11, 6200],
  ];
  for (const [fId, yr, mo, amt] of earningData) {
    await AppDataSource.query(
      `INSERT INTO farmer_earning (id, farmer_id, year, month, amount) VALUES (?, ?, ?, ?, ?)`,
      [ulid(), fId, yr, mo, amt],
    );
  }
  console.log('✓ Seeded farmer_earning (6 months × 2 farmers)');

  await AppDataSource.destroy();
  console.log('✅ Seed done. 现在可以打开 http://localhost:5173/ 看猪列表');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
