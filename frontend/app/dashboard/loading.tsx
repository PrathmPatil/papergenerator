import { LoadingPanel } from "@/components/loading";
import { LayoutDashboard } from "lucide-react";

export default function Loading() {
  return <LoadingPanel label="Loading dashboard..." icon={LayoutDashboard} />;
}
