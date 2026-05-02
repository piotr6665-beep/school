import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Users, CalendarCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface EventBookingPayload {
  selected_option: string | null;
  quantity: number;
  notes: string | null;
}

interface EventBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: EventBookingPayload) => Promise<void>;
  eventTitle: string;
  options: string[];
  maxParticipants: number | null;
  isLoading?: boolean;
}

const EventBookingDialog = ({
  isOpen,
  onClose,
  onConfirm,
  eventTitle,
  options,
  maxParticipants,
  isLoading = false,
}: EventBookingDialogProps) => {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedOption(options[0] || "");
      setQuantity(1);
      setNotes("");
    }
  }, [isOpen, options]);

  const max = Math.min(maxParticipants ?? 10, 10);

  const handleConfirm = async () => {
    await onConfirm({
      selected_option: selectedOption || null,
      quantity,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            {t("eventBooking.title")}
          </DialogTitle>
          <DialogDescription>
            {t("eventBooking.description", { name: eventTitle })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {options.length > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor="option">{t("eventBooking.selectOption")}</Label>
              <Select value={selectedOption} onValueChange={setSelectedOption}>
                <SelectTrigger id="option">
                  <SelectValue placeholder={t("eventBooking.selectOption")} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="quantity" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {t("eventBooking.quantity")}
            </Label>
            <Select
              value={quantity.toString()}
              onValueChange={(v) => setQuantity(parseInt(v, 10))}
            >
              <SelectTrigger id="quantity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} {n === 1 ? t("eventBooking.person") : t("eventBooking.people")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">{t("eventBooking.notes")}</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("eventBooking.notesPlaceholder")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("eventBooking.booking")}
              </>
            ) : (
              t("eventBooking.confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventBookingDialog;
