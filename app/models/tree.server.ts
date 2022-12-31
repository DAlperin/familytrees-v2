import { prisma } from "~/db.server";

export async function getTrees() {
  return await prisma.tree.findMany({
    orderBy: {
      version: "desc",
    },
  });
}

export async function createTree(
  name: string,
  version: string,
  docVersion: string
) {
  return await prisma.tree.create({
    data: {
      name,
      version,
      docVersion: docVersion,
    },
  });
}

export async function deleteTree(id: string) {
  return await prisma.tree.delete({
    where: {
      id,
    },
  });
}

export async function updateVersion(id: string, version: string) {
  return await prisma.tree.update({
    where: {
      id,
    },
    data: {
      version,
    },
  });
}

export async function updateDocVersion(id: string, version: string) {
  return await prisma.tree.update({
    where: {
      id,
    },
    data: {
      docVersion: version,
    },
  });
}
