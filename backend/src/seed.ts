import {
  connectDB,
  disconnectDB,
} from "./db";
import {
  User,
  Admin,
  Wallet,
  DataPlan,
  ServiceProvider,
  ServicePackage,
  ExamPinProduct,
  SystemConfig,
} from "./models";
import { hashPassword } from "./services/password.service";
import { seedDefaultSystemConfig } from "./services/config.service";
import {
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD,
  SEED_ADMIN_NAME,
  SEED_ADMIN_PHONE,
} from "./config";

interface PlanSeed {
  id: string;
  network: string;
  planName: string;
  size: string;
  validity: string;
  price: number;
  oldPrice: number;
}

const DATA_PLANS: PlanSeed[] = [
  { id: "plan-mtn-100mb", network: "MTN", planName: "MTN 100MB", size: "100MB", validity: "Daily", price: 170, oldPrice: 200 },
  { id: "plan-mtn-200mb", network: "MTN", planName: "MTN 200MB", size: "200MB", validity: "Daily", price: 300, oldPrice: 350 },
  { id: "plan-mtn-500mb", network: "MTN", planName: "MTN 500MB", size: "500MB", validity: "Weekly", price: 500, oldPrice: 600 },
  { id: "plan-mtn-1gb", network: "MTN", planName: "MTN 1GB", size: "1GB", validity: "Monthly", price: 1000, oldPrice: 1200 },
  { id: "plan-mtn-2gb", network: "MTN", planName: "MTN 2GB", size: "2GB", validity: "Monthly", price: 1900, oldPrice: 2300 },
  { id: "plan-mtn-5gb", network: "MTN", planName: "MTN 5GB", size: "5GB", validity: "Monthly", price: 4400, oldPrice: 5000 },
  { id: "plan-mtn-10gb", network: "MTN", planName: "MTN 10GB", size: "10GB", validity: "Monthly", price: 8000, oldPrice: 9000 },
  { id: "plan-mtn-20gb", network: "MTN", planName: "MTN 20GB", size: "20GB", validity: "Monthly", price: 15000, oldPrice: 16500 },
  { id: "plan-airtel-100mb", network: "Airtel", planName: "Airtel 100MB", size: "100MB", validity: "Daily", price: 170, oldPrice: 200 },
  { id: "plan-airtel-500mb", network: "Airtel", planName: "Airtel 500MB", size: "500MB", validity: "Weekly", price: 500, oldPrice: 600 },
  { id: "plan-airtel-1gb", network: "Airtel", planName: "Airtel 1GB", size: "1GB", validity: "Monthly", price: 1000, oldPrice: 1200 },
  { id: "plan-airtel-2gb", network: "Airtel", planName: "Airtel 2GB", size: "2GB", validity: "Monthly", price: 1900, oldPrice: 2300 },
  { id: "plan-airtel-5gb", network: "Airtel", planName: "Airtel 5GB", size: "5GB", validity: "Monthly", price: 4400, oldPrice: 5000 },
  { id: "plan-airtel-10gb", network: "Airtel", planName: "Airtel 10GB", size: "10GB", validity: "Monthly", price: 8000, oldPrice: 9000 },
  { id: "plan-glo-100mb", network: "Glo", planName: "Glo 100MB", size: "100MB", validity: "Daily", price: 170, oldPrice: 200 },
  { id: "plan-glo-500mb", network: "Glo", planName: "Glo 500MB", size: "500MB", validity: "Weekly", price: 500, oldPrice: 600 },
  { id: "plan-glo-1gb", network: "Glo", planName: "Glo 1GB", size: "1GB", validity: "Monthly", price: 1000, oldPrice: 1200 },
  { id: "plan-glo-2gb", network: "Glo", planName: "Glo 2GB", size: "2GB", validity: "Monthly", price: 1900, oldPrice: 2300 },
  { id: "plan-glo-5gb", network: "Glo", planName: "Glo 5GB", size: "5GB", validity: "Monthly", price: 4400, oldPrice: 5000 },
  { id: "plan-9mobile-200mb", network: "9mobile", planName: "9mobile 200MB", size: "200MB", validity: "Weekly", price: 340, oldPrice: 400 },
  { id: "plan-9mobile-500mb", network: "9mobile", planName: "9mobile 500MB", size: "500MB", validity: "Weekly", price: 550, oldPrice: 650 },
  { id: "plan-9mobile-1gb", network: "9mobile", planName: "9mobile 1GB", size: "1GB", validity: "Monthly", price: 1050, oldPrice: 1250 },
  { id: "plan-9mobile-2gb", network: "9mobile", planName: "9mobile 2GB", size: "2GB", validity: "Monthly", price: 2000, oldPrice: 2400 },
];

