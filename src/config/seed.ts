import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./db";
import { User } from "../models/User";
import { Partner } from "../models/Partner";
import { Lead } from "../models/Lead";
import { Client } from "../models/Client";
import { Payment } from "../models/Payment";

dotenv.config();

const ADMIN = {
  name: "School Connect Admin",
  email: "admin@schoolconnect.in",
  password: "Admin@123",
  role: "admin" as const,
};

const PARTNERS = [
  {
    name: "Rajesh Kumar",
    email: "partner1@sc.in",
    city: "Hyderabad",
    localArea: "Gachibowli",
    pincode: "500032",
    phone: "9876543210",
  },
  {
    name: "Priya Sharma",
    email: "partner2@sc.in",
    city: "Mumbai",
    localArea: "Andheri West",
    pincode: "400053",
    phone: "9876543211",
  },
  {
    name: "Arjun Nair",
    email: "partner3@sc.in",
    city: "Bangalore",
    localArea: "Koramangala",
    pincode: "560034",
    phone: "9876543212",
  },
  {
    name: "Lakshmi Iyer",
    email: "partner4@sc.in",
    city: "Chennai",
    localArea: "Adyar",
    pincode: "600020",
    phone: "9876543213",
  },
  {
    name: "Vikram Patil",
    email: "partner5@sc.in",
    city: "Pune",
    localArea: "Kothrud",
    pincode: "411038",
    phone: "9876543214",
  },
];

const PARTNER_PASSWORD = "Partner@123";

const SCHOOL_LEADS = [
  {
    schoolName: "Delhi Public School",
    targetTitle: "Principal",
    targetClasses: [6, 7, 8, 9, 10],
    dealValue: 250000,
  },
  {
    schoolName: "St. Mary's High School",
    targetTitle: "Director",
    targetClasses: [1, 2, 3, 4, 5],
    dealValue: 180000,
  },
  {
    schoolName: "Green Valley International",
    targetTitle: "Principal",
    targetClasses: [9, 10, 11, 12],
    dealValue: 320000,
  },
  {
    schoolName: "National Public School",
    targetTitle: "Vice Principal",
    targetClasses: [6, 7, 8],
    dealValue: 150000,
  },
  {
    schoolName: "Sunrise Academy",
    targetTitle: "Principal",
    targetClasses: [1, 2, 3, 4, 5, 6],
    dealValue: 200000,
  },
  {
    schoolName: "Cambridge School",
    targetTitle: "Director",
    targetClasses: [10, 11, 12],
    dealValue: 280000,
  },
  {
    schoolName: "Little Scholars Preschool",
    targetTitle: "Owner",
    targetClasses: [1, 2, 3],
    dealValue: 90000,
  },
  {
    schoolName: "Heritage Public School",
    targetTitle: "Principal",
    targetClasses: [6, 7, 8, 9, 10, 11, 12],
    dealValue: 400000,
  },
  {
    schoolName: "Modern High School",
    targetTitle: "Principal",
    targetClasses: [8, 9, 10],
    dealValue: 175000,
  },
  {
    schoolName: "Oxford English School",
    targetTitle: "Director",
    targetClasses: [1, 2, 3, 4, 5, 6, 7, 8],
    dealValue: 220000,
  },
  {
    schoolName: "Ryan International",
    targetTitle: "Principal",
    targetClasses: [9, 10, 11, 12],
    dealValue: 350000,
  },
  {
    schoolName: "Podar International School",
    targetTitle: "Principal",
    targetClasses: [6, 7, 8, 9, 10],
    dealValue: 290000,
  },
  {
    schoolName: "DAV Public School",
    targetTitle: "Vice Principal",
    targetClasses: [6, 7, 8, 9],
    dealValue: 210000,
  },
  {
    schoolName: "Kendriya Vidyalaya Branch",
    targetTitle: "Principal",
    targetClasses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    dealValue: 450000,
  },
  {
    schoolName: "Euro School",
    targetTitle: "Director",
    targetClasses: [11, 12],
    dealValue: 160000,
  },
  {
    schoolName: "Billabong High School",
    targetTitle: "Principal",
    targetClasses: [1, 2, 3, 4, 5],
    dealValue: 195000,
  },
  {
    schoolName: "Vibgyor High",
    targetTitle: "Principal",
    targetClasses: [6, 7, 8, 9, 10, 11, 12],
    dealValue: 380000,
  },
  {
    schoolName: "Orchids International",
    targetTitle: "Director",
    targetClasses: [1, 2, 3, 4],
    dealValue: 120000,
  },
  {
    schoolName: "Narayana E-Techno",
    targetTitle: "Principal",
    targetClasses: [9, 10, 11, 12],
    dealValue: 310000,
  },
  {
    schoolName: "Sri Chaitanya School",
    targetTitle: "Principal",
    targetClasses: [6, 7, 8, 9, 10, 11, 12],
    dealValue: 420000,
  },
];

