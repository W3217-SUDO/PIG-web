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
  await AppDataSource.query('TRUNCATE TABLE `pig`');
  await AppDataSource.query('TRUNCATE TABLE `farmer`');
  await AppDataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('🧹 Truncated: pig, farmer');

  // ─── 农户 ─────────────────────────────────────────────────
  const farmer1Id = ulid();
  const farmer2Id = ulid();

  await AppDataSource.query(
    `INSERT INTO farmer (id, name, region, years, avatar_url, story, video_url) VALUES
       (?, '老李', '广元', 18, ?, ?, ''),
       (?, '老王', '绵阳', 12, ?, ?, '')`,
    [
      farmer1Id,
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
      '广元市朝天区临溪乡养猪 18 年,只用粗粮 + 山泉。家里 3 代都是养猪人。',
      farmer2Id,
      'https://images.unsplash.com/photo-1559548331-f9cb98280344?w=400&q=80',
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
      'https://images.unsplash.com/photo-1593179357196-705d7578b1d0?w=800&q=80',
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
      'https://images.unsplash.com/photo-1605063709404-13ce0e2ed8d8?w=800&q=80',
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
      'https://images.unsplash.com/photo-1568864148878-5fff7c4b6b1f?w=800&q=80',
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
      'https://images.unsplash.com/photo-1546193988-fd7eaa75ff03?w=800&q=80',
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
      'https://images.unsplash.com/photo-1518443855757-dfadac7101ae?w=800&q=80',
    ],
  ];

  for (const [title, breed, farmerId, region, weight, expected, price, total, sold, _age, cover] of pigs) {
    const pigId = ulid();
    const status = sold >= total ? 'sold_out' : 'listed';
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
        `${breed} · 来自${region}山区散养农户。10-12 个月慢养,粗粮 + 山泉,无催肥饲料。`,
        breed,
        farmerId,
        region,
        weight,
        expected,
        price.toFixed(2),
        total,
        sold,
        cover,
        '',
        status,
      ],
    );
    console.log(`  ✓ ${title}  (${sold}/${total} shares · ${status})`);
  }

  await AppDataSource.destroy();
  console.log('✅ Seed done. 现在可以打开 http://localhost:5173/ 看猪列表');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
