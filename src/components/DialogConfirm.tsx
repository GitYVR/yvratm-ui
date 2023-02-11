import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from "@mui/material";

function DialogConfirm({
  title,
  bodyText,
  isOpen,
  onClose,
  onConfirm,
}: {
  title: string;
  bodyText: string;
  isOpen: boolean;
  onClose: any;
  onConfirm: any;
}) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{bodyText}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onConfirm}>Yes</Button>
        <Button onClick={onClose}>No</Button>
      </DialogActions>
    </Dialog>
  );
}

export { DialogConfirm };
