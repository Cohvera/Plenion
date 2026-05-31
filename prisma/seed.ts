import { PrismaClient, TechniqueCode, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const companies = [
  { code: "Q_HOME" as const, name: "Q-Home", color: "#1f7a62" },
  { code: "WARCO" as const, name: "Warco", color: "#b63a3a" },
  { code: "TOMME" as const, name: "Tomme", color: "#a07018" }
];

const techniques = [
  ["ELECTRICITY", "Electricity", "Electrical installation, panels, cabling and inspection.", "WARCO"],
  ["HVAC", "HVAC", "Heating, ventilation, cooling and climate systems.", "TOMME"],
  ["SOLAR_PANELS", "Solar panels", "PV installation, inverter and grid coordination.", "Q_HOME"],
  ["BATTERY", "Battery", "Home and business battery storage.", "Q_HOME"],
  ["CHARGING_STATIONS", "Charging stations", "EV charging infrastructure and load balancing.", "WARCO"],
  ["DOMOTICS_LOXONE", "Domotics / Loxone", "Smart building controls, Loxone and automation.", "Q_HOME"],
  [
    "ENERGY_MANAGEMENT_Q_ENERGY_AI",
    "Energy management / Q-Energy AI",
    "Energy optimization, monitoring and Q-Energy AI scenarios.",
    "Q_HOME"
  ],
  ["SANITARY", "Sanitary", "Water, drainage and sanitary installation.", "TOMME"]
] as const;

const templateContent = `Scope
- Analyse the supplied quotation request, plans and specifications.
- Include supply, installation, commissioning and coordination.
- Clearly list exclusions and customer assumptions.

Commercial notes
- Prices are valid for 30 days unless stated otherwise.
- Final execution planning depends on site readiness and approved technical design.`;

async function main() {
  const companyRecords = new Map<string, { id: string }>();

  for (const company of companies) {
    const record = await prisma.company.upsert({
      where: { code: company.code },
      update: { name: company.name, color: company.color },
      create: company
    });
    companyRecords.set(company.code, record);
  }

  const techniqueRecords = new Map<TechniqueCode, { id: string; label: string }>();
  for (const [code, label, description, ownerCode] of techniques) {
    const owner = companyRecords.get(ownerCode);
    const technique = await prisma.technique.upsert({
      where: { code },
      update: {
        label,
        description,
        defaultOwnerCompanyId: owner?.id
      },
      create: {
        code,
        label,
        description,
        defaultOwnerCompanyId: owner?.id
      }
    });
    techniqueRecords.set(code, technique);
  }

  const users = [
    ["Lotte Warco", "lotte@warco.be", UserRole.REQUESTER, "WARCO"],
    ["Quinten Q-Home", "quinten@q-home.be", UserRole.TECHNICAL_QUOTATION_MAKER, "Q_HOME"],
    ["Tom Tomme", "tom@tomme.be", UserRole.TECHNICAL_QUOTATION_MAKER, "TOMME"],
    ["Admin Cohvera", "admin@cohvera.local", UserRole.ADMIN, "Q_HOME"]
  ] as const;

  for (const [name, email, role, companyCode] of users) {
    const company = companyRecords.get(companyCode);
    if (!company) {
      throw new Error(`Missing company ${companyCode}`);
    }
    await prisma.user.upsert({
      where: { email },
      update: { name, role, companyId: company.id },
      create: { name, email, role, companyId: company.id }
    });
  }

  for (const [code, label] of techniqueRecords) {
    for (const company of companyRecords.values()) {
      await prisma.template.upsert({
        where: {
          companyId_techniqueId_version: {
            companyId: company.id,
            techniqueId: label.id,
            version: 1
          }
        },
        update: {
          title: `${label.label} base section`,
          content: templateContent,
          active: true
        },
        create: {
          title: `${label.label} base section`,
          companyId: company.id,
          techniqueId: label.id,
          content: templateContent,
          active: true,
          version: 1
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
