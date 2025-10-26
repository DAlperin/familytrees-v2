import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import "./styles/tailwind.css";
import { getUser } from "./session.server";

export const meta: MetaFunction = () => [
  { charSet: "utf-8" },
  { title: "Family Trees" },
  { name: "viewport", content: "width=device-width,initial-scale=1" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  return {
    user: await getUser(request),
  };
}

export default function App() {
  return (
    <html lang="en" className="h-full">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="h-screen">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
