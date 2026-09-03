import { LoadingPanel } from "@/components/loading";
import { Tags } from "lucide-react";

export default function Loading() {
  return <LoadingPanel label="Loading topics..." icon={Tags} />;
}
