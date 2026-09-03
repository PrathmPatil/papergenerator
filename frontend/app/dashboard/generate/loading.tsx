import { LoadingPanel } from "@/components/loading";
import { Wand2 } from "lucide-react";

export default function Loading() {
  return <LoadingPanel label="Loading paper generator..." icon={Wand2} />;
}
