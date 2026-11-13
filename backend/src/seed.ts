import bcrypt from 'bcrypt';
import { prisma } from './lib/prisma';

const allPermissions = [
  'view_dashboard',
  'create_content',
  'create_video',
  'register_affiliate',
  'view_affiliate_stats',
  'create_campaign',
  'view_own_campaigns',
  'create_team',
  'view_own_teams',
  'create_workflow',
  'view_own_workflows',
  'request_withdraw',
  'manage_users',
  'manage_subscriptions',
  'manage_ai_providers',
  'manage_campaigns',
  'view_audit_logs',
  'approve_content',
  'view_assigned_tasks',
];

const permissionsMap: Record<string, string[]> = {
  'Super Admin': allPermissions,
  Admin: allPermissions.filter(p => p !== 'manage_ai_providers'),
  'Content Creator': [
    'view_dashboard',
    'create_content',
    'create_video',
    'register_affiliate',
    'view_affiliate_stats',
    'create_team',
    'view_own_teams',
    'create_workflow',
    'view_own_workflows',
    'request_withdraw',
  ],
  Advertiser: ['view_dashboard', 'create_campaign', 'view_own_campaigns', 'create_team', 'view_own_teams'],
  'Team Leader': [
    'view_dashboard',
    'create_content',
    'create_video',
    'create_team',
    'view_own_teams',
    'approve_content',
  ],
  'Team Member': ['view_dashboard', 'view_assigned_tasks'],
  'Affiliate Partner': [
    'view_dashboard',
    'register_affiliate',
    'view_affiliate_stats',
    'request_withdraw',
  ],
};

async function main() {
  for (const perm of allPermissions) {
    await prisma.permission.upsert({
      where: { name: perm },
      update: {},
      create: { name: perm },
    });
  }

  for (const roleName of Object.keys(permissionsMap)) {
    const permObjs = await prisma.permission.findMany({
      where: { name: { in: permissionsMap[roleName] } },
    });
    await prisma.role.upsert({
      where: { name: roleName },
      update: { permissions: { set: permObjs.map(p => ({ id: p.id })) } },
      create: {
        name: roleName,
        permissions: { connect: permObjs.map(p => ({ id: p.id })) },
      },
    });
  }

  const providerDefs = [
    { name: 'Mock Text Provider', type: 'text' },
    { name: 'Mock Image Provider', type: 'image' },
    { name: 'Mock Video Provider', type: 'video' },
  ];
  for (const def of providerDefs) {
    const existing = await prisma.aIProvider.findFirst({ where: { name: def.name } });
    if (!existing) {
      await prisma.aIProvider.create({ data: { name: def.name, type: def.type, config: {} } });
      console.log(`AI provider created: ${def.name}`);
    }
  }

  const adminEmail = 'admin@cpai.com';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 12);
    const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Super Admin' } });
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
        role: { connect: { id: superAdminRole.id } },
        wallet: { create: {} },
      },
    });
    console.log('Super Admin user created (admin@cpai.com / admin123)');
  } else {
    console.log('Super Admin user already exists');
  }

  await prisma.wallet.upsert({ where: { userId: admin.id }, update: {}, create: { userId: admin.id } });

  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);
  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, plan: 'Professional', tokenQuota: 200000, endDate },
  });

  let campaign = await prisma.campaign.findFirst({
    where: { advertiserId: admin.id, name: 'Demo Campaign' },
  });
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        advertiserId: admin.id,
        name: 'Demo Campaign',
        budget: 5000000,
        commissionRate: 10,
      },
    });
    console.log('Demo campaign created');
  }

  const demoProduct = await prisma.product.findFirst({
    where: { campaignId: campaign.id, name: 'Demo Produk Digital' },
  });
  if (!demoProduct) {
    await prisma.product.create({
      data: {
        campaignId: campaign.id,
        name: 'Demo Produk Digital',
        price: 150000,
        affiliateCommission: 15000,
      },
    });
    console.log('Demo product created');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
