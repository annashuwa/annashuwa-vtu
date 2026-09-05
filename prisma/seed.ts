import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedCatalog() {
  const dataPlans = [
    // MTN
    { network: "MTN", planName: "MTN 100MB", size: "100MB", validity: "Daily", price: 170, oldPrice: 200 },
    { network: "MTN", planName: "MTN 200MB", size: "200MB", validity: "Daily", price: 300, oldPrice: 350 },
    { network: "MTN", planName: "MTN 500MB", size: "500MB", validity: "Weekly", price: 500, oldPrice: 600 },
    { network: "MTN", planName: "MTN 1GB", size: "1GB", validity: "Monthly", price: 1000, oldPrice: 1200 },
    { network: "MTN", planName: "MTN 2GB", size: "2GB", validity: "Monthly", price: 1900, oldPrice: 2300 },
    { network: "MTN", planName: "MTN 5GB", size: "5GB", validity: "Monthly", price: 4400, oldPrice: 5000 },
    { network: "MTN", planName: "MTN 10GB", size: "10GB", validity: "Monthly", price: 8000, oldPrice: 9000 },
    { network: "MTN", planName: "MTN 20GB", size: "20GB", validity: "Monthly", price: 15000, oldPrice: 16500 },
    // Airtel
    { network: "Airtel", planName: "Airtel 100MB", size: "100MB", validity: "Daily", price: 170, oldPrice: 200 },
    { network: "Airtel", planName: "Airtel 500MB", size: "500MB", validity: "Weekly", price: 500, oldPrice: 600 },
    { network: "Airtel", planName: "Airtel 1GB", size: "1GB", validity: "Monthly", price: 1000, oldPrice: 1200 },
    { network: "Airtel", planName: "Airtel 2GB", size: "2GB", validity: "Monthly", price: 1900, oldPrice: 2300 },
    { network: "Airtel", planName: "Airtel 5GB", size: "5GB", validity: "Monthly", price: 4400, oldPrice: 5000 },
    { network: "Airtel", planName: "Airtel 10GB", size: "10GB", validity: "Monthly", price: 8000, oldPrice: 9000 },
    // Glo
    { network: "Glo", planName: "Glo 100MB", size: "100MB", validity: "Daily", price: 170, oldPrice: 200 },
    { network: "Glo", planName: "Glo 500MB", size: "500MB", validity: "Weekly", price: 500, oldPrice: 600 },
    { network: "Glo", planName: "Glo 1GB", size: "1GB", validity: "Monthly", price: 1000, oldPrice: 1200 },
    { network: "Glo", planName: "Glo 2GB", size: "2GB", validity: "Monthly", price: 1900, oldPrice: 2300 },
    { network: "Glo", planName: "Glo 5GB", size: "5GB", validity: "Monthly", price: 4400, oldPrice: 5000 },
    // 9mobile
    { network: "9mobile", planName: "9mobile 200MB", size: "200MB", validity: "Weekly", price: 340, oldPrice: 400 },
    { network: "9mobile", planName: "9mobile 500MB", size: "500MB", validity: "Weekly", price: 550, oldPrice: 650 },
    { network: "9mobile", planName: "9mobile 1GB", size: "1GB", validity: "Monthly", price: 1050, oldPrice: 1250 },
    { network: "9mobile", planName: "9mobile 2GB", size: "2GB", validity: "Monthly", price: 2000, oldPrice: 2400 },
  ];

  for (const p of dataPlans) {
    await prisma.dataPlan.upsert({
      where: { id: `plan-${p.network}-${p.size}`.toLowerCase() },
      update: { price: p.price, oldPrice: p.oldPrice },
      create: {
        id: `plan-${p.network}-${p.size}`.toLowerCase(),
        network: p.network,
        planName: p.planName,
        size: p.size,
        validity: p.validity,
        price: p.price,
        oldPrice: p.oldPrice,
      },
    });
  }

  const electricity = [
    { name: "Ikeja Electric", code: "ikeja-electric", desc: "IKEDC - Ikeja Electricity Distribution Company" },
    { name: "Eko Electric", code: "eko-electric", desc: "EKEDC - Eko Electricity Distribution Company" },
    { name: "Abuja Electric", code: "abuja-electric", desc: "AEDC - Abuja Electricity Distribution Company" },
    { name: "Kano Electric", code: "kano-electric", desc: "KEDCO - Kano Electricity Distribution Company" },
    { name: "Ibadan Electric", code: "ibadan-electric", desc: "IBEDC - Ibadan Electricity Distribution Company" },
    { name: "Benin Electric", code: "benin-electric", desc: "BEDC - Benin Electricity Distribution Company" },
    { name: "Enugu Electric", code: "enugu-electric", desc: "EEDC - Enugu Electricity Distribution Company" },
    { name: "Jos Electric", code: "jos-electric", desc: "JED - Jos Electricity Distribution Company" },
    { name: "Port Harcourt Electric", code: "portharcourt-electric", desc: "PHED - Port Harcourt Electricity Distribution Company" },
  ];

  for (const p of electricity) {
    await prisma.serviceProvider.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.desc },
      create: {
        category: "ELECTRICITY",
        name: p.name,
        code: p.code,
        description: p.desc,
        fee: 100,
      },
    });
  }

  const cableProviders = [
    { name: "DStv", code: "dstv", desc: "MultiChoice DStv subscription" },
    { name: "GOtv", code: "gotv", desc: "MultiChoice GOtv subscription" },
    { name: "StarTimes", code: "startimes", desc: "StarTimes subscription" },
  ];

  const dstvPackages = [
    { name: "DStv Padi", price: 2900, duration: "1 month" },
    { name: "DStv Yanga", price: 3600, duration: "1 month" },
    { name: "DStv Confam", price: 7700, duration: "1 month" },
    { name: "DStv Compact", price: 11300, duration: "1 month" },
    { name: "DStv Compact Plus", price: 17800, duration: "1 month" },
    { name: "DStv Premium", price: 24400, duration: "1 month" },
  ];
  const gotvPackages = [
    { name: "GOtv Smallie", price: 1900, duration: "1 month" },
    { name: "GOtv Jinja", price: 2500, duration: "1 month" },
    { name: "GOtv Jolli", price: 3300, duration: "1 month" },
    { name: "GOtv Max", price: 6300, duration: "1 month" },
    { name: "GOtv Supa", price: 7400, duration: "1 month" },
  ];
  const startimesPackages = [
    { name: "Startimes Nova", price: 2200, duration: "1 month" },
    { name: "Startimes Basic", price: 3200, duration: "1 month" },
    { name: "Startimes Classic", price: 4400, duration: "1 month" },
    { name: "Startimes Super", price: 10000, duration: "1 month" },
  ];

  for (const p of cableProviders) {
    const provider = await prisma.serviceProvider.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.desc },
      create: { category: "CABLE", name: p.name, code: p.code, description: p.desc },
    });
    const packages = p.code === "dstv" ? dstvPackages : p.code === "gotv" ? gotvPackages : startimesPackages;
    for (const pkg of packages) {
      await prisma.servicePackage.upsert({
        where: { id: `${p.code}-${pkg.name}`.toLowerCase().replace(/\s+/g, "-") },
        update: { price: pkg.price, duration: pkg.duration },
        create: {
          id: `${p.code}-${pkg.name}`.toLowerCase().replace(/\s+/g, "-"),
          providerId: provider.id,
          name: pkg.name,
          price: pkg.price,
          duration: pkg.duration,
        },
      });
    }
  }

  const examPins = [
    { name: "WAEC PIN", category: "WAEC", price: 2500, costPrice: 2300, desc: "West African Examinations Council registration PIN" },
    { name: "NECO PIN", category: "NECO", price: 2300, costPrice: 2100, desc: "National Examinations Council registration PIN" },
    { name: "NABTEB PIN", category: "NABTEB", price: 2200, costPrice: 2000, desc: "National Business and Technical Examinations Board PIN" },
    { name: "JAMB PIN", category: "JAMB", price: 5700, costPrice: 5400, desc: "Joint Admissions and Matriculation Board ePIN" },
  ];

  for (const p of examPins) {
    await prisma.examPinProduct.upsert({
      where: { id: `exam-${p.category}`.toLowerCase() },
      update: { name: p.name, price: p.price, costPrice: p.costPrice, description: p.desc },
      create: {
        id: `exam-${p.category}`.toLowerCase(),
        name: p.name,
        category: p.category,
        price: p.price,
        costPrice: p.costPrice,
        description: p.desc,
      },
    });
  }
}

