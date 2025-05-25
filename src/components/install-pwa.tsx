import { usePWA } from "@/lib/usePWA";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function InstallPWA() {
  const { isInstallable, isInstalled, promptToInstall } = usePWA();

  if (!isInstallable || isInstalled) {
    return null;
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="flex gap-2 items-center" 
      onClick={promptToInstall}
    >
      <Download className="h-4 w-4" />
      Install App
    </Button>
  );
}
