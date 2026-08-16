import Logo from "@/components/logo";
import { Spinner } from "@/components/ui/spinner";

interface AppLoaderProps {
  text?: string;
}

const AppLoader = ({ text }: AppLoaderProps) => {
  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center gap-6">
      <Logo imgClass="size-20" />
      <div className="flex flex-col items-center justify-center gap-2">
        <Spinner className="size-6 text-primary" />
        {text && (
          <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
};

export default AppLoader;
