import { type RouteConfig, route, index } from "@react-router/dev/routes";

export default [
  index("./routes/index.tsx"),
  route("admin", "./routes/admin.tsx"),
  route("login", "./routes/login.tsx"),
  route("join", "./routes/join.tsx"),
  route("logout", "./routes/logout.tsx"),
  route("healthcheck", "./routes/healthcheck.tsx"),
  route(":key", "./routes/$key.tsx"),
] satisfies RouteConfig;
