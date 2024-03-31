import React from "react";

interface BarcodeResult {
  codeResult?: {
    code?: string;
    format?: string;

    // Other properties if available
  };
  // Other properties if available
}

interface ResultProps {
  result: BarcodeResult;
}

const Result: React.FC<ResultProps> = ({ result }) => (
  <li>
    {result.codeResult && result.codeResult.code} [
    {result.codeResult && result.codeResult.format}]
  </li>
);

export default Result;
