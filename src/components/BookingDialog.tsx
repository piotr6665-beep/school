import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Loader2, Users } from "lucide-react";

interface BookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => Promise<void>;
  className: string;
  availableSpots: number;
  isLoading?: boolean;
}

const BookingDialog = ({
  isOpen,
  onClose,
  onConfirm,
  className,
  availableSpots,
  isLoading = false,
}: BookingDialogProps) => {
  const [quantity, setQuantity] = useState(1);
  const { t } = useTranslation();

  const maxQuantity = Math.min(availableSpots, 10);

  const handleConfirm = async () => {
    await onConfirm(quantity);
    setQuantity(1);
  };

  const handleClose = () => {
    setQuantity(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('bookings.bookingDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('bookings.bookingDialog.description', { className })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              <Users className="h-4 w-4 inline mr-2" />
              {t('bookings.bookingDialog.quantity')}
            </Label>
            <Select
              value={quantity.toString()}
              onValueChange={(value) => setQuantity(parseInt(value))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? t('bookings.bookingDialog.person') : t('bookings.bookingDialog.people')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('bookings.bookingDialog.availableSpots')}: {availableSpots}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('bookings.bookingDialog.booking')}
              </>
            ) : (
              t('bookings.bookingDialog.confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
