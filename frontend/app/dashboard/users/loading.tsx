import { LoadingPanel } from "@/components/loading";
import { Users } from "lucide-react";

export default function Loading() {
  return <LoadingPanel label="Loading users..." icon={Users} />;
}