async function seedUsers() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@annashuwa.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@1234";
  const name = process.env.SEED_ADMIN_NAME ?? "ANNASHUWA Admin";
  const phone = process.env.SEED_ADMIN_PHONE ?? "+2348000000000";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        fullName: name,
        email,
        phone,
        password: hash,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: true,
        wallet: { create: {} },
        admin: { create: {} },
      },
    });
    console.log("  -> Created admin user:", user.email);
  } else {
    console.log("  -> Admin user already exists:", existing.email);
  }

  // Demo users
  const demos = [
    { fullName: "Chinedu Okafor", email: "user@annashuwa.com", phone: "+2348011111111" },
    { fullName: "Aisha Bello", email: "demo@annashuwa.com", phone: "+2348022222222" },
  ];
  for (const d of demos) {
    const exists = await prisma.user.findUnique({ where: { email: d.email } });
    if (!exists) {
      const hash = await bcrypt.hash("User@1234", 12);
      await prisma.user.create({
        data: {
          ...d,
          password: hash,
          role: "USER",
          status: "ACTIVE",
          emailVerified: true,
          wallet: { create: { balance: 25000 } },
        },
      });
    }
  }
}

async function main() {
  console.log("Seeding ANASHUWA VTU database...");
  await seedCatalog();
  await seedUsers();
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });