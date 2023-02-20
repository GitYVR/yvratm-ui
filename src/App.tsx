import { Grid, Button, Typography, CircularProgress } from "@mui/material";
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { QrReader } from "react-qr-reader";
import { styled } from "@mui/system";
import { DialogConfirm } from "./components/DialogConfirm";
import { ViewFinder } from "./components/ViewFinder";
import QRCode from "react-qr-code";
import { epochNowInSeconds, prettyNumbers } from "./common/utils";

import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CancelIcon from "@mui/icons-material/Cancel";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import AirIcon from "@mui/icons-material/Air";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import GroupsIcon from "@mui/icons-material/Groups";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";

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
  membershipCadPer30Days: number;
  curMembershipTimeExtend: number;
  rateLastUpdatedTimestamp: number;
  ethWalletAddress: string;
  maticBalanceOnPolygon: number;
  version: string;
};

type FinishDepositResp = {
  txHash: string;
  totalMaticToRecv: number;
  totalDepositCAD: number;
};

type FobUserState = {
  name: null | string;
  expire_timestamp: null | number;
};

const ATM_BACKEND_URL = "http://localhost:3000";

enum PageState {
  MAIN,

  CHECK_MEMBERSHIP,
  CHECK_MEMBERSHIP_SCANNED_FOB,
  CHECK_MEMBERSHIP_INSERT_BILL,
  CHECK_MEMBERSHIP_EXTENDING,
  CHECK_MEMBERSHIP_EXTENDED_MEMBERSHIP,

  BUYING_MATIC_SCAN_ADDRESS,
  BUYING_MATIC_INSERT_BILL,
  BUYING_MATIC_SENDING_TX,
  BUYING_MATIC_TX_RECEIPT,
}

