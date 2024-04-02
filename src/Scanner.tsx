/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC, RefObject, useCallback, useEffect } from "react";
import Quagga, {
  QuaggaJSCodeReader,
  QuaggaJSReaderConfig,
} from "@ericblade/quagga2";

// Function to calculate median of an array
function getMedian(arr: number[]): number {
  const newArr = [...arr];
  newArr.sort((a, b) => a - b);
  const half = Math.floor(newArr.length / 2);
  if (newArr.length % 2 === 1) {
    return newArr[half];
  }
  return (newArr[half - 1] + newArr[half]) / 2;
}

// Function to calculate median of code errors
interface DecodedCode {
  error: number; // Assuming error is a number, adjust as necessary
  // Add other properties if necessary
}

function getMedianOfCodeErrors(decodedCodes: DecodedCode[]): number {
  const errors = decodedCodes.flatMap((x) => x.error);
  const medianOfErrors = getMedian(errors);
  return medianOfErrors;
}

// Default settings for constraints, locator, and decoders
const defaultConstraints = {
  width: 640,
  height: 300,
};

const defaultLocatorSettings = {
  patchSize: "medium",
  halfSample: true,
  willReadFrequently: true,
};

const defaultDecoders = ["ean_reader"] as DecoderType[];
type DecoderType = QuaggaJSReaderConfig | QuaggaJSCodeReader;
interface ScannerProps {
  onDetected: (result: any) => void;
  scannerRef: RefObject<HTMLDivElement>;
  onScannerReady?: () => void;
  cameraId?: string | null;
  facingMode?: string;
  constraints?: { width: number; height: number };
  locator?: {
    patchSize: string;
    halfSample: boolean;
    willReadFrequently: boolean;
  };
  decoders?: DecoderType[];
  locate?: boolean;
}

const Scanner: FC<ScannerProps> = ({
  onDetected,
  scannerRef,
  onScannerReady,
  cameraId,
  facingMode,
  constraints = defaultConstraints,
  locator = defaultLocatorSettings,
  decoders = defaultDecoders,
  locate = true,
}) => {
  const errorCheck = useCallback(
    (result: any) => {
      if (!onDetected) {
        return;
      }
      const err = getMedianOfCodeErrors(result.codeResult.decodedCodes);
      if (err < 0.25 && result.codeResult.code.length === 13) {
        onDetected(result.codeResult.code);
      }
    },
    [onDetected]
  );

  const handleProcessed = (result: any) => {
    const drawingCtx = Quagga.canvas.ctx.overlay;
    const drawingCanvas = Quagga.canvas.dom.overlay;
    drawingCtx.font = "24px Arial";
    // drawingCtx.fillStyle = 'green';

    if (result) {
      if (result.boxes) {
        drawingCtx.clearRect(
          0,
          0,
          parseInt(drawingCanvas.getAttribute("width") || "0"),
          parseInt(drawingCanvas.getAttribute("height") || "0")
        );
        result.boxes
          .filter((box: string[]) => box !== result.box)
          .forEach((box: string[]) => {
            Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, {
              color: "purple",
              lineWidth: 2,
            });
          });
      }
      if (result.box) {
        Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, {
          color: "blue",
          lineWidth: 2,
        });
      }
      if (result.codeResult && result.codeResult.code) {
        drawingCtx.font = "24px Arial";
        drawingCtx.fillText(result.codeResult.code, 10, 20);
      }
    }
  };

  useEffect(() => {
    let ignoreStart = false;
    const init = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (ignoreStart) {
        return;
      }
      await Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            constraints: {
              ...constraints,
              ...(cameraId && { deviceId: cameraId }),
              ...(!cameraId && { facingMode }),
            },
            target: scannerRef.current!,
            willReadFrequently: true,
          },
          locator,
          decoder: { readers: decoders },
          locate,
        },
        async (err: string) => {
          Quagga.onProcessed(handleProcessed);

          if (err) {
            console.error("Error starting Quagga:", err);
          }
          if (scannerRef.current) {
            await Quagga.start();
            if (onScannerReady) {
              onScannerReady();
            }
          }
        }
      );
      Quagga.onDetected(errorCheck);
    };
    init();
    return () => {
      ignoreStart = true;
      Quagga.stop();
      Quagga.offDetected(errorCheck);
      Quagga.offProcessed(handleProcessed);
    };
  }, []);

  return null;
};

export default Scanner;
