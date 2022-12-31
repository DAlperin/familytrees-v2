import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  const email = "rachel@remix.run";

  // cleanup the existing database
  await prisma.user.delete({ where: { email } }).catch(() => {
    // no worries if it doesn't exist yet
  });

  const hashedPassword = await bcrypt.hash("racheliscool", 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });
  const tree = await prisma.tree.upsert({
    where: {
      name: "exampletree1",
    },
    update: {
      name: "exampletree1",
      version: "v1",
    },
    create: {
      name: "exampletree1",
      version: "v1",
    },
  });
  const tree2 = await prisma.tree.upsert({
    where: {
      name: "exampletree2",
    },
    update: {
      name: "exampletree2",
      version: "v1",
    },
    create: {
      name: "exampletree2",
      version: "v1",
    },
  });
  // const key = await prisma.key.create({
  //   data: {
  //     trees: {
  //       connect: [
  //         {
  //           id: tree.id
  //         },
  //         {
  //           id: tree2.id
  //         }
  //       ]
  //     }
  //   },
  //   include: {
  //     trees: true
  //   }
  // })
  // console.log(key)
  //
  // const key = await prisma.key.create({
  //   data: {
  //     permissions: {
  //       create: [
  //         {
  //           tree: {
  //             connect: {
  //               id: tree.id
  //             }
  //           }
  //         },
  //         {
  //           tree: {
  //             connect: {
  //               id: tree2.id
  //             }
  //           }
  //         }
  //       ]
  //     }
  //   }
  // })

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