function App() {
  const [keyFobId, setKeyFobId] = useState("");
  const [fobUser, setFobUser] = useState<null | FobUserState>(null);
  const [advancedView, setAdvanedView] = useState(false);
  const [machineState, setMachineState] = useState<null | MachineState>(null);
  const [pageState, setPageState] = useState<PageState>(PageState.MAIN);

  const [finishDepositResp, setFinishDepositResp] =
    useState<null | FinishDepositResp>(null);
  const [recipientAddress, setRecipientAddress] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>("");

  const [isDoneDepositingOpen, setIsDoneDepositingOpen] = useState(false);
  const [isDoneDepositingMembershipOpen, setIsDoneDepositingMembershipOpen] =
    useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isConfirmAddressDialogOpen, setIsConfirmAddressDialogOpen] =
    useState(false);

  // Yes very dirty but whatever
  let keysLogged = "";
  const keyPressListener = (x: KeyboardEvent) => {
    if (x.key.toLowerCase() !== "enter") {
      keysLogged = keysLogged + x.key;
    } else {
      setKeyFobId(keysLogged);
      keysLogged = "";
      setPageState(PageState.CHECK_MEMBERSHIP_SCANNED_FOB);
    }
  };

  // eslint-disable-next-line
  const handleRFIDKeyDown = useMemo(() => keyPressListener, []);

  const cancelAndReturnHome = useCallback(() => {
    if (
      pageState === PageState.BUYING_MATIC_INSERT_BILL ||
      pageState === PageState.CHECK_MEMBERSHIP_INSERT_BILL
    ) {
      fetch(`${ATM_BACKEND_URL}/deposit/cancel`, { method: "POST" }).catch(
        (e) => {
          alert(`Error occured while cancelling: ${e || "unknown"}`);
        }
      );
    }

    setRecipientAddress(null);
    setPageState(PageState.MAIN);
    setIsReturnDialogOpen(false);
  }, [pageState]);

  const confirmUserAddressAndProceed = useCallback((address: string) => {
    setIsConfirmAddressDialogOpen(false);
    setRecipientAddress(address);
    setPageState(PageState.BUYING_MATIC_INSERT_BILL);
    fetch(`${ATM_BACKEND_URL}/deposit/start`, { method: "POST" }).catch((e) => {
      alert(`Error occured ${e || "unknown"}`);
    });
  }, []);

  const getMachineState = useCallback(async () => {
    const resp = await fetch(`${ATM_BACKEND_URL}/stats`).then((x) => x.json());
    setMachineState(resp as MachineState);
  }, []);

  const getFobUserStats = useCallback(async () => {
    const resp = await fetch(
      `https://fobs.dctrl.wtf/fob/${keyFobId}/user`
    ).then((x) => x.json());
    setFobUser(resp as FobUserState);
  }, [setFobUser, keyFobId]);

  const finalizeDepositAndSendMatic = useCallback(async () => {
    setPageState(PageState.BUYING_MATIC_SENDING_TX);
    fetch(`${ATM_BACKEND_URL}/deposit/end/matic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: recipientAddress,
      }),
    })
      .then(async (resp) => {
        const respJ = await resp.json();
        setFinishDepositResp(respJ as FinishDepositResp);
        setPageState(PageState.BUYING_MATIC_TX_RECEIPT);
      })
      .catch((e) => {
        alert(`An error occurred ${e || "unknown"}`);
      });
  }, [recipientAddress]);

  const finalizeDepositAndUpdateMembership = useCallback(async () => {
    setPageState(PageState.CHECK_MEMBERSHIP_EXTENDING);
    fetch(`${ATM_BACKEND_URL}/deposit/end/membership`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fobKey: keyFobId,
      }),
    })
      .then(async () => {
        await getFobUserStats();
        setPageState(PageState.CHECK_MEMBERSHIP_EXTENDED_MEMBERSHIP);
      })
      .catch((e) => {
        alert(`An error occurred ${e || "unknown"}`);
      });
  }, [keyFobId, getFobUserStats]);
  useEffect(() => {
    if (pageState === PageState.CHECK_MEMBERSHIP) {
      document.addEventListener("keydown", handleRFIDKeyDown as any);
    } else {
      document.removeEventListener("keydown", handleRFIDKeyDown as any);
    }
  }, [pageState, handleRFIDKeyDown]);

  useEffect(() => {
    if (
      keyFobId !== "" &&
      pageState === PageState.CHECK_MEMBERSHIP_SCANNED_FOB
    ) {
      getFobUserStats();
    }
  }, [keyFobId, pageState, getFobUserStats]);

  useEffect(() => {
    if (machineState !== null) return;
    getMachineState();
    setInterval(getMachineState, 2500);
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
          setPageState(PageState.CHECK_MEMBERSHIP_EXTENDING);
          setIsDoneDepositingOpen(false);
        }}
        onClose={() => setIsDoneDepositingOpen(false)}
      />
      <DialogConfirm
        title="Confirm Done Depositing"
        bodyText={`Finish deposit and extend membership?`}
        isOpen={isDoneDepositingMembershipOpen}
        onConfirm={() => {
          finalizeDepositAndUpdateMembership();
          setPageState(PageState.CHECK_MEMBERSHIP_EXTENDING);
          setIsDoneDepositingMembershipOpen(false);
        }}
        onClose={() => setIsDoneDepositingMembershipOpen(false)}
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
        <br />
        {advancedView && (
          <Typography variant="subtitle1">
            Version: {machineState === null ? "--" : machineState.version}
            &nbsp;|&nbsp;Depositing:{" "}
            {machineState === null
              ? "--"
              : machineState.isDepositInProgress.toString()}
            &nbsp;|&nbsp;Emptying:{" "}
            {machineState === null
              ? "--"
              : machineState.isEmptyingInProgress.toString()}
            &nbsp;|&nbsp;MATIC Balance:{" "}
            {machineState !== null
              ? prettyNumbers(machineState.maticBalanceOnPolygon)
              : "--"}
            &nbsp;|&nbsp;Last Updated:{" "}
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
                (machineState !== null &&
                  (machineState.isDepositInProgress ||
                    machineState.isEmptyingInProgress)) ||
                machineState === null
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
            &nbsp;&nbsp;
            <StackVerticalButton
              variant="contained"
              onClick={() => {
                setPageState(PageState.CHECK_MEMBERSHIP);
              }}
            >
              <GroupsIcon style={{ fontSize: "50px" }} />
              MEMBERSHIP
            </StackVerticalButton>
            {advancedView && (
              <>
                &nbsp;&nbsp;
                <StackVerticalButton
                  variant="contained"
                  color="warning"
                  disabled={
                    machineState !== null &&
                    (machineState.isDepositInProgress ||
                      machineState.isEmptyingInProgress)
                  }
                  onClick={() =>
                    fetch(`${ATM_BACKEND_URL}/payout/empty`, { method: "POST" })
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
                    fetch(`${ATM_BACKEND_URL}/machine/state/reset`, {
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
        {pageState === PageState.CHECK_MEMBERSHIP && (
          <Typography variant="h4">Please scan your FOB</Typography>
        )}
        {pageState === PageState.CHECK_MEMBERSHIP_SCANNED_FOB && (
          <>
            <Typography variant="h5">FOB ID: {keyFobId}</Typography>
            {fobUser === null && <CircularProgress />}
            {fobUser !== null && (
              <>
                {fobUser.name === null ? (
                  <Typography variant="h5">USER NOT REGISTERED</Typography>
                ) : (
                  <Typography variant="h5">
                    Name:&nbsp;{fobUser.name}
                  </Typography>
                )}
                {fobUser.expire_timestamp === null ? (
                  ""
                ) : (
                  <Typography variant="h5">
                    Expires:&nbsp;
                    {new Date(fobUser.expire_timestamp * 1000).toLocaleString()}
                  </Typography>
                )}
              </>
            )}
            {fobUser !== null &&
              fobUser.name !== null &&
              fobUser.expire_timestamp !== null && (
                <>
                  <StackVerticalButton
                    style={{ marginTop: "20px", height: "125px" }}
                    variant="contained"
                    onClick={() => {
                      setPageState(PageState.CHECK_MEMBERSHIP_INSERT_BILL);
                      fetch(`${ATM_BACKEND_URL}/deposit/start`, {
                        method: "POST",
                      }).catch((e) => {
                        alert(`Error occured ${e || "unknown"}`);
                      });
                    }}
                    color="success"
                  >
                    <LocalAtmIcon style={{ fontSize: "50px" }} />
                    PAY MEMBERSHIP FEES
                  </StackVerticalButton>
                </>
              )}
          </>
        )}
        {pageState === PageState.CHECK_MEMBERSHIP_INSERT_BILL &&
          fobUser !== null &&
          fobUser.name !== null &&
          fobUser.expire_timestamp !== null &&
          machineState !== null &&
          machineState.curMembershipTimeExtend !== null && (
            <>
              <Typography variant="h4">FEED BILLS INTO MACHINE</Typography>
              <Typography variant="h5">
                INSERTED CAD: $
                {machineState === null
                  ? "--"
                  : machineState.currentDeposit.toString()}
              </Typography>
              <Typography variant="h5">Name: {fobUser.name}</Typography>
              <Typography variant="h5">FOB Key: {keyFobId}</Typography>
              <Typography variant="h5">
                Expiry:{" "}
                {new Date(fobUser.expire_timestamp * 1000).toLocaleString()}
              </Typography>
              <Typography variant="h5">
                New Expiry:{" "}
                {machineState.currentDeposit <= 0
                  ? fobUser.expire_timestamp
                  : new Date(
                      ((fobUser.expire_timestamp < epochNowInSeconds()
                        ? epochNowInSeconds()
                        : fobUser.expire_timestamp) +
                        machineState.curMembershipTimeExtend) *
                        1000
                    ).toLocaleString()}
              </Typography>
              <br />
              <Button
                onClick={() => setIsDoneDepositingMembershipOpen(true)}
                variant="contained"
                color="success"
                style={{ height: "75px", fontSize: "15px" }}
              >
                <AttachMoneyIcon style={{ fontSize: "35px" }} />
                &nbsp;&nbsp;PROCEED&nbsp;&nbsp;
              </Button>
            </>
          )}
        {pageState === PageState.CHECK_MEMBERSHIP_EXTENDING && (
          <>
            <Typography variant="h4">Updating membership</Typography>
            <CircularProgress />
          </>
        )}
        {pageState === PageState.CHECK_MEMBERSHIP_EXTENDED_MEMBERSHIP && (
          <>
            <Typography variant="h4">Membership Updated!</Typography>
            {fobUser !== null &&
              fobUser.name !== null &&
              fobUser.expire_timestamp !== null && (
                <>
                  <Typography variant="h5">Name: {fobUser.name}</Typography>
                  <Typography variant="h5">FOB Key: {keyFobId}</Typography>
                  <Typography variant="h5">
                    New Expiry:{" "}
                    {new Date(fobUser.expire_timestamp * 1000).toLocaleString()}
                  </Typography>
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
                    let txt = result.getText();

                    if (txt.startsWith("ethereum:")) {
                      try {
                        txt = txt.replace("ethereum:", "").slice(0, 42);
                      } catch (e) {}
                    }

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
              INSERTED CAD: $
              {machineState === null
                ? "--"
                : machineState.currentDeposit.toString()}
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
              Transaction Hash:{" "}
              {finishDepositResp !== null ? finishDepositResp.txHash : "--"}
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
                finishDepositResp !== null ? finishDepositResp.txHash : "--"
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
