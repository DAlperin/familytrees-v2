import { prisma } from "~/db.server";

export async function createKey(name: string, trees: string[]) {
  const treeConnects = trees.map((tree) => {
    return {
      id: tree,
    };
  });
  return await prisma.accessKey.create({
    data: {
      name,
      trees: {
        connect: treeConnects,
      },
    },
  });
}

export async function updateKey(id: string, trees: string[]) {
  const treeConnects = trees.map((tree) => {
    return {
      id: tree,
    };
  });
  return await prisma.accessKey.update({
    where: {
      id,
    },
    data: {
      trees: {
        set: treeConnects,
      },
    },
  });
}

export async function getKeys() {
  return await prisma.accessKey.findMany({
    include: {
      trees: true,
    },
  });
}

export async function deleteKey(id: string) {
  return await prisma.accessKey.delete({
    where: {
      id,
    },
  });
}
