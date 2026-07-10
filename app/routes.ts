import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("sample", "routes/sample.tsx"),
] satisfies RouteConfig;
