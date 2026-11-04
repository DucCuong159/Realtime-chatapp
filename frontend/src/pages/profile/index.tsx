import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { PROTECTED_ROUTES } from "@/routes/routes";
import {
  profileFormSchema,
  type ProfileFormType,
} from "@/validators/user.validator";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Camera, Check, Trash2 } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { type FieldErrors, type UseFormRegister, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ProfileHeader = () => (
  <div className="mx-auto flex w-full max-w-2xl items-center gap-3 pb-6">
    <Link
      to={PROTECTED_ROUTES.CONVERSATION}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "size-9 rounded-full cursor-pointer hover:bg-muted",
      )}
      aria-label="Back to conversations"
    >
      <ArrowLeft className="size-5" />
    </Link>
    <div>
      <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
        Account Settings
      </h1>
      <p className="text-xs text-muted-foreground md:text-sm">
        Manage your personal profile and account details
      </p>
    </div>
  </div>
);

interface ProfileAvatarCardProps {
  userName?: string;
  avatarPreview: string | null;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
}

const ProfileAvatarCard = ({
  userName,
  avatarPreview,
  onImageChange,
  onRemoveAvatar,
}: ProfileAvatarCardProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = (userName || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Profile Photo</CardTitle>
        <CardDescription className="text-xs">
          Upload a JPG, PNG, WebP or GIF up to 10MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <Avatar className="size-24 border-2 border-border shadow-sm">
            {avatarPreview && (
              <AvatarImage src={avatarPreview} alt={userName || "User Avatar"} />
            )}
            <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={onImageChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="size-4" />
              <span>Upload New Photo</span>
            </Button>

            {avatarPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                onClick={() => {
                  onRemoveAvatar();
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <Trash2 className="size-4" />
                <span>Remove</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ProfileInfoCardProps {
  email?: string;
  name?: string;
  about?: string;
  register: UseFormRegister<ProfileFormType>;
  errors: FieldErrors<ProfileFormType>;
  aboutCount: number;
  onAboutChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

const ProfileInfoCard = ({
  email,
  name,
  about,
  register,
  errors,
  aboutCount,
  onAboutChange,
}: ProfileInfoCardProps) => {
  const { onChange: formAboutChange, ...aboutField } = register("about");

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
        <CardDescription className="text-xs">
          Update your display name and bio description.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field className="gap-1.5">
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="email">Email Address</FieldLabel>
            <Badge variant="secondary" className="gap-1 text-[11px]">
              <Check className="size-3 text-green-600 dark:text-green-400" />
              <span>Verified</span>
            </Badge>
          </div>
          <Input
            id="email"
            type="email"
            value={email || ""}
            readOnly
            disabled
            className="cursor-not-allowed bg-muted/60 text-muted-foreground opacity-90"
          />
          <p className="text-[11px] text-muted-foreground">
            Your email address is your login credential and cannot be changed.
          </p>
        </Field>

        <Field data-invalid={!!errors.name} className="gap-1.5">
          <FieldLabel htmlFor="name">Full Name</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="Enter your name"
            maxLength={50}
            defaultValue={name || ""}
            {...register("name")}
          />
          {errors.name && <FieldError>{errors.name.message}</FieldError>}
        </Field>

        <Field data-invalid={!!errors.about} className="gap-1.5">
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="about">About / Bio</FieldLabel>
            <span className="text-xs text-muted-foreground">{aboutCount}/200</span>
          </div>
          <Textarea
            id="about"
            placeholder="Write a brief bio about yourself..."
            rows={3}
            maxLength={200}
            defaultValue={about || ""}
            {...aboutField}
            onChange={(e) => {
              onAboutChange(e);
              void formAboutChange(e);
            }}
          />
          {errors.about && <FieldError>{errors.about.message}</FieldError>}
        </Field>
      </CardContent>
    </Card>
  );
};

const ProfilePage = () => {
  const { user, updateProfile, isUpdatingProfile } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar || null,
  );
  const [aboutCount, setAboutCount] = useState(user?.about?.length || 0);

  const form = useForm<ProfileFormType>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      about: user?.about || "",
      avatar: user?.avatar || null,
    },
  });

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP, GIF)");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image file size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUri = reader.result as string;
      setAvatarPreview(dataUri);
      form.setValue("avatar", dataUri, { shouldDirty: true });
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    form.setValue("avatar", null, { shouldDirty: true });
  };

  const onSubmit = async (data: ProfileFormType) => {
    if (isUpdatingProfile) return;
    await updateProfile(data);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-y-auto bg-background p-4 md:p-8">
      <ProfileHeader />

      <div className="mx-auto w-full max-w-2xl">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ProfileAvatarCard
            userName={user?.name}
            avatarPreview={avatarPreview}
            onImageChange={handleImageChange}
            onRemoveAvatar={handleRemoveAvatar}
          />

          <ProfileInfoCard
            email={user?.email}
            name={user?.name}
            about={user?.about || ""}
            register={form.register}
            errors={form.formState.errors}
            aboutCount={aboutCount}
            onAboutChange={(e) => setAboutCount(e.target.value.length)}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={isUpdatingProfile}
              className="min-w-32 cursor-pointer gap-2"
            >
              {isUpdatingProfile ? (
                <>
                  <Spinner className="size-4" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