const ELECTRICITY_PROVIDERS: { id: string; name: string; code: string; description: string }[] = [
  { id: "ikeja-electric", name: "Ikeja Electric", code: "ikeja-electric", description: "IKEDC - Ikeja Electricity Distribution Company" },
  { id: "eko-electric", name: "Eko Electric", code: "eko-electric", description: "EKEDC - Eko Electricity Distribution Company" },
  { id: "abuja-electric", name: "Abuja Electric", code: "abuja-electric", description: "AEDC - Abuja Electricity Distribution Company" },
  { id: "kano-electric", name: "Kano Electric", code: "kano-electric", description: "KEDCO - Kano Electricity Distribution Company" },
  { id: "ibadan-electric", name: "Ibadan Electric", code: "ibadan-electric", description: "IBEDC - Ibadan Electricity Distribution Company" },
  { id: "benin-electric", name: "Benin Electric", code: "benin-electric", description: "BEDC - Benin Electricity Distribution Company" },
  { id: "enugu-electric", name: "Enugu Electric", code: "enugu-electric", description: "EEDC - Enugu Electricity Distribution Company" },
  { id: "jos-electric", name: "Jos Electric", code: "jos-electric", description: "JED - Jos Electricity Distribution Company" },
  { id: "portharcourt-electric", name: "Port Harcourt Electric", code: "portharcourt-electric", description: "PHED - Port Harcourt Electricity Distribution Company" },
];

const CABLE_PROVIDERS: { id: string; name: string; code: string; description: string; packages: { name: string; price: number; duration: string }[] }[] = [
  {
    id: "dstv",
    name: "DStv",
    code: "dstv",
    description: "MultiChoice DStv subscription",
    packages: [
      { name: "DStv Padi", price: 2900, duration: "1 month" },
      { name: "DStv Yanga", price: 3600, duration: "1 month" },
      { name: "DStv Confam", price: 7700, duration: "1 month" },
      { name: "DStv Compact", price: 11300, duration: "1 month" },
      { name: "DStv Compact Plus", price: 17800, duration: "1 month" },
      { name: "DStv Premium", price: 24400, duration: "1 month" },
    ],
  },
  {
    id: "gotv",
    name: "GOtv",
    code: "gotv",
    description: "MultiChoice GOtv subscription",
    packages: [
      { name: "GOtv Smallie", price: 1900, duration: "1 month" },
      { name: "GOtv Jinja", price: 2500, duration: "1 month" },
      { name: "GOtv Jolli", price: 3300, duration: "1 month" },
      { name: "GOtv Max", price: 6300, duration: "1 month" },
      { name: "GOtv Supa", price: 7400, duration: "1 month" },
    ],
  },
  {
    id: "startimes",
    name: "StarTimes",
    code: "startimes",
    description: "StarTimes subscription",
    packages: [
      { name: "StarTimes Nova", price: 2200, duration: "1 month" },
      { name: "StarTimes Basic", price: 3200, duration: "1 month" },
      { name: "StarTimes Classic", price: 4400, duration: "1 month" },
      { name: "StarTimes Super", price: 10000, duration: "1 month" },
    ],
  },
];

const EXAM_PRODUCTS: { id: string; name: string; category: string; price: number; costPrice: number; description: string }[] = [
  { id: "exam-waec", name: "WAEC PIN", category: "WAEC", price: 2500, costPrice: 2300, description: "West African Examinations Council registration PIN" },
  { id: "exam-neco", name: "NECO PIN", category: "NECO", price: 2300, costPrice: 2100, description: "National Examinations Council registration PIN" },
  { id: "exam-nabteb", name: "NABTEB PIN", category: "NABTEB", price: 2200, costPrice: 2000, description: "National Business and Technical Examinations Board PIN" },
  { id: "exam-jamb", name: "JAMB PIN", category: "JAMB", price: 5700, costPrice: 5400, description: "Joint Admissions and Matriculation Board ePIN" },
];

