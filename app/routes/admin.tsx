import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  data,
} from "react-router";
import {
  unstable_parseMultipartFormData,
  type NodeOnDiskFile,
} from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { NewTreeForm } from "~/components/NewTreeForm";
import { useEffect, useRef, useState } from "react";
import { rmSync, uploadHandler } from "~/uploadHandler.server";
import { Form, useActionData, useFetcher, useLoaderData } from "react-router";
import { tileImage } from "~/sharp.server";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import { s3Client } from "~/s3.server";
import readdir from "recursive-readdir";
import {
  createTree,
  deleteTree,
  getTrees,
  updateDocVersion,
  updateVersion,
} from "~/models/tree.server";
import { NewKeyForm } from "~/components/NewKeyForm";
import { createKey, getKeys } from "~/models/key.server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { Viewer } from "~/components/Viewer";

export const meta: MetaFunction = () => {
  return [{ title: "Admin" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  const trees = await getTrees();
  const keys = await getKeys();
  const url =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000/"
      : "https://marcsfamilytrees.com/";
  return {
    trees,
    keys,
    url,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler
  );
  let intent = formData.get("intent");
  switch (intent) {
    case "create": {
      const name = formData.get("name");
      const image = formData.get("upload")
        ? (formData.get("upload") as unknown as NodeOnDiskFile)
        : null;
      const doc = formData.get("document")
        ? (formData.get("document") as unknown as NodeOnDiskFile)
        : null;

      if (typeof name !== "string") {
        return {
          success: {
            create: false,
            update: false,
            key: false,
          },
          errors: {
            name: "Invalid name",
            image: null,
          },
        };
      }
      if (name.length < 5) {
        return {
          success: {
            create: false,
            update: false,
            key: false,
          },
          errors: {
            name: "Name must be at least 5 chars",
            image: null,
          },
        };
      }
      if (!image?.name) {
        return {
          success: {
            create: false,
            update: false,
            key: false,
          },
          errors: {
            name: null,
            image: "image required",
          },
        };
      }
      if (!doc?.name) {
        return {
          success: {
            create: false,
            update: false,
            key: false,
          },
          errors: {
            name: null,
            image: "document required",
          },
        };
      }
      const docVersion = doc?.name;
      let promisedUploads = [];
      const uploadDocFile = async () => {
        const docFile = await fs.readFileSync(`./tmp/uploads/${doc?.name}`);
        const docUploadParams: PutObjectCommandInput = {
          Bucket: "zaydes-trees",
          Key: doc?.name,
          Body: docFile,
          ACL: "public-read",
        };
        await s3Client.send(new PutObjectCommand(docUploadParams));
      };
      promisedUploads.push(uploadDocFile());
      const version = await tileImage(image?.name);
      // Upload dzi file
      const uploadFile = async () => {
        const dzFile = await fs.readFileSync(`./tmp/out/${version}.dzi`);
        const dziUploadParams: PutObjectCommandInput = {
          Bucket: "zaydes-trees",
          Key: `${version}/image.dzi`,
          Body: dzFile,
          ACL: "public-read",
        };
        console.log("Starting dzi upload");
        await s3Client.send(new PutObjectCommand(dziUploadParams));
        console.log("Finished dzi upload");
      };
      promisedUploads.push(uploadFile());
      // Upload all tiles
      const files = await readdir(`./tmp/out/${version}_files`, [
        "vips-properties.xml",
      ]);
      for (const filePath of files) {
        const path = filePath.split("/").slice(3, 5).join("/");
        const key = `${version}/image_files/${path}`;
        const uploadFile = async () => {
          const file = await fs.readFileSync(filePath);
          const uploadParams: PutObjectCommandInput = {
            Bucket: "zaydes-trees",
            Key: key,
            Body: file,
            ACL: "public-read",
          };
          console.log(`Starting upload for ${key}`);
          await s3Client.send(new PutObjectCommand(uploadParams));
          console.log(`Finished upload for ${key}`);
        };
        promisedUploads.push(uploadFile());
      }
      await Promise.all(promisedUploads);
      try {
        await createTree(name, version.toString(), docVersion);
      } catch (e) {
        console.log(e);
        if (e instanceof PrismaClientKnownRequestError) {
          if (e.code === "P2002") {
            return {
              success: {
                create: false,
                update: false,
                key: false,
              },
              errors: {
                name: "Name already taken, pick a new one",
                image: null,
              },
            };
          }
        }
      }
      rmSync(`./tmp/out/${version}.dzi`);
      rmSync(`./tmp/out/${version}_files`, { recursive: true, force: true });
      return {
        success: {
          create: true,
          update: false,
          key: false,
        },
        errors: {
          name: null,
          image: null,
        },
      };
    }
    case "delete_tree": {
      const id = formData.get("id");
      if (typeof id !== "string") {
        return {
          success: {
            create: false,
            update: false,
            key: false,
          },
          errors: {
            name: null,
            image: null,
            delete: "bad",
          },
        };
      }
      await deleteTree(id);
      return {
        success: {
          create: false,
          update: false,
          key: false,
        },
        errors: {
          name: null,
          image: null,
        },
      };
    }
    case "create_key": {
      const trees = formData.getAll("tree");
      const name = formData.get("name");

      // Validate name
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return {
          success: {
            create: false,
            update: false,
            key: false,
          },
          errors: {
            name: "Name is required",
            image: null,
          },
        };
      }

      // Validate that at least one tree is selected
      if (!trees || trees.length === 0) {
        return {
          success: {
            create: false,
            update: false,
            key: false,
          },
          errors: {
            name: null,
            image: "At least one tree must be selected",
          },
        };
      }

      try {
        await createKey(name, trees as string[]);
        return {
          success: {
            create: false,
            update: false,
            key: true,
          },
          errors: {
            name: null,
            image: null,
          },
        };
      } catch (e) {
        console.error("Error creating key:", e);
        return {
          success: {
            create: false,
            update: false,
            key: false,
          },
          errors: {
            name: null,
            image: "Failed to create key. Please try again.",
          },
        };
      }
    }
    case "update_tree": {
      const id = formData.get("id");
      const image = formData.get("upload")
        ? (formData.get("upload") as unknown as NodeOnDiskFile)
        : null;
      const doc = formData.get("document")
        ? (formData.get("document") as unknown as NodeOnDiskFile)
        : null;
      if (image?.name) {
        let promisedUploads = [];
        const version = await tileImage(image?.name);
        // Upload dzi file
        const uploadFile = async () => {
          const dzFile = await fs.readFileSync(`./tmp/out/${version}.dzi`);
          const dziUploadParams: PutObjectCommandInput = {
            Bucket: "zaydes-trees",
            Key: `${version}/image.dzi`,
            Body: dzFile,
            ACL: "public-read",
          };
          console.log("Starting dzi upload");
          await s3Client.send(new PutObjectCommand(dziUploadParams));
          console.log("Finished dzi upload");
        };
        promisedUploads.push(uploadFile());
        // Upload all tiles
        const files = await readdir(`./tmp/out/${version}_files`, [
          "vips-properties.xml",
        ]);
        for (const filePath of files) {
          const path = filePath.split("/").slice(3, 5).join("/");
          const key = `${version}/image_files/${path}`;
          const uploadFile = async () => {
            const file = await fs.readFileSync(filePath);
            const uploadParams: PutObjectCommandInput = {
              Bucket: "zaydes-trees",
              Key: key,
              Body: file,
              ACL: "public-read",
            };
            console.log(`Starting upload for ${key}`);
            await s3Client.send(new PutObjectCommand(uploadParams));
            console.log(`Finished upload for ${key}`);
          };
          promisedUploads.push(uploadFile());
        }
        await Promise.all(promisedUploads);
        await updateVersion(id as string, version.toString());
      }
      if (doc?.name) {
        const docFile = await fs.readFileSync(`./tmp/uploads/${doc?.name}`);
        const docUploadParams: PutObjectCommandInput = {
          Bucket: "zaydes-trees",
          Key: doc?.name,
          Body: docFile,
          ACL: "public-read",
        };
        await s3Client.send(new PutObjectCommand(docUploadParams));
        await updateDocVersion(id as string, doc?.name);
      }
      return {
        success: {
          create: false,
          update: true,
          key: false,
        },
        errors: {
          name: null,
          image: null,
        },
      };
    }
  }
  return {
    success: {
      create: false,
      update: false,
      key: false,
    },
    errors: {
      name: null,
      image: null,
    },
  };
}

export default function Admin() {
  const [openMenu, setOpenMenu] = useState("");
  const [editingTree, setEditingTree] = useState("");
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();
  let formRef = useRef<HTMLFormElement>(null);
  let keyFormRef = useRef<HTMLFormElement>(null);
  const fetcher = useFetcher();
  useEffect(() => {
    console.log(actionData);
    if (actionData?.success?.create) {
      formRef.current?.reset();
      setOpenMenu("showTrees");
    }
    if (actionData?.success?.key) {
      keyFormRef.current?.reset();
      setOpenMenu("showKeys");
    }
    if (actionData?.success?.update) {
      setEditingTree("");
    }
  }, [actionData]);

  return (
    <>
      <div className="mx-auto h-full max-w-7xl sm:px-6 lg:px-8">
        <h1 className="text-xl">Dashboard</h1>
        <hr className="my-1" />
        <div className="flex flex-row space-x-1">
          <button
            onClick={() => {
              setOpenMenu("createTree");
            }}
            className="flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Create new tree
          </button>
          <button
            onClick={() => {
              setOpenMenu("createKey");
            }}
            className="flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Create new key
          </button>
          <button
            onClick={() => {
              setOpenMenu("showTrees");
            }}
            className="flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Show Trees
          </button>
          <button
            onClick={() => {
              setOpenMenu("showKeys");
            }}
            className="flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Show Keys
          </button>
        </div>
        {openMenu === "createTree" ? (
          <>
            <NewTreeForm formRef={formRef} />

            {actionData?.errors?.name ? (
              <p className="text-red-600">{actionData?.errors?.name}</p>
            ) : null}
            {actionData?.errors?.image ? (
              <p className="text-red-600">{actionData?.errors?.image}</p>
            ) : null}
            {actionData?.success?.create ? (
              <p className="text-green-600">Success!</p>
            ) : null}
          </>
        ) : null}
        {openMenu === "createKey" ? (
          <>
            <NewKeyForm formRef={keyFormRef} trees={loaderData.trees} />
            {actionData?.errors?.name ? (
              <p className="text-red-600">{actionData?.errors?.name}</p>
            ) : null}
            {actionData?.errors?.image ? (
              <p className="text-red-600">{actionData?.errors?.image}</p>
            ) : null}
            {actionData?.success?.key ? (
              <p className="text-green-600">Key created successfully!</p>
            ) : null}
          </>
        ) : null}
        {openMenu === "showTrees" ? (
          <>
            <h1 className="mt-2 text-xl">Trees</h1>
            {loaderData.trees.map((tree) => (
              <div key={tree.id} className="h-1/2 w-2/3">
                <p>{tree.name}</p>
                <div className="flex flex-row space-x-2">
                  <button
                    className="flex justify-center rounded-md border border-transparent bg-red-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    onClick={() => {
                      fetcher.submit(
                        { intent: "delete_tree", id: tree.id },
                        {
                          method: "post",
                          encType: "multipart/form-data",
                        }
                      );
                    }}
                  >
                    Delete
                  </button>
                  <a
                    className="flex justify-center rounded-md border border-transparent bg-blue-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    href={`https://zaydes-trees.s3.amazonaws.com/${tree.docVersion}`}
                  >
                    Download Doc
                  </a>
                  <button
                    className="flex justify-center rounded-md border border-transparent bg-blue-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={() => {
                      if (editingTree === tree.id) setEditingTree("");
                      else setEditingTree(tree.id);
                    }}
                  >
                    Edit Tree
                  </button>
                </div>
                {editingTree === tree.id ? (
                  <Form method="post" encType="multipart/form-data">
                    <input
                      hidden={true}
                      readOnly={true}
                      name="id"
                      value={tree.id}
                    />
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Image
                    </label>
                    <div className="mt-1">
                      <input
                        type="file"
                        name="upload"
                        className="block border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Document
                    </label>
                    <div className="mt-1">
                      <input
                        type="file"
                        name="document"
                        className="block border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      name="intent"
                      value="update_tree"
                      className="flex w-1/2 justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Update
                    </button>
                  </Form>
                ) : (
                  <Viewer
                    id={tree.version}
                    className="my-5 h-3/4 w-full border-2 border-gray-400"
                  />
                )}
              </div>
            ))}
          </>
        ) : null}
        {openMenu === "showKeys" ? (
          <>
            <h1 className="mt-2 text-xl">Keys</h1>
            {loaderData.keys.map((key) => (
              <div key={key.id}>
                <p className="font-bold">{key.name}</p>
                <a
                  className="text-blue-500"
                  target="_blank"
                  href={`${loaderData.url}${key.id}`}
                >{`${loaderData.url}${key.id}`}</a>
                {key.trees.map((tree) => (
                  <li key={tree.id}>{tree.name}</li>
                ))}
                <hr />
              </div>
            ))}
          </>
        ) : null}
      </div>
    </>
  );
}
