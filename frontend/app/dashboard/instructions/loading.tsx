import { LoadingPanel } from "@/components/loading";
import { CircleHelp } from "lucide-react";

export default function Loading() {
  return <LoadingPanel label="Loading instructions..." icon={CircleHelp} />;
}
