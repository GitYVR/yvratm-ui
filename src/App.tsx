import { Grid, Button, Typography, CircularProgress } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { QrReader } from "react-qr-reader";
import { styled } from "@mui/system";
import { DialogConfirm } from "./components/DialogConfirm";
import { ViewFinder } from "./components/ViewFinder";
import QRCode from "react-qr-code";
import { prettyNumbers } from "./common/utils";

import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CancelIcon from "@mui/icons-material/Cancel";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import AirIcon from "@mui/icons-material/Air";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

const StackVerticalButton = styled(Button)({
  display: "flex",
  flexDirection: "column",
  height: "150px",
  width: "200px",
  fontSize: "20px",
});

type MachineState = {
  isEmptyingInProgress: boolean;
  isDepositInProgress: boolean;
  numOfNotes: number;
  currentDeposit: number;
  cadPerMatic: number;
  currentMaticToRecv: number;
  currency: string;
  rateLastUpdatedTimestamp: number;
  ethWalletAddress: string;
  maticBalanceOnPolygon: number;
};

type FinishDepositResp = {
  txHash: string;
  totalMaticToRecv: number;
  totalDepositCAD: number;
};

const BACKEND_URL = "http://localhost:3000";

enum PageState {
  MAIN,

  BUYING_MATIC_SCAN_ADDRESS,
  BUYING_MATIC_INSERT_BILL,
  BUYING_MATIC_SENDING_TX,
  BUYING_MATIC_TX_RECEIPT,
}

