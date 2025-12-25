import { Button } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@client/components/ui/avatar";
import { Badge } from "@client/components/ui/badge";
import { Separator } from "@client/components/ui/separator";
import { useAuth } from "@client/provider/AuthProvider";
import axios from "axios";
import { Loader2, User, Mail, Building, Shield, Save, KeyIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { profileFormSchema, type ProfileFormData } from "./profileFormSchema";
import { useNavigate } from "react-router";

const Profile = () => {
  const { user: authUser, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullname: "",
      email: "",
      avatar: ""
    }
  });

  useEffect(() => {
    if (authUser) {
      reset({
        fullname: authUser.fullname || "",
        email: authUser.email || "",
        avatar: authUser.avatar || ""
      });
    }
  }, [authUser, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!authUser) return;

    setSaving(true);
    try {
      const response = await axios.put('/api/account/profile', {
        fullname: data.fullname,
        email: data.email,
        avatar: data.avatar
      });

      // Update the user in context
      setUser({
        ...authUser,
        fullname: response.data.fullname,
        email: response.data.email,
        avatar: response.data.avatar
      });

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading || !authUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">User Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Overview Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarImage src={authUser.avatar} alt={authUser.fullname} />
              <AvatarFallback className="text-lg">
                {getInitials(authUser.fullname)}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl">{authUser.fullname}</CardTitle>
            <CardDescription>{authUser.username}</CardDescription>
            <Badge variant={authUser.status === 'active' ? 'default' : 'secondary'} className="mt-2">
              {authUser.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Email:</span>
              <span>{authUser.email}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Tenant:</span>
              <span>{authUser.activeTenant.name}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Roles:</span>
              <div className="flex flex-wrap gap-1">
                {authUser.roles.map((role, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            
            <Separator />
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">OTP Authentication</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Click the button below to setup or manage your TOTP (OTP) authentication.
                </p>
              </div>
              <Button variant="default" onClick={() => {navigate('/console/otp-setup')}} className="w-full">
                <KeyIcon className="h-4 w-4 mr-2" />
                OTP Setup
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center items-center">
            
          </CardFooter>
        </Card>

        {/* Profile Edit Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Personal Information</span>
            </CardTitle>
            <CardDescription>
              Update your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullname">Full Name *</Label>
                  <Input
                    id="fullname"
                    {...register("fullname")}
                    placeholder="Enter your full name"
                    className={errors.fullname ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                  />
                  {errors.fullname && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      {errors.fullname.message}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="Enter your email"
                    className={errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                  />
                  {errors.email && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      {errors.email.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 hidden">
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input
                  id="avatar"
                  {...register("avatar")}
                  placeholder="Enter avatar image URL"
                  className={errors.avatar ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                />
                {errors.avatar && (
                  <div className="flex items-center mt-1 text-red-600 text-sm">
                    {errors.avatar.message}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Username</Label>
                  <p className="text-sm text-muted-foreground mt-1">{authUser.username}</p>
                  <p className="text-xs text-muted-foreground">Username cannot be changed</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Active Tenant</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{authUser.activeTenant.name}</span>
                    <Badge variant="outline">{authUser.activeTenant.code}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {authUser.activeTenant.description}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Roles & Permissions</Label>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-sm font-medium mb-2">Roles:</p>
                      <div className="flex flex-wrap gap-2">
                        {authUser.roles.map((role, index) => (
                          <Badge key={index} variant="secondary">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {authUser.permissions.slice(0, 10).map((permission, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                        {authUser.permissions.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{authUser.permissions.length - 10} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-2">
                <Button type="submit" disabled={isSubmitting || saving}>
                  {saving || isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;