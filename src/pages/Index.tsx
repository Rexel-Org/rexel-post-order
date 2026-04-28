import { useVersionStore } from "@/stores/versionStore";
import OrderHistory from "./OrderHistory";
import Homepage from "./Homepage";

export default function Index() {
  const scenario = useVersionStore((s) => s.scenario);
  return scenario === "homepage" ? <Homepage /> : <OrderHistory />;
}