function App() {
  const [advancedView, setAdvanedView] = useState(false);
  const [machineState, setMachineState] = useState<null | MachineState>(null);
  const [pageState, setPageState] = useState<PageState>(PageState.MAIN);

  const [finishDepositResp, setFinishDepositResp] =
    useState<null | FinishDepositResp>(null);
  const [recipientAddress, setRecipientAddress] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>("");

  const [isDoneDepositingOpen, setIsDoneDepositingOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isConfirmAddressDialogOpen, setIsConfirmAddressDialogOpen] =
    useState(false);

  const cancelAndReturnHome = useCallback(() => {
    if (pageState === PageState.BUYING_MATIC_INSERT_BILL) {
      fetch(`${BACKEND_URL}/deposit/cancel`, { method: "POST" }).catch((e) => {
        alert(`Error occured while cancelling: ${e}`);
      });
    }

    setRecipientAddress(null);
    setPageState(PageState.MAIN);
    setIsReturnDialogOpen(false);
  }, [pageState]);

  const confirmUserAddressAndProceed = useCallback((address: string) => {
    setIsConfirmAddressDialogOpen(false);
    setRecipientAddress(address);
    setPageState(PageState.BUYING_MATIC_INSERT_BILL);
    fetch(`${BACKEND_URL}/deposit/start`, { method: "POST" }).catch((e) => {
      alert(`Error occured ${e}`);
    });
  }, []);

  const getMachineState = useCallback(async () => {
    const resp = await fetch(`${BACKEND_URL}/stats`).then((x) => x.json());
    setMachineState(resp as MachineState);
  }, []);

  const finalizeDepositAndSendMatic = useCallback(async () => {
    setPageState(PageState.BUYING_MATIC_SENDING_TX);
    fetch(`${BACKEND_URL}/deposit/end`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: JSON.stringify({
        recipient: recipientAddress,
      }),
    })
      .then(async (resp) => {
        const respJ = await resp.json();
        console.log("respJ", respJ);
        setFinishDepositResp(respJ as FinishDepositResp);
        setPageState(PageState.BUYING_MATIC_TX_RECEIPT);
      })
      .catch((e) => {
        alert(`An error occurred ${e.toString()}`);
      });
  }, [recipientAddress]);

  useEffect(() => {
    if (machineState !== null) return;
    getMachineState();
    setInterval(getMachineState, 1000);
  }, [getMachineState, machineState]);

  return (
    <>
      <DialogConfirm
        title="Return Home?"
        bodyText="Do you really want to return home?"
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
      <DialogConfirm
        title="Confirm Done Depositing"
        bodyText={`Done depositing?`}
        isOpen={isDoneDepositingOpen}
        onConfirm={() => {
          finalizeDepositAndSendMatic();
          setPageState(PageState.BUYING_MATIC_SENDING_TX);
          setIsDoneDepositingOpen(false)
        }}
        onClose={() => setIsDoneDepositingOpen(false)}
      />
      <Grid
        container
        spacing={0}
        direction="column"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: "20vh" }}
      >
        <Typography onClick={() => setAdvanedView(!advancedView)} variant="h4">
          YVR ON-BOARDOOOOR
        </Typography>
        <Typography variant="subtitle2">
          1 MATIC = CAD $
          {machineState !== null
            ? prettyNumbers(machineState.cadPerMatic)
            : "--"}
        </Typography>
        {advancedView && (
          <Typography variant="subtitle1">
            Depositing: {machineState?.isDepositInProgress.toString() || "--"}
            &nbsp;|&nbsp; Emptying:{" "}
            {machineState?.isEmptyingInProgress.toString() || "--"}
            &nbsp;|&nbsp; MATIC Balance:{" "}
            {machineState !== null
              ? prettyNumbers(machineState.maticBalanceOnPolygon)
              : "--"}
            &nbsp;|&nbsp; Last Updated:{" "}
            {machineState === null
              ? "--"
              : new Date(machineState.rateLastUpdatedTimestamp).toDateString() +
                " - " +
                new Date().toISOString().substring(11, 19)}
          </Typography>
        )}
      </Grid>
      <Grid
        container
        spacing={0}
        direction={pageState === PageState.MAIN ? undefined : "column"}
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: "55vh" }}
      >
        {pageState === PageState.MAIN && (
          <>
            <StackVerticalButton
              disabled={
                machineState?.isDepositInProgress ||
                machineState?.isEmptyingInProgress
              }
              variant="contained"
              onClick={() => {
                setPageState(PageState.BUYING_MATIC_SCAN_ADDRESS);
              }}
            >
              <AttachMoneyIcon style={{ fontSize: "50px" }} />
              BUY MATIC <br />
              WITH CAD
            </StackVerticalButton>
            {advancedView && (
              <>
                &nbsp;&nbsp;
                <StackVerticalButton
                  variant="contained"
                  color="warning"
                  disabled={
                    machineState?.isDepositInProgress ||
                    machineState?.isEmptyingInProgress
                  }
                  onClick={() =>
                    fetch(`${BACKEND_URL}/payout/empty`, { method: "POST" })
                  }
                >
                  <AirIcon style={{ fontSize: "50px" }} />
                  EMPTY PAYOUT
                </StackVerticalButton>
                &nbsp;&nbsp;
                <StackVerticalButton
                  variant="contained"
                  color="error"
                  onClick={() =>
                    fetch(`${BACKEND_URL}/machine/state/reset`, {
                      method: "POST",
                    })
                  }
                >
                  <RestartAltIcon style={{ fontSize: "50px" }} />
                  RESET MACHINE STATE
                </StackVerticalButton>
              </>
            )}
          </>
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
              Recipient address: {recipientAddress || "--"}
            </Typography>
            <div style={{ marginTop: "15px" }} />
            <Typography variant="h5">
              INSERTED CAD: ${machineState?.currentDeposit.toString() || "--"}
            </Typography>
            <Typography variant="h5">
              MATIC TO RECEIVE: ~
              {machineState !== null
                ? prettyNumbers(machineState.currentMaticToRecv)
                : "--"}
            </Typography>
            <StackVerticalButton
              style={{ marginTop: "20px", height: "125px" }}
              variant="contained"
              onClick={() => {
                setIsDoneDepositingOpen(true);
              }}
              color="success"
            >
              <ThumbUpOffAltIcon style={{ fontSize: "50px" }} />
              DONE
            </StackVerticalButton>
          </>
        )}
        {pageState === PageState.BUYING_MATIC_SENDING_TX && (
          <>
            <Typography variant="h5">
              CONFIRMING DEPOSIT AND SENDING MATIC...
            </Typography>
            <CircularProgress />
          </>
        )}
        {pageState === PageState.BUYING_MATIC_TX_RECEIPT && (
          <>
            <Typography variant="h5">MATIC SENT</Typography>
            <Typography variant="subtitle1">
              Transaction Hash: {finishDepositResp?.txHash || "--"}
            </Typography>
            <Typography variant="subtitle1">
              Deposited CAD:{" "}
              {finishDepositResp !== null
                ? prettyNumbers(finishDepositResp.totalDepositCAD)
                : "--"}
            </Typography>
            <Typography variant="subtitle1">
              Received MATIC:{" "}
              {finishDepositResp !== null
                ? prettyNumbers(finishDepositResp.totalMaticToRecv)
                : "--"}
            </Typography>
            <QRCode
              value={`https://polygonscan.com/tx/${
                finishDepositResp?.txHash || "--"
              }`}
            />
          </>
        )}
      </Grid>
      <Grid
        container
        spacing={0}
        direction="column"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: "25vh" }}
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
