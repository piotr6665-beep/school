import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Trash2, Image, Loader2, Pencil } from "lucide-react";

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  display_order: number;
  created_at: string;
}

const GalleryManager = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editImage, setEditImage] = useState<GalleryImage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    file: null as File | null,
  });
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    file: null as File | null,
    previewUrl: null as string | null,
  });

  const { data: images, isLoading } = useQuery({
    queryKey: ["gallery-images-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as GalleryImage[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; file: File }) => {
      setUploading(true);
      
      const fileExt = data.file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, data.file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from("gallery")
        .getPublicUrl(fileName);
      
      const { error: insertError } = await supabase
        .from("gallery_images")
        .insert({
          title: data.title,
          description: data.description || null,
          image_url: urlData.publicUrl,
          display_order: (images?.length || 0) + 1,
        });
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-images-admin"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-images"] });
      setIsAddOpen(false);
      setFormData({ title: "", description: "", file: null });
      setUploading(false);
      toast({ title: t("admin.gallery.added"), description: t("admin.gallery.addedDesc") });
    },
    onError: () => {
      setUploading(false);
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; description: string; file?: File | null }) => {
      let imageUrl: string | undefined;
      
      if (data.file) {
        const fileExt = data.file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(fileName, data.file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from("gallery")
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
      
      const updateData: { title: string; description: string | null; image_url?: string } = {
        title: data.title,
        description: data.description || null,
      };
      
      if (imageUrl) {
        updateData.image_url = imageUrl;
      }
      
      const { error } = await supabase
        .from("gallery_images")
        .update(updateData)
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-images-admin"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-images"] });
      setEditImage(null);
      toast({ title: t("admin.gallery.updated") });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const image = images?.find((img) => img.id === id);
      if (image && image.image_url.includes("supabase")) {
        const fileName = image.image_url.split("/").pop();
        if (fileName) {
          await supabase.storage.from("gallery").remove([fileName]);
        }
      }
      const { error } = await supabase.from("gallery_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-images-admin"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-images"] });
      setDeleteId(null);
      toast({ title: t("admin.gallery.deleted") });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !formData.title) return;
    addMutation.mutate({
      title: formData.title,
      description: formData.description,
      file: formData.file,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editImage || !editFormData.title) return;
    updateMutation.mutate({
      id: editImage.id,
      title: editFormData.title,
      description: editFormData.description,
      file: editFormData.file,
    });
  };

  const openEditDialog = (image: GalleryImage) => {
    setEditImage(image);
    setEditFormData({
      title: image.title,
      description: image.description || "",
      file: null,
      previewUrl: image.image_url,
    });
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setEditFormData({ ...editFormData, file, previewUrl: url });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("admin.gallery.title")}</h2>
          <p className="text-muted-foreground">
            {t("admin.gallery.total", { count: images?.length || 0 })}
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("admin.gallery.add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.gallery.addTitle")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("admin.gallery.imageTitle")}</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t("admin.gallery.titlePlaceholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.gallery.description")}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("admin.gallery.descriptionPlaceholder")}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.gallery.image")}</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("admin.gallery.uploading")}
                  </>
                ) : (
                  t("admin.gallery.add")
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {images?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Image className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("admin.gallery.noImages")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images?.map((image) => (
            <Card key={image.id} className="overflow-hidden group">
              <div className="relative aspect-[4/3]">
                <img
                  src={image.image_url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => openEditDialog(image)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setDeleteId(image.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold truncate">{image.title}</h3>
                {image.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {image.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editImage} onOpenChange={() => setEditImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.gallery.editTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editFormData.previewUrl && (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={editFormData.previewUrl}
                  alt={editFormData.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("admin.gallery.image")}</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleEditFileChange}
              />
              <p className="text-xs text-muted-foreground">{t("admin.gallery.changeImageHint")}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("admin.gallery.imageTitle")}</Label>
              <Input
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                placeholder={t("admin.gallery.titlePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.gallery.description")}</Label>
              <Textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder={t("admin.gallery.descriptionPlaceholder")}
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {t("common.save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.gallery.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.gallery.confirmDeleteDesc")}
            </AlertDialogDescription>
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

export default GalleryManager;
