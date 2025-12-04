import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@client/components/ui/alert-dialog"
import { useEffect } from "react"

interface ConfirmDialogProps {
  title: string
  description: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

const ConfirmDialog = ({ title, description, open, onOpenChange, onConfirm }: ConfirmDialogProps) => {
  // Cleanup pointer events when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.documentElement.style.pointerEvents = '';
        // Also remove any stale Radix portals
        const portals = document.querySelectorAll('[data-radix-portal]');
        portals.forEach(portal => {
          if (!portal.querySelector('[data-state="open"]')) {
            (portal as HTMLElement).style.pointerEvents = 'none';
          }
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      // Immediate cleanup
      setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.documentElement.style.pointerEvents = '';
        // Clean up portals
        const portals = document.querySelectorAll('[data-radix-portal]');
        portals.forEach(portal => {
          (portal as HTMLElement).style.pointerEvents = 'none';
        });
      }, 100);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange} modal>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ConfirmDialog