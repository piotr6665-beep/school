import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Loader2, Users, X } from "lucide-react";

interface Instructor {
  id: string;
  name: string;
  title: string;
  bio: string;
  specializations: string[];
  image_url: string | null;
  display_order: number;
}

const InstructorsManager = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editInstructor, setEditInstructor] = useState<Instructor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newSpec, setNewSpec] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    bio: "",
    specializations: [] as string[],
    file: null as File | null,
    previewUrl: null as string | null,
  });

  const { data: instructors, isLoading } = useQuery({
    queryKey: ["instructors-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instructors")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Instructor[];
    },
  });

  const resetForm = () => {
    setFormData({ name: "", title: "", bio: "", specializations: [], file: null, previewUrl: null });
    setNewSpec("");
  };

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      setUploading(true);
      let imageUrl = null;
      
      if (data.file) {
        const fileExt = data.file.name.split(".").pop();
        const fileName = `instructor-${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(fileName, data.file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from("gallery")
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
      
      const { error } = await supabase.from("instructors").insert({
        name: data.name,
        title: data.title,
        bio: data.bio,
        specializations: data.specializations,
        image_url: imageUrl,
        display_order: (instructors?.length || 0) + 1,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructors-admin"] });
      setIsAddOpen(false);
      resetForm();
      setUploading(false);
      toast({ title: t("admin.instructors.added") });
    },
    onError: () => {
      setUploading(false);
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Instructor>; file?: File | null }) => {
      let imageUrl = data.updates.image_url;
      
      if (data.file) {
        const fileExt = data.file.name.split(".").pop();
        const fileName = `instructor-${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(fileName, data.file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from("gallery")
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
      
      const { error } = await supabase
        .from("instructors")
        .update({ ...data.updates, image_url: imageUrl })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructors-admin"] });
      setEditInstructor(null);
      resetForm();
      toast({ title: t("admin.instructors.updated") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("instructors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructors-admin"] });
      setDeleteId(null);
      toast({ title: t("admin.instructors.deleted") });
    },
  });

  const handleAddSpec = () => {
    if (newSpec.trim()) {
      setFormData({ ...formData, specializations: [...formData.specializations, newSpec.trim()] });
      setNewSpec("");
    }
  };

  const handleRemoveSpec = (index: number) => {
    setFormData({
      ...formData,
      specializations: formData.specializations.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInstructor) return;
    updateMutation.mutate({
      id: editInstructor.id,
      updates: {
        name: formData.name,
        title: formData.title,
        bio: formData.bio,
        specializations: formData.specializations,
        image_url: editInstructor.image_url,
      },
      file: formData.file,
    });
  };

  const openEditDialog = (instructor: Instructor) => {
    setEditInstructor(instructor);
    setFormData({
      name: instructor.name,
      title: instructor.title,
      bio: instructor.bio,
      specializations: instructor.specializations || [],
      file: null,
      previewUrl: instructor.image_url,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData({ ...formData, file, previewUrl: url });
    }
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const FormFields = ({ isEdit = false }: { isEdit?: boolean }) => (
    <>
      <div className="space-y-2">
        <Label>{t("admin.instructors.name")}</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t("admin.instructors.namePlaceholder")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>{t("admin.instructors.title")}</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder={t("admin.instructors.titlePlaceholder")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>{t("admin.instructors.bio")}</Label>
        <Textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder={t("admin.instructors.bioPlaceholder")}
          rows={3}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>{t("admin.instructors.specializations")}</Label>
        <div className="flex gap-2">
          <Input
            value={newSpec}
            onChange={(e) => setNewSpec(e.target.value)}
            placeholder={t("admin.instructors.specPlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSpec())}
          />
          <Button type="button" variant="secondary" onClick={handleAddSpec}>
            {t("common.add")}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.specializations.map((spec, idx) => (
            <Badge key={idx} variant="secondary" className="gap-1">
              {spec}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveSpec(idx)} />
            </Badge>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("admin.instructors.photo")}</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
        {formData.previewUrl && (
          <div className="mt-2">
            <img 
              src={formData.previewUrl} 
              alt="Podgląd" 
              className="w-32 h-32 object-cover rounded-lg border"
            />
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("admin.instructors.title")}</h2>
          <p className="text-muted-foreground">
            {t("admin.instructors.total", { count: instructors?.length || 0 })}
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("admin.instructors.add")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("admin.instructors.addTitle")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormFields />
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("admin.instructors.add")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {instructors?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("admin.instructors.noInstructors")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instructors?.map((instructor) => (
            <Card key={instructor.id} className="overflow-hidden group">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={instructor.image_url || undefined} />
                    <AvatarFallback>{getInitials(instructor.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{instructor.name}</h3>
                    <p className="text-sm text-primary">{instructor.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{instructor.bio}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {instructor.specializations?.map((spec, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(instructor)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    {t("common.edit")}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteId(instructor.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editInstructor} onOpenChange={() => { setEditInstructor(null); resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.instructors.editTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <FormFields isEdit />
            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.instructors.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.instructors.confirmDeleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InstructorsManager;