const STATUSES = ["new", "in_progress", "negotiating", "converted", "lost"] as const;

async function clearDatabase(): Promise<void> {
  await Promise.all([
    Payment.deleteMany({}),
    Client.deleteMany({}),
    Lead.deleteMany({}),
    Partner.deleteMany({}),
    User.deleteMany({}),
  ]);
}

async function syncPartnerStats(partnerIds: mongoose.Types.ObjectId[]): Promise<void> {
  for (const partnerId of partnerIds) {
    const [totalLeads, clients] = await Promise.all([
      Lead.countDocuments({ partner: partnerId }),
      Client.find({ partner: partnerId }).select("dealValue").lean(),
    ]);

    const totalClients = clients.length;
    const totalRevenue = clients.reduce((sum, c) => sum + c.dealValue, 0);

    await Partner.findByIdAndUpdate(partnerId, {
      totalLeads,
      totalClients,
      totalRevenue,
    });
  }
}

async function seed(): Promise<void> {
  await connectDB();
  console.log("Clearing existing data...");
  await clearDatabase();

  console.log("Creating admin...");
  await User.create(ADMIN);

  console.log("Creating partners...");
  const partnerDocs: InstanceType<typeof Partner>[] = [];

  for (const partnerData of PARTNERS) {
    const user = await User.create({
      name: partnerData.name,
      email: partnerData.email,
      password: PARTNER_PASSWORD,
      role: "partner",
    });

    const partner = await Partner.create({
      user: user._id,
      city: partnerData.city,
      localArea: partnerData.localArea,
      pincode: partnerData.pincode,
      phone: partnerData.phone,
      designation: "Regional Partner",
    });

    partnerDocs.push(partner);
    console.log(`  ${partner.partnerId} — ${partnerData.name} (${partnerData.city})`);
  }

  console.log("Creating 20 leads...");
  const createdLeads: InstanceType<typeof Lead>[] = [];

  for (let i = 0; i < SCHOOL_LEADS.length; i++) {
    const template = SCHOOL_LEADS[i];
    const partner = partnerDocs[i % partnerDocs.length];
    const status = STATUSES[i % STATUSES.length];

    const lead = await Lead.create({
      schoolName: template.schoolName,
      description: `Outreach for ${template.targetClasses.join(", ")} classes`,
      address: `${100 + i}, Education Lane`,
      city: partner.city,
      localArea: partner.localArea,
      pincode: partner.pincode,
      targetTitle: template.targetTitle,
      targetClasses: template.targetClasses,
      dealValue: template.dealValue,
      status,
      partner: partner._id,
      notes: "Seeded lead",
    });

    createdLeads.push(lead);
  }

  console.log("Creating 10 clients from converted leads...");
  const clientsToCreate = createdLeads.slice(0, 10);

  for (const lead of clientsToCreate) {
    lead.status = "converted";
    lead.convertedAt = new Date();
    await lead.save();

    await Client.create({
      lead: lead._id,
      schoolName: lead.schoolName,
      address: lead.address,
      city: lead.city,
      partner: lead.partner,
      dealValue: lead.dealValue,
      targetClasses: lead.targetClasses,
      targetTitle: lead.targetTitle,
      notes: "Converted from seeded lead",
    });
  }

  console.log("Syncing partner statistics...");
  await syncPartnerStats(partnerDocs.map((p) => p._id));

  console.log("\nSeed completed successfully!");
  console.log("Admin: admin@schoolconnect.in / Admin@123");
  console.log("Partners: partner1@sc.in … partner5@sc.in / Partner@123");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