async function seedCatalog() {
  for (const plan of DATA_PLANS) {
    await DataPlan.updateOne(
      { _id: plan.id },
      {
        $set: {
          network: plan.network,
          planName: plan.planName,
          size: plan.size,
          validity: plan.validity,
          price: plan.price,
          oldPrice: plan.oldPrice,
          kind: "DATA",
          isActive: true,
        },
      },
      { upsert: true }
    );
  }

  for (const ep of ELECTRICITY_PROVIDERS) {
    await ServiceProvider.updateOne(
      { _id: ep.id },
      {
        $set: {
          category: "ELECTRICITY",
          name: ep.name,
          code: ep.code,
          description: ep.description,
          fee: 100,
          isActive: true,
        },
      },
      { upsert: true }
    );
  }

  for (const cp of CABLE_PROVIDERS) {
    await ServiceProvider.updateOne(
      { _id: cp.id },
      {
        $set: {
          category: "CABLE",
          name: cp.name,
          code: cp.code,
          description: cp.description,
          fee: 0,
          isActive: true,
        },
      },
      { upsert: true }
    );
    for (const pkg of cp.packages) {
      const pkgId = `${cp.id}-${pkg.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.replace(/(^-|-$)/g, "");
      await ServicePackage.updateOne(
        { _id: pkgId },
        {
          $set: {
            providerId: cp.id,
            name: pkg.name,
            price: pkg.price,
            oldPrice: null,
            duration: pkg.duration,
            isActive: true,
          },
        },
        { upsert: true }
      );
    }
  }

  for (const prod of EXAM_PRODUCTS) {
    await ExamPinProduct.updateOne(
      { _id: prod.id },
      {
        $set: {
          name: prod.name,
          category: prod.category,
          price: prod.price,
          costPrice: prod.costPrice,
          description: prod.description,
          isActive: true,
        },
      },
      { upsert: true }
    );
  }
}

async function seedUsers() {
  const password = await hashPassword("User@1234");

  let admin = await User.findOne({ email: SEED_ADMIN_EMAIL });
  if (!admin) {
    const adminPassword = await hashPassword(SEED_ADMIN_PASSWORD);
    admin = await User.create({
      fullName: SEED_ADMIN_NAME,
      email: SEED_ADMIN_EMAIL,
      phone: SEED_ADMIN_PHONE,
      password: adminPassword,
      role: "ADMIN",
      status: "ACTIVE",
      avatar: null,
      emailVerified: true,
      kycStatus: "VERIFIED",
    });
    await Admin.create({ userId: String(admin._id), title: "Platform Administrator" });
    console.log(`[seed] created admin ${SEED_ADMIN_EMAIL}`);
  }

  const demoUsers: { fullName: string; email: string; phone: string }[] = [
    { fullName: "Chinedu Okafor", email: "user@annashuwa.com", phone: "+2348011111111" },
    { fullName: "Aisha Bello", email: "demo@annashuwa.com", phone: "+2348022222222" },
  ];

  for (const demo of demoUsers) {
    let user = await User.findOne({ email: demo.email });
    if (!user) {
      user = await User.create({
        fullName: demo.fullName,
        email: demo.email,
        phone: demo.phone,
        password,
        role: "USER",
        status: "ACTIVE",
        avatar: null,
        emailVerified: true,
        kycStatus: "NONE",
      });
      console.log(`[seed] created user ${demo.email}`);
    }
    await Wallet.updateOne(
      { userId: String(user._id) },
      { $set: { userId: String(user._id), balance: 25000, currency: "NGN" } },
      { upsert: true }
    );
  }

  if (admin) {
    await Wallet.updateOne(
      { userId: String(admin._id) },
      { $set: { userId: String(admin._id), balance: 0, currency: "NGN" } },
      { upsert: true }
    );
  }
}

async function main() {
  await connectDB();
  await seedDefaultSystemConfig();
  await seedCatalog();
  await seedUsers();

  const counts = {
    users: await User.countDocuments(),
    wallets: await Wallet.countDocuments(),
    dataPlans: await DataPlan.countDocuments(),
    providers: await ServiceProvider.countDocuments(),
    packages: await ServicePackage.countDocuments(),
    examProducts: await ExamPinProduct.countDocuments(),
    systemConfigKeys: await SystemConfig.countDocuments(),
  };
  console.log("[seed] done", counts);
  await disconnectDB();
}

main().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});