import { HeroPage } from "@/components/custom/HeroPage";
import { CustomStickyBanner } from "@/components/custom/CustomStickyBanner";

export default function Home() {
  return (
    <div className="relative flex w-full flex-col overflow-y-auto">
      <CustomStickyBanner />
      <HeroPage />
    </div>
  );
}