import { Grid, Button, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { QrReader } from "react-qr-reader";
import { styled } from "@mui/system";
import { DialogConfirm } from "./components/DialogConfirm";
import { ViewFinder } from "./components/ViewFinder";
import QRCode from "react-qr-code";

import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CancelIcon from "@mui/icons-material/Cancel";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";

const StackVerticalButton = styled(Button)({
  display: "flex",
  flexDirection: "column",
  height: "150px",
  width: "200px",
  fontSize: "20px",
});

type UserState = {
  depositedCAD: number;
  transferToAddress: string;
};

const initialUserState: UserState = {
  depositedCAD: 0,
  transferToAddress: "",
};

enum PageState {
  MAIN,

  BUYING_MATIC_SCAN_ADDRESS,
  BUYING_MATIC_INSERT_BILL,
  BUYING_MATIC_INSERT_BILL_DONE,
  BUYING_MATIC_TX_RECEIPT,
}

function App() {
  const [userState, setUserState] = useState<UserState>(initialUserState);
  const [pageState, setPageState] = useState<PageState>(PageState.MAIN);

  const [qrCodeData, setQrCodeData] = useState<string>("");

  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isConfirmAddressDialogOpen, setIsConfirmAddressDialogOpen] =
    useState(false);

  const cancelAndReturnHome = useCallback(() => {
    setPageState(PageState.MAIN);
    setUserState(initialUserState);
    setIsReturnDialogOpen(false);
  }, []);

  const confirmUserAddressAndProceed = useCallback(
    (address: string) => {
      setUserState({ ...userState, transferToAddress: address });
      setPageState(PageState.BUYING_MATIC_INSERT_BILL);
      setIsConfirmAddressDialogOpen(false);
    },
    [userState]
  );

  return (
    <>
      <DialogConfirm
        title="Cancel And Return Home?"
        bodyText="Do you really want to cancel your progress and return home?"
        isOpen={isReturnDialogOpen}
        onConfirm={() => cancelAndReturnHome()}
        onClose={() => setIsReturnDialogOpen(false)}
      />
      <DialogConfirm
        title="Confirm Your Address"
        bodyText={`Confirm that ${qrCodeData} is your address?`}
        isOpen={isConfirmAddressDialogOpen}
        onConfirm={() => confirmUserAddressAndProceed(qrCodeData)}
        onClose={() => setIsConfirmAddressDialogOpen(false)}
      />
      <Grid
        container
        spacing={0}
        direction="column"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: "5vh" }}
      >
        <Typography variant="h4">CASH TO MATIC</Typography>
      </Grid>
      <Grid
        container
        spacing={0}
        direction="column"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: "80vh" }}
      >
        {pageState === PageState.MAIN && (
          <StackVerticalButton
            variant="contained"
            onClick={() => setPageState(PageState.BUYING_MATIC_SCAN_ADDRESS)}
          >
            <AttachMoneyIcon style={{ fontSize: "50px" }} />
            BUY MATIC <br />
            WITH CAD
          </StackVerticalButton>
        )}
        {pageState === PageState.BUYING_MATIC_SCAN_ADDRESS && (
          <>
            <div style={{ width: "400px", margin: "auto" }}>
              <Typography variant="h6">
                SCANNING ETHEREUM ADDRESS QR CODE
              </Typography>
              <QrReader
                ViewFinder={ViewFinder}
                videoId="video"
                scanDelay={500}
                constraints={{ facingMode: "user" }}
                onResult={(result, error) => {
                  if (!!result) {
                    const txt = result.getText();

                    // Is an address
                    if (txt.startsWith("0x") && txt.length === 42) {
                      setQrCodeData(txt);
                      setIsConfirmAddressDialogOpen(true);
                    }
                  }

                  if (!!error) {
                    console.info("qr-code", error);
                  }
                }}
              />
            </div>
          </>
        )}
        {pageState === PageState.BUYING_MATIC_INSERT_BILL && (
          <>
            <Typography variant="h5">FEED CAD BILLS INTO MACHINE</Typography>
            <Typography variant="subtitle1">
              NO REFUNDS. PRESS PROCEED WHEN DONE.
            </Typography>
            <div style={{ marginTop: "15px" }} />
            <Typography variant="h5">INSERTED CAD: $0</Typography>
            <Typography variant="h5">MATIC TO RECEIVE: 0</Typography>
            <StackVerticalButton
              style={{ marginTop: "20px", height: "125px" }}
              variant="contained"
              onClick={() => setPageState(PageState.BUYING_MATIC_TX_RECEIPT)}
            >
              <ThumbUpOffAltIcon style={{ fontSize: "50px" }} />
              PROCEED
            </StackVerticalButton>
          </>
        )}
        {pageState === PageState.BUYING_MATIC_TX_RECEIPT && (
          <>
            <Typography variant="h5">MATIC SENT</Typography>
            <Typography variant="subtitle1">Tx 0x123455</Typography>
            <QRCode value={`https://polygonscan.com/address/${1234}`} />
          </>
        )}
      </Grid>
      <Grid
        container
        spacing={0}
        direction="column"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: "15vh" }}
      >
        {pageState !== PageState.MAIN && (
          <Button
            onClick={() => setIsReturnDialogOpen(true)}
            variant="contained"
            color="error"
            style={{ height: "75px", fontSize: "15px" }}
          >
            <CancelIcon style={{ fontSize: "35px" }} />
            &nbsp;&nbsp;RETURN HOME
          </Button>
        )}
      </Grid>
    </>
  );
}

export default App;
