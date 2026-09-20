import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import {
  Property,
  PropertyHealthReport,
  User,
  VerificationHistory,
  sequelize,
  syncDatabase,
} from './models/index.js';

dotenv.config();

async function main() {
  await syncDatabase();

  const email = (process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@verifiedproperty.com').toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'Admin@12345';
  const fullName = process.env.SEED_SUPER_ADMIN_NAME ?? 'Super Admin';
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

  const passwordHash = await bcrypt.hash(password, rounds);

  const [admin] = await User.findOrCreate({
    where: { email },
    defaults: {
      email,
      fullName,
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      phone: '9999999999',
      avatarUrl: null,
      lastLoginAt: null,
    },
  });

  await admin.update({ fullName, passwordHash, role: 'SUPER_ADMIN', status: 'ACTIVE' });

  const [lawyer] = await User.findOrCreate({
    where: { email: 'lawyer@verifiedproperty.com' },
    defaults: {
      email: 'lawyer@verifiedproperty.com',
      fullName: 'Anita Legal',
      passwordHash: await bcrypt.hash('Lawyer@12345', rounds),
      role: 'LAWYER',
      phone: '9888888888',
      status: 'ACTIVE',
      avatarUrl: null,
      lastLoginAt: null,
    },
  });

  const [inspector] = await User.findOrCreate({
    where: { email: 'inspector@verifiedproperty.com' },
    defaults: {
      email: 'inspector@verifiedproperty.com',
      fullName: 'Rohit Field',
      passwordHash: await bcrypt.hash('Inspect@12345', rounds),
      role: 'INSPECTOR',
      phone: '9777777777',
      status: 'ACTIVE',
      avatarUrl: null,
      lastLoginAt: null,
    },
  });

  const [seller] = await User.findOrCreate({
    where: { email: 'seller@example.com' },
    defaults: {
      email: 'seller@example.com',
      fullName: 'Rahul Sharma',
      passwordHash: await bcrypt.hash('Seller@12345', rounds),
      role: 'SELLER',
      phone: '9666666666',
      status: 'ACTIVE',
      avatarUrl: null,
      lastLoginAt: null,
    },
  });

  await User.findOrCreate({
    where: { email: 'buyer@example.com' },
    defaults: {
      email: 'buyer@example.com',
      fullName: 'Priya Verma',
      passwordHash: await bcrypt.hash('Buyer@12345', rounds),
      role: 'BUYER',
      phone: '9555555555',
      status: 'ACTIVE',
      avatarUrl: null,
      lastLoginAt: null,
    },
  });

  const existingProperty = await Property.findOne({ where: { propertyCode: 'GW-DEMO0001' } });

  if (!existingProperty) {
    const property = await Property.create({
      propertyCode: 'GW-DEMO0001',
      title: '3 BHK Apartment in Sector 67, Gurgaon',
      description:
        'Spacious resale apartment with park-facing view. Ideal for self-use families seeking verified inventory.',
      propertyType: 'APARTMENT',
      city: 'Gurgaon',
      locality: 'Sector 67',
      address: 'Tower B, Green Residency, Sector 67, Gurgaon',
      state: 'Haryana',
      pincode: '122102',
      latitude: null,
      longitude: null,
      bhk: 3,
      carpetAreaSqft: 1450,
      builtUpAreaSqft: 1680,
      floor: 8,
      totalFloors: 18,
      ageYears: 4,
      parkingSpaces: 1,
      furnishing: 'SEMI_FURNISHED',
      readyToMove: true,
      askingPrice: 12500000,
      estimatedMinPrice: 11200000,
      estimatedMaxPrice: 11800000,
      trustScore: 88,
      listingStatus: 'PENDING_VERIFICATION',
      verificationStatus: 'LEGAL_REVIEW',
      rejectionReason: null,
      lastVerifiedAt: null,
      sellerId: seller.id,
      lawyerId: lawyer.id,
      inspectorId: inspector.id,
      propertyManagerId: null,
    });

    await VerificationHistory.bulkCreate([
      {
        propertyId: property.id,
        fromStatus: null,
        toStatus: 'SUBMITTED',
        notes: 'Seller submitted property',
        actorId: admin.id,
      },
      {
        propertyId: property.id,
        fromStatus: 'SUBMITTED',
        toStatus: 'DOCUMENT_COLLECTION',
        notes: 'Documents collected',
        actorId: admin.id,
      },
      {
        propertyId: property.id,
        fromStatus: 'DOCUMENT_COLLECTION',
        toStatus: 'LEGAL_REVIEW',
        notes: 'Assigned to legal team',
        actorId: admin.id,
      },
    ]);

    await PropertyHealthReport.create({
      propertyId: property.id,
      ownershipStatus: 'Verified',
      ownershipNotes: null,
      titleStatus: 'Under review',
      titleNotes: null,
      encumbranceStatus: 'Pending',
      encumbranceNotes: null,
      litigationStatus: 'Pending',
      litigationNotes: null,
      governmentApprovalStatus: null,
      governmentApprovalNotes: null,
      propertyTaxStatus: null,
      propertyTaxNotes: null,
      physicalInspectionStatus: null,
      physicalInspectionNotes: null,
      priceAssessmentStatus: null,
      priceAssessmentNotes: null,
      summary: 'Initial health report draft for demo property.',
      couldNotVerify: ['Municipal digital record unavailable'],
    });
  }

  const liveProperty = await Property.findOne({ where: { propertyCode: 'GW-LIVE0001' } });
  if (!liveProperty) {
    const live = await Property.create({
      propertyCode: 'GW-LIVE0001',
      title: '4 BHK Villa in DLF Phase 2, Gurgaon',
      description:
        'Fully verified independent villa with garden and covered parking. Published for buyer discovery.',
      propertyType: 'VILLA',
      city: 'Gurgaon',
      locality: 'DLF Phase 2',
      address: '12, Maple Lane, DLF Phase 2, Gurgaon',
      state: 'Haryana',
      pincode: '122002',
      latitude: null,
      longitude: null,
      bhk: 4,
      carpetAreaSqft: 3200,
      builtUpAreaSqft: 3800,
      floor: 0,
      totalFloors: 2,
      ageYears: 7,
      parkingSpaces: 2,
      furnishing: 'FULLY_FURNISHED',
      readyToMove: true,
      askingPrice: 45000000,
      estimatedMinPrice: 42000000,
      estimatedMaxPrice: 44000000,
      trustScore: 92,
      listingStatus: 'LIVE',
      verificationStatus: 'VERIFIED',
      rejectionReason: null,
      lastVerifiedAt: new Date(),
      sellerId: seller.id,
      lawyerId: lawyer.id,
      inspectorId: inspector.id,
      propertyManagerId: null,
    });

    await VerificationHistory.create({
      propertyId: live.id,
      fromStatus: 'FINAL_REVIEW',
      toStatus: 'VERIFIED',
      notes: 'Seed verified listing for buyer web',
      actorId: admin.id,
    });
  }

  console.log('Seed completed');
  console.log({
    admin: { email, password },
    lawyer: { email: 'lawyer@verifiedproperty.com', password: 'Lawyer@12345' },
    inspector: { email: 'inspector@verifiedproperty.com', password: 'Inspect@12345' },
    seller: { email: 'seller@example.com', password: 'Seller@12345' },
    buyer: { email: 'buyer@example.com', password: 'Buyer@12345' },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });
